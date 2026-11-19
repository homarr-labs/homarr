import { dehydrate, QueryClient } from "@tanstack/query-core";

import { intersectFederationPermissions } from "@homarr/auth/server";
import { inArray } from "@homarr/db";
import { integrations } from "@homarr/db/schema";

import { createBoardQuerySnapshot } from "./board-query-snapshot";
import { createBoardWidgetPrefetch } from "./board-widget-prefetch";
import type { BoardWidgetPrefetchApi, BoardWidgetPrefetchBoard, BoardWidgetPrefetchRpc } from "./board-widget-prefetch";
import { createApiCaller } from "./procedure";
import type { ApiContext } from "./procedure";
import { dockerRouter } from "./router/docker/docker-router";
import { integrationRouter } from "./router/integration/integration-router";
import { widgetRouter } from "./router/widgets";

const createPrefetchClients = (context: ApiContext) => {
  const caller = createApiCaller(
    { widget: widgetRouter, integration: integrationRouter, docker: dockerRouter },
    context,
  );
  const invoke = async (path: string[], input: unknown) => {
    let procedure: unknown = caller;
    for (const segment of path) procedure = (procedure as Record<string, unknown>)[segment];
    return await (procedure as (input: unknown) => Promise<unknown>)(input);
  };
  const proxy = (path: string[] = []): unknown =>
    new Proxy(() => undefined, {
      get(_target, property) {
        if (property === "query") return (input?: unknown) => invoke(path, input);
        if (property === "queryOptions") {
          return (input?: unknown) => ({
            queryKey: [path, { input, type: "query" }],
            queryFn: () => invoke(path, input),
          });
        }
        if (typeof property === "string" && property !== "then") return proxy([...path, property]);
        return undefined;
      },
    });
  return { api: proxy() as BoardWidgetPrefetchApi, rpc: proxy() as BoardWidgetPrefetchRpc };
};

// The caller supplies a board loaded and authorized by the board router. Cache
// contents and refresh inputs always come from this server-owned definition.
export const getBoardWidgetQuerySnapshot = async (
  context: ApiContext,
  board: BoardWidgetPrefetchBoard,
  layoutId: string,
) => {
  const ids = [...new Set(board.items.flatMap((item) => item.integrationIds))];
  const rows = await context.db.query.integrations.findMany({
    columns: { id: true },
    where: inArray(integrations.id, ids),
    with: { origin: { with: { connection: true } } },
  });
  // Board view grants native integration reads. A source worker's current
  // ceiling still applies when serving a previously cached result.
  const allowedIntegrations = rows.filter(
    ({ origin }) =>
      intersectFederationPermissions({ hasUseAccess: true, hasInteractAccess: true, hasFullAccess: true }, origin, true)
        .hasUseAccess,
  );
  const snapshot = createBoardQuerySnapshot(board, allowedIntegrations);
  const queryClient = new QueryClient({ defaultOptions: { queries: { gcTime: Infinity, retry: false } } });
  await snapshot.restoreAsync(queryClient).catch(() => undefined);
  const restoredHashes = new Set(
    queryClient
      .getQueryCache()
      .getAll()
      .filter((query) => query.meta?.rscWidgetPrefetch === true && query.state.status === "success")
      .map((query) => query.queryHash),
  );
  const clients = createPrefetchClients(context);
  const dependentQueries = createBoardWidgetPrefetch(clients.api, clients.rpc).prefetchInitialWidgetData(
    queryClient,
    board,
    layoutId,
    Boolean(context.session),
  );
  const refreshingQueries = queryClient
    .getQueryCache()
    .getAll()
    .flatMap((query) => {
      if (query.meta?.rscWidgetPrefetch !== true || !query.promise) return [];
      return [{ queryHash: query.queryHash, promise: query.promise }];
    });

  // Refreshes seed the next navigation without delaying this response. Only
  // completed data crosses RPC; pending query promises cannot be serialized.
  void Promise.allSettled([...refreshingQueries.map(({ promise }) => promise), ...dependentQueries])
    .then(async () => {
      const lateQueries = queryClient
        .getQueryCache()
        .getAll()
        .flatMap((query) => {
          if (query.meta?.rscWidgetPrefetch !== true || !query.promise) return [];
          return [query.promise];
        });
      await Promise.allSettled(lateQueries);
      await snapshot.saveAsync(queryClient);
    })
    .catch(() => undefined)
    .finally(() => queryClient.clear());

  return {
    state: dehydrate(queryClient, {
      shouldDehydrateMutation: () => false,
      shouldDehydrateQuery: (query) => query.meta?.rscWidgetPrefetch === true && query.state.status === "success",
    }),
    refreshQueryHashes: refreshingQueries
      .filter(({ queryHash }) => restoredHashes.has(queryHash))
      .map(({ queryHash }) => queryHash),
  };
};
