import type { QueryKey } from "@tanstack/react-query";

import {
  normalizeWidgetQuery,
  type WidgetQueryMatcher,
  type WidgetQueryMatcherScope,
  widgetQueryValueEquals,
} from "@homarr/widgets/definition";

export const matchesWidgetItemQuery = (
  queryKey: QueryKey,
  widgetQueryKeys: readonly QueryKey[],
  scope: WidgetQueryMatcherScope,
  queryMatcher?: WidgetQueryMatcher,
) => {
  const query = normalizeWidgetQuery(queryKey);
  if (!query || !widgetQueryKeys.some((candidate) => matchesDefinitionPath(query.path, candidate))) return false;
  if (queryMatcher) return queryMatcher(query, scope);

  return matchesQueryInput(query.input, scope);
};

const matchesDefinitionPath = (path: readonly string[], candidate: QueryKey) => {
  const candidatePath = candidate[0];
  return (
    Array.isArray(candidatePath) &&
    candidatePath.every((part, index) => typeof part === "string" && path[index] === part)
  );
};

const matchesQueryInput = (input: unknown, scope: WidgetQueryMatcherScope) => {
  if (input == null) return true;
  if (Array.isArray(input)) {
    return widgetQueryValueEquals(input, scope.integrationIds) || containsValue(scope.options, input);
  }

  if (!isRecord(input)) {
    return (
      input === scope.itemId ||
      input === scope.boardId ||
      scope.integrationIds.includes(String(input)) ||
      containsValue(scope.options, input)
    );
  }

  for (const [key, value] of Object.entries(input)) {
    if (key === "itemId") {
      if (value !== scope.itemId) return false;
      continue;
    }
    if (key === "boardId") {
      if (value !== scope.boardId) return false;
      continue;
    }
    if (key === "integrationId") {
      if (!scope.integrationIds.includes(String(value))) return false;
      continue;
    }
    if (key === "integrationIds") {
      if (!widgetQueryValueEquals(value, scope.integrationIds)) return false;
      continue;
    }

    if (isIdentityKey(key) && !matchesAnyScopedValue(value, scope)) return false;
  }

  return true;
};

const matchesAnyScopedValue = (value: unknown, scope: WidgetQueryMatcherScope) =>
  value === scope.itemId ||
  value === scope.boardId ||
  scope.integrationIds.includes(String(value)) ||
  containsValue(scope.options, value);

const isIdentityKey = (key: string) => key === "id" || key.endsWith("Id") || key.endsWith("Ids");

const containsValue = (container: unknown, expected: unknown, seen = new WeakSet<object>()): boolean => {
  if (widgetQueryValueEquals(container, expected)) return true;
  if (container === null || typeof container !== "object" || seen.has(container)) return false;
  seen.add(container);

  return Object.values(container).some((value) => containsValue(value, expected, seen));
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);
