"use client";

import { useCallback, useMemo } from "react";
import { ActionIcon, Center, Menu, ScrollArea, Select, SimpleGrid, Stack, Text } from "@mantine/core";
import { IconPlugConnectedX, IconServer, IconQuestionMark } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { useScopedI18n } from "@homarr/translation/client";

import classes from "./component.module.css";

import type { WidgetComponentProps } from "../definition";
import { containerColors } from "../beszel/_shared/colors";
import {
  BeszelAreaChart,
  ChartPanel,
  useContainerNames,
  useDockerChartData,
  useSystemChartData,
} from "../beszel/_shared/chart";
import {
  chartAxisFormatters,
  formatByteRate,
  formatGB,
  formatPercent,
  formatStorageBytes,
} from "../beszel/_shared/format";
import { makeTooltipProps } from "../beszel/_shared/tooltip";
import { useLiveStats } from "../beszel/_shared/use-live-stats";

const tooltipPercent = makeTooltipProps(formatPercent);
const tooltipGB = makeTooltipProps(formatGB, true);
const tooltipRate = makeTooltipProps(formatByteRate, true);
const tooltipPercentTotal = makeTooltipProps(formatPercent, true);
const tooltipBytesTotal = makeTooltipProps(formatStorageBytes, true);

const CHART_HEIGHT = 180;

export default function BeszelSystemStatsWidget({
  options,
  integrationIds,
  isEditMode,
  width,
  setOptions,
}: WidgetComponentProps<"beszelSystemStats">) {
  const t = useScopedI18n("widget.beszelSystemStats");
  const { data: systemsResult = [], isPending: systemsPending } = clientApi.widget.beszel.getSystems.useQuery(
    { integrationIds },
    { staleTime: 30 * 1000 },
  );

  const systems = useMemo(
    () => systemsResult.flatMap((r) => r.systems.map((s) => ({ value: s.id, label: s.name }))),
    [systemsResult],
  );

  const selectedSystem = options.systemId || systems[0]?.value || "";
  const selectedLabel = systems.find((s) => s.value === selectedSystem)?.label;
  const systemExists = systems.some((s) => s.value === selectedSystem);
  const systemReady = !systemsPending && (selectedSystem === "" || systemExists);

  const handleSelectSystem = useCallback(
    (value: string) => setOptions({ newOptions: { systemId: value } }),
    [setOptions],
  );

  const showDocker = options.showDockerCpu || options.showDockerMemory || options.showDockerNetwork;
  const isLive = options.timePeriod === "1m";

  const { data: statsResult } = clientApi.widget.beszel.getSystemStats.useQuery(
    {
      integrationIds,
      systemId: selectedSystem,
      timePeriod: options.timePeriod as "1m" | "1h" | "12h" | "24h" | "1w" | "30d",
      includeDocker: showDocker,
    },
    { staleTime: 30 * 1000, enabled: !isLive && systemReady && selectedSystem !== "" },
  );

  const { data: liveData, error: liveError } = useLiveStats(integrationIds, selectedSystem, isLive && systemReady);

  const activeStats = isLive ? liveData : statsResult;

  const cpuMap = useCallback((s: { cpu: number }) => ({ [t("chart.cpu.series")]: s.cpu }), [t]);
  const memoryMap = useCallback(
    (s: { mu: number; mb: number }) => ({
      [t("chart.memory.series")]: s.mu,
      [t("chart.memory.cache")]: s.mb ?? 0,
    }),
    [t],
  );
  const diskMap = useCallback((s: { du: number }) => ({ [t("chart.disk.series")]: s.du }), [t]);
  const diskIOMap = useCallback(
    (s: { dr?: number; dw?: number }) => ({
      [t("chart.diskIO.read")]: (s.dr ?? 0) * (1024 * 1024),
      [t("chart.diskIO.write")]: (s.dw ?? 0) * (1024 * 1024),
    }),
    [t],
  );
  const networkMap = useCallback(
    (s: { ns: number; nr: number; b?: [number, number] }) => ({
      [t("chart.network.sent")]: s.b?.[0] ?? s.ns,
      [t("chart.network.recv")]: s.b?.[1] ?? s.nr,
    }),
    [t],
  );

  const cpuData = useSystemChartData(activeStats?.systemStats, cpuMap, isLive);
  const memoryData = useSystemChartData(activeStats?.systemStats, memoryMap, isLive);
  const diskData = useSystemChartData(activeStats?.systemStats, diskMap, isLive);
  const diskIOData = useSystemChartData(activeStats?.systemStats, diskIOMap, isLive);
  const networkData = useSystemChartData(activeStats?.systemStats, networkMap, isLive);

  const containerNames = useContainerNames(activeStats?.containerStats);
  const dockerCpuData = useDockerChartData(activeStats?.containerStats, containerNames, "cpu", isLive);
  const dockerMemData = useDockerChartData(activeStats?.containerStats, containerNames, "memory", isLive);
  const dockerNetData = useDockerChartData(activeStats?.containerStats, containerNames, "network", isLive);

  const containerSeries = containerNames.map((name, i) => ({
    name,
    color: containerColors[i % containerColors.length] as string,
  }));

  const cols = width > 600 ? 2 : 1;

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
            {t("error.internalServerError")}
          </Text>
        </Stack>
      </Center>
    );
  }

  return (
    <ScrollArea
      h="100%"
      className={classes.beszelStatsWrapper}
      style={{ pointerEvents: isEditMode ? "none" : undefined }}
    >
      <Stack gap="md" p="sm">
        {!isEditMode && systems.length > 1 && (
          <Menu
            trigger="click-hover"
            openDelay={100}
            closeDelay={300}
            position="bottom-start"
            withArrow
            shadow="md"
            withinPortal
          >
            <Menu.Target>
              <ActionIcon
                variant="subtle"
                size="sm"
                className={classes.beszelStatsSystemToggle}
                style={{ position: "absolute", top: 6, left: 6, zIndex: 1 }}
                title={selectedLabel}
              >
                <IconServer size={14} />
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
              {systems.map((s) => (
                <Menu.Item
                  key={s.value}
                  fz="xs"
                  fw={s.value === selectedSystem ? 600 : 400}
                  c={s.value === selectedSystem ? undefined : "dimmed"}
                  onClick={() => handleSelectSystem(s.value)}
                >
                  {s.label}
                </Menu.Item>
              ))}
            </Menu.Dropdown>
          </Menu>
        )}

        {activeStats && (
          <SimpleGrid cols={cols} spacing="md">
            {options.showCpu && cpuData.length > 0 && (
              <ChartPanel title={t("chart.cpu.title")} subtitle={t("chart.cpu.subtitle")}>
                <BeszelAreaChart
                  h={CHART_HEIGHT}
                  data={cpuData}
                  series={[{ name: t("chart.cpu.series"), color: "teal.6" }]}
                  yAxisFormatter={chartAxisFormatters.percent}
                  yAxisDomain={[0, "auto"]}
                  tooltipProps={tooltipPercent}
                />
              </ChartPanel>
            )}

            {options.showMemory && memoryData.length > 0 && (
              <ChartPanel title={t("chart.memory.title")} subtitle={t("chart.memory.subtitle")}>
                <BeszelAreaChart
                  h={CHART_HEIGHT}
                  data={memoryData}
                  type="stacked"
                  series={[
                    { name: t("chart.memory.series"), color: "teal.5" },
                    { name: t("chart.memory.cache"), color: "teal.8" },
                  ]}
                  yAxisFormatter={chartAxisFormatters.gb}
                  tooltipProps={tooltipGB}
                />
              </ChartPanel>
            )}

            {options.showDisk && diskData.length > 0 && (
              <ChartPanel title={t("chart.disk.title")} subtitle={t("chart.disk.subtitle")}>
                <BeszelAreaChart
                  h={CHART_HEIGHT}
                  data={diskData}
                  series={[{ name: t("chart.disk.series"), color: "grape.6" }]}
                  yAxisFormatter={chartAxisFormatters.gb}
                  tooltipProps={tooltipGB}
                />
              </ChartPanel>
            )}

            {options.showDiskIO && diskIOData.length > 0 && (
              <ChartPanel title={t("chart.diskIO.title")} subtitle={t("chart.diskIO.subtitle")}>
                <BeszelAreaChart
                  h={CHART_HEIGHT}
                  data={diskIOData}
                  series={[
                    { name: t("chart.diskIO.write"), color: "orange.6" },
                    { name: t("chart.diskIO.read"), color: "blue.6" },
                  ]}
                  yAxisFormatter={chartAxisFormatters.rate}
                  tooltipProps={tooltipRate}
                />
              </ChartPanel>
            )}

            {options.showNetwork && networkData.length > 0 && (
              <ChartPanel title={t("chart.network.title")} subtitle={t("chart.network.subtitle")}>
                <BeszelAreaChart
                  h={CHART_HEIGHT}
                  data={networkData}
                  series={[
                    { name: t("chart.network.sent"), color: "blue.6" },
                    { name: t("chart.network.recv"), color: "teal.6" },
                  ]}
                  yAxisFormatter={chartAxisFormatters.rate}
                  tooltipProps={tooltipRate}
                />
              </ChartPanel>
            )}

            {showDocker && containerSeries.length > 0 && (
              <>
                {options.showDockerCpu && dockerCpuData.length > 0 && (
                  <ChartPanel title={t("chart.dockerCpu.title")} subtitle={t("chart.dockerCpu.subtitle")}>
                    <BeszelAreaChart
                      h={CHART_HEIGHT}
                      data={dockerCpuData}
                      type="stacked"
                      series={containerSeries}
                      yAxisFormatter={chartAxisFormatters.percent}
                      tooltipProps={tooltipPercentTotal}
                    />
                  </ChartPanel>
                )}

                {options.showDockerMemory && dockerMemData.length > 0 && (
                  <ChartPanel title={t("chart.dockerMemory.title")} subtitle={t("chart.dockerMemory.subtitle")}>
                    <BeszelAreaChart
                      h={CHART_HEIGHT}
                      data={dockerMemData}
                      type="stacked"
                      series={containerSeries}
                      yAxisFormatter={chartAxisFormatters.bytes}
                      tooltipProps={tooltipBytesTotal}
                    />
                  </ChartPanel>
                )}

                {options.showDockerNetwork && dockerNetData.length > 0 && (
                  <ChartPanel title={t("chart.dockerNetwork.title")} subtitle={t("chart.dockerNetwork.subtitle")}>
                    <BeszelAreaChart
                      h={CHART_HEIGHT}
                      data={dockerNetData}
                      series={containerSeries}
                      yAxisFormatter={chartAxisFormatters.rate}
                      tooltipProps={tooltipRate}
                    />
                  </ChartPanel>
                )}
              </>
            )}
          </SimpleGrid>
        )}
      </Stack>
    </ScrollArea>
  );
}
