"use client";

import { useState } from "react";
import { ActionIcon, Badge, Box, Group, SegmentedControl, Select, SimpleGrid, Stack, Text } from "@mantine/core";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";

import type { ClusterHealthMonitoring, Resource } from "@homarr/integrations/types";
import { useByteFormatter } from "@homarr/settings";
import { useI18n } from "@homarr/translation/client";
import { zoomCompensatedSize } from "@homarr/ui";

import { MonitoringComparisonChart } from "../../common/monitoring-comparison-chart";
import { monitoringChartColors } from "../../common/monitoring-chart-colors";
import type { WidgetComponentProps } from "../../definition";
import { percentage } from "../display";
import { useHealthBounds } from "../use-health-bounds";
import { resourcePercentage } from "./resource-data";
import { ResourceDialog, ResourceTable } from "./resource-table";

type AdvancedView = "overview" | "workloads" | "storage";
interface ClusterAdvancedProps {
  data: ClusterHealthMonitoring;
  width: number;
  height: number;
  refreshFailed?: boolean;
  widgetProps: WidgetComponentProps<"healthMonitoring"> & { integrationId: string; integrationName?: string };
}

export function ClusterAdvanced({ data, width, height, widgetProps, refreshFailed }: ClusterAdvancedProps) {
  const t = useI18n("widget.healthMonitoring.rework");
  const [view, setView] = useState<AdvancedView>("overview");
  const body = useHealthBounds();
  const views = [
    { value: "overview", label: t("resourceOverview") },
    { value: "workloads", label: t("clusterWorkloads") },
    { value: "storage", label: t("storage") },
  ];
  const contentWidth = body.width || Math.max(100, width - 24);
  const contentHeight = body.height || Math.max(50, height - 90);
  return (
    <Stack p={12} gap={10} h="100%" miw={0} mih={0} style={{ overflow: "hidden" }}>
      <Group gap="sm" justify="space-between" wrap="nowrap" pe={30} style={{ flexShrink: 0 }}>
        <Text size="sm" fw={650} truncate>
          {widgetProps.integrationName ?? "Proxmox"}
        </Text>
        <Badge size="sm" variant="light" color="gray" c="var(--mantine-color-text)">
          {t("clusterActive", { active: data.nodes.filter((node) => node.isRunning).length, total: data.nodes.length })}
        </Badge>
      </Group>
      {refreshFailed && (
        <Text
          component="output"
          size="xs"
          c="var(--health-warning)"
          lineClamp={1}
          aria-live="polite"
          title={t("refreshFailed")}
          style={{ flexShrink: 0 }}
        >
          {t("refreshFailed")}
        </Text>
      )}
      <SegmentedControl
        size="xs"
        value={view}
        data={views}
        fullWidth
        onChange={(value) => setView(value as AdvancedView)}
        aria-label={t("advancedViews")}
        transitionDuration={0}
        style={{ flexShrink: 0 }}
      />
      <Box ref={body.ref} flex={1} miw={0} mih={0} style={{ overflow: "hidden" }}>
        {view === "overview" && (
          <ClusterOverview
            data={data}
            width={contentWidth}
            height={contentHeight}
            isEditMode={widgetProps.isEditMode}
          />
        )}
        {view === "workloads" && (
          <ClusterWorkloads data={data} width={contentWidth} height={contentHeight} widgetProps={widgetProps} />
        )}
        {view === "storage" && (
          <Stack gap={8} h="100%" miw={0} mih={0}>
            <Group gap="xs" justify="space-between" wrap="nowrap" style={{ flexShrink: 0 }}>
              <Text size="xs" c="dimmed" truncate>
                {t("clusterStorageRisk")}
              </Text>
              <Text size="xs" c="dimmed">
                {t("clusterActive", {
                  active: data.storages.filter((storage) => storage.isRunning).length,
                  total: data.storages.length,
                })}
              </Text>
            </Group>
            <Box flex={1} miw={0} mih={0} style={{ overflow: "hidden" }}>
              <ResourceTable
                type="storage"
                data={data.storages}
                order="storage-risk"
                widgetProps={{
                  ...widgetProps,
                  width: contentWidth,
                  height: Math.max(40, contentHeight - 26),
                  displayScale: 1,
                }}
              />
            </Box>
          </Stack>
        )}
      </Box>
    </Stack>
  );
}

function ClusterOverview({
  data,
  width,
  height,
  isEditMode,
}: {
  data: ClusterHealthMonitoring;
  width: number;
  height: number;
  isEditMode: boolean;
}) {
  const t = useI18n("widget.healthMonitoring.rework");
  const tc = useI18n("widget.healthMonitoring.cluster");
  const { formatBytesPair } = useByteFormatter();
  const [page, setPage] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const chart = useHealthBounds();
  const online = data.nodes.filter((node) => node.isRunning);
  const offline = data.nodes.length - online.length;
  const workloads = [...data.vms, ...data.lxcs];
  const running = workloads.filter((workload) => workload.isRunning).length;
  const cores = online.reduce((sum, node) => sum + node.cpu.cores, 0);
  const usedCores = online.reduce((sum, node) => sum + node.cpu.cores * node.cpu.utilization, 0);
  const totalMemory = online.reduce((sum, node) => sum + node.memory.total, 0);
  const usedMemory = online.reduce((sum, node) => sum + node.memory.used, 0);
  let cpu: number | null = null;
  let memoryValue = "—";
  let memoryContext = t("unknown");
  if (cores > 0 && Number.isFinite(cores) && Number.isFinite(usedCores)) cpu = (usedCores / cores) * 100;
  if (totalMemory > 0 && Number.isFinite(totalMemory) && Number.isFinite(usedMemory)) {
    const bytes = formatBytesPair(usedMemory, totalMemory);
    memoryValue = bytes.used;
    memoryContext = bytes.total;
  }
  let nodeContext = t("healthy");
  let nodeContextColor = "dimmed";
  if (data.nodes.length === 0) nodeContext = t("unknown");
  if (offline > 0) {
    nodeContext = t("clusterOfflineNodes", { count: offline });
    nodeContextColor = "var(--health-warning)";
  }
  let cpuContext = t("unknown");
  if (cpu !== null) cpuContext = t("clusterCores", { count: cores });
  let columns = 4;
  if (width < 600 && height >= 400) columns = 2;
  const compact = height < 250;
  const chartHeight = Math.max(1, Math.floor(chart.height || height - 180));
  let capacity = Math.max(1, Math.floor((chartHeight - 50) / 56));
  if (chartHeight < 140) capacity = Math.max(1, Math.floor(chartHeight / 38));
  const pages = Math.max(1, Math.ceil(data.nodes.length / capacity));
  const currentPage = Math.min(page, pages - 1);
  const visible = data.nodes.slice(currentPage * capacity, (currentPage + 1) * capacity);
  const selected = data.nodes.find((node) => node.id === selectedId);
  const chartData = visible.map((node) => {
    let name = node.name;
    if (!node.isRunning) name += " · " + node.status;
    return { name, cpu: resourcePercentage(node, "cpu"), memory: resourcePercentage(node, "memory") };
  });
  let labelWidth = 120;
  let labelMaxLength = 22;
  if (width < 500) labelMaxLength = 13;
  if (width < 500) labelWidth = 84;
  return (
    <Stack gap={8} h="100%" miw={0} mih={0} style={{ overflow: "hidden" }}>
      <SimpleGrid cols={columns} spacing="md" verticalSpacing="sm" style={{ flexShrink: 0 }}>
        <Summary
          label={tc("resource.node.name")}
          value={online.length + " / " + data.nodes.length}
          context={nodeContext}
          contextColor={nodeContextColor}
          compact={compact}
        />
        <Summary
          label={t("clusterWorkloads")}
          value={running + " / " + workloads.length}
          context={t("clusterWorkloadCount", { active: running, total: workloads.length })}
          compact={compact}
        />
        <Summary label={t("cpu")} value={percentage(cpu)} context={cpuContext} compact={compact} />
        <Summary label={t("memoryUsed")} value={memoryValue} context={memoryContext} compact={compact} />
      </SimpleGrid>
      <Group gap={8} justify="space-between" wrap="nowrap" style={{ flexShrink: 0 }}>
        <Text size="xs" fw={600} truncate>
          {t("clusterNodeComparison")}
        </Text>
        <Group gap={4} wrap="nowrap">
          <Select
            size="xs"
            w={160}
            maw={width * 0.5}
            value={selectedId}
            placeholder={t("clusterInspectNode")}
            aria-label={t("clusterInspectNode")}
            data={data.nodes.map((node) => ({ value: node.id, label: node.name + " · " + node.status }))}
            onChange={(value) => setSelectedId(value)}
            disabled={isEditMode}
            searchable={data.nodes.length > 5}
          />
          {pages > 1 && (
            <>
              <ActionIcon
                variant="subtle"
                color="gray"
                size="sm"
                aria-label={t("resourcePrevious")}
                disabled={currentPage === 0}
                onClick={() => setPage(currentPage - 1)}
              >
                <IconChevronLeft style={zoomCompensatedSize(14)} />
              </ActionIcon>
              <ActionIcon
                variant="subtle"
                color="gray"
                size="sm"
                aria-label={t("resourceNext")}
                disabled={currentPage + 1 >= pages}
                onClick={() => setPage(currentPage + 1)}
              >
                <IconChevronRight style={zoomCompensatedSize(14)} />
              </ActionIcon>
            </>
          )}
        </Group>
      </Group>
      <Box ref={chart.ref} flex={1} miw={0} mih={0} style={{ overflow: "hidden" }}>
        {chartData.length > 0 && (
          <MonitoringComparisonChart
            h={chartHeight}
            data={chartData}
            series={[
              { name: "cpu", label: t("cpu"), color: monitoringChartColors.cpu },
              { name: "memory", label: t("memory"), color: monitoringChartColors.memory },
            ]}
            withBarValueLabel={width >= 600}
            labelWidth={labelWidth}
            labelMaxLength={labelMaxLength}
            disabled={isEditMode}
            onSelect={(index) => {
              const node = visible[index];
              if (node) setSelectedId(node.id);
            }}
          />
        )}
        {chartData.length === 0 && (
          <Text size="xs" c="dimmed">
            {t("noClusterResources")}
          </Text>
        )}
      </Box>
      <ResourceDialog selected={selected} onClose={() => setSelectedId(null)} />
    </Stack>
  );
}

function ClusterWorkloads({ data, width, height, widgetProps }: ClusterAdvancedProps) {
  const t = useI18n("widget.healthMonitoring.rework");
  const tc = useI18n("widget.healthMonitoring.cluster");
  const [kind, setKind] = useState("all");
  let resources: Resource[] = [...data.vms, ...data.lxcs];
  if (kind === "qemu") resources = data.vms;
  if (kind === "lxc") resources = data.lxcs;
  const choices = [
    { value: "all", label: t("clusterAllWorkloads") },
    { value: "qemu", label: tc("resource.qemu.name") },
    { value: "lxc", label: tc("resource.lxc.name") },
  ];
  return (
    <Stack gap={10} h="100%" miw={0} mih={0}>
      <Group justify="space-between" gap="sm" wrap="nowrap" style={{ flexShrink: 0 }}>
        <Select
          size="xs"
          w={200}
          maw="60%"
          value={kind}
          onChange={(value) => {
            if (value) setKind(value);
          }}
          data={choices}
          allowDeselect={false}
          aria-label={t("clusterWorkloads")}
        />
        <Text size="xs" c="dimmed">
          {t("clusterWorkloadCount", {
            active: resources.filter((resource) => resource.isRunning).length,
            total: resources.length,
          })}
        </Text>
      </Group>
      <Box flex={1} miw={0} mih={0} style={{ overflow: "hidden" }}>
        <ResourceTable
          type="qemu"
          data={resources}
          widgetProps={{ ...widgetProps, width, height: Math.max(40, height - 40), displayScale: 1 }}
        />
      </Box>
    </Stack>
  );
}

function Summary({
  label,
  value,
  context,
  contextColor = "dimmed",
  compact = false,
}: {
  label: string;
  value: string;
  context: string;
  contextColor?: string;
  compact?: boolean;
}) {
  let valueSize = "xl";
  if (compact) valueSize = "sm";
  return (
    <Stack gap={3} miw={0} title={context}>
      <Text size="xs" c={contextColor} truncate>
        {label}
      </Text>
      <Text size={valueSize} fw={650} truncate style={{ fontVariantNumeric: "tabular-nums" }}>
        {value}
      </Text>
      {!compact && (
        <Text size="xs" c={contextColor} truncate>
          {context}
        </Text>
      )}
    </Stack>
  );
}
