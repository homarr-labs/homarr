"use client";

import { useState } from "react";

import {
  ActionIcon,
  Box,
  Card,
  Divider,
  Flex,
  Group,
  Indicator,
  List,
  Modal,
  Progress,
  ScrollArea,
  Stack,
  Text,
} from "@mantine/core";
import {
  IconBrain,
  IconClock,
  IconCpu,
  IconCpu2,
  IconFileReport,
  IconInfoCircle,
  IconPackages,
  IconRefreshAlert,
  IconServer,
  IconTemperature,
  IconVersions,
} from "@tabler/icons-react";
import combineClasses from "clsx";
import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";

import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import { useRequiredBoard } from "@homarr/boards/context";
import { formatBytes } from "@homarr/common";
import type { ScopedTranslationFunction } from "@homarr/translation";
import { useI18n } from "@homarr/translation/client";
import { zoomCompensatedSize } from "@homarr/ui";

import { filterStorageVolumes, normalizeStorageDeviceName } from "../filter-storage-volumes";
import { WidgetEmptyState } from "../common/empty-state";
import { IntegrationErrorIndicator } from "../common/integration-error-indicator";
import { getUsableWidgetQueryData, isInitialWidgetQueryPending } from "../common/query-state";
import { WidgetQueryLoadingState } from "../common/query-state-indicator";
import type { WidgetComponentProps } from "../definition";
import actionTargetClasses from "../common/action-target.module.css";
import { CpuRing } from "./rings/cpu-ring";
import { CpuTempRing } from "./rings/cpu-temp-ring";
import { GpuRing } from "./rings/gpu-ring";
import { formatMemoryUsage, MemoryRing } from "./rings/memory-ring";
import classes from "./system-health.module.css";

dayjs.extend(duration);

export const SystemHealthMonitoring = ({
  options,
  integrationIds,
  width,
  displayMode,
  withScrollArea = true,
}: WidgetComponentProps<"healthMonitoring"> & { withScrollArea?: boolean }) => {
  const t = useI18n("widget.healthMonitoring");
  const healthQuery = clientApi.widget.healthMonitoring.getSystemHealthStatus.useQuery({ integrationIds });
  const healthResults = getUsableWidgetQueryData(healthQuery) ?? [];
  const healthData = healthResults.filter(
    (entry): entry is typeof entry & { healthInfo: NonNullable<typeof entry.healthInfo> } => entry.healthInfo !== null,
  );
  const [openedIntegrationId, setOpenedIntegrationId] = useState<string | null>(null);
  const board = useRequiredBoard();

  const isAdvanced = displayMode === "advanced";
  const isTiny = !isAdvanced && width < 256;
  const showCpu = isAdvanced || options.cpu;
  const showMemory = isAdvanced || options.memory;
  const showGpu = isAdvanced || options.gpu;
  const showFileSystem = isAdvanced || options.fileSystem;
  const queryIndicators = (
    <Group gap={0}>
      <IntegrationErrorIndicator results={healthResults} />
    </Group>
  );

  if (isInitialWidgetQueryPending(healthQuery)) return <WidgetQueryLoadingState />;
  if (healthData.length === 0) {
    return (
      <Box h="100%" pos="relative">
        <Box pos="absolute" top={4} right={8} style={{ zIndex: 2 }}>
          {queryIndicators}
        </Box>
        <WidgetEmptyState />
      </Box>
    );
  }

  const Container = withScrollArea ? ScrollArea : Box;

  return (
    <Container h={withScrollArea ? "100%" : undefined} pos="relative">
      <Box pos="absolute" top={4} right={8} style={{ zIndex: 2 }}>
        {queryIndicators}
      </Box>
      <Stack mih="100%" gap="sm" className="health-monitoring">
        {healthData.map(({ integrationId, integrationName, healthInfo }) => {
          const filteredFileSystem = filterStorageVolumes(
            healthInfo.fileSystem,
            options.visibleStorageVolumes,
            integrationId,
          );
          const filteredSmart = filterStorageVolumes(healthInfo.smart, options.visibleStorageVolumes, integrationId);
          const disksData = matchFileSystemAndSmart(filteredFileSystem, filteredSmart);
          const memoryUsage = formatMemoryUsage(healthInfo.memAvailableInBytes, healthInfo.memUsedInBytes);
          const hasAttentionState = healthInfo.rebootRequired || healthInfo.availablePkgUpdates > 0;
          return (
            <Stack
              gap="sm"
              key={integrationId}
              h={!isAdvanced && healthData.length === 1 ? "100%" : "auto"}
              className={combineClasses(
                `health-monitoring-information health-monitoring-${integrationName}`,
                classes.systemPanel,
              )}
              p="sm"
              pos="relative"
            >
              <Box
                className={combineClasses(
                  "health-monitoring-information-card-section",
                  classes.infoAction,
                  !isAdvanced && !hasAttentionState && classes.infoActionCompact,
                )}
                pos="absolute"
                top={8}
                right={8}
              >
                <Indicator
                  className="health-monitoring-updates-reboot-indicator"
                  inline
                  processing
                  styles={{ indicator: { pointerEvents: "none" } }}
                  color={healthInfo.rebootRequired ? "red" : healthInfo.availablePkgUpdates > 0 ? "blue" : "gray"}
                  position="top-end"
                  size={16}
                  label={healthInfo.availablePkgUpdates > 0 ? healthInfo.availablePkgUpdates : undefined}
                  disabled={!healthInfo.rebootRequired && healthInfo.availablePkgUpdates === 0}
                >
                  <ActionIcon
                    className={combineClasses("health-monitoring-information-icon-avatar", actionTargetClasses.root)}
                    variant={"light"}
                    color="var(--mantine-color-text)"
                    size="sm"
                    radius={board.itemRadius}
                    onClick={() => setOpenedIntegrationId(integrationId)}
                    aria-label={t("popover.information")}
                  >
                    <IconInfoCircle
                      className="health-monitoring-information-icon"
                      style={zoomCompensatedSize(30)}
                    />
                  </ActionIcon>
                </Indicator>
                <Modal
                  opened={openedIntegrationId === integrationId}
                  onClose={() => setOpenedIntegrationId(null)}
                  size="auto"
                  title={t("popover.information")}
                  centered
                >
                  <Stack gap="10px" className="health-monitoring-modal-stack">
                    <Divider />
                    <SystemInformationList healthInfo={healthInfo} memoryUsage={memoryUsage} t={t} />
                  </Stack>
                </Modal>
              </Box>
              <Flex className="health-monitoring-information-card-elements" justify="center" align="center" wrap="wrap">
                {showCpu && <CpuRing cpuUtilization={healthInfo.cpuUtilization} isTiny={isTiny} />}
                {showCpu && (
                  <CpuTempRing fahrenheit={options.fahrenheit} cpuTemp={healthInfo.cpuTemp} isTiny={isTiny} />
                )}
                {showMemory && (
                  <MemoryRing
                    available={healthInfo.memAvailableInBytes}
                    used={healthInfo.memUsedInBytes}
                    isTiny={isTiny}
                  />
                )}
                {showGpu &&
                  healthInfo.gpu.map((gpu) => (
                    <GpuRing key={gpu.gpuId} gpu={gpu} isTiny={isTiny} fahrenheit={options.fahrenheit} />
                  ))}
              </Flex>
              {isAdvanced && (
                <Card className={classes.card} radius={board.itemRadius} p="sm">
                  <SystemInformationList healthInfo={healthInfo} memoryUsage={memoryUsage} t={t} compact />
                </Card>
              )}
              {showFileSystem &&
                disksData.map((disk) => {
                  return (
                    <Card
                      className={combineClasses(
                        `health-monitoring-disk-card health-monitoring-disk-card-${integrationName}`,
                        classes.card,
                      )}
                      style={{ overflow: "visible" }}
                      key={disk.deviceName}
                      radius={board.itemRadius}
                      p="xs"
                    >
                      <Stack gap="xs">
                        <Group
                          className="health-monitoring-disk-status"
                          justify="space-between"
                          align="center"
                          wrap="wrap"
                          gap={8}
                        >
                          <Group gap={4} wrap="nowrap">
                            <IconServer className="health-monitoring-disk-icon" size="1rem" />
                            <Text className="dihealth-monitoring-disk-name" size="xs">
                              {disk.deviceName}
                            </Text>
                          </Group>
                          {disk.temperature !== null && (
                            <Group gap={4} wrap="nowrap">
                              <IconTemperature className="health-monitoring-disk-temperature-icon" size="1rem" />
                              <Text className="health-monitoring-disk-temperature-value" size="xs">
                                {options.fahrenheit
                                  ? `${(disk.temperature * 1.8 + 32).toFixed(1)}°F`
                                  : `${disk.temperature}°C`}
                              </Text>
                            </Group>
                          )}
                          <Group gap={4} wrap="nowrap">
                            <IconFileReport className="health-monitoring-disk-status-icon" size="1rem" />
                            <Text className="health-monitoring-disk-status-value" size="xs">
                              {disk.overallStatus ? disk.overallStatus : "N/A"}
                            </Text>
                          </Group>
                        </Group>
                        <Progress.Root className="health-monitoring-disk-use" radius={board.itemRadius} size="lg">
                          <Progress.Section
                            value={disk.percentage}
                            color={progressColor(disk.percentage)}
                            className="health-monitoring-disk-use-percentage"
                          />
                          <Progress.Section
                            className="health-monitoring-disk-available-percentage"
                            value={100 - disk.percentage}
                            color="default"
                          />
                        </Progress.Root>
                        <Group justify="space-between" gap={8} wrap="nowrap">
                          <Text className="health-monitoring-disk-use-value" size="xs" c="dimmed">
                            {t("popover.used")} {formatFileSize(disk.used)}
                          </Text>
                          <Text className="health-monitoring-disk-available-value" size="xs" c="dimmed">
                            {formatFileSize(disk.available)} {t("popover.available")}
                          </Text>
                        </Group>
                      </Stack>
                    </Card>
                  );
                })}
            </Stack>
          );
        })}
      </Stack>
    </Container>
  );
};

type HealthInfo = NonNullable<
  RouterOutputs["widget"]["healthMonitoring"]["getSystemHealthStatus"][number]["healthInfo"]
>;

const SystemInformationList = ({
  healthInfo,
  memoryUsage,
  t,
  compact = false,
}: {
  healthInfo: HealthInfo;
  memoryUsage: ReturnType<typeof formatMemoryUsage>;
  t: ScopedTranslationFunction<"widget.healthMonitoring">;
  compact?: boolean;
}) => {
  // compact is only true for the inline on-board card; the non-compact usage renders inside a portaled Modal,
  // which sits outside the zoomed canvas and must not be zoom-compensated.
  const iconSize = compact ? 18 : 30;
  const iconSizeProp = compact ? undefined : iconSize;
  const iconStyle = compact ? zoomCompensatedSize(iconSize) : undefined;
  return (
    <List
      className="health-monitoring-information-list"
      center
      spacing={compact ? 4 : "xs"}
      size={compact ? "sm" : undefined}
    >
      <List.Item
        className="health-monitoring-information-processor"
        icon={<IconCpu2 size={iconSizeProp} style={iconStyle} />}
      >
        {t("popover.processor", { cpuModelName: healthInfo.cpuModelName })}
      </List.Item>
      <List.Item
        className="health-monitoring-information-memory"
        icon={<IconBrain size={iconSizeProp} style={iconStyle} />}
      >
        {t("popover.memory", { memory: memoryUsage.memTotal.GB })}
      </List.Item>
      <List.Item
        className="health-monitoring-information-memory"
        icon={<IconBrain size={iconSizeProp} style={iconStyle} />}
      >
        {t("popover.memoryAvailable", {
          memoryAvailable: memoryUsage.memFree.GB,
          percent: String(memoryUsage.memFree.percent),
        })}
      </List.Item>
      <List.Item
        className="health-monitoring-information-version"
        icon={<IconVersions size={iconSizeProp} style={iconStyle} />}
      >
        {t("popover.version", { version: healthInfo.version })}
      </List.Item>
      <List.Item
        className="health-monitoring-information-uptime"
        icon={<IconClock size={iconSizeProp} style={iconStyle} />}
      >
        {formatUptime(healthInfo.uptime, t)}
      </List.Item>
      {healthInfo.loadAverage && (
        <List.Item
          className="health-monitoring-information-load-average"
          icon={<IconCpu size={iconSizeProp} style={iconStyle} />}
        >
          {t("popover.loadAverage")}: {healthInfo.loadAverage["1min"]}% / {healthInfo.loadAverage["5min"]}% /{" "}
          {healthInfo.loadAverage["15min"]}%
        </List.Item>
      )}
      <List.Item
        className="health-monitoring-information-updates"
        icon={<IconPackages size={iconSizeProp} style={iconStyle} />}
      >
        {t("popover.updatesAvailable", { count: healthInfo.availablePkgUpdates })}
      </List.Item>
      <List.Item
        className="health-monitoring-information-reboot"
        icon={<IconRefreshAlert size={iconSizeProp} style={iconStyle} />}
      >
        {healthInfo.rebootRequired ? t("popover.rebootRequired") : t("popover.rebootNotRequired")}
      </List.Item>
    </List>
  );
};

export const formatUptime = (uptimeInSeconds: number, t: ScopedTranslationFunction<"widget.healthMonitoring">) => {
  const uptimeDuration = dayjs.duration(uptimeInSeconds, "seconds");
  const months = uptimeDuration.months();
  const days = uptimeDuration.days();
  const hours = uptimeDuration.hours();
  const minutes = uptimeDuration.minutes();

  return t("popover.uptime", {
    months: String(months),
    days: String(days),
    hours: String(hours),
    minutes: String(minutes),
  });
};

export const progressColor = (percentage: number) => {
  if (percentage < 40) return "green";
  else if (percentage < 60) return "yellow";
  else if (percentage < 90) return "orange";
  else return "red";
};

// Some integrations report file sizes as raw bytes (e.g. TrueNAS, Glances) while others pre-format
// them (e.g. Unraid, dashdot). Format the former and pass the latter through untouched.
const formatFileSize = (value: string) => {
  const bytes = Number(value);
  return Number.isFinite(bytes) ? formatBytes(Math.round(bytes)) : value;
};

interface FileSystem {
  deviceName: string;
  used: string;
  available: string;
  percentage: number;
}

interface SmartData {
  deviceName: string;
  temperature: number | null;
  overallStatus: string;
}

export const matchFileSystemAndSmart = (fileSystems: FileSystem[], smartData: SmartData[]) => {
  return fileSystems
    .map((fileSystem) => {
      const normalizedFileSystemName = normalizeStorageDeviceName(fileSystem.deviceName);
      const smartDisk = smartData.find(
        (smart) =>
          smart.deviceName === fileSystem.deviceName ||
          normalizeStorageDeviceName(smart.deviceName) === normalizedFileSystemName,
      );

      return {
        deviceName: smartDisk?.deviceName ?? fileSystem.deviceName,
        used: fileSystem.used,
        available: fileSystem.available,
        percentage: fileSystem.percentage,
        temperature: smartDisk?.temperature ?? null,
        overallStatus: smartDisk?.overallStatus ?? "",
      };
    })
    .toSorted((fileSystemA, fileSystemB) => fileSystemA.deviceName.localeCompare(fileSystemB.deviceName));
};
