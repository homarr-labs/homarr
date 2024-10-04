"use client";

import { useState } from "react";
import {
  ActionIcon,
  Box,
  Card,
  Center,
  Divider,
  Flex,
  Group,
  Indicator,
  List,
  Modal,
  Progress,
  RingProgress,
  ScrollArea,
  Stack,
  Text,
  Tooltip,
} from "@mantine/core";
import { useDisclosure, useElementSize } from "@mantine/hooks";
import {
  IconBrain,
  IconClock,
  IconCpu,
  IconCpu2,
  IconFileReport,
  IconInfoCircle,
  IconServer,
  IconTemperature,
  IconVersions,
} from "@tabler/icons-react";
import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";

import { clientApi } from "@homarr/api/client";
import type { TranslationFunction } from "@homarr/translation";
import { useI18n } from "@homarr/translation/client";

import type { WidgetComponentProps } from "../definition";
import { NoIntegrationSelectedError } from "../errors";

export default function HealthMonitoringWidget({
  options,
  integrationIds,
  serverData,
}: WidgetComponentProps<"healthMonitoring">) {
  const t = useI18n();
  const [healthData, setHealthData] = useState(serverData?.initialData ?? []);
  const [opened, { open, close }] = useDisclosure(false);

  clientApi.widget.healthMonitoring.subscribeHealthStatus.useSubscription(
    { integrationIds },
    {
      onData(newData) {
        setHealthData((prevData) => {
          return prevData.map((item) =>
            item.integrationId === newData.integrationId ? { ...item, healthInfo: newData.healthInfo } : item,
          );
        });
      },
    },
  );

  if (integrationIds.length === 0) {
    throw new NoIntegrationSelectedError();
  }
  return (
    <Box h="100%" className="health-monitoring">
      <ScrollArea className="health-monitoring-scroll-area">
        {healthData.map(({ integrationId, integrationName, healthInfo, timestamp }) => {
          const memoryUsage = formatMemoryUsage(healthInfo.memAvailable, healthInfo.memUsed);
          const disksData = matchFileSystemAndSmart(healthInfo.fileSystem, healthInfo.smart);
          const { ref, width } = useElementSize();
          const ringSize = width * 0.95;
          const ringThickness = width / 10;
          const progressSize = width * 0.2;

          return (
            <Box
              key={integrationId}
              h="100%"
              className={`health-monitoring-information health-monitoring-${integrationName}`}
            >
              <Card className="health-monitoring-information-card" m="2.5cqmin" p="2.5cqmin" withBorder>
                <Flex
                  className="health-monitoring-information-card-elements"
                  h="100%"
                  w="100%"
                  justify="space-between"
                  align="center"
                  key={integrationId}
                >
                  <Box className="health-monitoring-information-card-section">
                    <Indicator
                      className="health-monitoring-updates-reboot-indicator"
                      inline
                      processing
                      color={healthInfo.rebootRequired ? "red" : healthInfo.availablePkgUpdates > 0 ? "blue" : "gray"}
                      position="top-end"
                      size="4cqmin"
                      label={healthInfo.availablePkgUpdates > 0 ? healthInfo.availablePkgUpdates : undefined}
                      disabled={!healthInfo.rebootRequired && healthInfo.availablePkgUpdates === 0}
                    >
                      <ActionIcon
                        className="health-monitoring-information-action-icon"
                        variant="default"
                        size="10cqmin"
                        radius="sm"
                        onClick={open}
                      >
                        <IconInfoCircle className="health-monitoring-information-icon" size="8cqmin" />
                      </ActionIcon>
                    </Indicator>
                    <Modal
                      opened={opened}
                      onClose={close}
                      size="auto"
                      title={t("widget.healthMonitoring.popover.information")}
                      centered
                    >
                      <Stack gap="10px" className="health-monitoring-modal-stack">
                        <Divider />
                        <List className="health-monitoring-information-list" center spacing="0.5cqmin">
                          <List.Item
                            className="health-monitoring-information-processor"
                            icon={<IconCpu2 size="1.5cqmin" />}
                          >
                            {t("common.rtl.default", {
                              value: t("widget.healthMonitoring.popover.processor"),
                              symbol: t("common.symbols.colon"),
                            })}{" "}
                            {healthInfo.cpuModelName}
                          </List.Item>
                          <List.Item
                            className="health-monitoring-information-memory"
                            icon={<IconBrain size="1.5cqmin" />}
                          >
                            {t("common.rtl.remainder", {
                              value: t("widget.healthMonitoring.popover.memory"),
                              symbol: t("common.symbols.colon"),
                              remainder: `${memoryUsage.memTotal.GB}GiB`,
                            })}
                          </List.Item>
                          <List.Item
                            className="health-monitoring-information-memory-available"
                            icon={<IconBrain size="1.5cqmin" />}
                          >
                            {t("common.rtl.remainder", {
                              value: t("widget.healthMonitoring.popover.available"),
                              symbol: t("common.symbols.colon"),
                              remainder: `${memoryUsage.memFree.GB}GiB (${memoryUsage.memFree.percent}%)`,
                            })}
                          </List.Item>
                          <List.Item
                            className="health-monitoring-information-version"
                            icon={<IconVersions size="1.5cqmin" />}
                          >
                            {t("common.rtl.default", {
                              value: t("widget.healthMonitoring.popover.version"),
                              symbol: t("common.symbols.colon"),
                            })}{" "}
                            {healthInfo.version}
                          </List.Item>
                          <List.Item
                            className="health-monitoring-information-uptime"
                            icon={<IconClock size="1.5cqmin" />}
                          >
                            {formatUptime(healthInfo.uptime, t)}
                          </List.Item>
                          <List.Item
                            className="health-monitoring-information-load-average"
                            icon={<IconCpu size="1.5cqmin" />}
                          >
                            {t("common.rtl.default", {
                              value: t("widget.healthMonitoring.popover.loadAverage"),
                              symbol: t("common.symbols.colon"),
                            })}
                          </List.Item>
                          <List m="0.5cqmin" withPadding center spacing="0.5cqmin" icon={<IconCpu size="1cqmin" />}>
                            <List.Item className="health-monitoring-information-load-average-1min">
                              {t("common.rtl.default", {
                                value: t("widget.healthMonitoring.popover.minute"),
                                symbol: t("common.symbols.colon"),
                              })}{" "}
                              {healthInfo.loadAverage["1min"]}
                            </List.Item>
                            <List.Item className="health-monitoring-information-load-average-5min">
                              {t("common.rtl.default", {
                                value: t("widget.healthMonitoring.popover.minutes", { count: 5 }),
                                symbol: t("common.symbols.colon"),
                              })}{" "}
                              {healthInfo.loadAverage["5min"]}
                            </List.Item>
                            <List.Item className="health-monitoring-information-load-average-15min">
                              {t("common.rtl.default", {
                                value: t("widget.healthMonitoring.popover.minutes", { count: 15 }),
                                symbol: t("common.symbols.colon"),
                              })}{" "}
                              {healthInfo.loadAverage["15min"]}
                            </List.Item>
                          </List>
                        </List>
                      </Stack>
                    </Modal>
                  </Box>
                  {options.cpu && (
                    <Box ref={ref} w="100%" h="100%" className="health-monitoring-cpu">
                      <RingProgress
                        className="health-monitoring-cpu-utilization"
                        roundCaps
                        size={ringSize}
                        thickness={ringThickness}
                        label={
                          <Center style={{ flexDirection: "column" }}>
                            <Text
                              className="health-monitoring-cpu-utilization-value"
                              size="3cqmin"
                            >{`${healthInfo.cpuUtilization.toFixed(2)}%`}</Text>
                            <IconCpu className="health-monitoring-cpu-utilization-icon" size="7cqmin" />
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
                    <Box ref={ref} w="100%" h="100%" className="health-monitoring-cpu-temperature">
                      <RingProgress
                        ref={ref}
                        className="health-monitoring-cpu-temp"
                        roundCaps
                        size={ringSize}
                        thickness={ringThickness}
                        label={
                          <Center style={{ flexDirection: "column" }}>
                            <Text className="health-monitoring-cpu-temp-value" size="3cqmin">
                              {options.fahrenheit
                                ? `${(healthInfo.cpuTemp * 1.8 + 32).toFixed(1)}°F`
                                : `${healthInfo.cpuTemp}°C`}
                            </Text>
                            <IconCpu className="health-monitoring-cpu-temp-icon" size="7cqmin" />
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
                    <Box ref={ref} w="100%" h="100%" className="health-monitoring-memory">
                      <RingProgress
                        className="health-monitoring-memory-use"
                        roundCaps
                        size={ringSize}
                        thickness={ringThickness}
                        label={
                          <Center style={{ flexDirection: "column" }}>
                            <Text className="health-monitoring-memory-value" size="3cqmin">
                              {memoryUsage.memUsed.GB}GiB
                            </Text>
                            <IconBrain className="health-monitoring-memory-icon" size="7cqmin" />
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
                <Text className="health-monitoring-status-update-time" c="dimmed" size="3.5cqmin" ta="center">
                  {t("common.rtl.remainder", {
                    value: t("widget.healthMonitoring.popover.lastSeen"),
                    symbol: t("common.symbols.colon"),
                    remainder: dayjs(timestamp).fromNow(),
                  })}
                </Text>
              </Card>
              {options.fileSystem &&
                disksData.map((disk) => {
                  return (
                    <Card
                      className="health-monitoring-disk-card"
                      key={disk.deviceName}
                      m="2.5cqmin"
                      p="2.5cqmin"
                      withBorder
                    >
                      <Flex
                        className="health-monitoring-disk-status"
                        justify="space-between"
                        align="center"
                        m="1.5cqmin"
                      >
                        <Group gap="1cqmin">
                          <IconServer className="health-monitoring-disk-icon" size="5cqmin" />
                          <Text className="dihealth-monitoring-disk-name" size="4cqmin">
                            {disk.deviceName}
                          </Text>
                        </Group>
                        <Group gap="1cqmin">
                          <IconTemperature className="health-monitoring-disk-temperature-icon" size="5cqmin" />
                          <Text className="health-monitoring-disk-temperature-value" size="4cqmin">
                            {options.fahrenheit
                              ? `${(disk.temperature * 1.8 + 32).toFixed(1)}°F`
                              : `${disk.temperature}°C`}
                          </Text>
                        </Group>
                        <Group gap="1cqmin">
                          <IconFileReport className="health-monitoring-disk-status-icon" size="5cqmin" />
                          <Text className="health-monitoring-disk-status-value" size="4cqmin">
                            {disk.overallStatus}
                          </Text>
                        </Group>
                      </Flex>
                      <Progress.Root className="health-monitoring-disk-use" size={progressSize}>
                        <Tooltip label={disk.used}>
                          <Progress.Section
                            value={disk.percentage}
                            color={progressColor(disk.percentage)}
                            className="health-monitoring-disk-use-percentage"
                          >
                            <Progress.Label className="health-monitoring-disk-use-value">
                              {t("widget.healthMonitoring.popover.used")}
                            </Progress.Label>
                          </Progress.Section>
                        </Tooltip>

                        <Tooltip
                          label={
                            Number(disk.available) / 1024 ** 4 >= 1
                              ? `${(Number(disk.available) / 1024 ** 4).toFixed(2)} TiB`
                              : `${(Number(disk.available) / 1024 ** 3).toFixed(2)} GiB`
                          }
                        >
                          <Progress.Section
                            className="health-monitoring-disk-available-percentage"
                            value={100 - disk.percentage}
                            color="default"
                          >
                            <Progress.Label className="health-monitoring-disk-available-value">
                              {t("widget.healthMonitoring.popover.available")}
                            </Progress.Label>
                          </Progress.Section>
                        </Tooltip>
                      </Progress.Root>
                    </Card>
                  );
                })}
            </Box>
          );
        })}
      </ScrollArea>
    </Box>
  );
}

export const formatUptime = (uptimeInSeconds: number, t: TranslationFunction) => {
  dayjs.extend(duration);
  const uptimeDuration = dayjs.duration(uptimeInSeconds, "seconds");
  const days = uptimeDuration.days();
  const hours = uptimeDuration.hours();
  const minutes = uptimeDuration.minutes();
  const formattedUptime = `${days} ${t("common.information.days")}, ${hours} ${t("common.information.hours")}, ${minutes} ${t("common.information.minutes")}`;

  return t("common.rtl.remainder", {
    value: t("widget.healthMonitoring.popover.uptime"),
    symbol: t("common.symbols.colon"),
    remainder: formattedUptime,
  });
};

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
