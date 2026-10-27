"use client";

import type { PropsWithChildren } from "react";
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import type { TRPCLink } from "@trpc/client";
import { observable } from "@trpc/server/observable";
import superjson from "superjson";

import type { AppRouter } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import { createHeadersCallbackForSource, getTrpcUrl } from "@homarr/api/shared";
import { DemoReadOnlyProvider } from "@homarr/widgets/demo-read-only";

import { useAdaptiveContainerPrototype } from "./adaptive-container-context";
import type { PrototypeCounts } from "./adaptive-container-context";
import {
  createPrototypeDownloads,
  createPrototypeMediaData,
  createPrototypeRequests,
  createPrototypeStatsSnapshot,
  prototypeFixtureIds,
  prototypeStatsCatalog,
} from "./prototype-fixtures";

const fixtureIds = new Set<string>([
  prototypeFixtureIds.integration,
  prototypeFixtureIds.downloadsIntegration,
  prototypeFixtureIds.requestsIntegration,
]);

function isFixtureInput(input: unknown) {
  if (!input || typeof input !== "object") return false;
  if ("integrationIds" in input && Array.isArray(input.integrationIds)) {
    return input.integrationIds.length > 0 && input.integrationIds.every((id) => fixtureIds.has(String(id)));
  }
  return "integrationId" in input && fixtureIds.has(String(input.integrationId));
}

function getFixtureData(path: string, input: unknown, counts: PrototypeCounts): unknown {
  if (!isFixtureInput(input)) return undefined;
  if (path === "widget.downloads.getJobsAndStatuses") return createPrototypeDownloads(counts.downloads);
  if (path === "widget.mediaRequests.getLatestRequests") return createPrototypeRequests(counts.requests);
  const sessions = { playing: counts.playing, paused: 0 };
  if (path === "widget.mediaServer.getCurrentStreams") return createPrototypeMediaData(sessions);
  if (path === "widget.stats.catalog") return prototypeStatsCatalog;
  if (path === "widget.stats.snapshot" || path === "widget.stats.refresh")
    return createPrototypeStatsSnapshot(sessions, Date.now());
  return undefined;
}

/** Real widgets, their queries, and their scroll areas; only service observations are mocked. */
export function PrototypeWidgetProvider({ children }: PropsWithChildren) {
  const prototype = useAdaptiveContainerPrototype();
  if (process.env.NODE_ENV === "production" || !prototype) return children;
  return <FixtureProvider counts={prototype.state.counts}>{children}</FixtureProvider>;
}

function FixtureProvider({ children, counts }: PropsWithChildren<{ counts: PrototypeCounts }>) {
  const queryClient = useQueryClient();
  const countsRef = useRef(counts);
  countsRef.current = counts;
  const [client] = useState(() => {
    const fixtureLink: TRPCLink<AppRouter> =
      () =>
      ({ op, next }) => {
        const data = getFixtureData(op.path, op.input, countsRef.current);
        if (data === undefined) return next(op);
        return observable((observer) => {
          observer.next({ result: { data } });
          observer.complete();
        });
      };
    return clientApi.createClient({
      links: [
        fixtureLink,
        httpBatchLink({
          url: getTrpcUrl(),
          transformer: superjson,
          headers: createHeadersCallbackForSource("adaptive-container-prototype"),
        }),
      ],
    });
  });

  useEffect(() => {
    for (const query of queryClient.getQueryCache().getAll()) {
      const [segments, options] = query.queryKey;
      if (!Array.isArray(segments) || !options || typeof options !== "object" || !("input" in options)) continue;
      const data = getFixtureData(segments.join("."), options.input, counts);
      if (data !== undefined) queryClient.setQueryData(query.queryKey, data);
    }
  }, [counts, queryClient]);

  return (
    <clientApi.Provider client={client} queryClient={queryClient}>
      <DemoReadOnlyProvider value={true}>{children}</DemoReadOnlyProvider>
    </clientApi.Provider>
  );
}
