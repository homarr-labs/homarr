import { dehydrate } from "@tanstack/react-query";
import type { QueryClient } from "@tanstack/react-query";

import { trpc } from "@homarr/api/server";
import { Stopwatch } from "@homarr/common";
import { createLogger } from "@homarr/core/infrastructure/logs";
import { prefetchInitialWidgetData } from "@homarr/widgets/server-prefetch";

import type { Board } from "~/app/[locale]/boards/_types";

const logger = createLogger({ module: "boardPreparation", scope: "capture" });
const queryBudgetMs = 30_000;

const settleQueriesAsync = async (client: QueryClient, dependentQueries: Promise<void>[]) => {
  await Promise.allSettled(dependentQueries);
  // Discovery can register another query. Read again after each settled group.
  while (true) {
    const pending = client
      .getQueryCache()
      .getAll()
      .flatMap((query) => {
        if (query.state.fetchStatus !== "fetching" || !query.promise) return [];
        return [query.promise];
      });
    if (pending.length === 0) return;
    await Promise.allSettled(pending);
  }
};

/**
 * Waits for every initial Widget query, within a budget, so the captured
 * document renders Widget content instead of streaming it after hydration.
 */
export const settleCapturedQueriesAsync = async (
  queryClient: QueryClient,
  { board, layoutId, isAuthenticated }: { board: Board; layoutId: string; isAuthenticated: boolean },
) => {
  const stopwatch = new Stopwatch();
  // These two consumers suspend instead of rendering an empty query state.
  for (const item of board.items) {
    const integrationId = item.integrationIds[0];
    if (!integrationId) continue;
    if (item.kind === "wud") void queryClient.prefetchQuery(trpc.widget.wud.getStats.queryOptions({ integrationId }));
    if (item.kind === "archiveTeamWarrior") {
      void queryClient.prefetchQuery(trpc.widget.archiveTeamWarrior.getStatus.queryOptions({ integrationId }));
    }
  }
  const dependent = prefetchInitialWidgetData(queryClient, board, layoutId, isAuthenticated);
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timedOut = await Promise.race([
    settleQueriesAsync(queryClient, dependent).then(() => false),
    new Promise<boolean>((resolve) => {
      timer = setTimeout(() => resolve(true), queryBudgetMs);
    }),
  ]);
  clearTimeout(timer);
  // Cancellation reverts a slow query to its last cached value and original age.
  if (timedOut) await queryClient.cancelQueries({ fetchStatus: "fetching" });

  const queries = dehydrate(queryClient, {
    shouldDehydrateMutation: () => false,
    shouldDehydrateQuery: (query) => query.state.data !== undefined && query.state.fetchStatus !== "fetching",
  });
  // A failed refresh with retained data is still useful presentation data.
  // Never serialize a rejected promise or an upstream error into the document.
  for (const query of queries.queries) {
    query.state = { ...query.state, status: "success", fetchStatus: "idle", error: null, fetchFailureReason: null };
  }
  const queryCount = queryClient.getQueryCache().getAll().length;
  logger.info("Board view queries captured", {
    boardId: board.id,
    durationMs: Math.round(stopwatch.getElapsedInMilliseconds()),
    queryCount,
    capturedQueryCount: queries.queries.length,
    queryTimedOut: timedOut,
  });
  return queries;
};
