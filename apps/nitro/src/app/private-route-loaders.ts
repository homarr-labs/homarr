import { createRouteQueryLoader } from "../navigation/query-loader";
import type { AuthenticatedReadQueryScope } from "../query/authenticated-read";

export function privateGroupListQueryOptions(scope: AuthenticatedReadQueryScope) {
  scope.assertCurrent();
  return scope.orpc.group.getAll.queryOptions({ input: undefined });
}

export function privateGroupDetailQueryOptions(scope: AuthenticatedReadQueryScope, id: string) {
  scope.assertCurrent();
  return scope.orpc.group.getById.queryOptions({ input: { id } });
}

export function privateApiKeysQueryOptions(scope: AuthenticatedReadQueryScope) {
  scope.assertCurrent();
  return scope.orpc.apiKeys.getAll.queryOptions({ input: undefined });
}

export async function loadPrivateGroupList(scope: AuthenticatedReadQueryScope, signal: AbortSignal): Promise<void> {
  scope.assertCurrent();
  await createRouteQueryLoader(scope.queryClient).loadFiniteQuery(
    privateGroupListQueryOptions(scope),
    { freshness: "fetch" },
    signal,
  );
  scope.assertCurrent();
}

export async function loadPrivateGroupDetail(
  scope: AuthenticatedReadQueryScope,
  id: string,
  signal: AbortSignal,
): Promise<void> {
  scope.assertCurrent();
  await createRouteQueryLoader(scope.queryClient).loadFiniteQuery(
    privateGroupDetailQueryOptions(scope, id),
    { freshness: "fetch" },
    signal,
  );
  scope.assertCurrent();
}

export async function loadPrivateApiKeys(scope: AuthenticatedReadQueryScope, signal: AbortSignal): Promise<void> {
  scope.assertCurrent();
  await createRouteQueryLoader(scope.queryClient).loadFiniteQuery(
    privateApiKeysQueryOptions(scope),
    { freshness: "fetch" },
    signal,
  );
  scope.assertCurrent();
}
