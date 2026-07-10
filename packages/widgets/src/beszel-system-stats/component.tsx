"use client";

import { useCallback, useMemo } from "react";
import { Button, Box, Center, Loader, Menu, ScrollArea, Select, SimpleGrid, Stack, Text } from "@mantine/core";
import { IconPlugConnectedX, IconServer, IconQuestionMark, IconServerOff } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { useSession } from "@homarr/auth/client";
import { constructBoardPermissions } from "@homarr/auth/shared";
import { useOptionalBoard } from "@homarr/boards/context";
import type { BeszelContainerStatsRecord, BeszelSystemStatsRecord } from "@homarr/integrations/types";
import { useScopedI18n } from "@homarr/translation/client";

import classes from "./component.module.css";

import type { WidgetComponentProps } from "../definition";
import { containerColors } from "../beszel/_shared/colors";
import type { BeszelTimePeriod } from "../beszel/_shared/chart";
import {
  BeszelChartPanel,
  CPU_Y_AXIS_DOMAIN,
  useContainerNames,
  useDockerChartData,
  useEfsChartData,
  useSystemChartData,
} from "../beszel/_shared/chart";
import {
  chartAxisFormatters,
  formatByteRate,
  formatGB,
  formatPercent,
  formatStorageBytes,
} from "../beszel/_shared/format";
import { BeszelIntegrationErrorIndicator } from "../beszel/_shared/error-indicator";
import { makeTooltipProps } from "../beszel/_shared/tooltip";
import { useLiveStats } from "../beszel/_shared/use-live-stats";

const tooltipPercent = makeTooltipProps(formatPercent);
const tooltipGB = makeTooltipProps(formatGB, true);
const tooltipRate = makeTooltipProps(formatByteRate, true);
const tooltipPercentTotal = makeTooltipProps(formatPercent, true);
const tooltipBytesTotal = makeTooltipProps(formatStorageBytes, true);

const CHART_HEIGHT = 180;
const MB = 1024 * 1024;
const gridColumns = [1, 2] as const;

function statsWhenShown<T>(show: boolean | undefined, data: T | undefined): T | undefined {
  if (!show || !data) return undefined;
  return data;
}

export default function BeszelSystemStatsWidget({
  options,
  integrationIds,
  isEditMode,
  width,
  boardId,
  itemId,
  setOptions,
}: WidgetComponentProps<"beszelSystemStats">) {
  const t = useScopedI18n("widget.beszelSystemStats");
  const board = useOptionalBoard();
  const { data: session } = useSession();
  const hasChangeAccess = board ? constructBoardPermissions(board, session).hasChangeAccess : false;
  const { mutate: saveItemOptions } = clientApi.widget.options.saveItemOptions.useMutation();
  const {
    data: systemsResult = [],
    isPending: systemsPending,
    error: systemsError,
  } = clientApi.widget.beszel.getSystems.useQuery({ integrationIds });

  const systems = useMemo(
    () => systemsResult.flatMap((r) => r.systems.map((s) => ({ value: s.id, label: s.name }))),
    [systemsResult],
  );

  const selectedSystem = options.systemId || systems[0]?.value || "";
  const selectedLabel = systems.find((s) => s.value === selectedSystem)?.label;
  const systemExists = systems.some((s) => s.value === selectedSystem);
  const systemReady = !systemsPending && (selectedSystem === "" || systemExists);

  const handleSelectSystem = useCallback(
    (value: string) => {
      setOptions({ newOptions: { systemId: value } });
      if (hasChangeAccess && boardId && itemId) {
        saveItemOptions({ boardId, itemId, newOptions: { systemId: value } });
      }
    },
    [setOptions, hasChangeAccess, boardId, itemId, saveItemOptions],
  );

  const showDocker = options.showDockerCpu || options.showDockerMemory || options.showDockerNetwork;
  const isLive = options.timePeriod === "1m";

  const { data: statsResult, error: statsError } = clientApi.widget.beszel.getSystemStats.useQuery(
    {
      integrationIds,
      systemId: selectedSystem,
      timePeriod: options.timePeriod as "1m" | "1h" | "12h" | "24h" | "1w" | "30d",
      includeDocker: showDocker,
    },
    {
      refetchInterval: isLive ? false : 5_000,
      enabled: !isLive && systemReady && selectedSystem !== "",
    },
  );

  const { data: liveData, error: liveError } = useLiveStats(integrationIds, selectedSystem, isLive && systemReady);

  let activeStats:
    | { systemStats: BeszelSystemStatsRecord[]; containerStats: BeszelContainerStatsRecord[]; error?: string }
    | null
    | undefined = statsResult;
  if (isLive) {
    activeStats = liveData;
  }

  const mappers = useMemo(
    () => ({
      cpu: (s: { cpu: number }) => ({ [t("chart.cpu.series")]: s.cpu }),
      memory: (s: { mu: number; mb: number }) => ({
        [t("chart.memory.series")]: s.mu,
        [t("chart.memory.cache")]: s.mb ?? 0,
      }),
      disk: (s: { du: number }) => ({ [t("chart.disk.series")]: s.du }),
      diskIO: (s: { dr?: number; dw?: number }) => ({
        [t("chart.diskIO.read")]: (s.dr ?? 0) * MB,
        [t("chart.diskIO.write")]: (s.dw ?? 0) * MB,
      }),
      network: (s: { ns: number; nr: number; b?: [number, number] }) => ({
        [t("chart.network.sent")]: s.b?.[0] ?? s.ns,
        [t("chart.network.recv")]: s.b?.[1] ?? s.nr,
      }),
    }),
    [t],
  );

  const series = useMemo(
    () => ({
      cpu: [{ name: t("chart.cpu.series"), color: "teal.6" }],
      memory: [
        { name: t("chart.memory.series"), color: "teal.5" },
        { name: t("chart.memory.cache"), color: "teal.8" },
      ],
      disk: [{ name: t("chart.disk.series"), color: "grape.6" }],
      diskIO: [
        { name: t("chart.diskIO.write"), color: "orange.6" },
        { name: t("chart.diskIO.read"), color: "blue.6" },
      ],
      network: [
        { name: t("chart.network.sent"), color: "blue.6" },
        { name: t("chart.network.recv"), color: "teal.6" },
      ],
    }),
    [t],
  );

  const systemStats = activeStats?.systemStats;
  const containerStatsRaw = activeStats?.containerStats;

  const timePeriod = options.timePeriod as BeszelTimePeriod;
  const cpuData = useSystemChartData(statsWhenShown(options.showCpu, systemStats), mappers.cpu, timePeriod);
  const memoryData = useSystemChartData(statsWhenShown(options.showMemory, systemStats), mappers.memory, timePeriod);
  const diskData = useSystemChartData(statsWhenShown(options.showDisk, systemStats), mappers.disk, timePeriod);
  const diskIOData = useSystemChartData(statsWhenShown(options.showDiskIO, systemStats), mappers.diskIO, timePeriod);
  const networkData = useSystemChartData(statsWhenShown(options.showNetwork, systemStats), mappers.network, timePeriod);

  const containerNames = useContainerNames(statsWhenShown(showDocker, containerStatsRaw));
  const dockerCpuData = useDockerChartData(
    statsWhenShown(options.showDockerCpu, containerStatsRaw),
    containerNames,
    "cpu",
    timePeriod,
  );
  const dockerMemData = useDockerChartData(
    statsWhenShown(options.showDockerMemory, containerStatsRaw),
    containerNames,
    "memory",
    timePeriod,
  );
  const dockerNetData = useDockerChartData(
    statsWhenShown(options.showDockerNetwork, containerStatsRaw),
    containerNames,
    "network",
    timePeriod,
  );

  const efsPaths = useMemo(() => {
    if (!systemStats) return [];
    const paths = new Set<string>();
    for (const record of systemStats) {
      if (record.stats.efs) {
        for (const path of Object.keys(record.stats.efs)) {
          paths.add(path);
        }
      }
    }
    return [...paths];
  }, [systemStats]);

  const storageData = useEfsChartData(statsWhenShown(options.showStorage, systemStats), efsPaths, timePeriod);

  const containerSeries = useMemo(
    () => containerNames.map((name, i) => ({ name, color: containerColors[i % containerColors.length] as string })),
    [containerNames],
  );

  const storageSeries = useMemo(
    () => efsPaths.map((path, i) => ({ name: path, color: containerColors[i % containerColors.length] as string })),
    [efsPaths],
  );

  const cols = gridColumns[Number(width > 600)];

  if (systemsError) throw systemsError;
  if (!isLive && statsError) throw statsError;

  if (systemsPending) {
    return (
      <Center h="100%">
        <Loader size="sm" />
      </Center>
    );
  }

  if (systems.length === 0) {
    return (
      <Box h="100%" pos="relative">
        <BeszelIntegrationErrorIndicator results={systemsResult} />
        <Center h="100%">
          <Stack align="center" gap="xs">
            <IconServerOff size={28} opacity={0.5} />
            <Text size="sm" c="dimmed">
              {t("empty.noSystems")}
            </Text>
          </Stack>
        </Center>
      </Box>
    );
  }

  if (!systemsPending && !systemExists && systems.length > 0) {
    return (
      <Center h="100%">
        <Stack align="center" gap="sm" p="md">
          <IconQuestionMark size={40} />
          <Text size="sm" c="dimmed" ta="center">
            {t("error.systemNotFound")}
          </Text>
          <Select
            size="xs"
            data={systems}
            value={selectedSystem}
            placeholder={t("selectSystem")}
            onChange={(value) => value && handleSelectSystem(value)}
          />
        </Stack>
      </Center>
    );
  }

  if (isLive && liveError && !liveData) {
    return (
      <Center h="100%">
        <Stack align="center" gap="sm" p="md">
          <IconPlugConnectedX size={40} />
          <Text size="sm" c="dimmed" ta="center">
            {t("error.liveConnectionFailed")}
          </Text>
          <Button size="xs" variant="light" onClick={() => setOptions({ newOptions: { timePeriod: "1h" } })}>
            {t("error.switchToHistorical")}
          </Button>
        </Stack>
      </Center>
    );
  }

  return (
    <Box h="100%" pos="relative">
      <Box pos="absolute" top={4} right={8} style={{ zIndex: 1 }}>
        <BeszelIntegrationErrorIndicator results={systemsResult} />
      </Box>
      <ScrollArea
        h="100%"
        className={classes.beszelStatsContainer}
        style={{ pointerEvents: (isEditMode && "none") || undefined }}
      >
        <Stack gap="md" p="sm">
          {!isEditMode && systems.length > 1 && (
            <Menu position="bottom-start" withArrow shadow="md" withinPortal>
              <Menu.Target>
                <Button
                  variant="default"
                  size="compact-xs"
                  leftSection={<IconServer size={14} />}
                  className={classes.beszelStatsSystemToggle}
                >
                  {selectedLabel}
                </Button>
              </Menu.Target>
              <Menu.Dropdown>
                {systems.map((s) => (
                  <Menu.Item
                    key={s.value}
                    fz="xs"
                    fw={s.value === selectedSystem ? 600 : 400}
                    c={s.value !== selectedSystem ? "dimmed" : undefined}
                    onClick={() => handleSelectSystem(s.value)}
                  >
                    {s.label}
                  </Menu.Item>
                ))}
              </Menu.Dropdown>
            </Menu>
          )}

          {!isLive && !activeStats && systemReady && selectedSystem !== "" && (
            <Center h={CHART_HEIGHT}>
              <Loader size="sm" />
            </Center>
          )}

          {!isLive && activeStats && "error" in activeStats && activeStats.error && (
            <Center h={CHART_HEIGHT}>
              <Stack align="center" gap="xs">
                <IconServerOff size={24} opacity={0.5} />
                <Text size="sm" c="dimmed">
                  {activeStats.error}
                </Text>
              </Stack>
            </Center>
          )}

          {activeStats && (!("error" in activeStats) || !activeStats.error) && (
            <SimpleGrid cols={cols} spacing="md">
              {options.showCpu && cpuData.length > 0 && (
                <BeszelChartPanel
                  title={t("chart.cpu.title")}
                  subtitle={t("chart.cpu.subtitle")}
                  chartProps={{
                    h: CHART_HEIGHT,
                    data: cpuData,
                    series: series.cpu,
                    yAxisFormatter: chartAxisFormatters.percent,
                    yAxisDomain: CPU_Y_AXIS_DOMAIN,
                    tooltipProps: tooltipPercent,
                  }}
                />
              )}

              {options.showMemory && memoryData.length > 0 && (
                <BeszelChartPanel
                  title={t("chart.memory.title")}
                  subtitle={t("chart.memory.subtitle")}
                  chartProps={{
                    h: CHART_HEIGHT,
                    data: memoryData,
                    type: "stacked",
                    series: series.memory,
                    yAxisFormatter: chartAxisFormatters.gb,
                    tooltipProps: tooltipGB,
                  }}
                />
              )}

              {options.showDisk && diskData.length > 0 && (
                <BeszelChartPanel
                  title={t("chart.disk.title")}
                  subtitle={t("chart.disk.subtitle")}
                  chartProps={{
                    h: CHART_HEIGHT,
                    data: diskData,
                    series: series.disk,
                    yAxisFormatter: chartAxisFormatters.gb,
                    tooltipProps: tooltipGB,
                  }}
                />
              )}

              {options.showDiskIO && diskIOData.length > 0 && (
                <BeszelChartPanel
                  title={t("chart.diskIO.title")}
                  subtitle={t("chart.diskIO.subtitle")}
                  chartProps={{
                    h: CHART_HEIGHT,
                    data: diskIOData,
                    series: series.diskIO,
                    yAxisFormatter: chartAxisFormatters.rate,
                    tooltipProps: tooltipRate,
                  }}
                />
              )}

              {options.showNetwork && networkData.length > 0 && (
                <BeszelChartPanel
                  title={t("chart.network.title")}
                  subtitle={t("chart.network.subtitle")}
                  chartProps={{
                    h: CHART_HEIGHT,
                    data: networkData,
                    series: series.network,
                    yAxisFormatter: chartAxisFormatters.rate,
                    tooltipProps: tooltipRate,
                  }}
                />
              )}

              {options.showStorage && storageData.length > 0 && storageSeries.length > 0 && (
                <BeszelChartPanel
                  title={t("chart.storage.title")}
                  subtitle={t("chart.storage.subtitle")}
                  chartProps={{
                    h: CHART_HEIGHT,
                    data: storageData,
                    type: "stacked",
                    series: storageSeries,
                    yAxisFormatter: chartAxisFormatters.bytes,
                    tooltipProps: tooltipBytesTotal,
                  }}
                />
              )}

              {showDocker && containerSeries.length > 0 && (
                <>
                  {options.showDockerCpu && dockerCpuData.length > 0 && (
                    <BeszelChartPanel
                      title={t("chart.dockerCpu.title")}
                      subtitle={t("chart.dockerCpu.subtitle")}
                      chartProps={{
                        h: CHART_HEIGHT,
                        data: dockerCpuData,
                        type: "stacked",
                        series: containerSeries,
                        yAxisFormatter: chartAxisFormatters.percent,
                        tooltipProps: tooltipPercentTotal,
                      }}
                    />
                  )}

                  {options.showDockerMemory && dockerMemData.length > 0 && (
                    <BeszelChartPanel
                      title={t("chart.dockerMemory.title")}
                      subtitle={t("chart.dockerMemory.subtitle")}
                      chartProps={{
                        h: CHART_HEIGHT,
                        data: dockerMemData,
                        type: "stacked",
                        series: containerSeries,
                        yAxisFormatter: chartAxisFormatters.bytes,
                        tooltipProps: tooltipBytesTotal,
                      }}
                    />
                  )}

                  {options.showDockerNetwork && dockerNetData.length > 0 && (
                    <BeszelChartPanel
                      title={t("chart.dockerNetwork.title")}
                      subtitle={t("chart.dockerNetwork.subtitle")}
                      chartProps={{
                        h: CHART_HEIGHT,
                        data: dockerNetData,
                        series: containerSeries,
                        yAxisFormatter: chartAxisFormatters.rate,
                        tooltipProps: tooltipRate,
                      }}
                    />
                  )}
                </>
              )}
            </SimpleGrid>
          )}
        </Stack>
      </ScrollArea>
    </Box>
  );
}
