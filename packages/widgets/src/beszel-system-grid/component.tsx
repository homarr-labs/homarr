"use client";

import { useMemo } from "react";
import { Badge, Card, Group, Progress, ScrollArea, SimpleGrid, Text, Stack } from "@mantine/core";
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

import { clientApi } from "@homarr/api/client";
import { useScopedI18n } from "@homarr/translation/client";

import type { WidgetComponentProps } from "../definition";
import type { BeszelSystemRow } from "../beszel/_shared/types";
import { statusColorMap, thresholdColor, loadAvgColor } from "../beszel/_shared/colors";
import { formatBytes, formatLoadAvg, formatPercent, formatTemp, formatUptime } from "../beszel/_shared/format";

const ICON_SIZE = 14;

interface MetricRowProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  progress?: { value: number; color: string };
}

const MetricRow = ({ icon, label, value, progress }: MetricRowProps) => (
  <Group gap="xs" wrap="nowrap" py={2}>
    {icon}
    <Text size="xs" c="dimmed" miw={55}>
      {label}
    </Text>
    {progress ? (
      <Group gap={6} wrap="nowrap" style={{ flex: 1 }}>
        <Text size="xs" fw={500} miw={38} ta="right">
          {value}
        </Text>
        <Progress value={progress.value} color={progress.color} size="sm" style={{ flex: 1 }} />
      </Group>
    ) : (
      <Text size="xs" fw={500}>
        {value}
      </Text>
    )}
  </Group>
);

const SystemCard = ({ system, options, t }: { system: BeszelSystemRow & { _key: string }; options: WidgetComponentProps<"beszelSystemGrid">["options"]; t: ReturnType<typeof useScopedI18n<"widget.beszelSystemGrid">> }) => (
  <Card padding={6} radius="sm" withBorder>
    <Group gap="xs" mb={4}>
      <Badge
        size="xs"
        variant="dot"
        color={statusColorMap[system.status]}
        styles={{ root: { textTransform: "none" } }}
      >
        {system.name}
      </Badge>
    </Group>

    <Stack gap={0}>
      {options.showCpu && (
        <MetricRow
          icon={<Cpu size={ICON_SIZE} />}
          label={t("metric.cpu")}
          value={formatPercent(system.cpu)}
          progress={{ value: system.cpu, color: thresholdColor(system.cpu) }}
        />
      )}
      {options.showMemory && (
        <MetricRow
          icon={<MemoryStick size={ICON_SIZE} />}
          label={t("metric.memory")}
          value={formatPercent(system.memory)}
          progress={{ value: system.memory, color: thresholdColor(system.memory) }}
        />
      )}
      {options.showDisk && (
        <MetricRow
          icon={<HardDrive size={ICON_SIZE} />}
          label={t("metric.disk")}
          value={formatPercent(system.disk)}
          progress={{ value: system.disk, color: thresholdColor(system.disk) }}
        />
      )}
      {options.showGpu && system.gpu > 0 && (
        <MetricRow
          icon={<Monitor size={ICON_SIZE} />}
          label={t("metric.gpu")}
          value={formatPercent(system.gpu)}
          progress={{ value: system.gpu, color: thresholdColor(system.gpu) }}
        />
      )}
      {options.showLoadAvg && system.loadAvg && (
        <MetricRow
          icon={<Activity size={ICON_SIZE} />}
          label={t("metric.loadAvg")}
          value={formatLoadAvg(system.loadAvg)}
        />
      )}
      {options.showNet && (
        <MetricRow
          icon={<Network size={ICON_SIZE} />}
          label={t("metric.net")}
          value={formatBytes(system.netBytes)}
        />
      )}
      {options.showTemp && system.temp !== null && (
        <MetricRow
          icon={<Thermometer size={ICON_SIZE} />}
          label={t("metric.temp")}
          value={formatTemp(system.temp, false)}
        />
      )}
      {options.showBattery && system.battery && (
        <MetricRow
          icon={system.battery[1] > 0 ? <BatteryCharging size={ICON_SIZE} /> : <Battery size={ICON_SIZE} />}
          label={t("metric.battery")}
          value={`${system.battery[0]}%`}
        />
      )}
      {options.showServices && (
        <MetricRow
          icon={<Server size={ICON_SIZE} />}
          label={t("metric.services")}
          value={String(system.services)}
        />
      )}
      {options.showUptime && (
        <MetricRow
          icon={<Activity size={ICON_SIZE} />}
          label={t("metric.uptime")}
          value={formatUptime(system.uptime)}
        />
      )}
      {options.showAgent && (
        <MetricRow
          icon={<Wifi size={ICON_SIZE} />}
          label={t("metric.agent")}
          value={system.agentVersion}
        />
      )}
    </Stack>
  </Card>
);

export default function BeszelSystemGridWidget({
  options,
  integrationIds,
  width,
}: WidgetComponentProps<"beszelSystemGrid">) {
  const t = useScopedI18n("widget.beszelSystemGrid");
  const [results] = clientApi.widget.beszel.getSystems.useSuspenseQuery({ integrationIds });
  const utils = clientApi.useUtils();

  clientApi.widget.beszel.subscribeSystems.useSubscription(
    { integrationIds },
    {
      onData(data) {
        utils.widget.beszel.getSystems.setData({ integrationIds }, (prev) => {
          if (!prev) return prev;
          return prev.map((r) =>
            r.integrationId === data.integrationId ? { ...r, systems: data.systems, updatedAt: data.timestamp } : r,
          );
        });
      },
    },
  );

  const allSystems = useMemo(
    () => results.flatMap((r) => r.systems.map((s) => ({ ...s, _key: `${r.integrationId}:${s.id}` }))),
    [results],
  );

  const filteredSystems = useMemo(() => {
    if (options.statusFilter === "all") return allSystems;
    return allSystems.filter((s) => s.status === options.statusFilter);
  }, [allSystems, options.statusFilter]);

  const getColCount = (w: number) => {
    if (w > 1200) return 4;
    if (w > 800) return 3;
    if (w > 500) return 2;
    return 1;
  };

  return (
    <ScrollArea h="100%">
      <SimpleGrid cols={getColCount(width)} spacing="xs" p={0}>
        {filteredSystems.map((system) => (
          <SystemCard key={system._key} system={system} options={options} t={t} />
        ))}
      </SimpleGrid>
    </ScrollArea>
  );
}
