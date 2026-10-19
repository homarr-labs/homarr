import {
  createPublishedBeszelRead,
  publishedAlbumSelection,
  publishedMediaPage,
} from "@homarr/api/published-item-reads";
import type { ORPCClient } from "@homarr/api/orpc";

export interface BoardWidgetSource {
  kind: string;
  options: Readonly<Record<string, unknown>>;
  integrationIds: readonly string[];
  itemId: string;
  boardId: string;
}
export interface BoardWidgetContext {
  caller: ORPCClient | (() => ORPCClient | Promise<ORPCClient>);
  signal?: AbortSignal;
  mediaPath?: (imageProxyPath: string) => string | Promise<string>;
}
export type WidgetDisplayValue =
  | null
  | boolean
  | number
  | string
  | WidgetDisplayValue[]
  | { [key: string]: WidgetDisplayValue };
export type BoardWidgetData =
  | { status: "ready"; data: WidgetDisplayValue }
  | { status: "unconfigured" | "unsupported" | "unavailable"; reason: string };

const privateField =
  /(?:password|secret|token|api.?key|authorization|credential|cookie|headers|private.?key|connection|stringified|raw.?response|^sources?$|^sourceId$|^sourceCacheVersion$|^configuration$|^options$|^template$|^requestCapabilities$|^baseUrl$|^integrationUrl$|^externalUrl$|^dashboardUrl$|^socketPath$|^env$|^labels$|^username$|^userName$)/i;
const sensitiveQuery = /(?:token|key|secret|password|auth|signature|credential|session|code)/i;

/** Shared links never carry userinfo, credential query parameters or worker-local bearer media paths. */
export function safeWidgetLink(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 8_192) return null;
  try {
    const url = new URL(value);
    if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) return null;
    if ([...url.searchParams.keys()].some((key) => sensitiveQuery.test(key))) return null;
    if (url.hash && /(?:token|secret|password|access.?key)=/i.test(url.hash)) return null;
    return url.href;
  } catch {
    return null;
  }
}
function safeText(value: string): string {
  return value
    .slice(0, 16_384)
    .replace(/https?:\/\/[^\s<>"']+/gi, (url) => safeWidgetLink(url) ?? "[redacted link]")
    .replace(/\b(?:Bearer|Basic)\s+[^\s<>"']+/gi, "[redacted authorization]")
    .replace(/\b(?:api[_ -]?key|password|secret|token|authorization)\s*[:=]\s*[^\s,;<>"']+/gi, "[redacted credential]");
}
/** Bounded display-only JSON; no integration configuration, executable template or response headers. */
export function projectWidgetDisplay(value: unknown, depth = 0): WidgetDisplayValue {
  const budget = { nodes: 8_000, characters: 262_144 };
  const visit = (entry: unknown, level: number): WidgetDisplayValue => {
    if (level > 12 || --budget.nodes < 0) return null;
    if (entry === null || typeof entry === "boolean") return entry;
    if (typeof entry === "number") return Number.isFinite(entry) ? entry : null;
    if (entry instanceof Date) {
      if (!Number.isFinite(entry.getTime())) return null;
      return entry.toISOString();
    }
    if (typeof entry === "string") {
      if (entry.startsWith("/api/") || entry.startsWith("//")) return null;
      if (/^(?:javascript|data|file|vbscript):/i.test(entry)) return null;
      if (budget.characters <= 0) return null;
      const result = safeText(entry.slice(0, budget.characters));
      budget.characters -= result.length;
      return result;
    }
    if (Array.isArray(entry)) return entry.slice(0, 200).map((child) => visit(child, level + 1));
    if (isRecord(entry)) {
      return Object.fromEntries(
        Object.entries(entry)
          .filter(([key]) => !privateField.test(key) && !["__proto__", "constructor", "prototype"].includes(key))
          .slice(0, 100)
          .map(([key, child]) => [safeText(key), visit(child, level + 1)]),
      );
    }
    return null;
  };
  return visit(value, depth);
}
function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function text(options: Readonly<Record<string, unknown>>, key: string, fallback = ""): string {
  const value = options[key];
  if (typeof value !== "string") return fallback;
  return value.slice(0, 8_192);
}
function number(
  options: Readonly<Record<string, unknown>>,
  key: string,
  fallback: number,
  min: number,
  max: number,
): number {
  const value = Number(options[key]);
  if (!Number.isFinite(value)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(value)));
}
function flag(options: Readonly<Record<string, unknown>>, key: string, fallback = false): boolean {
  if (typeof options[key] !== "boolean") return fallback;
  return options[key];
}
function strings(value: unknown, limit = 100): string[] {
  if (!Array.isArray(value)) return [];
  return [
    ...new Set(
      value.filter((entry): entry is string => typeof entry === "string" && entry.length > 0 && entry.length <= 8_192),
    ),
  ].slice(0, limit);
}
function pick<const T extends string>(value: unknown, values: readonly T[], fallback: T): T {
  return values.find((candidate) => candidate === value) ?? fallback;
}
function location(value: unknown) {
  if (!isRecord(value) || typeof value.latitude !== "number" || typeof value.longitude !== "number") return null;
  if (
    !Number.isFinite(value.latitude) ||
    !Number.isFinite(value.longitude) ||
    Math.abs(value.latitude) > 90 ||
    Math.abs(value.longitude) > 180
  )
    return null;
  return { latitude: value.latitude, longitude: value.longitude };
}
const notConfigured = (reason: string): BoardWidgetData => ({ status: "unconfigured", reason });
const unsupported = (reason: string): BoardWidgetData => ({ status: "unsupported", reason });

/** Inputs come exclusively from the already-authorized persisted board item. No caller-supplied RPC paths or inputs. */
export async function getBoardWidgetData(
  source: BoardWidgetSource,
  context: BoardWidgetContext,
): Promise<BoardWidgetData> {
  const { kind, options, itemId, boardId } = source;
  const integrationIds = strings([...source.integrationIds]);
  const integrationId = integrationIds[0];
  const requestOptions = { signal: context.signal };
  const ready = async (data: unknown): Promise<BoardWidgetData> => {
    let nodes = 8_000;
    const bindMedia = async (entry: unknown, depth = 0): Promise<unknown> => {
      if (--nodes < 0 || depth > 12) return null;
      if (typeof entry === "string" && /^\/api\/image-proxy\/[A-Za-z0-9_-]{1,256}$/.test(entry)) {
        if (!context.mediaPath) return null;
        let path: string;
        try {
          path = await context.mediaPath(entry);
        } catch {
          return null;
        }
        if (!path.startsWith(`/remote/boards/${encodeURIComponent(boardId)}/media/`)) return null;
        if (!/^\/remote\/boards\/[^/?]+\/media\/[^/?]+$/.test(path)) return null;
        return path;
      }
      if (Array.isArray(entry)) {
        const result: unknown[] = [];
        for (const child of entry.slice(0, 200)) result.push(await bindMedia(child, depth + 1));
        return result;
      }
      if (isRecord(entry) && !(entry instanceof Date)) {
        const result: Record<string, unknown> = {};
        for (const [key, child] of Object.entries(entry).slice(0, 100)) {
          if (privateField.test(key) || ["__proto__", "constructor", "prototype"].includes(key)) continue;
          result[key] = await bindMedia(child, depth + 1);
        }
        return result;
      }
      return entry;
    };
    return { status: "ready", data: projectWidgetDisplay(await bindMedia(data)) };
  };
  let callerPromise: Promise<ORPCClient> | undefined;
  const caller = () =>
    (callerPromise ??= Promise.resolve().then(() => {
      if (typeof context.caller === "function") return context.caller();
      return context.caller;
    }));
  try {
    context.signal?.throwIfAborted();
    if (kind === "assistant")
      return unsupported("Assistant conversations and tools require separate interactive authorization.");
    if (kind === "smartHome-executeAutomation")
      return unsupported("Automation actions are disabled for read-only shares.");
    if (kind === "customApi")
      return ready(await (await caller()).widget.customApi.getShareData({ itemId }, requestOptions));
    if (kind === "dateTime" || kind === "clock") {
      const data: Record<string, unknown> = {
        now: new Date(),
        timezone: text(options, "timezone", "UTC"),
        showDate: flag(options, "showDate", true),
        timeFormat: text(options, "customTimeFormat", "HH:mm"),
        dateFormat: text(options, "dateFormat"),
        worldClockCities: options.worldClockCities,
      };
      const point = location(options.weatherLocation);
      if (flag(options, "showWeather") && point)
        data.weather = await (await caller()).widget.weather.atLocation(point, requestOptions);
      return ready(data);
    }
    if (kind === "notebook")
      return ready({ format: "text", content: text(options, "content").replace(/<[^>]*>/g, "") });
    if (kind === "countdown")
      return ready({
        now: new Date(),
        events: options.events ?? [],
        showProgress: flag(options, "showProgress", true),
        showSeconds: flag(options, "showSeconds"),
      });
    if (kind === "timer")
      return ready({
        mode: text(options, "mode", "timer"),
        timerMinutes: number(options, "timerMinutes", 5, 1, 1440),
        focusMinutes: number(options, "focusMinutes", 25, 1, 1440),
        shortBreakMinutes: number(options, "shortBreakMinutes", 5, 1, 1440),
        longBreakMinutes: number(options, "longBreakMinutes", 15, 1, 1440),
        state: "local-to-viewer",
      });
    if (kind === "iframe" || kind === "video") {
      const url = safeWidgetLink(options.embedUrl ?? options.feedUrl);
      if (!url) return notConfigured("A public HTTP(S) embed URL is required.");
      return ready({ url, mode: "link", embeddedContent: "Requires an explicitly permitted frontend embed." });
    }
    if (kind === "weather" || kind === "airQuality") {
      const point = location(options.location);
      if (!point) return notConfigured("A saved location is required.");
      const api = await caller();
      if (kind === "weather") return ready(await api.widget.weather.atLocation(point, requestOptions));
      return ready(await api.widget.airQuality.atLocation(point, requestOptions));
    }
    if (kind === "minecraftServerStatus") {
      const domain = text(options, "domain");
      if (!domain) return notConfigured("A saved Minecraft server is required.");
      return ready(
        await (
          await caller()
        ).widget.minecraft.getServerStatus(
          { domain, isBedrockServer: flag(options, "isBedrockServer") },
          requestOptions,
        ),
      );
    }
    if (kind === "stockPrice")
      return ready(
        await (
          await caller()
        ).widget.stockPrice.getPriceHistory(
          {
            stock: text(options, "stock", "AAPL"),
            timeRange: pick(
              options.timeRange,
              ["1d", "5d", "1mo", "3mo", "6mo", "ytd", "1y", "2y", "5y", "10y", "max"],
              "1mo",
            ),
            timeInterval: pick(options.timeInterval, ["5m", "15m", "30m", "1h", "1d", "5d", "1wk", "1mo"], "1d"),
          },
          requestOptions,
        ),
      );
    if (kind === "rssFeed") {
      const urls = strings(options.feedUrls).filter((url) => safeWidgetLink(url));
      if (!urls.length) return notConfigured("Saved public feed URLs are required.");
      return ready(
        await (
          await caller()
        ).widget.rssFeed.getFeeds(
          {
            urls,
            maximumAmountPosts: number(options, "maximumAmountPosts", 100, 1, 200),
            descriptionMaxLength: number(options, "descriptionMaxLength", 250, 1, 5000),
          },
          requestOptions,
        ),
      );
    }
    if (kind === "timetable") {
      const station = options.station;
      const baseUrl = safeWidgetLink(options.baseUrl);
      if (!baseUrl || !isRecord(station) || typeof station.value !== "string")
        return notConfigured("A saved station and timetable URL are required.");
      return ready(
        await (
          await caller()
        ).widget.timetable.getTimetable(
          { baseUrl, itemId, boardId, stationId: station.value, limit: 10 },
          requestOptions,
        ),
      );
    }
    if (kind === "app" || kind === "bookmarks") {
      const api = await caller();
      const selected = strings(options.items);
      if (kind === "app") {
        const appId = text(options, "appId");
        if (!appId) return notConfigured("A saved application is required.");
        const app = await api.app.byId({ id: appId }, requestOptions);
        return ready({
          id: app.id,
          name: app.name,
          description: app.description,
          href: safeWidgetLink(app.href),
          iconUrl: safeWidgetLink(app.iconUrl),
        });
      }
      const appIds = selected.filter((value) => !value.startsWith("url:"));
      const apps = await api.app.byIds(appIds, requestOptions);
      const values = selected.flatMap((value) => {
        if (value.startsWith("url:")) {
          const href = safeWidgetLink(value.slice(4));
          if (!href) return [];
          return [{ id: value, name: new URL(href).hostname, href, description: null }];
        }
        const app = apps.find((entry) => entry.id === value);
        if (!app) return [];
        return [{ id: app.id, name: app.name, href: safeWidgetLink(app.href), description: app.description }];
      });
      for (const custom of strings(options.customUrls)) {
        const href = safeWidgetLink(custom);
        if (href) values.push({ id: `url:${href}`, name: new URL(href).hostname, href, description: null });
      }
      return ready({ bookmarks: values, groups: options.groups ?? [] });
    }
    if (kind === "dockerContainers") {
      const endpointIds = strings(options.endpointIds);
      if (!endpointIds.length) return notConfigured("Select explicit Docker endpoints before publishing this widget.");
      const result = await (await caller()).docker.getContainers({ endpointIds }, requestOptions);
      const filters = strings(options.containerFilter);
      const containers = result.containers
        .filter((entry) => {
          if (!endpointIds.includes(entry.endpointId)) return false;
          if (!filters.length) return true;
          let name = entry.name;
          if (!flag(options, "filterCaseSensitive", true)) name = name.toLowerCase();
          const match = filters.some((filter) => {
            let pattern = filter;
            if (!flag(options, "filterCaseSensitive", true)) pattern = pattern.toLowerCase();
            if (!flag(options, "filterAllowWildcards")) return name === pattern;
            const parts = pattern.split("*");
            const first = parts[0] ?? "";
            if (!name.startsWith(first)) return false;
            let offset = first.length;
            for (const part of parts.slice(1, -1)) {
              const found = name.indexOf(part, offset);
              if (found === -1) return false;
              offset = found + part.length;
            }
            const last = parts.at(-1) ?? "";
            return name.endsWith(last) && name.length - last.length >= offset;
          });
          return flag(options, "filterIsWhitelist") === match;
        })
        .map(({ id, name, state, image, cpuUsage, memoryUsage, endpointId }) => ({
          id,
          name,
          state,
          image,
          cpuUsage,
          memoryUsage,
          endpointId,
        }));
      return ready({ containers, timestamp: result.timestamp });
    }
    if (kind === "releases") {
      const repositories = Array.isArray(options.repositories)
        ? options.repositories
            .filter(isRecord)
            .flatMap((repo) => {
              if (
                typeof repo.identifier !== "string" ||
                !["github", "dockerHub", "gitlab", "npm", "codeberg", "linuxServerIO"].includes(String(repo.provider))
              )
                return [];
              const provider = repo.provider as
                | "github"
                | "dockerHub"
                | "gitlab"
                | "npm"
                | "codeberg"
                | "linuxServerIO";
              const providerUrl = safeWidgetLink(repo.providerUrl) ?? undefined;
              return [{ provider, identifier: repo.identifier, providerUrl }];
            })
            .slice(0, 50)
        : [];
      const api = await caller();
      const latest = await api.widget.releases.getLatest({ itemId, repositories }, requestOptions);
      let services: unknown = [];
      if (integrationIds.length)
        services = await api.widget.releases.getServiceVersions({ integrationIds }, requestOptions);
      return ready({ latest, services });
    }
    if (!integrationId) return notConfigured("A saved integration is required.");
    const api = await caller();
    const many = { integrationIds };
    const one = { integrationId };
    switch (kind) {
      case "anchorNote": {
        const noteId = text(options, "noteId");
        if (!noteId) return notConfigured("A saved note is required.");
        const note = await api.widget.anchorNotes.getNote({ ...one, noteId }, requestOptions);
        return ready({
          content: note.content,
          title: flag(options, "showTitle", true) ? note.title : undefined,
          updatedAt: flag(options, "showUpdatedAt", true) ? note.updatedAt : undefined,
        });
      }
      case "dnsHoleSummary":
      case "dnsHoleControls":
        return ready(await api.widget.dnsHole.summary(many, requestOptions));
      case "smartHome-entityState": {
        const entityId = text(options, "entityId");
        if (!entityId) return notConfigured("A saved entity is required.");
        return ready(await api.widget.smartHome.entityDetails({ ...one, entityId }, requestOptions));
      }
      case "downloads":
        return ready(
          await api.widget.downloads.getJobsAndStatuses(
            {
              ...many,
              limitPerIntegration: number(options, "limitPerIntegration", 50, 1, 100),
              includeArchivedHistory: flag(options, "includeArchivedHistory"),
              historyWindowDays: number(options, "historyWindowDays", 7, 1, 365),
            },
            requestOptions,
          ),
        );
      case "mediaServer":
        return ready(
          await api.widget.mediaServer.getCurrentStreams(
            { ...many, showOnlyPlaying: flag(options, "showOnlyPlaying", true) },
            requestOptions,
          ),
        );
      case "mediaReleases":
        return ready(await api.widget.mediaRelease.getMediaReleases(many, requestOptions));
      case "mediaRequests-requestStats":
        return ready(await api.widget.mediaRequests.getStats(many, requestOptions));
      case "mediaRequests-requestList": {
        const statuses = strings(options.statusFilter).filter(
          (value): value is "pending" | "approved" | "declined" | "failed" | "completed" =>
            ["pending", "approved", "declined", "failed", "completed"].includes(value),
        );
        return ready(
          await api.widget.mediaRequests.getLatestRequests(
            {
              ...many,
              statuses: statuses.length ? statuses : ["pending", "approved", "declined", "failed", "completed"],
              recentDays: number(options, "recentDays", 0, 0, 365),
            },
            requestOptions,
          ),
        );
      }
      case "calendar": {
        const now = new Date();
        const releaseType = strings(options.releaseType).filter(
          (value): value is "inCinemas" | "digitalRelease" | "physicalRelease" =>
            ["inCinemas", "digitalRelease", "physicalRelease"].includes(value),
        );
        return ready(
          await api.widget.calendar.findAllEvents(
            {
              ...many,
              year: now.getUTCFullYear(),
              month: now.getUTCMonth() + 1,
              releaseType,
              showUnmonitored: flag(options, "showUnmonitored"),
            },
            requestOptions,
          ),
        );
      }
      case "mediaMissing":
        return ready(
          await api.widget.mediaOrganizer.getData(
            { ...many, pageSize: publishedMediaPage("mediaMissing", options).displaySize },
            requestOptions,
          ),
        );
      case "mediaTranscoding":
        return ready(
          await api.widget.mediaTranscoding.getDataAsync(
            { ...one, page: 1, pageSize: publishedMediaPage("mediaTranscoding", options).displaySize },
            requestOptions,
          ),
        );
      case "indexerManager":
        return ready(await api.widget.indexerManager.getIndexersStatus(many, requestOptions));
      case "networkControllerSummary":
      case "networkControllerStatus":
        return ready(await api.widget.networkController.summary(many, requestOptions));
      case "notifications":
        return ready(await api.widget.notifications.getNotifications(many, requestOptions));
      case "coolify":
        return ready(await api.widget.coolify.getInstancesInfo(many, requestOptions));
      case "paperlessNgx":
        return ready(await api.widget.paperlessNgx.getStats(one, requestOptions));
      case "patchmon":
        return ready(await api.widget.patchmon.getStats(one, requestOptions));
      case "bazarr":
        return ready(await api.widget.bazarr.getBadges(one, requestOptions));
      case "archiveTeamWarrior":
        return ready(await api.widget.archiveTeamWarrior.getStatus(one, requestOptions));
      case "tracearr":
        return ready(await api.widget.tracearr.getDashboard(many, requestOptions));
      case "speedtestTracker":
        return ready(await api.widget.speedtestTracker.getDashboard(many, requestOptions));
      case "uptimeKuma":
        return ready(await api.widget.uptimeKuma.getDashboard(many, requestOptions));
      case "audioStats":
        return ready(await api.widget.audioStats.getStats(one, requestOptions));
      case "vpn":
        return ready(await api.widget.vpn.getSummaries(many, requestOptions));
      case "ups":
        return ready(await api.widget.ups.getSummaries(many, requestOptions));
      case "traefik":
        return ready(await api.widget.traefik.getDashboard(many, requestOptions));
      case "wud":
        return ready(await api.widget.wud.getStats(one, requestOptions));
      case "llamacpp":
        return ready(await api.widget.llamacpp.getStats(one, requestOptions));
      case "beszelSystemTable":
      case "beszelSystemGrid": {
        const result = await api.widget.beszel.getSystems(many, requestOptions);
        const status = text(options, "statusFilter", "all");
        return ready(
          result.map((entry) => ({
            ...entry,
            systems: entry.systems.filter((system) => status === "all" || system.status === status),
          })),
        );
      }
      case "beszelAlerts":
        return ready(
          await api.widget.beszel.getAlerts(
            {
              ...many,
              includeHistory: flag(options, "showHistory", true),
              maxHistoryItems: number(options, "maxHistoryItems", 10, 1, 100),
            },
            requestOptions,
          ),
        );
      case "beszelSystemStats": {
        const results = await api.widget.beszel.getSystems(many, requestOptions);
        const choices = results.flatMap((entry) =>
          entry.systems.map((system) => ({ integrationId: entry.integrationId, systemId: system.id })),
        );
        const read = createPublishedBeszelRead({ options, integrationIds });
        const selected = read.selectSystem(choices);
        if (!selected) return notConfigured("The selected system is not in this widget's saved integrations.");
        const includeDocker = read.includeDocker;
        const timePeriod = pick(read.timePeriod, ["1m", "1h", "12h", "24h", "1w", "30d"], "1h");
        const result = await api.widget.beszel.getSystemStats(
          { integrationIds: [selected.integrationId], systemId: selected.systemId, timePeriod, includeDocker },
          requestOptions,
        );
        if (!includeDocker) result.containerStats = [];
        return ready({ ...result, systemId: selected.systemId });
      }
      case "immich-serverStats":
        return ready(await api.widget.immich.getServerStats(one, requestOptions));
      case "immich-albumCarousel": {
        const savedAlbum = publishedAlbumSelection(options);
        let albumId: string | undefined;
        if (typeof savedAlbum === "string") albumId = savedAlbum.slice(0, 8_192);
        return ready(await api.widget.immich.getAlbum({ ...one, albumId }, requestOptions));
      }
      case "healthMonitoring":
      case "systemResources":
      case "systemDisks": {
        const definitions = await api.integration.byIds(integrationIds, requestOptions);
        const scoped = definitions.filter((entry) => integrationIds.includes(entry.id));
        const systemKinds = ["truenas", "synology", "unraid", "glances", "openmediavault", "dashDot", "mock"];
        const systemIds = scoped.filter((entry) => systemKinds.includes(entry.kind)).map((entry) => entry.id);
        const systems = systemIds.length
          ? await api.widget.healthMonitoring.getSystemHealthStatus({ integrationIds: systemIds }, requestOptions)
          : [];
        const visible = strings(options.visibleStorageVolumes);
        for (const entry of systems) {
          if (!entry.healthInfo || !visible.length) continue;
          const matches = (device: string) =>
            visible.some((value) => value === device || value === `${entry.integrationId}:${device}`);
          entry.healthInfo.fileSystem = entry.healthInfo.fileSystem.filter((volume) => matches(volume.deviceName));
          entry.healthInfo.smart = entry.healthInfo.smart.filter((volume) => matches(volume.deviceName));
        }
        const clusters: unknown[] = [];
        if (kind === "healthMonitoring")
          for (const entry of scoped) {
            if (entry.kind === "proxmox" || entry.kind === "mock")
              clusters.push(
                await api.widget.healthMonitoring.getClusterHealthStatus({ integrationId: entry.id }, requestOptions),
              );
          }
        return ready({ systems, clusters });
      }
      case "firewall":
        return ready({
          cpu: await api.widget.firewall.getFirewallCpuStatus(many, requestOptions),
          memory: await api.widget.firewall.getFirewallMemoryStatus(many, requestOptions),
          version: await api.widget.firewall.getFirewallVersionStatus(many, requestOptions),
          interfaces: await api.widget.firewall.getFirewallInterfacesStatus(many, requestOptions),
        });
      case "stats": {
        const entries = Array.isArray(options.entries)
          ? options.entries
              .filter(isRecord)
              .filter(
                (entry) =>
                  entry.hidden !== true &&
                  typeof entry.integrationId === "string" &&
                  integrationIds.includes(entry.integrationId) &&
                  typeof entry.metric === "string",
              )
          : [];
        const snapshots = new Map<string, Awaited<ReturnType<ORPCClient["widget"]["stats"]["displaySnapshot"]>>>();
        for (const entry of entries) {
          const id = String(entry.integrationId);
          if (!snapshots.has(id))
            snapshots.set(id, await api.widget.stats.displaySnapshot({ integrationId: id }, requestOptions));
        }
        return ready({
          entries: entries.map((entry) => ({
            id: entry.id,
            label: entry.label,
            metric: entry.metric,
            value: snapshots.get(String(entry.integrationId))?.values[String(entry.metric)] ?? null,
            updatedAt: snapshots.get(String(entry.integrationId))?.updatedAt,
          })),
          cacheOnly: false,
        });
      }
      case "umami": {
        const websiteId = text(options, "websiteId");
        if (!websiteId) return notConfigured("A saved website selection is required.");
        const input = { ...many, ...one, websiteId, timeFrame: text(options, "timeFrame", "24h") };
        const limit = number(options, "topCount", 5, 1, 500);
        const view = text(options, "viewMode", "chart");
        if (view === "topPages") return ready(await api.widget.umami.getTopPages({ ...input, limit }, requestOptions));
        if (view === "topReferrers")
          return ready(await api.widget.umami.getTopReferrers({ ...input, limit }, requestOptions));
        if (view === "events")
          return ready(
            await api.widget.umami.getMultiEventTimeSeries(
              { ...input, eventNames: strings(options.eventNames).toSorted() },
              requestOptions,
            ),
          );
        return ready(
          await api.widget.umami.getVisitorStats(
            { ...input, eventName: text(options, "eventName") || undefined },
            requestOptions,
          ),
        );
      }
      case "wazuhAgents":
        return ready(await api.widget.wazuh.getAgents(one, requestOptions));
      case "wazuhAlerts":
        return ready(
          await api.widget.wazuh.getAlerts(
            {
              ...one,
              minLevel: number(options, "minLevel", 7, 0, 16),
              limit: number(options, "limit", 20, 1, 100),
              hours: number(options, "hours", 24, 1, 720),
            },
            requestOptions,
          ),
        );
      case "wazuhSummary":
        return ready(
          await api.widget.wazuh.getSummary(
            { ...one, range: pick(options.range, ["1h", "24h", "7d", "30d"], "24h") },
            requestOptions,
          ),
        );
      case "wazuhTimeline":
        return ready(
          await api.widget.wazuh.getTimeline(
            {
              ...one,
              range: pick(options.range, ["1h", "24h", "7d", "30d"], "24h"),
              interval: pick(
                options.interval,
                ["auto", "1m", "5m", "15m", "30m", "1h", "3h", "6h", "12h", "1d"],
                "auto",
              ),
              minLevel: number(options, "minLevel", 0, 0, 16),
            },
            requestOptions,
          ),
        );
      case "wazuhTopList":
        return ready(
          await api.widget.wazuh.getTopList(
            {
              ...one,
              range: pick(options.range, ["1h", "24h", "7d", "30d"], "24h"),
              kind: pick(options.kind, ["rules", "agents", "sourceIps", "mitreTactics", "mitreTechniques"], "rules"),
              limit: number(options, "limit", 8, 1, 50),
              minLevel: number(options, "minLevel", 0, 0, 16),
            },
            requestOptions,
          ),
        );
      case "wazuhVulnerabilities":
        return ready(
          await api.widget.wazuh.getVulnerabilities(
            {
              ...one,
              cveLimit: number(options, "cveLimit", 8, 1, 50),
              agentLimit: number(options, "agentLimit", 5, 1, 50),
              cveOrder: pick(options.cveOrder, ["score", "agents"], "score"),
              minSeverity: pick(options.minSeverity, ["all", "medium", "high", "critical"], "all"),
            },
            requestOptions,
          ),
        );
      case "wazuhFim":
        return ready(
          await api.widget.wazuh.getFim(
            {
              ...one,
              range: pick(options.range, ["1h", "24h", "7d", "30d"], "24h"),
              event: pick(options.event, ["all", "added", "modified", "deleted"], "all"),
              limit: number(options, "limit", 20, 1, 100),
              includeRegistry: flag(options, "includeRegistry", true),
            },
            requestOptions,
          ),
        );
      case "wazuhAuthFailures":
        return ready(
          await api.widget.wazuh.getAuthFailures(
            { ...one, hours: number(options, "hours", 24, 1, 168), limit: number(options, "limit", 6, 1, 25) },
            requestOptions,
          ),
        );
      default:
        return unsupported("No reviewed read-only display projection exists for this widget kind.");
    }
  } catch {
    return { status: "unavailable", reason: "Widget data is temporarily unavailable." };
  }
}
