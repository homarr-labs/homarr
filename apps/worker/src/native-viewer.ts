import superjson from "superjson";

import { defaultClockWeatherLocation, defaultWeatherLocation } from "@homarr/definitions";
import type { AccessPrincipal } from "@homarr/worker-access";
import { WorkerAccessError } from "@homarr/worker-access";

import type { WorkerState } from "./state";

export interface ViewerItem {
  id: string;
  boardId: string;
  kind: string;
  options: Record<string, unknown>;
  integrationIds: string[];
}
export interface ViewerBoard {
  id: string;
  name: string;
  items: ViewerItem[];
}
export interface NativeViewerCall {
  path: string;
  kind: "query" | "subscription" | "mutation";
  input: unknown;
}

const forbidden = (): never => {
  throw new WorkerAccessError("FORBIDDEN", "This request is outside the published dashboard");
};
const record = (value: unknown): Record<string, unknown> => {
  if (value && typeof value === "object" && !Array.isArray(value)) return value as Record<string, unknown>;
  return {};
};
const strings = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is string => typeof entry === "string");
};
const equal = (left: unknown, right: unknown): boolean => {
  if (Object.is(left, right)) return true;
  if (Array.isArray(left) && Array.isArray(right))
    return left.length === right.length && left.every((value, index) => equal(value, right[index]));
  if (left && right && typeof left === "object" && typeof right === "object") {
    const first = record(left);
    const second = record(right);
    return (
      Object.keys(first).length === Object.keys(second).length &&
      Object.keys(first).every((key) => equal(first[key], second[key]))
    );
  }
  return false;
};
const subset = (values: readonly string[], allowed: readonly string[]) =>
  values.every((value) => allowed.includes(value));
const credentialQuery = /(?:token|key|secret|password|auth|signature|credential|session|code)/i;
const disclosedResource = /^\/api\/(?:user-medias\/[A-Za-z0-9_-]{1,256}|federation\/media\/[A-Za-z0-9_.-]{1,8192})$/;

function publishedUrl(value: string): string {
  if (!/^https?:\/\//i.test(value)) return value;
  try {
    const url = new URL(value);
    let changed = !!url.username || !!url.password;
    url.username = "";
    url.password = "";
    for (const name of [...url.searchParams.keys()]) {
      if (credentialQuery.test(name)) {
        url.searchParams.delete(name);
        changed = true;
      }
    }
    if (/(?:token|secret|password|access.?key)=/i.test(url.hash)) {
      url.hash = "";
      changed = true;
    }
    if (changed) return url.href;
  } catch {
    return "";
  }
  return value;
}

function redactPublishedUrls(value: unknown, depth = 0): unknown {
  if (depth > 20) return null;
  if (typeof value === "string") return publishedUrl(value);
  if (Array.isArray(value)) return value.map((entry) => redactPublishedUrls(entry, depth + 1));
  if (value && typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype)
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, redactPublishedUrls(entry, depth + 1)]),
    );
  return value;
}

/** A read manifest, deliberately independent of frontend code or integration SDK method names. */
const integrationReads: Record<string, readonly string[]> = {
  "widget.anchorNotes.getNote": ["anchorNote"],
  "widget.dnsHole.summary": ["dnsHoleSummary", "dnsHoleControls"],
  "widget.smartHome.entityDetails": ["smartHome-entityState"],
  "widget.downloads.getJobsAndStatuses": ["downloads"],
  "widget.mediaServer.getCurrentStreams": ["mediaServer", "audioStats"],
  "widget.mediaRelease.getMediaReleases": ["mediaReleases"],
  "widget.mediaRequests.getStats": ["mediaRequests-requestStats"],
  "widget.mediaRequests.getLatestRequests": ["mediaRequests-requestList"],
  "widget.calendar.findAllEvents": ["calendar"],
  "widget.mediaOrganizer.getData": ["mediaMissing"],
  "widget.mediaTranscoding.getDataAsync": ["mediaTranscoding"],
  "widget.indexerManager.getIndexersStatus": ["indexerManager"],
  "widget.networkController.summary": ["networkControllerSummary", "networkControllerStatus"],
  "widget.notifications.getNotifications": ["notifications"],
  "widget.coolify.getInstancesInfo": ["coolify"],
  "widget.paperlessNgx.getStats": ["paperlessNgx"],
  "widget.patchmon.getStats": ["patchmon"],
  "widget.bazarr.getBadges": ["bazarr"],
  "widget.archiveTeamWarrior.getStatus": ["archiveTeamWarrior"],
  "widget.tracearr.getDashboard": ["tracearr"],
  "widget.speedtestTracker.getDashboard": ["speedtestTracker"],
  "widget.uptimeKuma.getDashboard": ["uptimeKuma"],
  "widget.audioStats.getStats": ["audioStats"],
  "widget.vpn.getSummaries": ["vpn"],
  "widget.ups.getSummaries": ["ups"],
  "widget.traefik.getDashboard": ["traefik"],
  "widget.wud.getStats": ["wud"],
  "widget.llamacpp.getStats": ["llamacpp"],
  "widget.beszel.getSystems": ["beszelSystemStats", "beszelSystemGrid", "beszelSystemTable"],
  "widget.beszel.getAlerts": ["beszelAlerts"],
  "widget.beszel.getSystemStats": ["beszelSystemStats", "beszelSystemGrid", "beszelSystemTable"],
  "widget.beszel.subscribeSystemStats": ["beszelSystemStats", "beszelSystemGrid", "beszelSystemTable"],
  "widget.immich.getServerStats": ["immich-serverStats"],
  "widget.immich.getAlbums": ["immich-serverStats"],
  "widget.immich.getAlbum": ["immich-albumCarousel"],
  "widget.immich.getAlbumPreview": ["immich-albumCarousel"],
  "widget.healthMonitoring.getSystemHealthStatus": ["healthMonitoring", "systemResources", "systemDisks"],
  "widget.healthMonitoring.getClusterHealthStatus": ["healthMonitoring"],
  "widget.firewall.getFirewallCpuStatus": ["firewall"],
  "widget.firewall.getFirewallMemoryStatus": ["firewall"],
  "widget.firewall.getFirewallVersionStatus": ["firewall"],
  "widget.firewall.getFirewallInterfacesStatus": ["firewall"],
  "widget.stats.catalog": ["stats"],
  "widget.stats.snapshot": ["stats"],
  "widget.stats.displaySnapshot": ["stats"],
  "widget.stats.refresh": ["stats"],
  "widget.umami.getVisitorStats": ["umami"],
  "widget.umami.getActiveVisitors": ["umami"],
  "widget.umami.getMultiEventTimeSeries": ["umami"],
  "widget.umami.getTopPages": ["umami"],
  "widget.umami.getTopReferrers": ["umami"],
  "widget.wazuh.getAgents": ["wazuhAgents"],
  "widget.wazuh.getAlerts": ["wazuhAlerts"],
  "widget.wazuh.getSummary": ["wazuhSummary"],
  "widget.wazuh.getTimeline": ["wazuhTimeline"],
  "widget.wazuh.getTopList": ["wazuhTopList"],
  "widget.wazuh.getVulnerabilities": ["wazuhVulnerabilities"],
  "widget.wazuh.getFim": ["wazuhFim"],
  "widget.wazuh.getAuthFailures": ["wazuhAuthFailures"],
  "widget.releases.getServiceVersions": ["releases"],
};

const optionFields: Record<string, Record<string, { option?: string; fallback?: unknown }>> = {
  "widget.anchorNotes.getNote": { noteId: {} },
  "widget.smartHome.entityDetails": { entityId: {} },
  "widget.downloads.getJobsAndStatuses": {
    limitPerIntegration: { fallback: 50 },
    includeArchivedHistory: { fallback: false },
    historyWindowDays: { fallback: 7 },
  },
  "widget.mediaServer.getCurrentStreams": { showOnlyPlaying: { fallback: true } },
  "widget.mediaRequests.getLatestRequests": {
    statuses: { option: "statusFilter", fallback: ["pending", "approved", "declined", "failed", "completed"] },
    recentDays: { fallback: 0 },
  },
  "widget.calendar.findAllEvents": { releaseType: { fallback: [] }, showUnmonitored: { fallback: false } },
  "widget.beszel.getAlerts": {
    includeHistory: { option: "showHistory", fallback: true },
    maxHistoryItems: { fallback: 10 },
  },
  "widget.beszel.getSystemStats": { timePeriod: { fallback: "1h" } },
  "widget.immich.getAlbumPreview": { randomizePhotos: { fallback: false } },
  "widget.umami.getVisitorStats": { websiteId: {}, timeFrame: { fallback: "24h" }, eventName: { fallback: undefined } },
  "widget.umami.getActiveVisitors": { websiteId: {} },
  "widget.umami.getMultiEventTimeSeries": {
    websiteId: {},
    timeFrame: { fallback: "24h" },
    eventNames: { fallback: [] },
  },
  "widget.umami.getTopPages": {
    websiteId: {},
    timeFrame: { fallback: "24h" },
    limit: { option: "topCount", fallback: 5 },
  },
  "widget.umami.getTopReferrers": {
    websiteId: {},
    timeFrame: { fallback: "24h" },
    limit: { option: "topCount", fallback: 5 },
  },
  "widget.wazuh.getAlerts": { minLevel: { fallback: 7 }, limit: { fallback: 20 }, hours: { fallback: 24 } },
  "widget.wazuh.getSummary": { range: { fallback: "24h" } },
  "widget.wazuh.getTimeline": { range: { fallback: "24h" }, interval: { fallback: "auto" }, minLevel: { fallback: 0 } },
  "widget.wazuh.getTopList": {
    range: { fallback: "24h" },
    kind: { fallback: "rules" },
    limit: { fallback: 8 },
    minLevel: { fallback: 0 },
  },
  "widget.wazuh.getVulnerabilities": {
    cveLimit: { fallback: 8 },
    agentLimit: { fallback: 5 },
    cveOrder: { fallback: "score" },
    minSeverity: { fallback: "all" },
  },
  "widget.wazuh.getFim": {
    range: { fallback: "24h" },
    event: { fallback: "all" },
    limit: { fallback: 20 },
    includeRegistry: { fallback: true },
  },
  "widget.wazuh.getAuthFailures": { hours: { fallback: 24 }, limit: { fallback: 6 } },
};

interface Disclosure {
  selectedSystems: Map<string, { integrationId: string; systemId: string }>;
  resources: Map<string, { boardId: string; expiresAt: number }>;
}
const disclosures = new WeakMap<WorkerState, Map<string, Disclosure>>();
const disclosureFor = (state: WorkerState, principal: AccessPrincipal) => {
  let grants = disclosures.get(state);
  if (!grants) {
    grants = new Map();
    disclosures.set(state, grants);
  }
  let value = grants.get(principal.grantId);
  if (!value) {
    value = { selectedSystems: new Map(), resources: new Map() };
    grants.set(principal.grantId, value);
  }
  // Bounded by recent active grants; revoked grants cannot use retained proof.
  if (grants.size > 256) {
    const oldest = grants.keys().next().value;
    if (oldest !== undefined) grants.delete(oldest);
  }
  return value;
};
const itemRevision = (item: ViewerItem) =>
  `${item.id}:${JSON.stringify(item.options)}:${item.integrationIds.join(",")}`;

function matchesIntegrationItem(item: ViewerItem, call: NativeViewerCall, disclosure: Disclosure) {
  const input = record(call.input);
  const requested = strings(input.integrationIds);
  if (typeof input.integrationId === "string") requested.push(input.integrationId);
  if (!requested.length || !subset(requested, item.integrationIds)) return false;
  for (const [key, constraint] of Object.entries(optionFields[call.path] ?? {})) {
    let expected = item.options[constraint.option ?? key] ?? constraint.fallback;
    if (key === "statuses" && Array.isArray(expected) && expected.length === 0) expected = constraint.fallback;
    if (key === "eventName" && expected === "") expected = undefined;
    if (key === "eventNames") {
      if (!equal(strings(input[key]).toSorted(), strings(expected).toSorted())) return false;
    } else if (!equal(input[key], expected)) return false;
  }
  if (call.path === "widget.immich.getAlbum" || call.path === "widget.immich.getAlbumPreview") {
    let album = item.options.albumId;
    if (album === "all" || album === "") album = undefined;
    if (input.albumId !== album) return false;
  }
  if (call.path === "widget.beszel.getSystemStats" || call.path === "widget.beszel.subscribeSystemStats") {
    if (requested.length !== 1 || typeof input.systemId !== "string") return false;
    if (item.kind === "beszelSystemStats") {
      const stored = item.options.systemId;
      const current = disclosure.selectedSystems.get(itemRevision(item));
      let selected = stored === `${requested[0]}:${input.systemId}`;
      if (item.integrationIds.length === 1 && stored === input.systemId) selected = true;
      if (!stored && current && current.integrationId === requested[0] && current.systemId === input.systemId)
        selected = true;
      if (!selected) return false;
      const docker = ["showDockerCpu", "showDockerMemory", "showDockerNetwork"].some(
        (key) => item.options[key] === true,
      );
      if (call.path.endsWith("getSystemStats") && input.includeDocker !== docker) return false;
    }
  }
  if (call.path.startsWith("widget.stats.")) {
    const entries = Array.isArray(item.options.entries) ? item.options.entries : [];
    if (!entries.some((entry) => record(entry).integrationId === requested[0] && record(entry).hidden !== true))
      return false;
  }
  if (
    call.path === "widget.mediaTranscoding.getDataAsync" &&
    (typeof input.pageSize !== "number" || input.pageSize < 1 || input.pageSize > 25)
  )
    return false;
  if (
    call.path === "widget.mediaOrganizer.getData" &&
    (typeof input.pageSize !== "number" || input.pageSize < 1 || input.pageSize > 50)
  )
    return false;
  return true;
}

/** Exported pure seam keeps the security boundary testable without booting integrations or a database. */
export function createNativeViewerPolicy(
  boards: readonly ViewerBoard[],
  disclosure: Disclosure = { selectedSystems: new Map(), resources: new Map() },
) {
  const items = boards.flatMap((board) => board.items);
  const revisions = new Set(items.map(itemRevision));
  for (const revision of disclosure.selectedSystems.keys()) {
    if (!revisions.has(revision)) disclosure.selectedSystems.delete(revision);
  }
  const allowedApps = items.flatMap((item) => {
    if (item.kind === "app" && typeof item.options.appId === "string") return [item.options.appId];
    if (item.kind === "bookmarks") return strings(item.options.items).filter((value) => !value.startsWith("url:"));
    return [];
  });
  const authorize = (call: NativeViewerCall) => {
    const input = record(call.input);
    // This cache refresh performs only integration reads; it cannot execute upstream mutations.
    if (call.kind === "mutation" && call.path !== "widget.stats.refresh") forbidden();
    if (call.kind === "subscription" && call.path !== "widget.beszel.subscribeSystemStats") forbidden();
    if (call.path === "board.getAllBoards" || call.path === "board.getHomeBoard") return;
    if (call.path === "board.getBoardByName") {
      const name = input.name;
      if (typeof name === "string" && boards.some((board) => board.name.toUpperCase() === name.toUpperCase())) return;
      forbidden();
    }
    if (call.path === "app.byId" || call.path === "widget.app.ping") {
      if (typeof input.id === "string" && allowedApps.includes(input.id)) return;
      forbidden();
    }
    if (call.path === "app.byIds") {
      if (Array.isArray(call.input) && subset(strings(call.input), allowedApps)) return;
      forbidden();
    }
    if (call.path === "integration.byIds") {
      if (
        Array.isArray(call.input) &&
        subset(
          strings(call.input),
          items.flatMap((item) => item.integrationIds),
        )
      )
        return;
      forbidden();
    }
    if (call.path === "federation.media") {
      if (
        typeof input.integrationId === "string" &&
        items.some((item) => item.integrationIds.includes(input.integrationId as string))
      )
        return;
      forbidden();
    }
    if (
      ["widget.customApi.getData", "widget.customApi.getShareData", "widget.customApi.queryRequest"].includes(call.path)
    ) {
      if (items.some((item) => item.kind === "customApi" && item.id === input.itemId)) return;
      forbidden();
    }
    if (
      integrationReads[call.path]?.some((kind) =>
        items.some((item) => item.kind === kind && matchesIntegrationItem(item, call, disclosure)),
      )
    )
      return;
    if (items.some((item) => matchesLocalItem(item, call))) return;
    forbidden();
  };
  return { authorize, boards, items, disclosure };
}

function matchesLocalItem(item: ViewerItem, call: NativeViewerCall) {
  const input = record(call.input);
  if (call.path === "widget.weather.atLocation" || call.path === "widget.airQuality.atLocation") {
    const kinds = ["weather", "clock", "dateTime"];
    if (call.path.includes("airQuality")) kinds.splice(0, kinds.length, "airQuality");
    if (!kinds.includes(item.kind)) return false;
    let point = record(item.options.location ?? defaultWeatherLocation);
    if (item.kind === "clock" || item.kind === "dateTime") {
      if (item.options.showWeather !== true) return false;
      point = record(item.options.weatherLocation ?? defaultClockWeatherLocation);
    }
    return input.latitude === point.latitude && input.longitude === point.longitude;
  }
  if (call.path === "widget.stockPrice.getPriceHistory" && item.kind === "stockPrice")
    return ["stock", "timeRange", "timeInterval"].every((key) => input[key] === item.options[key]);
  if (call.path === "widget.minecraft.getServerStatus" && item.kind === "minecraftServerStatus")
    return input.domain === item.options.domain && input.isBedrockServer === (item.options.isBedrockServer ?? false);
  if (call.path === "widget.rssFeed.getFeeds" && item.kind === "rssFeed")
    return (
      input.itemId === item.id &&
      equal(input.urls, redactPublishedUrls(item.options.feedUrls)) &&
      input.maximumAmountPosts === (item.options.maximumAmountPosts ?? 100) &&
      input.descriptionMaxLength === (item.options.descriptionMaxLength ?? 250)
    );
  if (call.path === "widget.timetable.getTimetable" && item.kind === "timetable")
    return (
      input.itemId === item.id &&
      (input.boardId === undefined || input.boardId === item.boardId) &&
      input.stationId === record(item.options.station).value &&
      input.baseUrl === item.options.baseUrl &&
      typeof input.limit === "number" &&
      input.limit >= 1 &&
      input.limit <= 50
    );
  if (call.path === "widget.releases.getLatest" && item.kind === "releases") {
    if (input.itemId !== item.id || !Array.isArray(input.repositories)) return false;
    const saved = Array.isArray(item.options.repositories) ? item.options.repositories : [];
    return (
      input.repositories.length <= 50 &&
      input.repositories.every((repository) =>
        saved.some((entry) =>
          ["provider", "identifier", "versionFilter", "providerUrl"].every((key) =>
            equal(redactPublishedUrls(record(entry)[key]), record(repository)[key]),
          ),
        ),
      )
    );
  }
  if (call.path === "docker.getContainers" && item.kind === "dockerContainers") {
    const endpoints = strings(item.options.endpointIds);
    return (
      endpoints.length > 0 && strings(input.endpointIds).length > 0 && subset(strings(input.endpointIds), endpoints)
    );
  }
  return false;
}

async function loadPublishedBoards(state: WorkerState, principal: AccessPrincipal): Promise<ViewerBoard[]> {
  const grant = state.access.assertActive(principal);
  if (grant.role !== "viewer") forbidden();
  if (!grant.boardIds.length) return [];
  const { db, inArray } = await import("@homarr/db");
  const { boards } = await import("@homarr/db/schema");
  const rows = await db.query.boards.findMany({
    where: inArray(boards.id, [...grant.boardIds]),
    columns: { id: true, name: true },
    with: { items: { with: { integrations: true } } },
  });
  return rows.map((board) => ({
    id: board.id,
    name: board.name,
    items: board.items.map((item) => {
      let options: Record<string, unknown> = {};
      try {
        options = record(superjson.parse(item.options));
      } catch {
        /* Invalid saved data never expands access. */
      }
      return {
        id: item.id,
        boardId: board.id,
        kind: item.kind,
        options,
        integrationIds: item.integrations.map(({ integrationId }) => integrationId),
      };
    }),
  }));
}

export async function authorizeNativeViewer(
  state: WorkerState,
  principal: AccessPrincipal,
  call: NativeViewerCall,
): Promise<void> {
  const boards = await loadPublishedBoards(state, principal);
  createNativeViewerPolicy(boards, disclosureFor(state, principal)).authorize(call);
  state.access.assertActive(principal);
}

export function projectNativeViewerValue(
  policy: ReturnType<typeof createNativeViewerPolicy>,
  call: Omit<NativeViewerCall, "kind">,
  value: unknown,
): unknown {
  const input = record(call.input);
  if (call.path === "board.getAllBoards" && Array.isArray(value))
    return redactPublishedUrls(value.filter((board) => policy.boards.some(({ id }) => id === record(board).id)));
  if (
    (call.path === "board.getBoardByName" || call.path === "board.getHomeBoard") &&
    !policy.boards.some(({ id }) => id === record(value).id)
  )
    forbidden();
  if (
    [
      "board.getBoardByName",
      "board.getHomeBoard",
      "widget.rssFeed.getFeeds",
      "app.byId",
      "app.byIds",
      "widget.app.ping",
    ].includes(call.path)
  )
    return redactPublishedUrls(value);
  if (call.path === "widget.customApi.getData") {
    const capabilities = record(value).requestCapabilities;
    return {
      ...record(value),
      requestCapabilities: (Array.isArray(capabilities) ? capabilities : []).filter(
        (entry) => record(entry).kind === "query" && record(entry).minimumBoardPermission === "view",
      ),
    };
  }
  if (call.path === "docker.getContainers") {
    const requested = strings(input.endpointIds);
    const candidates = policy.items.filter(
      (item) => item.kind === "dockerContainers" && subset(requested, strings(item.options.endpointIds)),
    );
    const result = record(value);
    const containers = Array.isArray(result.containers) ? result.containers : [];
    const endpoints = Array.isArray(result.endpoints) ? result.endpoints : [];
    return {
      ...result,
      endpoints: endpoints.filter((endpoint) => requested.includes(String(record(endpoint).id))),
      containers: containers.filter(
        (container) =>
          requested.includes(String(record(container).endpointId)) &&
          candidates.some((item) => matchesPublishedContainer(String(record(container).name), item.options)),
      ),
    };
  }
  if (call.path === "widget.healthMonitoring.getSystemHealthStatus" && Array.isArray(value)) {
    return value.map((entry) => {
      if (!record(entry).healthInfo) return entry;
      const integrationId = String(record(entry).integrationId);
      const candidates = policy.items.filter(
        (item) => integrationReads[call.path]?.includes(item.kind) && item.integrationIds.includes(integrationId),
      );
      if (candidates.some((item) => strings(item.options.visibleStorageVolumes).length === 0)) return entry;
      const selected = candidates.flatMap((item) => strings(item.options.visibleStorageVolumes));
      const healthInfo = record(record(entry).healthInfo);
      const visible = (volume: unknown) => {
        const device = String(record(volume).deviceName);
        return selected.includes(device) || selected.includes(`${integrationId}:${device}`);
      };
      return {
        ...record(entry),
        healthInfo: {
          ...healthInfo,
          fileSystem: (Array.isArray(healthInfo.fileSystem) ? healthInfo.fileSystem : []).filter(visible),
          smart: (Array.isArray(healthInfo.smart) ? healthInfo.smart : []).filter(visible),
        },
      };
    });
  }
  if (call.path === "widget.beszel.subscribeSystemStats" && record(value).type === "container_stats") {
    const candidates = policy.items.filter(
      (item) =>
        integrationReads[call.path]?.includes(item.kind) &&
        matchesIntegrationItem(item, { ...call, kind: "subscription" }, policy.disclosure),
    );
    const docker = candidates.some(
      (item) =>
        item.kind !== "beszelSystemStats" ||
        ["showDockerCpu", "showDockerMemory", "showDockerNetwork"].some((key) => item.options[key] === true),
    );
    if (!docker) return { ...record(value), record: { ...record(record(value).record), stats: [] } };
  }
  if (call.path.startsWith("widget.stats.")) {
    const metrics = new Set(
      policy.items
        .filter((item) => item.kind === "stats")
        .flatMap((item) => {
          const entries = Array.isArray(item.options.entries) ? item.options.entries : [];
          return entries
            .filter((entry) => record(entry).integrationId === input.integrationId && record(entry).hidden !== true)
            .map((entry) => record(entry).metric);
        }),
    );
    if (call.path === "widget.stats.catalog")
      return {
        ...record(value),
        metrics: (Array.isArray(record(value).metrics) ? (record(value).metrics as unknown[]) : []).filter((metric) =>
          metrics.has(record(metric).key),
        ),
      };
    return {
      ...record(value),
      values: Object.fromEntries(Object.entries(record(record(value).values)).filter(([key]) => metrics.has(key))),
    };
  }
  if (call.path === "widget.beszel.getSystems" && Array.isArray(value)) {
    const ids = strings(input.integrationIds);
    const candidates = policy.items.filter(
      (item) =>
        ["beszelSystemStats", "beszelSystemGrid", "beszelSystemTable"].includes(item.kind) &&
        subset(ids, item.integrationIds),
    );
    if (candidates.some((item) => item.kind !== "beszelSystemStats")) return value;
    const systems = value.flatMap((entry) =>
      (Array.isArray(record(entry).systems) ? (record(entry).systems as unknown[]) : []).map((system) => ({
        integrationId: String(record(entry).integrationId),
        systemId: String(record(system).id),
      })),
    );
    const selected = new Set<string>();
    for (const item of candidates) {
      const stored = item.options.systemId;
      let choice = systems.find((system) => `${system.integrationId}:${system.systemId}` === stored);
      if (!stored) choice = systems[0];
      if (!choice) {
        const legacy = systems.filter((system) => system.systemId === stored);
        if (legacy.length === 1) choice = legacy[0];
      }
      if (choice) {
        selected.add(`${choice.integrationId}:${choice.systemId}`);
        policy.disclosure.selectedSystems.set(itemRevision(item), choice);
      }
    }
    return value.map((entry) => ({
      ...record(entry),
      systems: (Array.isArray(record(entry).systems) ? (record(entry).systems as unknown[]) : []).filter((system) =>
        selected.has(`${record(entry).integrationId}:${record(system).id}`),
      ),
    }));
  }
  return value;
}

function matchesPublishedContainer(name: string, options: Record<string, unknown>) {
  const filters = strings(options.containerFilter);
  if (!filters.length) return true;
  let candidate = name;
  if (options.filterCaseSensitive !== true) candidate = candidate.toLowerCase();
  const match = filters.some((filter) => {
    let pattern = filter;
    if (options.filterCaseSensitive !== true) pattern = pattern.toLowerCase();
    if (options.filterAllowWildcards !== true || !pattern.includes("*")) return candidate === pattern;
    const parts = pattern.split("*");
    const first = parts[0] ?? "";
    if (!candidate.startsWith(first)) return false;
    let offset = first.length;
    for (const part of parts.slice(1, -1)) {
      const index = candidate.indexOf(part, offset);
      if (index === -1) return false;
      offset = index + part.length;
    }
    const last = parts.at(-1) ?? "";
    return candidate.endsWith(last) && candidate.length - last.length >= offset;
  });
  return (options.filterIsWhitelist === true) === match;
}

export async function projectNativeViewerResult(
  state: WorkerState,
  principal: AccessPrincipal,
  call: Omit<NativeViewerCall, "kind"> & { result: unknown },
): Promise<unknown> {
  if (call.result && typeof call.result === "object" && Symbol.asyncIterator in call.result) {
    const iterable = call.result as AsyncIterable<unknown>;
    return (async function* () {
      for await (const value of iterable) {
        await authorizeNativeViewer(state, principal, { ...call, kind: "subscription" });
        yield await projectNativeViewerResult(state, principal, { ...call, result: value });
      }
    })();
  }
  const boards = await loadPublishedBoards(state, principal);
  const policy = createNativeViewerPolicy(boards, disclosureFor(state, principal));
  let result = projectNativeViewerValue(policy, call, call.result);
  // Returned image-proxy IDs become signed, expiring board capabilities. A caller
  // cannot construct a new image path by guessing another cached image ID.
  const matching = boards.find((board) =>
    board.items.some(
      (item) =>
        item.id === record(call.input).itemId ||
        (integrationReads[call.path]?.includes(item.kind) &&
          matchesIntegrationItem(item, { ...call, kind: "query" }, policy.disclosure)),
    ),
  );
  const boardId = matching?.id ?? boards[0]?.id;
  if (boardId) {
    const signed = new Map<string, Promise<string>>();
    let budget = 20_000;
    const visit = async (value: unknown, currentBoardId: string, depth = 0): Promise<unknown> => {
      if (--budget < 0 || depth > 20) return value;
      if (typeof value === "string" && /^\/api\/image-proxy\/[A-Za-z0-9_-]{1,256}$/.test(value)) {
        const key = `${currentBoardId}:${value}`;
        let path = signed.get(key);
        if (!path) {
          path = import("./media").then(({ createBoardMediaPath }) =>
            createBoardMediaPath(state, principal, currentBoardId, value),
          );
          signed.set(key, path);
        }
        return path;
      }
      if (typeof value === "string" && disclosedResource.test(value))
        policy.disclosure.resources.set(value, { boardId: currentBoardId, expiresAt: Date.now() + 300_000 });
      if (Array.isArray(value)) {
        const projected: unknown[] = [];
        for (const entry of value) projected.push(await visit(entry, currentBoardId, depth + 1));
        return projected;
      }
      if (value && typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype) {
        const board = boards.find(({ id }) => id === record(value).id);
        const projected: Record<string, unknown> = {};
        for (const [key, entry] of Object.entries(value))
          projected[key] = await visit(entry, board?.id ?? currentBoardId, depth + 1);
        return projected;
      }
      return value;
    };
    result = await visit(result, boardId);
    if (policy.disclosure.resources.size > 1024) {
      const entries = [...policy.disclosure.resources.entries()].slice(-1024);
      policy.disclosure.resources = new Map(entries);
    }
  }
  state.access.assertActive(principal);
  return result;
}

export async function hasNativeViewerResourceAccess(state: WorkerState, principal: AccessPrincipal, path: string) {
  const grant = state.access.assertActive(principal);
  if (grant.role !== "viewer" || !disclosedResource.test(path)) return false;
  const proof = disclosureFor(state, principal).resources.get(path);
  return !!proof && proof.expiresAt > Date.now() && grant.boardIds.includes(proof.boardId);
}

export async function getNativeViewerBootstrap(state: WorkerState, principal: AccessPrincipal, headers: Headers) {
  const [{ createCaller, createApiContext }, { getReadSession }] = await Promise.all([
    import("@homarr/api"),
    import("./api"),
  ]);
  const session = await getReadSession(state, principal);
  const caller = createCaller(createApiContext({ headers, session }));
  const [user, settings, runtime] = await Promise.all([
    caller.frontend.userSettings({ userId: session.user.id }),
    caller.frontend.settings(),
    caller.frontend.runtime(),
  ]);
  const boards = await loadPublishedBoards(state, principal);
  const first = boards[0]?.id ?? null;
  state.access.assertActive(principal);
  const bootstrap = {
    session,
    user: { ...user, homeBoardId: first, mobileHomeBoardId: first },
    serverSettings: redactPublishedUrls({
      ...settings,
      board: { ...settings.board, homeBoardId: first, mobileHomeBoardId: first },
      search: { defaultSearchEngineId: null },
    }) as typeof settings,
    runtime: {
      ...runtime,
      authProviders: [],
      credentialsEnabled: false,
      ldapEnabled: false,
      oidcEnabled: false,
      oidcAutoLogin: false,
      logoutRedirectUrl: undefined,
      dockerEnabled: false,
      kubernetesEnabled: false,
    },
    integrationPermissions: [],
    assistantAvailability: "unauthenticated" as const,
  };
  return (await projectNativeViewerResult(state, principal, {
    path: "remote.bootstrap",
    input: undefined,
    result: bootstrap,
  })) as typeof bootstrap;
}
