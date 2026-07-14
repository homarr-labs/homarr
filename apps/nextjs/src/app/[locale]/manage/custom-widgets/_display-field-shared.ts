export const listItemDefaults = {
  mapping: { label: "", jsonPath: "$", unit: "" },
  column: { header: "", jsonPath: "$" },
  statGridItem: { label: "", jsonPath: "$", unit: "", color: "blue" },
  progressBar: { label: "", valuePath: "$", maxPath: "", unit: "", color: "blue" },
  statusItem: { label: "", jsonPath: "$", goodValues: "online,true" },
  countGridItem: { label: "", jsonPath: "$", unit: "" },
} as const;

export function cloneLast<T extends Record<string, unknown>>(items: T[], fallback: T): T {
  return { ...(items.at(-1) ?? fallback) };
}

export const MANTINE_COLORS = [
  "blue",
  "teal",
  "green",
  "red",
  "orange",
  "yellow",
  "violet",
  "pink",
  "cyan",
  "grape",
  "indigo",
  "lime",
] as const;
export const REQUEST_MANIFEST_STARTER = `[
  {
    "id": "details",
    "kind": "query",
    "method": "GET",
    "pathTemplate": "/api/details/{id}",
    "parameters": { "id": "string" },
    "auth": "inherit",
    "minimumBoardPermission": "view",
    "cacheTtlSeconds": 30
  }
]`;
