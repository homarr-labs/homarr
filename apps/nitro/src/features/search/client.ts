import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import type { RouterClient } from "@orpc/server";

import type { createAppProcedures } from "../../../../../packages/api/src/nitro/routers/app";
import type { createBangsSearchProcedures } from "../../../../../packages/api/src/nitro/routers/bangs-search";
import type { NativeIntegrationProcedures } from "./native-types";
import type { createSearchEngineProcedures } from "../../../../../packages/api/src/nitro/routers/search-engine";

export type SearchRpcClient = RouterClient<{
  app: ReturnType<typeof createAppProcedures>;
  bangs: ReturnType<typeof createBangsSearchProcedures>;
  integration: NativeIntegrationProcedures;
  searchEngine: ReturnType<typeof createSearchEngineProcedures>;
}>;

export type SearchEngine = Awaited<ReturnType<SearchRpcClient["searchEngine"]["catalog"]>>[number];
export type SearchEngineDetail = Awaited<ReturnType<SearchRpcClient["searchEngine"]["byId"]>>;
export type SearchEngineValues = Parameters<SearchRpcClient["searchEngine"]["create"]>[0];
export type MediaResult = Awaited<ReturnType<SearchRpcClient["integration"]["searchMediaRequests"]>>[number];

export function createSearchRpcClient(endpoint: URL): SearchRpcClient {
  if (endpoint.origin !== window.location.origin || endpoint.username || endpoint.password || endpoint.hash)
    throw new Error("Search RPC requires a credential-free same-origin endpoint without a fragment");
  return createORPCClient(
    new RPCLink({
      url: `/${endpoint.pathname.slice(1)}${endpoint.search}`,
      origin: endpoint.origin,
      fetch: (request, init) => fetch(request, { ...init, credentials: "same-origin" }),
    }),
  );
}
