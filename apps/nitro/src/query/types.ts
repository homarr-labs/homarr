import type { AnyNestedClient } from "@orpc/client";
import type { RouterUtils } from "@orpc/tanstack-query";
import type { QueryClient } from "@tanstack/react-query";

import type { ExpansionApiAssemblyClient } from "@homarr/api/nitro/assembly/client";

export type ExpansionQueryUtils = RouterUtils<ExpansionApiAssemblyClient>;

export type ExpansionQueryRuntime = "browser" | "server";

export type ExpansionQueryCacheIdentity = Readonly<{
  cacheLifetimeId: string;
  clientCacheId: string;
  principalCacheId: string;
  permissionRevision: string;
  boardCacheId: string;
  boardRevision: string;
}>;

export type ExpansionQueryScopeState = "active" | "retiring" | "retired";

export type QueryScope<TClient extends AnyNestedClient> = Readonly<{
  identity: ExpansionQueryCacheIdentity;
  runtime: ExpansionQueryRuntime;
  queryClient: QueryClient;
  orpc: RouterUtils<TClient>;
  state: ExpansionQueryScopeState;
  isCurrent: () => boolean;
  assertCurrent: () => void;
  invalidate: () => Promise<void>;
  retire: () => Promise<void>;
}>;

export type QueryScopeOwner<TClient extends AnyNestedClient> = Readonly<{
  queryClient: QueryClient;
  runtime: ExpansionQueryRuntime;
  acquire: (client: TClient, identity: ExpansionQueryCacheIdentity) => QueryScope<TClient>;
}>;

export type ExpansionQueryScope = QueryScope<ExpansionApiAssemblyClient>;

export type ExpansionQueryScopeOwner = QueryScopeOwner<ExpansionApiAssemblyClient>;

export type ExpansionQueryRouterContext = Readonly<{
  queryClient: QueryClient;
  orpc: ExpansionQueryUtils;
  queryScope: ExpansionQueryScope;
}>;
