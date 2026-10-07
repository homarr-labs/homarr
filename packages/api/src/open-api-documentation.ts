import type { generateOpenApiDocument } from "trpc-to-openapi";

const task = (id: string, title: string, description: string) => ({ id, title, description });
export const apiTasks = [
  task(
    "dashboards",
    "Build dashboards",
    "Compose boards, widgets, sections and responsive layouts; manage board access.",
  ),
  task("apps", "Manage apps", "Create dashboard apps and update their links, icons and reachability settings."),
  task("integrations", "Connect integrations", "Discover connection types and configure saved integrations."),
  task(
    "accounts",
    "Manage accounts and access",
    "Manage users, groups, invitations, memberships, permissions and API keys.",
  ),
  task("preferences", "Update user preferences", "Patch appearance, home boards, search behavior and header layout."),
  task("settings", "Configure the instance", "Read and patch server-setting groups, including branding and defaults."),
  task("search", "Configure search", "Create search engines and update their triggers and query URLs."),
  task(
    "portability",
    "Export and import configuration",
    "Transfer boards and instance configuration with conflict handling.",
  ),
  task(
    "certificates",
    "Manage trusted certificates",
    "Inspect and install public root certificates for integration connections.",
  ),
  task("maintenance", "Inspect Homarr", "Read instance health and version information."),
  task(
    "compatibility",
    "Compatibility routes",
    "Existing preference routes remain available; use partial updates for new automation.",
  ),
];

const taskByTag: Record<string, string> = {
  boards: "dashboards",
  board: "dashboards",
  app: "apps",
  apps: "apps",
  integrations: "integrations",
  groups: "accounts",
  group: "accounts",
  users: "accounts",
  user: "accounts",
  invites: "accounts",
  invite: "accounts",
  apikeys: "accounts",
  settings: "settings",
  searchengines: "search",
  config: "portability",
  certificates: "certificates",
  info: "maintenance",
};

const preferenceAliases = new Set([
  "changeHomeBoards",
  "changeDefaultSearchEngine",
  "changeSearchPreferences",
  "changeColorScheme",
  "changeEnableRightClickOnWidgets",
  "changeHeaderPreferences",
  "changeDdgBangs",
  "changeFirstDayOfWeek",
]);

// Preserve the two operation names used by the existing public reference.
const existingOperationNames: Record<string, string> = {
  "integrationRouter-request": "integration-request",
  "integrationRouter-testConnection": "integration-testConnection",
};

function readableName(value: string) {
  const name = value.replace(/([a-z])([A-Z])/g, "$1 $2");
  return `${name.charAt(0).toUpperCase()}${name.slice(1)}`;
}

/** Task navigation is documentation metadata; native procedures own the HTTP contracts. */
export function describeApiDocument(document: ReturnType<typeof generateOpenApiDocument>) {
  for (const item of Object.values(document.paths ?? {})) {
    for (const operation of Object.values(item ?? {})) {
      if (!operation || typeof operation !== "object" || !("operationId" in operation)) continue;
      operation.operationId = existingOperationNames[operation.operationId] ?? operation.operationId;
      const tag = operation.tags?.[0];
      if (!tag) throw new Error(`Missing documentation tag for ${operation.operationId}`);
      let taskId = taskByTag[tag.replaceAll("-", "").toLowerCase()];
      const member = operation.operationId.split("-").at(-1) ?? operation.operationId;
      if (tag === "users" && ["getPreferences", "updatePreferences"].includes(member)) taskId = "preferences";
      if (tag === "users" && preferenceAliases.has(member)) {
        taskId = "compatibility";
        operation.deprecated = true;
        operation.description = `Use PATCH /api/users/preferences to update only supplied preferences. ${operation.description ?? ""}`;
      }
      const selected = apiTasks.find((entry) => entry.id === taskId);
      if (!selected) throw new Error(`Missing documentation task for ${operation.operationId} (${tag})`);
      operation.summary ??= readableName(member);
      operation.description ??= selected.description;
      Object.assign(operation, { "x-homarr-task": selected.id, "x-homarr-doc-tag": tag });
      operation.tags = [selected.title];
    }
  }
  document.tags = apiTasks.map((entry) => ({ name: entry.title, description: entry.description }));
  Object.assign(document, { "x-homarr-tasks": apiTasks });
}
