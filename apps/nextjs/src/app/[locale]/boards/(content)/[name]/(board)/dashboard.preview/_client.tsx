"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider, hashKey } from "@tanstack/react-query";
import { TRPCClientError } from "@trpc/client";
import type { TRPCLink } from "@trpc/client";
import { getQueryKey } from "@trpc/react-query";
import { observable } from "@trpc/server/observable";

import type { AppRouter, RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import { IntegrationProvider } from "@homarr/auth/client";
import { BoardProvider } from "@homarr/boards/context";
import { DemoReadOnlyProvider } from "@homarr/widgets/demo-read-only";
import { getHealthPreviewData } from "@homarr/widgets/health-monitoring/rework/fixtures";
import { seedFixtureQueries } from "@homarr/widgets/health-monitoring/rework/runtime";

import { ClientBoard } from "../../../_client";

type Board = RouterOutputs["board"]["getBoardByName"];

function seedDashboardReadings(cache: QueryClient, board: Board, reading: number, observedAt: number) {
  const fixtures = getHealthPreviewData("normal");
  for (const item of board.items) {
    if (item.kind !== "healthMonitoring") continue;
    const systems = item.integrationIds.flatMap((id) => fixtures.systems.filter((system) => system.id === id));
    let cluster = null;
    if (item.integrationIds.includes("fixture-proxmox")) cluster = fixtures.cluster;
    seedFixtureQueries(cache, { systems, cluster }, reading, observedAt - reading * 10_000);
  }
}

function createFixtureLink(cache: QueryClient): TRPCLink<AppRouter> {
  return () =>
    ({ op }) =>
      observable((observer) => {
        if (op.type !== "query") {
          observer.error(TRPCClientError.from(new Error("The disposable dashboard is read-only.")));
          return;
        }
        const query = cache
          .getQueryCache()
          .getAll()
          .find((entry) => {
            const path = entry.queryKey[0];
            const details = entry.queryKey[1];
            if (!Array.isArray(path) || path.join(".") !== op.path) return false;
            if (!details || typeof details !== "object" || !("input" in details)) return false;
            return hashKey([details.input]) === hashKey([op.input]);
          });
        if (query?.state.data === undefined) {
          observer.error(TRPCClientError.from(new Error(`No disposable fixture for ${op.path}.`)));
          return;
        }
        observer.next({ result: { data: query.state.data } });
        observer.complete();
      });
}

export function HealthDashboardFixtureProvider({ board, children }: { board: Board; children: ReactNode }) {
  const [startedAt] = useState(Date.now);
  const [reading, setReading] = useState(0);
  const [cache] = useState(() => {
    const next = new QueryClient({
      defaultOptions: { queries: { enabled: false, staleTime: Infinity, retry: false, refetchOnWindowFocus: false } },
    });
    next.setQueryData(getQueryKey(clientApi.board.getBoardByName, { name: board.name }, "query"), board);
    seedDashboardReadings(next, board, 0, startedAt);
    return next;
  });
  const [client] = useState(() => clientApi.createClient({ links: [createFixtureLink(cache)] }));
  const permissions = [...new Set(board.items.flatMap((item) => item.integrationIds))].map((id) => ({
    id,
    permissions: { hasUseAccess: true, hasInteractAccess: false, hasFullAccess: false },
  }));

  useEffect(() => {
    const timer = setInterval(() => setReading((current) => current + 1), 1_000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (reading === 0) return;
    // Widgets collect real observations through their normal query/render path.
    // No precomputed chart history or network integration is supplied here.
    seedDashboardReadings(cache, board, reading, Date.now());
  }, [board, cache, reading]);

  return (
    <QueryClientProvider client={cache}>
      <clientApi.Provider client={client} queryClient={cache}>
        <IntegrationProvider integrations={permissions}>
          <DemoReadOnlyProvider value>{children}</DemoReadOnlyProvider>
        </IntegrationProvider>
      </clientApi.Provider>
    </QueryClientProvider>
  );
}

export function HealthDashboardClient({
  board,
  layoutId,
  viewportWidth,
}: {
  board: Board;
  layoutId: string;
  viewportWidth: number;
}) {
  return (
    <HealthDashboardFixtureProvider board={board}>
      <BoardProvider initialBoard={board} initialLayoutId={layoutId} initialViewportWidth={viewportWidth}>
        <ClientBoard />
      </BoardProvider>
    </HealthDashboardFixtureProvider>
  );
}
