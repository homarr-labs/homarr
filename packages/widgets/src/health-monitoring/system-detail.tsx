"use client";

import { useEffect, useState } from "react";
import {
  ActionIcon,
  Box,
  Group,
  Progress,
  SegmentedControl,
  Select,
  SimpleGrid,
  Stack,
  Text,
  Tooltip,
} from "@mantine/core";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";

import { useByteFormatter } from "@homarr/settings";
import { useCurrentIntlLocale, useI18n } from "@homarr/translation/client";

import { useWidgetNow } from "../common/use-widget-now";

import { healthAlertLabel, isStaleReading, percentage, pressureColor, temperature, uptime } from "./display";
import type { HealthOptions } from "./display";
import type { HealthSystemSnapshot, HealthVolume } from "./model";
import { finiteReading } from "./model";
import { SystemHistory } from "./system-history";
import classes from "./system-view.module.css";

export interface SystemDetailProps {
  snapshot: HealthSystemSnapshot;
  width: number;
  height: number;
  options: HealthOptions;
  isEditMode: boolean;
  onPreferences: (options: Partial<HealthOptions>) => void;
  onPreferredHeight?: (height: number) => void;
}

export function SystemDetail({
  snapshot,
  width,
  height,
  options,
  isEditMode,
  onPreferences,
  onPreferredHeight,
}: SystemDetailProps) {
  const t = useI18n("widget.healthMonitoring.rework");
  const locale = useCurrentIntlLocale();
  const now = useWidgetNow()?.getTime();
  const [view, setView] = useState("overview");
  const [gpuId, setGpuId] = useState("");
  const health = snapshot.system.health;
  const tabs = [{ value: "overview", label: t("resourceOverview") }];
  if (snapshot.volumes.length > 0) tabs.push({ value: "storage", label: t("storage") + " " + snapshot.volumes.length });
  if ((health?.gpu.length ?? 0) > 0)
    tabs.push({ value: "graphics", label: t("gpuCount", { count: health?.gpu.length ?? 0 }) });
  tabs.push({ value: "info", label: t("systemInfo") });
  const active = tabs.find((tab) => tab.value === view)?.value ?? "overview";
  const hasHistory = snapshot.system.history.some(
    (sample) =>
      [sample.cpu, sample.memory, sample.temperature, sample.networkDown, sample.networkUp].some(
        (value) => value !== null,
      ) ||
      Object.values(sample.gpu).some((gpu) => [gpu.usage, gpu.memory, gpu.temperature].some((value) => value !== null)),
  );
  let statusMessage = "";
  if (!snapshot.available) {
    statusMessage = t("unavailable");
    if (hasHistory) statusMessage = t("unavailableHistory");
  } else if (isStaleReading(snapshot.system.updatedAt, now)) {
    statusMessage = t("stale", {
      time: new Date(snapshot.system.updatedAt).toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit" }),
    });
  }
  let statusHeight = 0;
  if (statusMessage) statusHeight = 28;
  let preferredHeight = 760;
  if (active === "storage") {
    let columns = 1;
    if (width >= 744) columns = 2;
    const rows = Math.ceil(Math.min(snapshot.volumes.length, 6) / columns);
    preferredHeight = rows * 104 + 160;
  }
  if (active === "info") preferredHeight = Math.min(7, 5 + snapshot.alerts.length) * 42 + 160;
  if (!snapshot.available && (!hasHistory || active === "info")) preferredHeight = 230;
  else preferredHeight += statusHeight;
  useEffect(() => onPreferredHeight?.(preferredHeight), [onPreferredHeight, preferredHeight]);
  const bodyHeight = Math.max(0, height - 62 - statusHeight);
  const gpu = health?.gpu.find((device) => device.gpuId === gpuId) ?? health?.gpu[0];
  let content = (
    <Overview
      snapshot={snapshot}
      width={width - 24}
      height={bodyHeight}
      options={options}
      isEditMode={isEditMode}
      onPreferences={onPreferences}
    />
  );
  if (!snapshot.available && !hasHistory)
    content = (
      <Text size="sm" c="dimmed">
        {t("unavailableDescription")}
      </Text>
    );
  if (active === "storage")
    content = (
      <StoragePage snapshot={snapshot} width={width - 24} height={bodyHeight} fahrenheit={options.fahrenheit} />
    );
  if (active === "info") content = <InformationPage snapshot={snapshot} height={bodyHeight} />;
  if (active === "graphics" && gpu) {
    const facts: string[] = [];
    if (finiteReading(gpu.temperature) !== null) facts.push(temperature(gpu.temperature, options.fahrenheit));
    if (finiteReading(gpu.fanSpeed) !== null) facts.push(t("fanSpeed", { value: gpu.fanSpeed ?? 0 }));
    let gpuControls = 0;
    if ((health?.gpu.length ?? 0) > 1) gpuControls += 38;
    if (facts.length > 0) gpuControls += 24;
    content = (
      <Stack h="100%" gap={8} mih={0} miw={0}>
        {(health?.gpu.length ?? 0) > 1 && (
          <Select
            size="xs"
            aria-label={t("graphics")}
            value={gpu.gpuId}
            onChange={(id) => {
              if (id) setGpuId(id);
            }}
            data={(health?.gpu ?? []).map((device) => ({ value: device.gpuId, label: device.name }))}
            allowDeselect={false}
            disabled={isEditMode}
            comboboxProps={{ withinPortal: true }}
          />
        )}
        {facts.length > 0 && (
          <Text size="xs" c="dimmed" truncate>
            {gpu.name} · {facts.join(" · ")}
          </Text>
        )}
        <Box flex={1} mih={0} miw={0}>
          <SystemHistory
            snapshot={snapshot}
            width={width - 24}
            height={Math.max(0, bodyHeight - gpuControls)}
            options={options}
            mode="gpu"
            gpuId={gpu.gpuId}
          />
        </Box>
      </Stack>
    );
  }
  return (
    <Stack h="100%" p={12} gap={10} miw={0} mih={0} data-health-details>
      <SegmentedControl
        size="xs"
        fullWidth
        value={active}
        onChange={setView}
        data={tabs}
        disabled={isEditMode}
        transitionDuration={0}
        aria-label={t("systemSections")}
      />
      {statusMessage && (
        <Text
          component="output"
          size="xs"
          c="var(--health-warning)"
          lineClamp={1}
          title={statusMessage}
          style={{ flexShrink: 0 }}
        >
          {statusMessage}
        </Text>
      )}
      <Box flex={1} mih={0} miw={0}>
        {content}
      </Box>
    </Stack>
  );
}

function Overview({ snapshot, width, height, options, isEditMode, onPreferences }: SystemDetailProps) {
  const t = useI18n("widget.healthMonitoring.rework");
  const { formatBytesPair, formatByteRate } = useByteFormatter();
  const metrics = [];
  if (snapshot.cpuPercent !== null)
    metrics.push({
      label: t("cpu"),
      value: percentage(snapshot.cpuPercent),
      percent: snapshot.cpuPercent,
      color: "blue",
      context: "",
    });
  if (snapshot.memory) {
    const memory = formatBytesPair(snapshot.memory.used, snapshot.memory.total);
    metrics.push({
      label: t("memory"),
      value: percentage(snapshot.memory.percent),
      percent: snapshot.memory.percent,
      color: "teal",
      context: memory.used + " / " + memory.total,
    });
  }
  if (snapshot.fullestVolume)
    metrics.push({
      label: t("mostUsedVolume"),
      value: percentage(snapshot.fullestVolume.percent),
      percent: snapshot.fullestVolume.percent,
      color: "teal",
      context: snapshot.fullestVolume.name,
    });
  const showMetrics = height >= 300 && metrics.length > 0;
  let historyHeight = height - 40;
  if (showMetrics) historyHeight -= 94;
  const facts: string[] = [];
  if (snapshot.temperature !== null) facts.push(temperature(snapshot.temperature, options.fahrenheit));
  if (snapshot.network?.down !== null && snapshot.network?.down !== undefined)
    facts.push("↓ " + formatByteRate(snapshot.network.down));
  if (snapshot.network?.up !== null && snapshot.network?.up !== undefined)
    facts.push("↑ " + formatByteRate(snapshot.network.up));
  return (
    <Stack h="100%" gap={10} mih={0} miw={0}>
      {showMetrics && (
        <SimpleGrid cols={metrics.length} spacing="md">
          {metrics.map((metric) => (
            <Stack key={metric.label} gap={4} miw={0}>
              <Text size="xs" c="dimmed" truncate>
                {metric.label}
              </Text>
              <Text size="xl" fw={650} className={classes.numeric}>
                {metric.value}
              </Text>
              {metric.percent !== null && (
                <Progress
                  value={metric.percent}
                  size={3}
                  color={pressureColor(metric.percent, metric.color)}
                  aria-label={metric.label}
                />
              )}
              <Text size="xs" c="dimmed" truncate>
                {metric.context || " "}
              </Text>
            </Stack>
          ))}
        </SimpleGrid>
      )}
      <Group justify="space-between" gap={6} wrap="nowrap" mih={28}>
        <Tooltip label={t("observedHistory")} withArrow>
          <Text component="span" tabIndex={0} size="xs" c="dimmed" truncate>
            {t("thisSession")}
          </Text>
        </Tooltip>
        <SegmentedControl
          size="xs"
          value={options.historyWindow}
          data={[
            { value: "5m", label: t("history5m") },
            { value: "15m", label: t("history15m") },
          ]}
          disabled={isEditMode}
          transitionDuration={0}
          aria-label={t("historyWindow")}
          onChange={(value) => {
            if (value === "5m" || value === "15m") onPreferences({ historyWindow: value });
          }}
        />
      </Group>
      <Box flex={1} mih={0} miw={0}>
        <SystemHistory
          snapshot={snapshot}
          width={width}
          height={Math.max(0, historyHeight - (facts.length > 0 ? 24 : 0))}
          options={options}
        />
      </Box>
      {facts.length > 0 && height >= 240 && (
        <Text size="xs" c="dimmed" truncate>
          {facts.join(" · ")}
        </Text>
      )}
    </Stack>
  );
}

function StoragePage({
  snapshot,
  width,
  height,
  fahrenheit,
}: {
  snapshot: HealthSystemSnapshot;
  width: number;
  height: number;
  fahrenheit: boolean;
}) {
  const t = useI18n("widget.healthMonitoring.rework");
  const [page, setPage] = useState(0);
  let columns = 1;
  if (width >= 720 && snapshot.volumes.length > 1) columns = 2;
  const rows = Math.max(1, Math.floor((height - 34) / 104));
  const capacity = rows * columns;
  const pages = Math.max(1, Math.ceil(snapshot.volumes.length / capacity));
  const current = Math.min(page, pages - 1);
  const volumes = snapshot.volumes.slice(current * capacity, (current + 1) * capacity);
  let healthTitle = t("diskHealth");
  if (snapshot.capabilities.healthScope === "pool") healthTitle = t("poolHealth");
  if (snapshot.capabilities.healthScope === "volume") healthTitle = t("volumeHealth");
  return (
    <Stack h="100%" gap={8} miw={0} mih={0}>
      <SimpleGrid cols={columns} spacing="lg" verticalSpacing={10} miw={0}>
        {volumes.map((volume) => (
          <Volume key={volume.id} volume={volume} fahrenheit={fahrenheit} healthTitle={healthTitle} />
        ))}
      </SimpleGrid>
      <Group justify="space-between" mt="auto" wrap="nowrap" gap={6}>
        <Text size="xs" c="dimmed">
          {t("volumeCount", { count: snapshot.volumes.length })}
        </Text>
        <DetailPager page={current} pages={pages} onChange={setPage} />
      </Group>
    </Stack>
  );
}

function Volume({
  volume,
  fahrenheit,
  healthTitle,
}: {
  volume: HealthVolume;
  fahrenheit: boolean;
  healthTitle: string;
}) {
  const t = useI18n("widget.healthMonitoring.rework");
  const tHealth = useI18n("widget.healthMonitoring");
  const { formatBytes } = useByteFormatter();
  let status = t("unknown");
  let color = "dimmed";
  if (volume.health === "healthy") {
    status = t("healthy");
    color = "var(--health-success)";
  }
  if (volume.health === "attention") {
    status = t("attention");
    color = "var(--health-warning)";
  }
  let reason = volume.smart?.overallStatus || healthTitle;
  const statusReason = volume.smart?.statusReason;
  if (statusReason?.type === "attributesFailed")
    reason = tHealth("smartStatus.attributesFailed", { attributes: statusReason.attributes.join(", ") });
  else if (statusReason) reason = tHealth(`smartStatus.${statusReason.type}`);
  let usedLabel = volume.fileSystem?.used.trim() ?? "";
  let freeLabel = volume.fileSystem?.available.trim() ?? "";
  if (volume.used !== null) usedLabel = formatBytes(volume.used);
  if (volume.total !== null && usedLabel) usedLabel += " / " + formatBytes(volume.total);
  if (volume.free !== null) freeLabel = formatBytes(volume.free);
  return (
    <Stack gap={6} py={6} miw={0}>
      <Group justify="space-between" gap="xs" wrap="nowrap">
        <Text size="sm" fw={600} truncate title={volume.name}>
          {volume.name}
        </Text>
        <Text size="sm" fw={600} className={classes.numeric}>
          {percentage(volume.percent)}
        </Text>
      </Group>
      {volume.percent !== null && (
        <Progress
          value={volume.percent}
          size={5}
          color={pressureColor(volume.percent, "teal")}
          aria-label={volume.name + " " + t("capacity")}
        />
      )}
      <Group gap="xs" justify="space-between" wrap="nowrap">
        <Text size="xs" c="dimmed" truncate>
          {usedLabel}
        </Text>
        {freeLabel && (
          <Text size="xs" c="dimmed" truncate>
            {t("freeSpace", { value: freeLabel })}
          </Text>
        )}
      </Group>
      <Group gap="sm" wrap="nowrap" justify="space-between">
        {volume.smart && (
          <Tooltip label={reason} withArrow events={{ hover: true, focus: true, touch: true }}>
            <Text component="span" tabIndex={0} size="xs" c={color} truncate>
              {healthTitle}: {status}
            </Text>
          </Tooltip>
        )}
        {volume.temperature !== null && (
          <Text size="xs" c="dimmed">
            {temperature(volume.temperature, fahrenheit)}
          </Text>
        )}
      </Group>
    </Stack>
  );
}

function InformationPage({ snapshot, height }: { snapshot: HealthSystemSnapshot; height: number }) {
  const t = useI18n("widget.healthMonitoring.rework");
  const { formatBytes } = useByteFormatter();
  const [page, setPage] = useState(0);
  const health = snapshot.system.health;
  const rows: { label: string; value: string }[] = [];
  if (health?.cpuModelName.trim()) rows.push({ label: t("processor"), value: health.cpuModelName });
  if (health?.version.trim()) rows.push({ label: t("version"), value: health.version });
  if (health && Number.isFinite(health.uptime) && health.uptime >= 0)
    rows.push({
      label: t("uptime"),
      value: uptime(health.uptime, t),
    });
  if (snapshot.memory) rows.push({ label: t("memoryAvailable"), value: formatBytes(snapshot.memory.available) });
  if (health?.loadAverage && snapshot.capabilities.loadUnit !== "none") {
    let label = t("loadAverage");
    if (snapshot.capabilities.loadUnit === "percent") label = t("cpuAverage");
    rows.push({
      label,
      value: Object.values(health.loadAverage)
        .map((value) => {
          if (!Number.isFinite(value)) return "—";
          if (snapshot.capabilities.loadUnit === "percent") return value.toFixed(1) + "%";
          return value.toFixed(2);
        })
        .join(" / "),
    });
  }
  for (const alert of snapshot.alerts) rows.push({ label: t("attention"), value: healthAlertLabel(alert, t) });
  const capacity = Math.max(1, Math.floor((height - 34) / 42));
  const pages = Math.max(1, Math.ceil(rows.length / capacity));
  const current = Math.min(page, pages - 1);
  return (
    <Stack h="100%" gap={8} miw={0} mih={0}>
      {rows.slice(current * capacity, (current + 1) * capacity).map((row, index) => (
        <Group key={index} justify="space-between" gap="sm" wrap="nowrap" mih={34}>
          <Text size="xs" c="dimmed" maw="40%" truncate>
            {row.label}
          </Text>
          <Text size="sm" fw={500} maw="65%" truncate title={row.value}>
            {row.value}
          </Text>
        </Group>
      ))}
      {rows.length === 0 && (
        <Text size="sm" c="dimmed">
          {t("unavailableDescription")}
        </Text>
      )}
      <Box mt="auto">
        <DetailPager page={current} pages={pages} onChange={setPage} />
      </Box>
    </Stack>
  );
}

function DetailPager({ page, pages, onChange }: { page: number; pages: number; onChange: (page: number) => void }) {
  const t = useI18n("widget.healthMonitoring.rework");
  if (pages <= 1) return null;
  return (
    <Group gap={5} justify="flex-end" wrap="nowrap">
      <Text size="xs" c="dimmed">
        {page + 1}/{pages}
      </Text>
      <ActionIcon
        size="sm"
        variant="subtle"
        color="gray"
        aria-label={t("previousItems")}
        disabled={page === 0}
        onClick={() => onChange(page - 1)}
      >
        <IconChevronLeft size={14} />
      </ActionIcon>
      <ActionIcon
        size="sm"
        variant="subtle"
        color="gray"
        aria-label={t("nextItems")}
        disabled={page + 1 >= pages}
        onClick={() => onChange(page + 1)}
      >
        <IconChevronRight size={14} />
      </ActionIcon>
    </Group>
  );
}
