import type { generateOpenApiDocument } from "trpc-to-openapi";
import type { RestRoute } from "./procedure";
import { restRoutes } from "./routes";

const task = (id: string, title: string, description: string) => ({ id, title, description });
const compatibilityTask = task(
  "compatibility",
  "Compatibility routes",
  "Existing convenience routes remain available; prefer the consolidated task interfaces for new automation.",
);

export const apiTasks = [
  task(
    "dashboards",
    "Build dashboards",
    "Compose boards, layouts, sections and widgets; manage placement and board access.",
  ),
  task(
    "preferences",
    "Update user preferences",
    "Change appearance, home boards, search behavior and header layout with partial updates.",
  ),
  task("apps", "Manage apps and media", "Create apps, select icons and upload images for dashboards."),
  task(
    "integrations",
    "Connect integrations",
    "Configure connections, inspect permissions, discover capabilities and call saved integration APIs.",
  ),
  task(
    "custom-widgets",
    "Build Custom Widgets",
    "Discover authoring resources, manage definitions, validate configuration and run previews.",
  ),
  task(
    "accounts",
    "Manage accounts and access",
    "Manage users, groups, invitations, membership, passwords and API keys.",
  ),
  task(
    "settings",
    "Configure the instance",
    "Read and patch server-setting groups, including branding, defaults, culture and analytics.",
  ),
  task(
    "portability",
    "Export and import configuration",
    "Transfer boards and instance configuration with explicit conflict handling.",
  ),
  task("search", "Configure search", "Manage search engines and discover DuckDuckGo bangs."),
  task(
    "containers",
    "Manage containers and deployments",
    "Inspect Docker hosts and containers, reconcile services and control deployments.",
  ),
  task(
    "kubernetes",
    "Manage Kubernetes resources",
    "Discover contexts, namespaces, workloads, networking, storage and cluster health.",
  ),
  task(
    "media",
    "Control media and downloads",
    "Manage download jobs, requests, libraries, playback and media processing.",
  ),
  task("systems", "Monitor systems", "Inspect system health, storage, updates, power and service availability."),
  task(
    "network",
    "Manage network and security",
    "Inspect network infrastructure, DNS, firewall, VPN, proxy and security status.",
  ),
  task(
    "content",
    "Work with notes, calendars and files",
    "Read notes, calendar events, documents, feeds and notifications.",
  ),
  task(
    "discovery",
    "Discover weather, travel and markets",
    "Find locations and stations, and retrieve weather, air quality and market data.",
  ),
  task("analytics", "Read website analytics", "Discover websites and events, and query visitor and event statistics."),
  task("smart-home", "Control smart home devices", "Inspect entities and send supported smart-home commands."),
  task(
    "assistant",
    "Use the Assistant and local AI",
    "Manage conversations, models and Assistant settings, and inspect local AI runtime status.",
  ),
  task(
    "maintenance",
    "Inspect and maintain Homarr",
    "Inspect instance status and statistics, and manage scheduled jobs and updates.",
  ),
  task(
    "certificates",
    "Manage trusted certificates",
    "Inspect and install public root certificates for integration connections.",
  ),
  compatibilityTask,
];

const widgetTasks: Record<string, string> = {
  airQuality: "discovery",
  anchorNotes: "content",
  app: "apps",
  archiveTeamWarrior: "systems",
  audioStats: "systems",
  bazarr: "media",
  beszel: "systems",
  calendar: "content",
  coolify: "containers",
  customApi: "custom-widgets",
  dnsHole: "network",
  downloads: "media",
  firewall: "network",
  healthMonitoring: "systems",
  immich: "media",
  indexerManager: "media",
  llamacpp: "assistant",
  mediaOrganizer: "media",
  mediaRelease: "media",
  mediaRequests: "media",
  mediaServer: "media",
  mediaTranscoding: "media",
  minecraft: "systems",
  networkController: "network",
  notebook: "content",
  notifications: "content",
  options: "dashboards",
  paperlessNgx: "content",
  patchmon: "systems",
  releases: "systems",
  rssFeed: "content",
  secrets: "dashboards",
  smartHome: "smart-home",
  speedtestTracker: "network",
  stats: "maintenance",
  stockPrice: "discovery",
  timetable: "discovery",
  tracearr: "media",
  traefik: "network",
  umami: "analytics",
  ups: "systems",
  uptimeKuma: "systems",
  vpn: "network",
  wazuh: "network",
  weather: "discovery",
  wud: "systems",
};
const ownerTasks: Record<string, string> = {
  apiKeys: "accounts",
  app: "apps",
  assistant: "assistant",
  bangs: "search",
  board: "dashboards",
  certificates: "certificates",
  config: "portability",
  cronJobs: "maintenance",
  customWidget: "custom-widgets",
  docker: "containers",
  group: "accounts",
  home: "maintenance",
  icon: "apps",
  info: "maintenance",
  integration: "integrations",
  invite: "accounts",
  kubernetes: "kubernetes",
  location: "discovery",
  media: "apps",
  searchEngine: "search",
  section: "dashboards",
  serverSettings: "settings",
  updateChecker: "maintenance",
  user: "accounts",
  widgetCatalog: "dashboards",
};

function taskFor(name: string) {
  const [owner, member] = name.split(".");
  let id = owner && ownerTasks[owner];
  if (owner === "widget") id = member && widgetTasks[member];
  if (
    owner === "user" &&
    ["getPreferences", "updatePreferences", "completeTour", "resetTours", "getTourStatus"].includes(member ?? "")
  )
    id = "preferences";
  const selected = apiTasks.find((entry) => entry.id === id);
  if (!selected) throw new Error(`Missing documentation task for ${name}`);
  return selected;
}

/** Generate task navigation without changing the established operation-page paths. */
export function describeApiDocument(document: ReturnType<typeof generateOpenApiDocument>) {
  const routes: Record<string, RestRoute> = restRoutes;
  const names = new Map(
    Object.entries(routes).map(([name, route]) => [route.operationId ?? name.replaceAll(".", "-"), name]),
  );
  names.set("widgetCatalog-list", "widgetCatalog.list");
  names.set("widgetCatalog-getOptions", "widgetCatalog.getOptions");
  names.set("media-uploadMedia", "media.uploadMedia");
  const compatibility = new Set([
    "user.changeHomeBoards",
    "user.changeDefaultSearchEngine",
    "user.changeSearchPreferences",
    "user.changeColorScheme",
    "user.changeByteUnitSystem",
    "user.changeEnableRightClickOnWidgets",
    "user.changePingIconsEnabled",
    "user.changeHeaderPreferences",
    "user.changeDdgBangs",
    "user.changeFirstDayOfWeek",
    "serverSettings.updateBoardSettings",
  ]);
  for (const item of Object.values(document.paths ?? {})) {
    for (const value of Object.values(item ?? {})) {
      if (!value || typeof value !== "object" || !("operationId" in value)) continue;
      const operation = value as {
        operationId: string;
        tags?: string[];
        deprecated?: boolean;
        description?: string;
        summary?: string;
      };
      const name = names.get(operation.operationId);
      if (!name) throw new Error(`Missing documentation source for ${operation.operationId}`);
      let selected = taskFor(name);
      if (compatibility.has(name)) {
        selected = compatibilityTask;
        operation.deprecated = true;
        let replacement = "PATCH /api/users/preferences";
        if (name.startsWith("serverSettings.")) replacement = "PATCH /api/settings";
        const description = operation.description?.replace(/^Deprecated:[^.]+\.\s*/, "") ?? "";
        operation.description = `Deprecated: use ${replacement} to update only supplied fields. ${description}`;
      }
      if (name.startsWith("widget.")) {
        const owner = name.split(".")[1] ?? "Widget";
        const label = owner.replace(/([a-z])([A-Z])/g, "$1 $2");
        operation.summary = `${label[0]?.toUpperCase()}${label.slice(1)}: ${operation.summary ?? name}`;
      }
      operation.description ??= selected.description;
      Object.assign(operation, { "x-homarr-task": selected.id, "x-homarr-doc-tag": operation.tags?.[0] });
      operation.tags = [selected.title];
    }
  }
  document.tags = apiTasks.map((entry) => ({ name: entry.title, description: entry.description }));
  Object.assign(document, { "x-homarr-tasks": apiTasks });
}
