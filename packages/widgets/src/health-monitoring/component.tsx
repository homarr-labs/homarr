"use client";

import {
  Avatar,
  Box,
  Card,
  Center,
  Flex,
  Group,
  HoverCard,
  Indicator,
  List,
  Progress,
  RingProgress,
  Text,
  Tooltip,
} from "@mantine/core";
import { useListState } from "@mantine/hooks";
import {
  IconBrain,
  IconClock,
  IconCpu,
  IconCpu2,
  IconFileReport,
  IconInfoSquare,
  IconServer,
  IconTemperature,
  IconVersions,
} from "@tabler/icons-react";

import type { HealthMonitoring } from "@homarr/integrations";
import { useI18n } from "@homarr/translation/client";

import type { WidgetComponentProps } from "../definition";
import { NoIntegrationSelectedError } from "../errors";

export default function HealthMonitoringWidget({
  options,
  integrationIds,
  serverData,
}: WidgetComponentProps<"healthMonitoring">) {
  if (integrationIds.length === 0) {
    throw new NoIntegrationSelectedError();
  }
  const t = useI18n();
  const [healthData] = useListState<{
    integrationId: string;
    healthInfo: HealthMonitoring;
  }>(serverData?.initialData ?? []);

  return (
    <Box>
      {healthData.map(({ integrationId, healthInfo }) => {
        const memoryUsage = formatMemoryUsage(healthInfo.memAvailable, healthInfo.memUsed);
        const disksData = matchFileSystemAndSmart(healthInfo.fileSystem, healthInfo.smart);

        return (
          <Box>
            <Card m="2.5cqmin" p="2.5cqmin" withBorder>
              <Flex justify="space-between" align="center" key={integrationId}>
                <HoverCard>
                  <HoverCard.Target>
                    <Indicator
                      inline
                      processing
                      color={healthInfo.rebootRequired ? "red" : healthInfo.availablePkgUpdates > 0 ? "blue" : "gray"}
                      position="top-end"
                      size={12}
                      label={healthInfo.availablePkgUpdates > 0 ? healthInfo.availablePkgUpdates : undefined}
                      disabled={!healthInfo.rebootRequired && healthInfo.availablePkgUpdates === 0}
                    >
                      <Avatar size="md" radius="sm">
                        <IconInfoSquare size={32} />
                      </Avatar>
                    </Indicator>
                  </HoverCard.Target>
                  <HoverCard.Dropdown>
                    <List center spacing="0.5cqmin">
                      <List.Item icon={<IconCpu2 size={16} />}>
                        {t("widget.healthMonitoring.popover.model")}: {healthInfo.cpuModelName}
                      </List.Item>
                      <List.Item icon={<IconVersions size={16} />}>
                        {t("widget.healthMonitoring.popover.version")}: {healthInfo.version}
                      </List.Item>
                      <List.Item icon={<IconClock size={16} />}>
                        {t("widget.healthMonitoring.popover.uptime")}: {formatUptime(healthInfo.uptime)}
                      </List.Item>
                    </List>
                  </HoverCard.Dropdown>
                </HoverCard>
                {options.cpu && (
                  <RingProgress
                    roundCaps
                    size={100}
                    thickness={12}
                    label={
                      <Center style={{ flexDirection: "column" }}>
                        <Text size="3cqmin">{`${healthInfo.cpuUtilization.toFixed(2)}%`}</Text>
                        <HoverCard>
                          <HoverCard.Target>
                            <IconCpu size={25} />
                          </HoverCard.Target>
                          <HoverCard.Dropdown>
                            <List center spacing="0.5cqmin" icon={<IconCpu2 size={16} />}>
                              <Text fw={700} td="underline">
                                {t("widget.healthMonitoring.popover.loadAverage")}
                              </Text>
                              <List.Item>
                                1 {t("widget.healthMonitoring.popover.minute")}: {healthInfo.loadAverage["1min"]}
                              </List.Item>
                              <List.Item>
                                5 {t("widget.healthMonitoring.popover.minutes")}: {healthInfo.loadAverage["5min"]}
                              </List.Item>
                              <List.Item>
                                15 {t("widget.healthMonitoring.popover.minutes")}: {healthInfo.loadAverage["15min"]}
                              </List.Item>
                            </List>
                          </HoverCard.Dropdown>
                        </HoverCard>
                      </Center>
                    }
                    sections={[
                      {
                        value: Number(healthInfo.cpuUtilization.toFixed(2)),
                        color: progressColor(Number(healthInfo.cpuUtilization.toFixed(2))),
                      },
                    ]}
                  />
                )}
                {healthInfo.cpuTemp && options.cpu && (
                  <RingProgress
                    roundCaps
                    size={100}
                    thickness={12}
                    label={
                      <Center style={{ flexDirection: "column" }}>
                        <Text size="3cqmin">
                          {options.fahrenheit
                            ? `${(healthInfo.cpuTemp * 1.8 + 32).toFixed(1)}°F`
                            : `${healthInfo.cpuTemp}°C`}
                        </Text>
                        <IconCpu size={25} />
                      </Center>
                    }
                    sections={[
                      {
                        value: healthInfo.cpuTemp,
                        color: progressColor(healthInfo.cpuTemp),
                      },
                    ]}
                  />
                )}
                {options.memory && (
                  <RingProgress
                    roundCaps
                    size={100}
                    thickness={12}
                    label={
                      <Center style={{ flexDirection: "column" }}>
                        <Text size="3cqmin">{memoryUsage.memUsed.GB}GiB</Text>
                        <HoverCard>
                          <HoverCard.Target>
                            <IconBrain size={25} />
                          </HoverCard.Target>
                          <HoverCard.Dropdown>
                            <List center spacing="0.5cqmin" icon={<IconBrain size={16} />}>
                              <List.Item>
                                {t("widget.healthMonitoring.popover.total")}: {memoryUsage.memTotal.GB}GiB
                              </List.Item>
                              <List.Item>
                                {t("widget.healthMonitoring.popover.available")}: {memoryUsage.memFree.GB}GiB (
                                {memoryUsage.memFree.percent}%)
                              </List.Item>
                            </List>
                          </HoverCard.Dropdown>
                        </HoverCard>
                      </Center>
                    }
                    sections={[
                      {
                        value: Number(memoryUsage.memUsed.percent),
                        color: progressColor(Number(memoryUsage.memUsed.percent)),
                        tooltip: `${memoryUsage.memUsed.percent}%`,
                      },
                    ]}
                  />
                )}
              </Flex>
            </Card>
            {options.fileSystem &&
              disksData.map((disk) => {
                return (
                  <Card key={disk.deviceName} m="2.5cqmin" p="2.5cqmin" withBorder>
                    <Flex justify="space-between" align="center" m="1.5cqmin">
                      <Group gap="1cqmin">
                        <IconServer size={18} />
                        {disk.deviceName}
                      </Group>
                      <Group gap="1cqmin">
                        <IconTemperature size={18} />{" "}
                        {options.fahrenheit ? `${(disk.temperature * 1.8 + 32).toFixed(1)}°F` : `${disk.temperature}°C`}
                      </Group>
                      <Group gap="1cqmin">
                        <IconFileReport size={18} />
                        {disk.overallStatus}
                      </Group>
                    </Flex>
                    <Progress.Root size={20}>
                      <Tooltip label={disk.used}>
                        <Progress.Section value={disk.percentage} color={progressColor(disk.percentage)}>
                          <Progress.Label>{t("widget.healthMonitoring.popover.used")}</Progress.Label>
                        </Progress.Section>
                      </Tooltip>

                      <Tooltip
                        label={
                          Number(disk.available) / 1024 ** 4 >= 1
                            ? `${(Number(disk.available) / 1024 ** 4).toFixed(2)} TiB`
                            : `${(Number(disk.available) / 1024 ** 3).toFixed(2)} GiB`
                        }
                      >
                        <Progress.Section value={100 - disk.percentage} color="default">
                          <Progress.Label>{t("widget.healthMonitoring.popover.available")}</Progress.Label>
                        </Progress.Section>
                      </Tooltip>
                    </Progress.Root>
                  </Card>
                );
              })}
          </Box>
        );
      })}
    </Box>
  );
}

export const progressColor = (percentage: number) => {
  if (percentage < 40) return "green";
  else if (percentage < 60) return "yellow";
  else if (percentage < 90) return "orange";
  else return "red";
};

interface FileSystem {
  deviceName: string;
  used: string;
  available: string;
  percentage: number;
}

interface SmartData {
  deviceName: string;
  temperature: number;
  overallStatus: string;
}

export const matchFileSystemAndSmart = (fileSystems: FileSystem[], smartData: SmartData[]) => {
  return fileSystems.map((fileSystem) => {
    const baseDeviceName = fileSystem.deviceName.replace(/[0-9]+$/, "");
    const smartDisk = smartData.find((smart) => smart.deviceName === baseDeviceName);

    return {
      deviceName: smartDisk?.deviceName ?? fileSystem.deviceName,
      used: fileSystem.used,
      available: fileSystem.available,
      percentage: fileSystem.percentage,
      temperature: smartDisk?.temperature ?? 0,
      overallStatus: smartDisk?.overallStatus ?? "",
    };
  });
};

export const formatUptime = (uptime: number) => {
  const days = Math.floor(uptime / (60 * 60 * 24));
  const remainingHours = Math.floor((uptime % (60 * 60 * 24)) / 3600);
  return `${days} days, ${remainingHours} hours`;
};

export const formatMemoryUsage = (memFree: string, memUsed: string) => {
  const memFreeBytes = Number(memFree);
  const memUsedBytes = Number(memUsed);
  const totalMemory = memFreeBytes + memUsedBytes;
  const memFreeGB = (memFreeBytes / 1024 ** 3).toFixed(2);
  const memUsedGB = (memUsedBytes / 1024 ** 3).toFixed(2);
  const memFreePercent = Math.round((memFreeBytes / totalMemory) * 100);
  const memUsedPercent = Math.round((memUsedBytes / totalMemory) * 100);
  const memTotalGB = (totalMemory / 1024 ** 3).toFixed(2);

  return {
    memFree: { percent: memFreePercent, GB: memFreeGB },
    memUsed: { percent: memUsedPercent, GB: memUsedGB },
    memTotal: { GB: memTotalGB },
  };
};
