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
import { useElementSize, useListState } from "@mantine/hooks";
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
    <Box h="100%">
      {healthData.map(({ integrationId, healthInfo }) => {
        const memoryUsage = formatMemoryUsage(healthInfo.memAvailable, healthInfo.memUsed);
        const disksData = matchFileSystemAndSmart(healthInfo.fileSystem, healthInfo.smart);
        const { ref, width } = useElementSize();
        const ringSize = width * 0.95;
        const ringThickness = width / 10;
        const progressSize = width * 0.2;
        const formatUptime = (uptime: number) => {
          const days = Math.floor(uptime / (60 * 60 * 24));
          const remainingHours = Math.floor((uptime % (60 * 60 * 24)) / 3600);
          return t("widget.healthMonitoring.popover.uptime", { days, hours: remainingHours });
        };

        return (
          <Box key={integrationId} h="100%">
            <Card className="health-card" m="2.5cqmin" p="2.5cqmin" withBorder>
              <Flex
                className="health-card-elements"
                h="100%"
                w="100%"
                justify="space-between"
                align="center"
                key={integrationId}
              >
                <Box className="health-card-info">
                  <HoverCard>
                    <HoverCard.Target>
                      <Indicator
                        className="system-updates-reboot-indicator"
                        inline
                        processing
                        color={healthInfo.rebootRequired ? "red" : healthInfo.availablePkgUpdates > 0 ? "blue" : "gray"}
                        position="top-end"
                        size="4cqmin"
                        label={healthInfo.availablePkgUpdates > 0 ? healthInfo.availablePkgUpdates : undefined}
                        disabled={!healthInfo.rebootRequired && healthInfo.availablePkgUpdates === 0}
                      >
                        <Avatar className="health-info-avatar" size="10cqmin" radius="sm">
                          <IconInfoSquare className="health-info-icon" size="8cqmin" />
                        </Avatar>
                      </Indicator>
                    </HoverCard.Target>
                    <HoverCard.Dropdown>
                      <List className="system-info-dropdown-list" size="sm" center spacing="0.5cqmin">
                        <List.Item className="system-info-processor" icon={<IconCpu2 size="1cqmin" />}>
                          {t("widget.healthMonitoring.popover.processor")} {healthInfo.cpuModelName}
                        </List.Item>
                        <List.Item className="system-info-version" icon={<IconVersions size="1cqmin" />}>
                          {t("widget.healthMonitoring.popover.version")} {healthInfo.version}
                        </List.Item>
                        <List.Item className="system-info-uptime" icon={<IconClock size="1cqmin" />}>
                          {formatUptime(healthInfo.uptime)}
                        </List.Item>
                      </List>
                    </HoverCard.Dropdown>
                  </HoverCard>
                </Box>
                {options.cpu && (
                  <Box ref={ref} w="100%" h="100%">
                    <RingProgress
                      className="ring-cpu-utilization"
                      roundCaps
                      size={ringSize}
                      thickness={ringThickness}
                      label={
                        <Center style={{ flexDirection: "column" }}>
                          <Text
                            className="ring-cpu-text"
                            size="3cqmin"
                          >{`${healthInfo.cpuUtilization.toFixed(2)}%`}</Text>
                          <HoverCard>
                            <HoverCard.Target>
                              <IconCpu className="ring-cpu-icon" size="7cqmin" />
                            </HoverCard.Target>
                            <HoverCard.Dropdown>
                              <List
                                className="load-average-dropdown-list"
                                size="sm"
                                center
                                spacing="0.5cqmin"
                                icon={<IconCpu2 size="1cqmin" />}
                              >
                                <List.Item className="load-average-title" icon>
                                  {t("widget.healthMonitoring.popover.loadAverage")}
                                </List.Item>
                                <List.Item className="load-average-1min">
                                  {t("widget.healthMonitoring.popover.oneMinute")} {healthInfo.loadAverage["1min"]}
                                </List.Item>
                                <List.Item className="load-average-5min">
                                  {t("widget.healthMonitoring.popover.fiveMinutes")} {healthInfo.loadAverage["5min"]}
                                </List.Item>
                                <List.Item className="load-average-15min">
                                  {t("widget.healthMonitoring.popover.fifteenMinutes")}{" "}
                                  {healthInfo.loadAverage["15min"]}
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
                  </Box>
                )}
                {healthInfo.cpuTemp && options.cpu && (
                  <Box ref={ref} w="100%" h="100%">
                    <RingProgress
                      ref={ref}
                      className="ring-cpu-temp"
                      roundCaps
                      size={ringSize}
                      thickness={ringThickness}
                      label={
                        <Center style={{ flexDirection: "column" }}>
                          <Text className="ring-cpu-temp-text" size="3cqmin">
                            {options.fahrenheit
                              ? `${(healthInfo.cpuTemp * 1.8 + 32).toFixed(1)}°F`
                              : `${healthInfo.cpuTemp}°C`}
                          </Text>
                          <IconCpu className="ring-cpu-temp-icon" size="7cqmin" />
                        </Center>
                      }
                      sections={[
                        {
                          value: healthInfo.cpuTemp,
                          color: progressColor(healthInfo.cpuTemp),
                        },
                      ]}
                    />
                  </Box>
                )}
                {options.memory && (
                  <Box ref={ref} w="100%" h="100%">
                    <RingProgress
                      className="ring-memory"
                      roundCaps
                      size={ringSize}
                      thickness={ringThickness}
                      label={
                        <Center style={{ flexDirection: "column" }}>
                          <Text className="ring-memory-text" size="3cqmin">
                            {memoryUsage.memUsed.GB}GiB
                          </Text>
                          <HoverCard>
                            <HoverCard.Target>
                              <IconBrain className="ring-memory-icon" size="7cqmin" />
                            </HoverCard.Target>
                            <HoverCard.Dropdown>
                              <List
                                className="ring-memory-dropdown-list"
                                size="sm"
                                center
                                spacing="0.5cqmin"
                                icon={<IconBrain size="1cqmin" />}
                              >
                                <List.Item className="memory-total">
                                  {t("widget.healthMonitoring.popover.total")} {memoryUsage.memTotal.GB}GiB
                                </List.Item>
                                <List.Item className="memory-available">
                                  {t("widget.healthMonitoring.popover.memAvailable")} {memoryUsage.memFree.GB}GiB (
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
                  </Box>
                )}
              </Flex>
            </Card>
            {options.fileSystem &&
              disksData.map((disk) => {
                return (
                  <Card className="disk-card" key={disk.deviceName} m="2.5cqmin" p="2.5cqmin" withBorder>
                    <Flex className="disk-card-status" justify="space-between" align="center" m="1.5cqmin">
                      <Group gap="1cqmin">
                        <IconServer className="disk-icon" size="5cqmin" />
                        <Text className="disk-name" size="4cqmin">
                          {disk.deviceName}
                        </Text>
                      </Group>
                      <Group gap="1cqmin">
                        <IconTemperature className="disk-temperature-icon" size="5cqmin" />
                        <Text className="disk-temperature-value" size="4cqmin">
                          {options.fahrenheit
                            ? `${(disk.temperature * 1.8 + 32).toFixed(1)}°F`
                            : `${disk.temperature}°C`}
                        </Text>
                      </Group>
                      <Group gap="1cqmin">
                        <IconFileReport className="disk-status-icon" size="5cqmin" />
                        <Text className="disk-status" size="4cqmin">
                          {disk.overallStatus}
                        </Text>
                      </Group>
                    </Flex>
                    <Progress.Root className="disk-card-use" size={progressSize}>
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
                          <Progress.Label>{t("widget.healthMonitoring.popover.diskAvailable")}</Progress.Label>
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
