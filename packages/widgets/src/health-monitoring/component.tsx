"use client";

import {
  Avatar,
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

dayjs.extend(duration);

export default function HealthMonitoringWidget({ options, integrationIds }: WidgetComponentProps<"healthMonitoring">) {
  const t = useI18n();
  const [healthData] = clientApi.widget.healthMonitoring.getHealthStatus.useSuspenseQuery(
    {
      integrationIds,
    },
    {
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: false,
    },
  );
  const [opened, { open, close }] = useDisclosure(false);
  const utils = clientApi.useUtils();

  clientApi.widget.healthMonitoring.subscribeHealthStatus.useSubscription(
    { integrationIds },
    {
      onData(data) {
        utils.widget.healthMonitoring.getHealthStatus.setData({ integrationIds }, (prevData) => {
          if (!prevData) {
            return undefined;
          }
          const newData = prevData.map((item) =>
            item.integrationId === data.integrationId
              ? { ...item, healthInfo: data.healthInfo, updatedAt: data.timestamp }
              : item,
          );
          return newData;
        });
      },
    },
  );

  return (
    <Stack h="100%" gap="2.5cqmin" className="health-monitoring">
      {healthData.map(({ integrationId, integrationName, healthInfo, updatedAt }) => {
        const disksData = matchFileSystemAndSmart(healthInfo.fileSystem, healthInfo.smart);
        const memoryUsage = formatMemoryUsage(healthInfo.memAvailable, healthInfo.memUsed);
        return (
          <Stack
            gap="2.5cqmin"
            key={integrationId}
            h="100%"
            className={`health-monitoring-information health-monitoring-${integrationName}`}
            p="2.5cqmin"
          >
            <Card className="health-monitoring-information-card" p="2.5cqmin" withBorder>
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
                    <Avatar className="health-monitoring-information-icon-avatar" size="10cqmin" radius="sm">
                      <IconInfoCircle className="health-monitoring-information-icon" size="8cqmin" onClick={open} />
                    </Avatar>
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
                          {t("widget.healthMonitoring.popover.processor", { cpuModelName: healthInfo.cpuModelName })}
                        </List.Item>
                        <List.Item
                          className="health-monitoring-information-memory"
                          icon={<IconBrain size="1.5cqmin" />}
                        >
                          {t("widget.healthMonitoring.popover.memory", { memory: memoryUsage.memTotal.GB })}
                        </List.Item>
                        <List.Item
                          className="health-monitoring-information-memory"
                          icon={<IconBrain size="1.5cqmin" />}
                        >
                          {t("widget.healthMonitoring.popover.memoryAvailable", {
                            memoryAvailable: memoryUsage.memFree.GB,
                            percent: memoryUsage.memFree.percent,
                          })}
                        </List.Item>
                        <List.Item
                          className="health-monitoring-information-version"
                          icon={<IconVersions size="1.5cqmin" />}
                        >
                          {t("widget.healthMonitoring.popover.version", {
                            version: healthInfo.version,
                          })}
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
                          {t("widget.healthMonitoring.popover.loadAverage")}
                        </List.Item>
                        <List m="0.5cqmin" withPadding center spacing="0.5cqmin" icon={<IconCpu size="1cqmin" />}>
                          <List.Item className="health-monitoring-information-load-average-1min">
                            {t("widget.healthMonitoring.popover.minute")} {healthInfo.loadAverage["1min"]}%
                          </List.Item>
                          <List.Item className="health-monitoring-information-load-average-5min">
                            {t("widget.healthMonitoring.popover.minutes", { count: 5 })}{" "}
                            {healthInfo.loadAverage["5min"]}%
                          </List.Item>
                          <List.Item className="health-monitoring-information-load-average-15min">
                            {t("widget.healthMonitoring.popover.minutes", { count: 15 })}{" "}
                            {healthInfo.loadAverage["15min"]}%
                          </List.Item>
                        </List>
                      </List>
                    </Stack>
                  </Modal>
                </Box>
                {options.cpu && <CpuRing cpuUtilization={healthInfo.cpuUtilization} />}
                {healthInfo.cpuTemp && options.cpu && (
                  <CpuTempRing fahrenheit={options.fahrenheit} cpuTemp={healthInfo.cpuTemp} />
                )}
                {options.memory && <MemoryRing available={healthInfo.memAvailable} used={healthInfo.memUsed} />}
              </Flex>
              {
                <Text
                  className="health-monitoring-status-update-time"
                  c="dimmed"
                  size="3.5cqmin"
                  ta="center"
                  mb="2.5cqmin"
                >
                  {t("widget.healthMonitoring.popover.lastSeen", { lastSeen: dayjs(updatedAt).fromNow() })}
                </Text>
              }
            </Card>
            {options.fileSystem &&
              disksData.map((disk) => {
                return (
                  <Card
                    className={`health-monitoring-disk-card health-monitoring-disk-card-${integrationName}`}
                    key={disk.deviceName}
                    p="2.5cqmin"
                    withBorder
                  >
                    <Flex className="health-monitoring-disk-status" justify="space-between" align="center" m="1.5cqmin">
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
                    <Progress.Root className="health-monitoring-disk-use" h="6cqmin">
                      <Tooltip label={disk.used}>
                        <Progress.Section
                          value={disk.percentage}
                          color={progressColor(disk.percentage)}
                          className="health-monitoring-disk-use-percentage"
                        >
                          <Progress.Label className="health-monitoring-disk-use-value" fz="2.5cqmin">
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
                          <Progress.Label className="health-monitoring-disk-available-value" fz="2.5cqmin">
                            {t("widget.healthMonitoring.popover.available")}
                          </Progress.Label>
                        </Progress.Section>
                      </Tooltip>
                    </Progress.Root>
                  </Card>
                );
              })}
          </Stack>
        );
      })}
    </Stack>
  );
}

export const formatUptime = (uptimeInSeconds: number, t: TranslationFunction) => {
  const uptimeDuration = dayjs.duration(uptimeInSeconds, "seconds");
  const months = uptimeDuration.months();
  const days = uptimeDuration.days();
  const hours = uptimeDuration.hours();
  const minutes = uptimeDuration.minutes();

  return t("widget.healthMonitoring.popover.uptime", { months, days, hours, minutes });
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
  return fileSystems
    .map((fileSystem) => {
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
    })
    .sort((fileSystemA, fileSystemB) => fileSystemA.deviceName.localeCompare(fileSystemB.deviceName));
};

const CpuRing = ({ cpuUtilization }: { cpuUtilization: number }) => {
  const { width, ref } = useElementSize();

  return (
    <Box ref={ref} w="100%" h="100%" className="health-monitoring-cpu">
      <RingProgress
        className="health-monitoring-cpu-utilization"
        roundCaps
        size={width * 0.95}
        thickness={width / 10}
        label={
          <Center style={{ flexDirection: "column" }}>
            <Text
              className="health-monitoring-cpu-utilization-value"
              size="3cqmin"
            >{`${cpuUtilization.toFixed(2)}%`}</Text>
            <IconCpu className="health-monitoring-cpu-utilization-icon" size="7cqmin" />
          </Center>
        }
        sections={[
          {
            value: Number(cpuUtilization.toFixed(2)),
            color: progressColor(Number(cpuUtilization.toFixed(2))),
          },
        ]}
      />
    </Box>
  );
};

const CpuTempRing = ({ fahrenheit, cpuTemp }: { fahrenheit: boolean; cpuTemp: number }) => {
  const { width, ref } = useElementSize();
  return (
    <Box ref={ref} w="100%" h="100%" className="health-monitoring-cpu-temperature">
      <RingProgress
        className="health-monitoring-cpu-temp"
        roundCaps
        size={width * 0.95}
        thickness={width / 10}
        label={
          <Center style={{ flexDirection: "column" }}>
            <Text className="health-monitoring-cpu-temp-value" size="3cqmin">
              {fahrenheit ? `${(cpuTemp * 1.8 + 32).toFixed(1)}°F` : `${cpuTemp.toFixed(1)}°C`}
            </Text>
            <IconCpu className="health-monitoring-cpu-temp-icon" size="7cqmin" />
          </Center>
        }
        sections={[
          {
            value: cpuTemp,
            color: progressColor(cpuTemp),
          },
        ]}
      />
    </Box>
  );
};

const MemoryRing = ({ available, used }: { available: string; used: string }) => {
  const { width, ref } = useElementSize();
  const memoryUsage = formatMemoryUsage(available, used);

  return (
    <Box ref={ref} w="100%" h="100%" className="health-monitoring-memory">
      <RingProgress
        className="health-monitoring-memory-use"
        roundCaps
        size={width * 0.95}
        thickness={width / 10}
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
  );
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
