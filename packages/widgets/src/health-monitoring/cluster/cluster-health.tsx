"use client";

import { Badge, Box, Group, Progress, SegmentedControl, Select, Stack, Text } from "@mantine/core";
import { useLocalStorage } from "@mantine/hooks";

import { clientApi } from "@homarr/api/client";
import { isTrpcForbiddenError } from "@homarr/api/query-cache";
import { useSession } from "@homarr/auth/client";
import type { ClusterHealthMonitoring as ClusterData, Resource } from "@homarr/integrations/types";
import { useByteFormatter } from "@homarr/settings";
import { useI18n } from "@homarr/translation/client";

import { thresholdColor } from "../../beszel/_shared/colors";
import { formatPercent } from "../../beszel/_shared/format";
import { isInitialWidgetQueryPending } from "../../common/query-state";
import { WidgetQueryLoadingState } from "../../common/query-state-indicator";
import type { WidgetComponentProps } from "../../definition";
import { uptime } from "../display";
import { getClusterVisibleSections } from "./accordion-state";
import { ResourceTable } from "./resource-table";
import { ClusterAdvanced } from "./cluster-advanced";

type Section = Resource["type"];

export function ClusterHealthMonitoring(
  props: WidgetComponentProps<"healthMonitoring"> & { integrationId: string; integrationName?: string },
) {
  const t = useI18n("widget.healthMonitoring");
  const tr = useI18n("widget.healthMonitoring.rework");
  const { data: session } = useSession();
  const query = clientApi.widget.healthMonitoring.getClusterHealthStatus.useQuery({
    integrationId: props.integrationId,
  });
  const sections = getClusterVisibleSections(props.displayMode, props.options.visibleClusterSections);
  const [savedSection, setSection] = useLocalStorage<string>({
    key:
      "health-resource-section-" +
      (session?.user.id ?? "anonymous") +
      "-" +
      props.boardId +
      "-" +
      props.itemId +
      "-" +
      props.integrationId,
    defaultValue: "node",
  });
  let selected = sections[0];
  if (sections.some((section) => section === savedSection)) selected = savedSection as Section;
  let scale = 1;
  if (props.displayMode !== "advanced" && Number.isFinite(props.displayScale) && (props.displayScale ?? 0) > 0)
    scale = props.displayScale ?? 1;
  const width = props.width * scale;
  const height = props.height * scale;
  const showCapacity = height >= 290 && (props.displayMode === "advanced" || props.options.cpu || props.options.memory);
  const short = height < 150;
  let padding = 10;
  let gap = 8;
  if (height < 110) {
    padding = 6;
    gap = 6;
  }
  let headerHeight = 22;
  if (short) headerHeight = 0;
  const categoryHeight = 30;
  let reservedHeight = padding * 2 + headerHeight + categoryHeight + gap;
  if (!short) reservedHeight += gap;
  if (showCapacity) reservedHeight += 54;
  if (query.isError) reservedHeight += 22;
  const bodyHeight = Math.max(20, height - reservedHeight);
  if (isInitialWidgetQueryPending(query)) return <WidgetQueryLoadingState />;
  let data = query.data;
  if (isTrpcForbiddenError(query.error)) data = undefined;
  if (!data)
    return (
      <Stack gap="xs" p={padding} h="100%" justify="center">
        <Text size="sm" fw={600}>
          {props.integrationName ?? "Proxmox"}
        </Text>
        <Text component="output" size="xs" aria-live="polite">
          {tr("clusterUnavailable")}
        </Text>
      </Stack>
    );
  if (props.displayMode === "advanced")
    return (
      <ClusterAdvanced data={data} width={width} height={height} refreshFailed={query.isError} widgetProps={props} />
    );
  const records: Record<Section, Resource[]> = {
    node: data.nodes,
    qemu: data.vms,
    lxc: data.lxcs,
    storage: data.storages,
  };
  const uptimes = data.nodes
    .filter((node) => node.isRunning && Number.isFinite(node.uptime) && node.uptime >= 0)
    .map((node) => node.uptime);
  let longestUptime;
  if (uptimes.length > 0 && props.options.showUptime) longestUptime = uptime(Math.max(...uptimes), tr);
  const choices = sections.map((section) => {
    const active = records[section].filter((resource) => resource.isRunning).length;
    return {
      value: section,
      label: t(`cluster.resource.${section}.name`),
      active,
      total: records[section].length,
    };
  });
  return (
    <Stack gap={gap} p={padding} h="100%" miw={0} mih={0} style={{ overflow: "hidden" }}>
      {!short && (
        <Group justify="space-between" wrap="nowrap" gap="xs" h={headerHeight} style={{ flexShrink: 0 }}>
          <Text size="sm" fw={650} truncate>
            {props.integrationName ?? "Proxmox"}
          </Text>
          <Group gap="sm" wrap="nowrap" style={{ flexShrink: 0 }}>
            {longestUptime && (
              <Text size="xs" c="dimmed" title={tr("nodeUptime")}>
                {tr("uptime")} {longestUptime}
              </Text>
            )}
            <Text size="xs" c="dimmed">
              {tr("clusterActive", {
                active: data.nodes.filter((node) => node.isRunning).length,
                total: data.nodes.length,
              })}
            </Text>
          </Group>
        </Group>
      )}
      {query.isError && (
        <Text component="output" size="xs" aria-live="polite">
          {tr("refreshFailed")}
        </Text>
      )}
      {showCapacity && <ClusterCapacity data={data} options={props.options} advanced={false} />}
      {selected && (
        <>
          {(width < 520 || short) && (
            <Select
              size="xs"
              value={selected}
              onChange={(value) => {
                if (value) setSection(value);
              }}
              data={choices.map((choice) => ({
                value: choice.value,
                label: choice.label + " · " + choice.active + "/" + choice.total,
              }))}
              aria-label={tr("clusterResources")}
              disabled={props.isEditMode}
              allowDeselect={false}
              styles={{ root: { flexShrink: 0 } }}
            />
          )}
          {width >= 520 && !short && (
            <SegmentedControl
              fullWidth
              size="xs"
              value={selected}
              aria-label={tr("clusterResources")}
              disabled={props.isEditMode}
              onChange={setSection}
              transitionDuration={0}
              style={{ flexShrink: 0 }}
              data={choices.map((choice) => {
                let color = "gray";
                if (choice.total > 0) color = "orange";
                if (
                  choice.total > 0 &&
                  (choice.active === choice.total ||
                    (props.options.sectionIndicatorRequirement === "any" && choice.active > 0))
                )
                  color = "teal";
                return {
                  value: choice.value,
                  label: (
                    <Group gap={5} justify="center" wrap="nowrap">
                      <Text size="xs">{choice.label}</Text>
                      <Badge
                        size="xs"
                        variant="light"
                        color={color}
                        c="var(--mantine-color-text)"
                        px={4}
                        style={{ flexShrink: 0 }}
                      >
                        {choice.active}/{choice.total}
                      </Badge>
                    </Group>
                  ),
                };
              })}
            />
          )}
          <Box flex={1} mih={0} miw={0} style={{ overflow: "hidden" }}>
            <ResourceTable
              type={selected}
              data={records[selected]}
              widgetProps={{ ...props, width: width - padding * 2, height: bodyHeight, displayScale: 1 }}
            />
          </Box>
        </>
      )}
    </Stack>
  );
}

function ClusterCapacity({
  data,
  options,
  advanced,
}: {
  data: ClusterData;
  options: WidgetComponentProps<"healthMonitoring">["options"];
  advanced: boolean;
}) {
  const t = useI18n("widget.healthMonitoring.rework");
  const { formatBytesPair } = useByteFormatter();
  const online = data.nodes.filter((node) => node.isRunning);
  const cores = online.reduce((sum, node) => sum + node.cpu.cores, 0);
  const usedCores = online.reduce((sum, node) => sum + node.cpu.cores * node.cpu.utilization, 0);
  const totalMemory = online.reduce((sum, node) => sum + node.memory.total, 0);
  const usedMemory = online.reduce((sum, node) => sum + node.memory.used, 0);
  let cpu: number | null = null;
  let ram: number | null = null;
  if (cores > 0 && Number.isFinite(cores) && Number.isFinite(usedCores)) cpu = (usedCores / cores) * 100;
  if (totalMemory > 0 && Number.isFinite(totalMemory) && Number.isFinite(usedMemory))
    ram = (usedMemory / totalMemory) * 100;
  let cpuContext = t("unknown");
  let memoryContext = t("unknown");
  if (cpu !== null) cpuContext = t("clusterCores", { count: cores });
  if (ram !== null) {
    const memory = formatBytesPair(usedMemory, totalMemory);
    memoryContext = memory.used + " / " + memory.total;
  }
  return (
    <Group grow gap="lg" wrap="nowrap" align="flex-start" style={{ flexShrink: 0 }}>
      {(advanced || options.cpu) && <Capacity label={t("cpu")} value={cpu} context={cpuContext} />}
      {(advanced || options.memory) && <Capacity label={t("memory")} value={ram} context={memoryContext} />}
    </Group>
  );
}

function Capacity({ label, value, context }: { label: string; value: number | null; context: string }) {
  let formatted = "—";
  let color = "gray";
  let percentage = 0;
  if (value !== null && Number.isFinite(value)) {
    formatted = formatPercent(value);
    color = thresholdColor(value);
    percentage = Math.max(0, Math.min(100, value));
  }
  return (
    <Stack gap={3} miw={0}>
      <Group justify="space-between" gap={6} wrap="nowrap">
        <Text size="xs" c="dimmed">
          {label}
        </Text>
        <Text size="sm" fw={650} style={{ fontVariantNumeric: "tabular-nums" }}>
          {formatted}
        </Text>
      </Group>
      <Progress value={percentage} size={4} color={color} aria-label={label + ": " + formatted} />
      <Text size="xs" c="dimmed" truncate>
        {context}
      </Text>
    </Stack>
  );
}
