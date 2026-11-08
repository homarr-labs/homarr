"use client";

import { useMemo, useState } from "react";
import { ActionIcon, Box, Group, Modal, Progress, Stack, Text, UnstyledButton } from "@mantine/core";
import { useElementSize } from "@mantine/hooks";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";

import type { Resource } from "@homarr/integrations/types";
import { useByteFormatter } from "@homarr/settings";
import { useI18n } from "@homarr/translation/client";
import { zoomCompensatedSize } from "@homarr/ui";

import { thresholdColor } from "../../beszel/_shared/colors";
import { formatPercent, formatUptime } from "../../beszel/_shared/format";
import type { WidgetComponentProps } from "../../definition";
import { ResourceDetails } from "./resource-details";
import { resourcePercentage } from "./resource-data";
export { resourcePercentage } from "./resource-data";
import classes from "./resource.module.css";
import healthMonitoringClasses from "../health-monitoring.module.css";

interface ResourceTableProps {
  type: Resource["type"];
  order?: "name" | "storage-risk";
  data: Resource[];
  widgetProps: WidgetComponentProps<"healthMonitoring"> & { integrationId: string };
}

type Metric = "cpu" | "memory" | "storage";

export function ResourceTable({ type, data, widgetProps, order = "name" }: ResourceTableProps) {
  const { width, height, displayMode, options, isEditMode } = widgetProps;
  const t = useI18n("widget.healthMonitoring.rework");
  const { formatBytesPair } = useByteFormatter();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const selected = data.find((resource) => resource.id === selectedId);
  const advanced = displayMode === "advanced";
  const narrow = width < 520;
  const micro = height < 74;
  const dense = narrow && height < 120;
  let rowHeight = 43;
  if (narrow) rowHeight = 61;
  if (height < 120) rowHeight = 43;
  let headerHeight = 22;
  if (narrow || micro) headerHeight = 0;
  let capacity = Math.max(1, Math.floor((height - headerHeight - 28) / rowHeight));
  if (micro) capacity = 1;
  const records = useMemo(
    () =>
      data.toSorted((left, right) => {
        if (order === "storage-risk") {
          const a = resourcePercentage(left, "storage");
          const b = resourcePercentage(right, "storage");
          if (a === null && b !== null) return 1;
          if (b === null && a !== null) return -1;
          if (a !== null && b !== null && a !== b) return b - a;
        }
        return left.name.localeCompare(right.name);
      }),
    [data, order],
  );
  const pages = Math.max(1, Math.ceil(records.length / capacity));
  const currentPage = Math.min(page, pages - 1);
  const start = currentPage * capacity;
  const visible = records.slice(start, start + capacity);
  const first = visible[0];
  const metrics: Metric[] = [];
  if (type !== "storage" && (advanced || options.cpu)) metrics.push("cpu");
  if (type !== "storage" && (advanced || options.memory)) metrics.push("memory");
  if (type === "storage" || width >= 760) metrics.push("storage");
  let microMetricCount = 1;
  if (width >= 280) microMetricCount = 2;
  let template = "minmax(110px, 1.5fr)";
  template += " minmax(0, 1fr)".repeat(metrics.length);
  const showUptime = !narrow && width >= 1000 && type !== "storage" && (advanced || options.showUptime);
  if (showUptime) template += " minmax(0, .7fr)";
  const metricLabel = (metric: Metric) => {
    if (metric === "cpu") return t("cpu");
    if (metric === "memory") return t("memory");
    return t("storage");
  };
  return (
    <Stack gap={0} h="100%" miw={0} mih={0} style={{ overflow: "hidden" }}>
      {!narrow && !micro && (
        <Box className={classes.rowGrid} style={{ gridTemplateColumns: template }} h={headerHeight}>
          <Text size="xs" c="dimmed">
            {t("name")}
          </Text>
          {metrics.map((metric) => (
            <Text key={metric} size="xs" c="dimmed">
              {metricLabel(metric)}
            </Text>
          ))}
          {showUptime && (
            <Text size="xs" c="dimmed">
              {t("uptime")}
            </Text>
          )}
        </Box>
      )}
      {micro && first && (
        <Group gap={4} wrap="nowrap" h="100%" miw={0}>
          <UnstyledButton
            flex={1}
            miw={0}
            disabled={isEditMode}
            aria-label={t("inspectResource", { name: first.name })}
            onClick={(event) => {
              event.stopPropagation();
              setSelectedId(first.id);
            }}
          >
            <Stack gap={4} miw={0}>
              <Text size="xs" fw={600} truncate>
                {first.name}
              </Text>
              {height >= 50 && metrics.length > 0 && (
                <Group gap={10} wrap="nowrap">
                  {metrics.slice(0, microMetricCount).map((metric) => (
                    <PercentCell
                      key={metric}
                      value={resourcePercentage(first, metric)}
                      label={metricLabel(metric)}
                      narrow
                    />
                  ))}
                </Group>
              )}
            </Stack>
          </UnstyledButton>
          {pages > 1 && (
            <Group gap={2} wrap="nowrap">
              <ActionIcon
                variant="subtle"
                color="gray"
                size="sm"
                aria-label={t("resourcePrevious")}
                disabled={currentPage === 0 || isEditMode}
                onClick={() => setPage(currentPage - 1)}
              >
                <IconChevronLeft style={zoomCompensatedSize(14)} />
              </ActionIcon>
              <ActionIcon
                variant="subtle"
                color="gray"
                size="sm"
                aria-label={t("resourceNext")}
                disabled={currentPage + 1 >= pages || isEditMode}
                onClick={() => setPage(currentPage + 1)}
              >
                <IconChevronRight style={zoomCompensatedSize(14)} />
              </ActionIcon>
            </Group>
          )}
        </Group>
      )}
      {!micro && (
        <Box flex={1} mih={0} style={{ overflow: "hidden" }}>
          {visible.map((resource) => {
            let stateColor = "var(--mantine-color-gray-6)";
            if (resource.isRunning) stateColor = "var(--mantine-color-teal-6)";
            const metricsContent = metrics.map((metric) => {
              const value = resourcePercentage(resource, metric);
              let context: string | undefined;
              if (width >= 900 && value !== null && metric !== "cpu") {
                let used = 0;
                let total = 0;
                if (metric === "memory" && resource.type !== "storage") {
                  used = resource.memory.used;
                  total = resource.memory.total;
                }
                if (metric === "storage" && resource.type === "storage") {
                  used = resource.used;
                  total = resource.total;
                }
                if (metric === "storage" && resource.type !== "storage") {
                  used = resource.storage.used;
                  total = resource.storage.total;
                }
                const bytes = formatBytesPair(used, total);
                context = bytes.used + " / " + bytes.total;
              }
              return (
                <PercentCell key={metric} value={value} context={context} label={metricLabel(metric)} narrow={narrow} />
              );
            });
            return (
              <UnstyledButton
                key={resource.id}
                className={classes.resource}
                disabled={isEditMode}
                aria-label={t("inspectResource", { name: resource.name })}
                w="100%"
                h={rowHeight}
                onClick={(event) => {
                  event.stopPropagation();
                  setSelectedId(resource.id);
                }}
              >
                <Box
                  className={classes.rowGrid}
                  style={{ gridTemplateColumns: template }}
                  data-narrow={narrow || undefined}
                >
                  <Group gap={8} wrap="nowrap" miw={0}>
                    <Box
                      style={{
                        ...zoomCompensatedSize(6),
                        borderRadius: "50%",
                        backgroundColor: stateColor,
                        flexShrink: 0,
                      }}
                      aria-hidden
                    />
                    <Stack gap={1} miw={0}>
                      <Text size="xs" fw={650} truncate>
                        {resource.name}
                      </Text>
                      {!dense && (
                        <Text size="xs" c="dimmed" truncate>
                          {resource.status}
                          {resource.type !== "node" && " · " + resource.node}
                        </Text>
                      )}
                    </Stack>
                  </Group>
                  {!narrow && metricsContent}
                  {showUptime && (
                    <Text size="xs" truncate>
                      {uptimeLabel(resource)}
                    </Text>
                  )}
                </Box>
                {narrow && (
                  <Group gap="md" mt={4} wrap="nowrap">
                    {metricsContent}
                  </Group>
                )}
              </UnstyledButton>
            );
          })}
          {visible.length === 0 && (
            <Text size="xs" c="dimmed" py="sm">
              {t("noClusterResources")}
            </Text>
          )}
        </Box>
      )}
      {!micro && pages > 1 && (
        <Group justify="space-between" wrap="nowrap" h={28} style={{ flexShrink: 0 }}>
          <Text size="xs" c="dimmed">
            {t("resourcePage", {
              first: start + 1,
              last: Math.min(start + capacity, records.length),
              total: records.length,
            })}
          </Text>
          <Group gap={4} wrap="nowrap">
            <ActionIcon
              variant="subtle"
              color="gray"
              size="sm"
              aria-label={t("resourcePrevious")}
              disabled={currentPage === 0 || isEditMode}
              onClick={() => setPage(currentPage - 1)}
            >
              <IconChevronLeft style={zoomCompensatedSize(14)} />
            </ActionIcon>
            <ActionIcon
              variant="subtle"
              color="gray"
              size="sm"
              aria-label={t("resourceNext")}
              disabled={currentPage + 1 >= pages || isEditMode}
              onClick={() => setPage(currentPage + 1)}
            >
              <IconChevronRight style={zoomCompensatedSize(14)} />
            </ActionIcon>
          </Group>
        </Group>
      )}
      <ResourceDialog selected={selected} onClose={() => setSelectedId(null)} />
    </Stack>
  );
}

function PercentCell({
  value,
  context,
  label,
  narrow,
}: {
  value: number | null;
  context?: string;
  label: string;
  narrow: boolean;
}) {
  let formatted = "—";
  if (value !== null) formatted = formatPercent(value);
  if (narrow)
    return (
      <Text size="xs" style={{ fontVariantNumeric: "tabular-nums" }}>
        <Text component="span" size="xs" c="dimmed">
          {label}{" "}
        </Text>
        <b>{formatted}</b>
      </Text>
    );
  return (
    <Stack gap={3} miw={0}>
      <Group gap={8} wrap="nowrap">
        <Text size="xs" fw={650} style={{ fontVariantNumeric: "tabular-nums" }}>
          {formatted}
        </Text>
        {value !== null && (
          <Progress
            value={Math.max(0, Math.min(100, value))}
            color={thresholdColor(value)}
            size={3}
            flex={1}
            aria-label={label}
          />
        )}
      </Group>
      {context && (
        <Text size="xs" c="dimmed" truncate>
          {context}
        </Text>
      )}
    </Stack>
  );
}

function uptimeLabel(resource: Resource) {
  if (resource.type === "storage" || !resource.isRunning || !Number.isFinite(resource.uptime) || resource.uptime < 0)
    return "—";
  return formatUptime(resource.uptime);
}

export function ResourceDialog({ selected, onClose }: { selected: Resource | undefined; onClose: () => void }) {
  const common = useI18n("common");
  const [dialogHeight, setDialogHeight] = useState(600);
  const { ref: detailRef, width: detailWidth, height: detailHeight } = useElementSize<HTMLDivElement>();
  return (
    <Modal
      opened={selected !== undefined}
      onClose={onClose}
      title={selected?.name}
      size="min(960px, calc(100vw - 24px))"
      centered
      closeButtonProps={{ "aria-label": common("action.close") }}
      attributes={{ header: { role: "presentation" } }}
      classNames={{ content: healthMonitoringClasses.root }}
      styles={{
        content: {
          display: "flex",
          flexDirection: "column",
          height: "min(" + dialogHeight + "px, calc(100dvh - 32px))",
          overflow: "hidden",
        },
        header: { flexShrink: 0 },
        body: { flex: 1, minHeight: 0, display: "flex", overflow: "hidden" },
      }}
    >
      <Box ref={detailRef} flex={1} miw={0} mih={0}>
        {selected && (
          <ResourceDetails
            item={selected}
            width={detailWidth || 320}
            height={detailHeight || 400}
            onPreferredHeight={setDialogHeight}
          />
        )}
      </Box>
    </Modal>
  );
}
