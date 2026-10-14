"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { MantineSize } from "@mantine/core";
import { Box, Card, Group, ScrollArea, SimpleGrid, Text, Tooltip, useComputedColorScheme } from "@mantine/core";

import type { SystemHealthMonitoring } from "@homarr/integrations/types";
import { formatBytesPair as formatBytesPairDefault } from "@homarr/common";
import { useI18n } from "@homarr/translation/client";

import { WidgetEmptyState } from "../common/empty-state";
import { WidgetQueryLoadingState } from "../common/query-state-indicator";
import type { WidgetComponentProps } from "../definition";

type DiskDisplayMode = WidgetComponentProps<"systemDisks">["options"]["displayMode"];

const advancedColumnBreakpoints = [
  { minimumWidth: 1820, columns: 7 },
  { minimumWidth: 1560, columns: 6 },
  { minimumWidth: 1300, columns: 5 },
  { minimumWidth: 1040, columns: 4 },
  { minimumWidth: 780, columns: 3 },
  { minimumWidth: 520, columns: 2 },
  { minimumWidth: 0, columns: 1 },
] as const;

const getSystemDisksLayout = (width: number, diskCount: number, isAdvanced: boolean) => {
  if (!isAdvanced) {
    return {
      columns: 1,
      showSecondaryText: false,
      showTemperature: true,
    };
  }

  const breakpoint = advancedColumnBreakpoints.find((candidate) => width >= candidate.minimumWidth);
  const columns = Math.min(diskCount, breakpoint?.columns ?? 1);
  return {
    columns: Math.max(1, columns),
    showSecondaryText: true,
    showTemperature: true,
  };
};

export const clampPercentage = (percentage: number): number => Math.min(100, Math.max(0, percentage));

export const getDisplayText = (
  item: { used: string; available: string; percentage: number },
  displayMode: DiskDisplayMode,
  translatedFreeText?: string,
  formatBytesPair: typeof formatBytesPairDefault = formatBytesPairDefault,
) => {
  switch (displayMode) {
    case "percentage":
      return `${Math.round(item.percentage)}%`;
    case "absolute": {
      const usedInBytes = Number(item.used);
      const availableInBytes = Number(item.available);
      if (Number.isFinite(usedInBytes) && Number.isFinite(availableInBytes)) {
        const { used, total } = formatBytesPair(usedInBytes, usedInBytes + availableInBytes);
        return `${used} / ${total}`;
      }
      return `${item.used} / ${item.available}`;
    }
    case "free":
      return translatedFreeText ?? `${Math.round(100 - clampPercentage(item.percentage))}% free`;
    default:
      return `${Math.round(item.percentage)}%`;
  }
};

export const getAdvancedDisplayTexts = (
  item: { used: string; available: string; percentage: number },
  translatedFreeText?: string,
  formatBytesPair: typeof formatBytesPairDefault = formatBytesPairDefault,
) => ({
  percentage: getDisplayText(item, "percentage"),
  absolute: getDisplayText(item, "absolute", undefined, formatBytesPair),
  free: getDisplayText(item, "free", translatedFreeText),
});

interface SystemDiskCardProps {
  itemRadius: MantineSize;
  deviceName: string;
  percentage: number;
  displayText: string;
  temperature: number | null | undefined;
  healthy: boolean;
  showBackgroundBar: boolean;
  integrationName?: string;
  secondaryText?: string;
  freeText?: string;
  smartStatus?: string;
  isAdvanced: boolean;
  showSecondaryText: boolean;
  showTemperature: boolean;
}

const SystemDiskCard = ({
  deviceName,
  percentage,
  displayText,
  temperature,
  healthy,
  showBackgroundBar,
  integrationName,
  secondaryText,
  freeText,
  smartStatus,
  isAdvanced,
  showSecondaryText,
  showTemperature,
  itemRadius,
}: SystemDiskCardProps) => {
  const colorScheme = useComputedColorScheme("light");
  const t = useI18n("widget.systemDisks");
  const valueRef = useRef<HTMLParagraphElement>(null);
  const [valueFits, setValueFits] = useState(true);

  useEffect(() => {
    const value = valueRef.current;
    const card = value?.offsetParent;
    if (!value || !card) return;
    const measure = () => {
      setValueFits(value.getBoundingClientRect().bottom <= card.getBoundingClientRect().bottom + 1);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(card);
    observer.observe(value);
    return () => observer.disconnect();
  }, []);

  const unhealthyLabel = t("status.unhealthy");
  const hasTemperature = temperature !== null && temperature !== undefined;
  const temperatureText = hasTemperature ? `${temperature}°C` : "—°C";
  const hasHiddenTemperature = hasTemperature && !showTemperature;
  const hasHiddenSecondaryText = Boolean(secondaryText && secondaryText !== displayText && !showSecondaryText);
  const tooltipLabel = [
    healthy ? displayText : `${displayText} (${unhealthyLabel})`,
    hasHiddenSecondaryText ? secondaryText : null,
    hasHiddenTemperature ? `${temperature}°C` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const backgroundColor = "rgb(from var(--mantine-color-primaryColor-filled) r g b / calc(var(--opacity, 1) * 0.12))";
  const borderColor = "rgb(from var(--mantine-color-secondaryColor-filled) r g b / calc(var(--opacity, 1) * 0.45))";
  const legacyBackground = colorScheme === "dark" ? "dark.7" : "gray.1";
  const cardBackground = isAdvanced ? backgroundColor : legacyBackground;
  const progressBackground = healthy ? "var(--mantine-color-green-light)" : "var(--mantine-color-red-light)";
  const legacyProgressColor = healthy ? "green" : "red";

  return (
    <Tooltip
      label={tooltipLabel}
      disabled={valueFits && !hasHiddenTemperature && !hasHiddenSecondaryText}
      position="top"
      withinPortal
    >
      <Card
        radius={itemRadius}
        py="xs"
        withBorder={isAdvanced}
        bg={cardBackground}
        style={{ overflow: "hidden", position: "relative", borderColor: isAdvanced ? borderColor : undefined }}
      >
        <Group justify="space-between" wrap="nowrap" style={{ zIndex: 1, minWidth: 0 }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <Text fw={700} size={isAdvanced ? "sm" : undefined} truncate="end">
              {deviceName}
            </Text>
            {integrationName && (
              <Text size="xs" c="dimmed" truncate="end">
                {integrationName}
              </Text>
            )}
            <Text
              ref={valueRef}
              size={isAdvanced ? "sm" : undefined}
              style={{ visibility: valueFits ? "visible" : "hidden" }}
            >
              <span>{displayText}</span>
              {!healthy && <span style={{ marginLeft: 5 }}>{unhealthyLabel}</span>}
            </Text>
            {showSecondaryText && secondaryText && secondaryText !== displayText && (
              <Text size="xs" c="dimmed">
                {secondaryText}
              </Text>
            )}
            {isAdvanced && freeText && freeText !== displayText && (
              <Text size="xs" c="dimmed">
                {freeText}
              </Text>
            )}
            {isAdvanced && (
              <Text size="xs" c={healthy ? "dimmed" : "red"}>
                {t("status.smart")}: {smartStatus?.trim() || "—"}
              </Text>
            )}
          </div>
          <div style={{ flexShrink: 0 }}>
            {showTemperature && (hasTemperature || isAdvanced) ? (
              <Text size={isAdvanced ? "sm" : undefined}>{temperatureText}</Text>
            ) : null}
          </div>
        </Group>
        <Box
          bg={isAdvanced ? undefined : legacyProgressColor}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: `${clampPercentage(percentage)}%`,
            height: "100%",
            zIndex: 0,
            display: showBackgroundBar ? "block" : "none",
            backgroundColor: isAdvanced ? progressBackground : undefined,
          }}
        ></Box>
      </Card>
    </Tooltip>
  );
};

export interface NativeSystemDisksViewProps {
  options: WidgetComponentProps<"systemDisks">["options"];
  width: number;
  displayMode: WidgetComponentProps<"systemDisks">["displayMode"];
  disks: {
    integrationId: string;
    integrationName: string;
    item: SystemHealthMonitoring["fileSystem"][number];
    smartItem: SystemHealthMonitoring["smart"][number] | undefined;
  }[];
  sourceCount: number;
  isPending: boolean;
  isEmpty: boolean;
  queryIndicators: ReactNode;
  itemRadius: MantineSize;
  formatBytesPair: typeof formatBytesPairDefault;
}

export function NativeSystemDisksView({
  options,
  width,
  displayMode,
  disks,
  sourceCount,
  isPending,
  isEmpty,
  queryIndicators,
  itemRadius,
  formatBytesPair,
}: NativeSystemDisksViewProps) {
  const t = useI18n("widget.systemDisks");
  const isAdvanced = displayMode === "advanced";
  const layout = useMemo(
    () => getSystemDisksLayout(width, disks.length, isAdvanced),
    [disks.length, isAdvanced, width],
  );
  const emptyState = (
    <Box h="100%" pos="relative">
      <Box pos="absolute" top={4} right={8} style={{ zIndex: 2 }}>
        {queryIndicators}
      </Box>
      <WidgetEmptyState />
    </Box>
  );

  if (isPending) return <WidgetQueryLoadingState />;
  if (isEmpty) return emptyState;

  return (
    <Box h="100%" pos="relative">
      <Box pos="absolute" top={4} right={8} style={{ zIndex: 2 }}>
        {queryIndicators}
      </Box>
      <ScrollArea h="100%">
        <SimpleGrid cols={layout.columns} spacing="xs" p="xs">
          {disks.map(({ integrationId, integrationName, item, smartItem }) => {
            const freeText = t("status.free", {
              percentage: String(Math.round(100 - clampPercentage(item.percentage))),
            });
            const advancedDisplayTexts = getAdvancedDisplayTexts(item, freeText, formatBytesPair);

            return (
              <SystemDiskCard
                itemRadius={itemRadius}
                key={`${integrationId}:${item.deviceName}`}
                deviceName={item.deviceName}
                percentage={item.percentage}
                displayText={
                  isAdvanced
                    ? advancedDisplayTexts.percentage
                    : getDisplayText(item, options.displayMode, freeText, formatBytesPair)
                }
                temperature={isAdvanced || options.showTemperatureIfAvailable ? smartItem?.temperature : undefined}
                healthy={smartItem?.healthy ?? true}
                showBackgroundBar={isAdvanced || options.showBackgroundBar}
                integrationName={isAdvanced || sourceCount > 1 ? integrationName : undefined}
                secondaryText={advancedDisplayTexts.absolute}
                freeText={advancedDisplayTexts.free}
                smartStatus={smartItem?.overallStatus}
                isAdvanced={isAdvanced}
                showSecondaryText={layout.showSecondaryText}
                showTemperature={layout.showTemperature}
              />
            );
          })}
        </SimpleGrid>
      </ScrollArea>
    </Box>
  );
}
