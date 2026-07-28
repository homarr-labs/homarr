"use client";

import type { MantineSize } from "@mantine/core";
import { Badge, Box, Card, Center, Group, Loader, Progress, Text, Stack } from "@mantine/core";
import {
  Activity,
  Battery,
  BatteryCharging,
  Cpu,
  HardDrive,
  MemoryStick,
  Monitor,
  Network,
  Server,
  Thermometer,
  Wifi,
} from "lucide-react";
import { IconServerOff } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { useRequiredBoard } from "@homarr/boards/context";
import { useModalAction } from "@homarr/modals";
import { useScopedI18n } from "@homarr/translation/client";

import classes from "./component.module.css";

import type { WidgetComponentProps } from "../definition";
import type { BeszelSystemRow } from "../beszel/_shared/types";
import { statusColorMap, thresholdColor } from "../beszel/_shared/colors";
import {
  formatByteRate,
  formatLoadAvg,
  formatPercent,
  formatTemp,
  formatUptime,
  getProgressTrackSize,
} from "../beszel/_shared/format";
import { useBeszelFilteredSystems } from "../beszel/_shared/hooks";
import { IntegrationErrorIndicator } from "../common/integration-error-indicator";
import { getUsableWidgetQueryData } from "../common/query-state";
import { BeszelSystemStatsModal } from "../beszel/_shared/system-stats-modal";
import { DiskUsage } from "../beszel/_shared/disk-usage";

interface SizeConfig {
  iconSize: number;
  fontSize: string;
  progressSize: "xs" | "sm";
  labelMiw: number;
  valueMiw: number;
  rowHeight: number;
  cardPadding: number;
  badgeHeight: number;
  badgeSize: "xs" | "sm";
  gap: number;
}

const defaultSizeConfig: SizeConfig = {
  iconSize: 10,
  fontSize: "10px",
  progressSize: "xs",
  labelMiw: 40,
  valueMiw: 30,
  rowHeight: 18,
  cardPadding: 4,
  badgeHeight: 20,
  badgeSize: "xs",
  gap: 2,
};

const sizeThresholds: [number, SizeConfig][] = [
  [0, defaultSizeConfig],
  [
    160,
    {
      iconSize: 12,
      fontSize: "xs",
      progressSize: "xs",
      labelMiw: 50,
      valueMiw: 34,
      rowHeight: 22,
      cardPadding: 6,
      badgeHeight: 22,
      badgeSize: "xs",
      gap: 6,
    },
  ],
  [
    280,
    {
      iconSize: 14,
      fontSize: "xs",
      progressSize: "sm",
      labelMiw: 55,
      valueMiw: 38,
      rowHeight: 24,
      cardPadding: 8,
      badgeHeight: 26,
      badgeSize: "sm",
      gap: 8,
    },
  ],
];

const getSizeConfig = (cellWidth: number, cellHeight: number): SizeConfig => {
  const basis = Math.min(cellWidth, cellHeight);
  let config = defaultSizeConfig;
  for (const [threshold, cfg] of sizeThresholds) {
    if (basis >= threshold) config = cfg;
  }
  return config;
};

const getMaxVisibleMetrics = (cellHeight: number, size: SizeConfig): number => {
  const available = cellHeight - size.cardPadding * 2 - size.badgeHeight - size.gap;
  return Math.max(1, Math.floor(available / size.rowHeight));
};

const MIN_CELL_WIDTH = 140;
const MIN_CELL_HEIGHT = 80;

const getColCount = (width: number, _height: number, itemCount: number): number => {
  if (itemCount <= 1) return 1;
  const maxCols = Math.min(itemCount, Math.max(1, Math.floor(width / MIN_CELL_WIDTH)));

  let best = 1;
  for (let c = 1; c <= maxCols; c++) {
    const emptyCells = (c - (itemCount % c)) % c;
    const bestEmpty = (best - (itemCount % best)) % best;
    if (emptyCells < bestEmpty || (emptyCells === bestEmpty && c > best)) {
      best = c;
    }
  }
  return best;
};

interface MetricRowProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  progress?: { value: number; color: string };
  size: SizeConfig;
}

const MetricValue = ({ value, progress, size }: Pick<MetricRowProps, "value" | "progress" | "size">) => (
  <Group gap={6} wrap="nowrap" style={{ flex: 1, minWidth: 0, marginLeft: "auto" }}>
    <Text size={size.fontSize} fw={500} w={size.valueMiw} ta="left" style={{ whiteSpace: "nowrap", flexShrink: 0 }}>
      {value}
    </Text>
    {progress && (
      <Progress
        value={progress.value}
        color={progress.color}
        size={getProgressTrackSize(size.progressSize)}
        style={{ flex: 1 }}
      />
    )}
  </Group>
);

const MetricRow = ({ icon, label, value, progress, size }: MetricRowProps) => (
  <Group gap="xs" wrap="nowrap" justify="space-between" style={{ minHeight: size.rowHeight }}>
    {icon}
    <Text size={size.fontSize} c="dimmed" w={size.labelMiw} style={{ whiteSpace: "nowrap", flexShrink: 0 }}>
      {label}
    </Text>
    <MetricValue value={value} progress={progress} size={size} />
  </Group>
);

interface SystemCardProps {
  system: BeszelSystemRow & { _key: string };
  options: WidgetComponentProps<"beszelSystemGrid">["options"];
  t: ReturnType<typeof useScopedI18n<"widget.beszelSystemGrid">>;
  size: SizeConfig;
  maxMetrics: number;
  itemRadius: MantineSize;
  onClick?: () => void;
}

const metricRenderers = [
  {
    key: "showCpu",
    render: (s: BeszelSystemRow, t: SystemCardProps["t"], sz: SizeConfig) => (
      <MetricRow
        key="cpu"
        icon={<Cpu size={sz.iconSize} />}
        label={t("metric.cpu")}
        value={formatPercent(s.cpu)}
        progress={{ value: s.cpu, color: thresholdColor(s.cpu) }}
        size={sz}
      />
    ),
    visible: (s: BeszelSystemRow, o: SystemCardProps["options"]) => o.showCpu,
  },
  {
    key: "showMemory",
    render: (s: BeszelSystemRow, t: SystemCardProps["t"], sz: SizeConfig) => (
      <MetricRow
        key="mem"
        icon={<MemoryStick size={sz.iconSize} />}
        label={t("metric.memory")}
        value={formatPercent(s.memory)}
        progress={{ value: s.memory, color: thresholdColor(s.memory) }}
        size={sz}
      />
    ),
    visible: (s: BeszelSystemRow, o: SystemCardProps["options"]) => o.showMemory,
  },
  {
    key: "showDisk",
    render: (s: BeszelSystemRow, t: SystemCardProps["t"], sz: SizeConfig) => (
      <Group key="disk" gap="xs" wrap="nowrap" justify="space-between" style={{ minHeight: sz.rowHeight }}>
        <HardDrive size={sz.iconSize} />
        <Text size={sz.fontSize} c="dimmed" w={sz.labelMiw} style={{ whiteSpace: "nowrap", flexShrink: 0 }}>
          {t("metric.disk")}
        </Text>
        <DiskUsage system={s} fontSize={sz.fontSize} progressSize={sz.progressSize} valueMiw={sz.valueMiw} />
      </Group>
    ),
    visible: (s: BeszelSystemRow, o: SystemCardProps["options"]) => o.showDisk,
  },
  {
    key: "showGpu",
    render: (s: BeszelSystemRow, t: SystemCardProps["t"], sz: SizeConfig) => (
      <MetricRow
        key="gpu"
        icon={<Monitor size={sz.iconSize} />}
        label={t("metric.gpu")}
        value={formatPercent(s.gpu)}
        progress={{ value: s.gpu, color: thresholdColor(s.gpu) }}
        size={sz}
      />
    ),
    visible: (s: BeszelSystemRow, o: SystemCardProps["options"]) => o.showGpu && s.gpu > 0,
  },
  {
    key: "showLoadAvg",
    render: (s: BeszelSystemRow, t: SystemCardProps["t"], sz: SizeConfig) => (
      <MetricRow
        key="la"
        icon={<Activity size={sz.iconSize} />}
        label={t("metric.loadAvg")}
        value={formatLoadAvg(s.loadAvg)}
        size={sz}
      />
    ),
    visible: (s: BeszelSystemRow, o: SystemCardProps["options"]) => o.showLoadAvg && s.loadAvg !== null,
  },
  {
    key: "showNet",
    render: (s: BeszelSystemRow, t: SystemCardProps["t"], sz: SizeConfig) => (
      <MetricRow
        key="net"
        icon={<Network size={sz.iconSize} />}
        label={t("metric.net")}
        value={formatByteRate(s.netBytes)}
        size={sz}
      />
    ),
    visible: (s: BeszelSystemRow, o: SystemCardProps["options"]) => o.showNet,
  },
  {
    key: "showTemp",
    render: (s: BeszelSystemRow, t: SystemCardProps["t"], sz: SizeConfig) => (
      <MetricRow
        key="temp"
        icon={<Thermometer size={sz.iconSize} />}
        label={t("metric.temp")}
        value={formatTemp(s.temp, false)}
        size={sz}
      />
    ),
    visible: (s: BeszelSystemRow, o: SystemCardProps["options"]) => o.showTemp && s.temp !== null,
  },
  {
    key: "showBattery",
    render: (s: BeszelSystemRow, t: SystemCardProps["t"], sz: SizeConfig) => {
      const batteryIcons = [Battery, BatteryCharging] as const;
      const Icon = batteryIcons[Math.min(1, s.battery?.[1] ?? 0)] ?? Battery;
      return (
        <MetricRow
          key="bat"
          icon={<Icon size={sz.iconSize} />}
          label={t("metric.battery")}
          value={`${s.battery?.[0] ?? 0}%`}
          size={sz}
        />
      );
    },
    visible: (s: BeszelSystemRow, o: SystemCardProps["options"]) => o.showBattery && s.battery !== null,
  },
  {
    key: "showServices",
    render: (s: BeszelSystemRow, t: SystemCardProps["t"], sz: SizeConfig) => (
      <MetricRow
        key="svc"
        icon={<Server size={sz.iconSize} />}
        label={t("metric.services")}
        value={String(s.services)}
        size={sz}
      />
    ),
    visible: (s: BeszelSystemRow, o: SystemCardProps["options"]) => o.showServices,
  },
  {
    key: "showUptime",
    render: (s: BeszelSystemRow, t: SystemCardProps["t"], sz: SizeConfig) => (
      <MetricRow
        key="up"
        icon={<Activity size={sz.iconSize} />}
        label={t("metric.uptime")}
        value={formatUptime(s.uptime)}
        size={sz}
      />
    ),
    visible: (s: BeszelSystemRow, o: SystemCardProps["options"]) => o.showUptime,
  },
  {
    key: "showAgent",
    render: (s: BeszelSystemRow, t: SystemCardProps["t"], sz: SizeConfig) => (
      <MetricRow
        key="agent"
        icon={<Wifi size={sz.iconSize} />}
        label={t("metric.agent")}
        value={s.agentVersion}
        size={sz}
      />
    ),
    visible: (s: BeszelSystemRow, o: SystemCardProps["options"]) => o.showAgent,
  },
] as const;

const SystemCard = ({ system, options, t, size, maxMetrics, itemRadius, onClick }: SystemCardProps) => {
  const enabledMetrics = metricRenderers.filter((metric) => metric.visible(system, options));
  const visibleMetrics = enabledMetrics.slice(0, maxMetrics);
  const hiddenMetricCount = enabledMetrics.length - visibleMetrics.length;

  return (
    <Card
      component="button"
      type="button"
      disabled={!onClick}
      padding={size.cardPadding}
      radius={itemRadius}
      bg="transparent"
      h="100%"
      onClick={onClick}
      className={onClick ? classes.clickableCard : undefined}
      style={{
        overflow: "hidden",
        display: "flex",
        flexDirection: "column" as const,
        border: "0.0625rem solid var(--border-color)",
        color: "inherit",
        font: "inherit",
        textAlign: "left",
        width: "100%",
      }}
    >
      <Group gap="xs" mb={2}>
        <Badge
          size={size.badgeSize}
          variant="dot"
          color={statusColorMap[system.status]}
          styles={{ root: { textTransform: "none" } }}
        >
          {system.name}
        </Badge>
      </Group>

      <Stack gap={0} style={{ flex: 1 }} justify="space-evenly">
        {visibleMetrics.map((m) => m.render(system, t, size))}
      </Stack>
      {hiddenMetricCount > 0 && (
        <Text size="10px" c="dimmed" ta="right">
          +{hiddenMetricCount}
        </Text>
      )}
    </Card>
  );
};

export default function BeszelSystemGridWidget({
  options,
  integrationIds,
  isEditMode,
  width,
  height,
}: WidgetComponentProps<"beszelSystemGrid">) {
  const t = useScopedI18n("widget.beszelSystemGrid");
  const board = useRequiredBoard();
  const { openModal } = useModalAction(BeszelSystemStatsModal);

  const systemsQuery = clientApi.widget.beszel.getSystems.useQuery({ integrationIds });
  const results = getUsableWidgetQueryData(systemsQuery) ?? [];
  const { isPending } = systemsQuery;

  const filteredSystems = useBeszelFilteredSystems(results, options.statusFilter);

  if (isPending) {
    return (
      <Center h="100%">
        <Loader size="sm" />
      </Center>
    );
  }

  if (filteredSystems.length === 0) {
    return (
      <Box h="100%" pos="relative" style={{ pointerEvents: isEditMode ? "none" : undefined }}>
        <IntegrationErrorIndicator results={results} />
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

  const cols = getColCount(width, height, filteredSystems.length);
  const rows = Math.ceil(filteredSystems.length / cols) || 1;
  const rawCellHeight = height / rows;
  const minimumCellHeight = MIN_CELL_HEIGHT;
  const scrollEnabled = rawCellHeight < minimumCellHeight;
  const effectiveCellHeight = scrollEnabled ? minimumCellHeight : rawCellHeight;
  const cellWidth = width / cols;
  const size = getSizeConfig(cellWidth, effectiveCellHeight);
  const maxMetrics = getMaxVisibleMetrics(effectiveCellHeight, size);

  return (
    <Box h="100%" pos="relative" style={{ pointerEvents: isEditMode ? "none" : undefined }}>
      <IntegrationErrorIndicator results={results} />
      <Box
        h="100%"
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gridTemplateRows: scrollEnabled ? `repeat(${rows}, ${minimumCellHeight}px)` : `repeat(${rows}, 1fr)`,
          gap: size.gap,
          overflow: scrollEnabled ? "auto" : "hidden",
        }}
      >
        {filteredSystems.map((system) => {
          const integrationId = system._key.split(":")[0] ?? "";
          const handleClick = isEditMode
            ? undefined
            : () => openModal({ integrationId, systemId: system.id }, { title: system.name });
          return (
            <SystemCard
              key={system._key}
              system={system}
              options={options}
              t={t}
              size={size}
              maxMetrics={maxMetrics}
              itemRadius={board.itemRadius}
              onClick={handleClick}
            />
          );
        })}
      </Box>
    </Box>
  );
}
