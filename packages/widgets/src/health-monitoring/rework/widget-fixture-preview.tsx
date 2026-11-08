"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Box } from "@mantine/core";
import { useElementSize, useLocalStorage } from "@mantine/hooks";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { getQueryKey } from "@trpc/react-query";

import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import { BoardPreviewProvider } from "@homarr/boards/context";
import { useSettings } from "@homarr/settings";

import type { WidgetComponentProps } from "../../definition";
import { reduceWidgetOptionsWithDefinition } from "../../manifest";
import HealthMonitoringWidget from "../component";
import { definition } from "../index";
import { HEALTH_FIXTURE_UPDATED_AT } from "./fixtures";
import type { HealthPreviewData, HealthSystemFixture } from "./types";

type WidgetOptions = WidgetComponentProps<"healthMonitoring">["options"];

export function observedHealth(system: HealthSystemFixture, reading: number) {
  const health = system.health;
  if (!health || reading === 0) return health;
  const offset = Math.sin(reading * 1.4) * 12;
  const next = { ...health, cpuUtilization: Math.max(0, Math.min(100, health.cpuUtilization + offset)) };
  const totalMemory = health.memUsedInBytes + health.memAvailableInBytes;
  if (totalMemory > 0) {
    next.memUsedInBytes = Math.max(0, Math.min(totalMemory, health.memUsedInBytes + totalMemory * offset * 0.001));
    next.memAvailableInBytes = totalMemory - next.memUsedInBytes;
  }
  if (health.network) {
    const multiplier = 1 + offset * 0.02;
    next.network = { up: health.network.up * multiplier, down: health.network.down * multiplier };
  }
  return next;
}

export function seedFixtureQueries(cache: QueryClient, data: HealthPreviewData, reading: number, startedAt: number) {
  const integrationIds = data.systems.map((system) => system.id);
  const integrations: RouterOutputs["integration"]["byIds"] = data.systems.map((system) => ({
    id: system.id,
    kind: system.kind,
  }));
  for (const system of data.systems) {
    if (system.kind === "mock")
      cache.setQueryData(
        getQueryKey(clientApi.widget.healthMonitoring.getClusterHealthStatus, { integrationId: system.id }, "query"),
        { nodes: [], vms: [], lxcs: [], storages: [] },
      );
  }
  if (data.cluster) {
    integrationIds.push("fixture-proxmox");
    integrations.push({ id: "fixture-proxmox", kind: "proxmox" });
    cache.setQueryData(
      getQueryKey(
        clientApi.widget.healthMonitoring.getClusterHealthStatus,
        { integrationId: "fixture-proxmox" },
        "query",
      ),
      data.cluster,
    );
  }
  if (data.loading) return;
  cache.setQueryData(getQueryKey(clientApi.integration.byIds, integrationIds, "query"), integrations);
  cache.setQueryData(
    getQueryKey(
      clientApi.widget.healthMonitoring.getSystemHealthStatus,
      { integrationIds: data.systems.map((system) => system.id) },
      "query",
    ),
    data.systems.map((system) => ({
      integrationId: system.id,
      integrationName: system.name,
      healthInfo: observedHealth(system, reading),
      updatedAt: new Date(startedAt - (HEALTH_FIXTURE_UPDATED_AT - system.updatedAt) + reading * 10_000),
      error: system.error,
    })),
  );
}

// The real widget consumes an isolated fixture cache. Its queries cannot contact
// configured servers, and its own history hook records each observed update.
export function useWidgetFixtureRuntime(data: HealthPreviewData) {
  const settings = useSettings();
  const [startedAt] = useState(Date.now);
  const [reading, setReading] = useState(0);
  const [cache] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { enabled: false, staleTime: Infinity, retry: false, refetchOnWindowFocus: false },
        },
      }),
  );
  // Keep the transport disconnected even if a component explicitly enables or
  // refreshes a query. Mutations cannot leave this disposable preview either.
  const [client] = useState(() => clientApi.createClient({ links: [] }));
  const defaultOptions = useMemo(
    () => reduceWidgetOptionsWithDefinition(definition, settings) as WidgetOptions,
    [settings],
  );
  const [savedOptions, setOptions] = useLocalStorage<Partial<WidgetOptions>>({
    key: "health-rework-preview-widget-options-v1",
    defaultValue: {},
  });
  const options = useMemo(() => ({ ...defaultOptions, ...savedOptions }), [defaultOptions, savedOptions]);
  const widgetStateRef = useRef<Record<string, unknown> | null>(null);
  const integrationIds = useMemo(() => {
    const ids = data.systems.map((system) => system.id);
    if (data.cluster) ids.push("fixture-proxmox");
    return ids;
  }, [data]);

  useEffect(() => {
    seedFixtureQueries(cache, data, reading, startedAt);
  }, [cache, data, reading, startedAt]);

  return {
    cache,
    client,
    options,
    integrationIds,
    widgetStateRef,
    reading,
    advanceReading: () => setReading((current) => current + 1),
    failRefresh: () => {
      const queryKey = getQueryKey(
        clientApi.widget.healthMonitoring.getSystemHealthStatus,
        { integrationIds: data.systems.map((system) => system.id) },
        "query",
      );
      cache
        .getQueryCache()
        .find({ queryKey })
        ?.setState({
          error: new Error("Simulated fixture refresh failure"),
          status: "error",
          fetchStatus: "idle",
          errorUpdatedAt: Date.now(),
        });
    },
    setOptions: ({ newOptions }: Parameters<WidgetComponentProps<"healthMonitoring">["setOptions"]>[0]) =>
      setOptions((current) => ({ ...current, ...newOptions })),
  };
}

export function WidgetFixturePreview({
  runtime,
  board,
  advanced,
}: {
  runtime: ReturnType<typeof useWidgetFixtureRuntime>;
  board: RouterOutputs["board"]["getBoardByName"];
  advanced: boolean;
}) {
  const { ref, width, height } = useElementSize<HTMLDivElement>();
  let displayMode: WidgetComponentProps<"healthMonitoring">["displayMode"] = "compact";
  if (advanced) displayMode = "advanced";
  return (
    <QueryClientProvider client={runtime.cache}>
      <clientApi.Provider client={runtime.client} queryClient={runtime.cache}>
        <BoardPreviewProvider board={board}>
          <Box ref={ref} h="100%" mih={0} data-health-integrated>
            <HealthMonitoringWidget
              integrationIds={runtime.integrationIds}
              boardId={undefined}
              itemId="health-rework-integrated"
              isEditMode={false}
              width={width}
              height={height}
              displayMode={displayMode}
              setOptions={runtime.setOptions}
              options={runtime.options}
              widgetStateRef={runtime.widgetStateRef}
            />
          </Box>
        </BoardPreviewProvider>
      </clientApi.Provider>
    </QueryClientProvider>
  );
}
