import type { QueryKey } from "@tanstack/react-query";

export interface WidgetQueryPath {
  path: readonly string[];
}

export function getQueryKey(procedure: WidgetQueryPath, input?: unknown, type: "query" | "any" = "query"): QueryKey {
  if (input === undefined && type === "any") return [procedure.path];
  return [procedure.path, input === undefined ? { type } : { input, type }];
}

export function getScopedWidgetQueryKey(procedure: WidgetQueryPath, input: unknown, cacheScope: string): QueryKey {
  return [...getQueryKey(procedure, input), { cacheScope }];
}
