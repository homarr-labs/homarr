"use client";

import { useEffect, useState } from "react";
import { ActionIcon, Badge, Box, Group, Progress, SegmentedControl, Select, Stack, Text } from "@mantine/core";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";

import type { Resource } from "@homarr/integrations/types";
import { useByteFormatter } from "@homarr/settings";
import { useI18n } from "@homarr/translation/client";

import { thresholdColor } from "../../beszel/_shared/colors";
import { formatPercent, formatUptime } from "../../beszel/_shared/format";
import { resourcePercentage } from "./resource-data";

interface Datum {
  label: string;
  value: string;
  context?: string;
  percent?: number | null;
}
type DetailTab = "overview" | "network" | "storage" | "placement";

export function ResourceDetails({
  item,
  width,
  height,
  onPreferredHeight,
}: {
  item: Resource;
  width: number;
  height: number;
  onPreferredHeight?: (height: number) => void;
}) {
  const t = useI18n("widget.healthMonitoring.rework");
  const tc = useI18n("widget.healthMonitoring.cluster.popover");
  const { formatBytes, formatBytesPair } = useByteFormatter();
  const [tab, setTab] = useState<DetailTab>("overview");
  const [page, setPage] = useState(0);
  const choices = [{ value: "overview", label: t("resourceOverview") }];
  if (item.type !== "storage") {
    if (Number.isFinite(item.network.in) || Number.isFinite(item.network.out))
      choices.push({ value: "network", label: t("resourceNetwork") });
    choices.push({ value: "storage", label: t("storage") });
  }
  choices.push({ value: "placement", label: t("resourcePlacement") });
  let color = "gray";
  if (item.isRunning) color = "teal";
  let selectedTab = tab;
  if (!choices.some((choice) => choice.value === tab)) selectedTab = "overview";
  const sections: Record<DetailTab, Datum[]> = { overview: [], network: [], storage: [], placement: [] };
  let storageUsed = 0;
  let storageTotal = 0;
  if (item.type === "storage") {
    storageUsed = item.used;
    storageTotal = item.total;
  } else {
    storageUsed = item.storage.used;
    storageTotal = item.storage.total;
  }
  const storagePercent = resourcePercentage(item, "storage");
  const storageBytes = formatBytesPair(storageUsed, storageTotal);
  let storageValue = "—";
  let storageContext = t("unknown");
  if (storagePercent !== null) {
    storageValue = formatPercent(storagePercent);
    storageContext = storageBytes.used + " / " + storageBytes.total;
  }
  const storage: Datum = { label: t("storage"), value: storageValue, context: storageContext, percent: storagePercent };
  sections.storage.push(storage);
  sections.placement.push({ label: tc("rightSection.node"), value: item.node });
  if (item.type === "storage") {
    sections.overview.push(storage);
    sections.placement.push({ label: tc("rightSection.plugin"), value: item.storagePlugin });
    let storageType = tc("detail.storageType.local");
    if (item.isShared) storageType = tc("detail.storageType.shared");
    sections.placement.push({ label: t("storage"), value: storageType });
  } else {
    const cpu = resourcePercentage(item, "cpu");
    const memory = resourcePercentage(item, "memory");
    const memoryBytes = formatBytesPair(item.memory.used, item.memory.total);
    let cpuValue = "—";
    let memoryValue = "—";
    let memoryContext = t("unknown");
    let uptime = "—";
    if (cpu !== null) cpuValue = formatPercent(cpu);
    if (memory !== null) {
      memoryValue = formatPercent(memory);
      memoryContext = memoryBytes.used + " / " + memoryBytes.total;
    }
    if (item.isRunning && Number.isFinite(item.uptime) && item.uptime >= 0) uptime = formatUptime(item.uptime);
    sections.overview.push(
      { label: t("cpu"), value: cpuValue, context: t("clusterCores", { count: item.cpu.cores }), percent: cpu },
      { label: t("memory"), value: memoryValue, context: memoryContext, percent: memory },
      { label: t("uptime"), value: uptime },
    );
    sections.network.push(
      { label: t("received"), value: counter(item.network.in, formatBytes, item.isRunning) },
      { label: t("sent"), value: counter(item.network.out, formatBytes, item.isRunning) },
    );
    sections.storage.push(
      { label: t("read"), value: counter(item.storage.read, formatBytes, item.isRunning) },
      { label: t("written"), value: counter(item.storage.write, formatBytes, item.isRunning) },
    );
    if (item.type === "qemu" || item.type === "lxc")
      sections.placement.push({ label: tc("rightSection.vmId"), value: String(item.vmId) });
    if (item.haState) sections.placement.push({ label: tc("detail.haState"), value: item.haState });
    sections.placement.push({ label: t("cpu"), value: t("clusterCores", { count: item.cpu.cores }) });
  }
  const data = sections[selectedTab];
  const bodyHeight = Math.max(64, height - 82);
  let columns = 1;
  if (width >= 540) columns = 2;
  if (width >= 780) columns = 3;
  const preferredRows = Math.ceil(Math.max(1, data.length) / columns);
  const preferredHeight = Math.min(3, preferredRows) * 96 + 210;
  useEffect(() => onPreferredHeight?.(preferredHeight), [onPreferredHeight, preferredHeight]);
  const rows = Math.max(1, Math.floor((bodyHeight - 28) / 96));
  const capacity = rows * columns;
  const pages = Math.max(1, Math.ceil(data.length / capacity));
  const currentPage = Math.min(page, pages - 1);
  const visible = data.slice(currentPage * capacity, (currentPage + 1) * capacity);
  return (
    <Stack gap={10} h="100%" miw={0} mih={0} style={{ overflow: "hidden" }}>
      <Group gap="sm" justify="space-between" wrap="nowrap" style={{ flexShrink: 0 }}>
        <Badge variant="light" color={color} c="var(--mantine-color-text)" radius="sm">
          {item.status}
        </Badge>
        <Text size="xs" c="dimmed" truncate>
          {item.node}
        </Text>
      </Group>
      {width < 520 && (
        <Select
          size="xs"
          value={selectedTab}
          onChange={(value) => {
            if (value) {
              setTab(value as DetailTab);
              setPage(0);
            }
          }}
          data={choices}
          allowDeselect={false}
          aria-label={t("details")}
          style={{ flexShrink: 0 }}
        />
      )}
      {width >= 520 && (
        <SegmentedControl
          size="xs"
          value={selectedTab}
          onChange={(value) => {
            setTab(value as DetailTab);
            setPage(0);
          }}
          data={choices}
          fullWidth
          transitionDuration={0}
          style={{ flexShrink: 0 }}
        />
      )}
      <Box flex={1} miw={0} mih={0} style={{ overflow: "hidden" }}>
        <Box
          display="grid"
          style={{ gridTemplateColumns: "repeat(" + columns + ", minmax(0, 1fr))", gap: "var(--mantine-spacing-lg)" }}
        >
          {visible.map((datum) => (
            <Stack key={datum.label} gap={5} miw={0} h={76}>
              <Text size="xs" c="dimmed" truncate>
                {datum.label}
              </Text>
              <Text size="xl" fw={650} truncate style={{ fontVariantNumeric: "tabular-nums" }}>
                {datum.value}
              </Text>
              {datum.percent !== undefined && datum.percent !== null && (
                <Progress
                  value={Math.max(0, Math.min(100, datum.percent))}
                  size={4}
                  color={thresholdColor(datum.percent)}
                  aria-label={datum.label}
                />
              )}
              {datum.context && (
                <Text size="xs" c="dimmed" truncate>
                  {datum.context}
                </Text>
              )}
            </Stack>
          ))}
        </Box>
        {visible.length === 0 && (
          <Text size="xs" c="dimmed">
            {t("unknown")}
          </Text>
        )}
      </Box>
      {pages > 1 && (
        <Group justify="space-between" wrap="nowrap" h={28} style={{ flexShrink: 0 }}>
          <Text size="xs" c="dimmed">
            {t("resourcePage", {
              first: currentPage * capacity + 1,
              last: Math.min((currentPage + 1) * capacity, data.length),
              total: data.length,
            })}
          </Text>
          <Group gap={4} wrap="nowrap">
            <ActionIcon
              variant="subtle"
              color="gray"
              size="sm"
              aria-label={t("resourcePrevious")}
              disabled={currentPage === 0}
              onClick={() => setPage(currentPage - 1)}
            >
              <IconChevronLeft size={14} />
            </ActionIcon>
            <ActionIcon
              variant="subtle"
              color="gray"
              size="sm"
              aria-label={t("resourceNext")}
              disabled={currentPage + 1 >= pages}
              onClick={() => setPage(currentPage + 1)}
            >
              <IconChevronRight size={14} />
            </ActionIcon>
          </Group>
        </Group>
      )}
    </Stack>
  );
}

function counter(value: number | null, format: (value: number) => string, running: boolean) {
  if (!running) return "—";
  if (value === null || !Number.isFinite(value) || value < 0) return "—";
  return format(value);
}
