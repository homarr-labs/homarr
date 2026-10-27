"use client";

import type { PropsWithChildren } from "react";
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import type { TRPCLink } from "@trpc/client";
import { getQueryKey } from "@trpc/react-query";
import { observable } from "@trpc/server/observable";
import superjson from "superjson";

import type { AppRouter, RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import { createHeadersCallbackForSource, getTrpcUrl } from "@homarr/api/shared";
import { useOptionalBoard } from "@homarr/boards/context";
import { DemoReadOnlyProvider } from "@homarr/widgets/demo-read-only";

import { useAdaptiveContainerPrototype } from "./adaptive-container-context";
import type { PrototypeProbe } from "./adaptive-container-context";
import {
  createPrototypeMediaData,
  createPrototypeStatsSnapshot,
  prototypeFixtureIds,
  prototypeStatsCatalog,
} from "./prototype-fixtures";

type MediaData = RouterOutputs["widget"]["mediaServer"]["getCurrentStreams"];
type StatsSnapshot = RouterOutputs["widget"]["stats"]["snapshot"];

interface ProviderProps {
  integrationId?: string;
  integrationIds?: string[];
}

interface FixtureSnapshot {
  probe: PrototypeProbe;
  observedAtMs: number;
}

function mediaData(snapshot: FixtureSnapshot, integrationIds: string[]): MediaData {
  const { probe } = snapshot;
  if (probe.status === "loading") return [];
  return integrationIds.flatMap((integrationId, index) => {
    let failed = ["error", "forbidden", "unconfigured"].includes(probe.status);
    if (probe.status === "partial" && index === integrationIds.length - 1) failed = true;
    let counts = { playing: 0, paused: 0 };
    if (index === 0 && !failed) counts = { playing: probe.playing, paused: probe.paused };
    const result = createPrototypeMediaData(counts, integrationId);
    if (failed) return result.map((entry) => ({ ...entry, error: "INTEGRATION_REQUEST_FAILED" }));
    return result;
  });
}

function statsSnapshot(snapshot: FixtureSnapshot): StatsSnapshot {
  const { probe } = snapshot;
  const result = createPrototypeStatsSnapshot(probe, snapshot.observedAtMs);
  if (probe.status === "stale") result.stale = true;
  if (["error", "partial", "forbidden", "unconfigured"].includes(probe.status)) result.error = true;
  if (["loading", "forbidden", "unconfigured"].includes(probe.status)) {
    result.values = {};
    result.updatedAt = null;
  }
  return result;
}

/** Native widgets and QueryClient stay in place; only this board's fixture transport is replaced. */
export function PrototypeWidgetProvider({ children, ...props }: PropsWithChildren<ProviderProps>) {
  const prototype = useAdaptiveContainerPrototype();
  const board = useOptionalBoard();
  if (process.env.NODE_ENV === "production" || !prototype) return children;
  let integrationIds = props.integrationIds;
  if (!integrationIds) {
    const mediaItem = board?.items.find((item) => item.id === prototype.mediaItemId);
    if (mediaItem && mediaItem.integrationIds.length > 0) integrationIds = mediaItem.integrationIds;
  }
  return (
    <FixtureProvider {...props} integrationIds={integrationIds} probe={prototype.state.probe}>
      {children}
    </FixtureProvider>
  );
}

function FixtureProvider({
  children,
  probe,
  integrationId = prototypeFixtureIds.integration,
  integrationIds,
}: PropsWithChildren<ProviderProps & { probe: PrototypeProbe }>) {
  const queryClient = useQueryClient();
  const [ids] = useState(() => integrationIds ?? [integrationId]);
  const [epoch] = useState(() => Date.now());
  const snapshot = { probe, observedAtMs: epoch + probe.observedAt * 1000 };
  const snapshotRef = useRef(snapshot);
  snapshotRef.current = snapshot;
  const [mediaInputs] = useState(() => [
    { integrationIds: ids, showOnlyPlaying: true },
    { integrationIds: ids, showOnlyPlaying: false },
  ]);
  const [client] = useState(() => {
    const fixtureIds = new Set(ids);
    const fixtureLink: TRPCLink<AppRouter> =
      () =>
      ({ op, next }) => {
        let requestedIds: string[] = [];
        if (op.input && typeof op.input === "object") {
          if ("integrationIds" in op.input && Array.isArray(op.input.integrationIds)) {
            requestedIds = op.input.integrationIds.filter((id): id is string => typeof id === "string");
          }
          if ("integrationId" in op.input && typeof op.input.integrationId === "string")
            requestedIds = [op.input.integrationId];
        }
        const fixturePath =
          op.path === "widget.mediaServer.getCurrentStreams" ||
          op.path === "widget.stats.catalog" ||
          op.path === "widget.stats.snapshot" ||
          op.path === "widget.stats.refresh";
        if (!fixturePath || requestedIds.length === 0 || !requestedIds.every((id) => fixtureIds.has(id)))
          return next(op);
        return observable((observer) => {
          let data: unknown = statsSnapshot(snapshotRef.current);
          if (op.path === "widget.stats.catalog") data = prototypeStatsCatalog;
          if (op.path === "widget.mediaServer.getCurrentStreams") data = mediaData(snapshotRef.current, requestedIds);
          observer.next({ result: { data } });
          observer.complete();
        });
      };
    for (const input of mediaInputs) {
      const queryKey = getQueryKey(clientApi.widget.mediaServer.getCurrentStreams, input, "query");
      queryClient.setQueryDefaults(queryKey, {
        staleTime: Infinity,
        refetchInterval: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        retry: false,
      });
      queryClient.setQueryData(queryKey, mediaData(snapshotRef.current, ids));
    }
    for (const id of ids) {
      queryClient.setQueryData(
        getQueryKey(clientApi.widget.stats.catalog, { integrationId: id }, "query"),
        prototypeStatsCatalog,
      );
      queryClient.setQueryData(
        getQueryKey(clientApi.widget.stats.snapshot, { integrationId: id }, "query"),
        statsSnapshot(snapshotRef.current),
      );
    }
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
    const current = snapshotRef.current;
    for (const input of mediaInputs) {
      const queryKey = getQueryKey(clientApi.widget.mediaServer.getCurrentStreams, input, "query");
      queryClient.setQueryData(queryKey, mediaData(current, ids), { updatedAt: current.observedAtMs });
      const query = queryClient.getQueryCache().find({ queryKey, exact: true });
      if (current.probe.status === "loading") {
        query?.setState({ data: undefined, error: null, status: "pending", fetchStatus: "fetching" });
      } else {
        query?.setState({ error: null, fetchStatus: "idle" });
      }
    }
    for (const id of ids) {
      queryClient.setQueryData(
        getQueryKey(clientApi.widget.stats.snapshot, { integrationId: id }, "query"),
        statsSnapshot(current),
        { updatedAt: current.observedAtMs },
      );
    }
  }, [probe, queryClient, ids, mediaInputs]);

  return (
    <clientApi.Provider client={client} queryClient={queryClient}>
      <DemoReadOnlyProvider value={true}>{children}</DemoReadOnlyProvider>
    </clientApi.Provider>
  );
}
