"use client";

import { useEffect, useRef, useState } from "react";
import { Box, Card, Group, ScrollArea, SimpleGrid, Text, Tooltip, useMantineColorScheme } from "@mantine/core";

import { clientApi } from "@homarr/api/client";
import { useRequiredBoard } from "@homarr/boards/context";
import { formatBytesPair } from "@homarr/common";
import { useI18n } from "@homarr/translation/client";

import { WidgetEmptyState } from "../common/empty-state";
import type { WidgetComponentProps } from "../definition";
import { filterStorageVolumes, normalizeStorageDeviceName } from "../filter-storage-volumes";
import { NoIntegrationDataError } from "../errors/no-data-integration";

type DisplayMode = WidgetComponentProps<"systemDisks">["options"]["displayMode"];

export const getDisplayText = (
  item: { used: string; available: string; percentage: number },
  displayMode: DisplayMode,
) => {
  switch (displayMode) {
    case "percentage":
      return `${Math.round(item.percentage)}%`;
    case "absolute": {
      const usedInBytes = Number(item.used);
      const availableInBytes = Number(item.available);
      if (Number.isFinite(usedInBytes) && Number.isFinite(availableInBytes)) {
        const { used, available } = formatBytesPair(usedInBytes, availableInBytes);
        return `${used} / ${available}`;
      }
      return `${item.used} / ${item.available}`;
    }
    case "free":
      return `${Math.round(100 - item.percentage)}% free`;
    default:
      return `${Math.round(item.percentage)}%`;
  }
};

export const clampPercentage = (percentage: number): number => Math.min(100, Math.max(0, percentage));

const getAbsoluteText = (item: { used: string; available: string }) => {
  const usedInBytes = Number(item.used);
  const availableInBytes = Number(item.available);
  if (!Number.isFinite(usedInBytes) || !Number.isFinite(availableInBytes)) return `${item.used} / ${item.available}`;
  const { used, available } = formatBytesPair(usedInBytes, availableInBytes);
  return `${used} / ${available}`;
};

interface SystemDiskCardProps {
  deviceName: string;
  percentage: number;
  displayText: string;
  temperature: number | null | undefined;
  healthy: boolean;
  showBackgroundBar: boolean;
  integrationName?: string;
  secondaryText?: string;
  isAdvanced: boolean;
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
  isAdvanced,
}: SystemDiskCardProps) => {
  const board = useRequiredBoard();
  const scheme = useMantineColorScheme();
  const t = useI18n();
  const valueRef = useRef<HTMLParagraphElement>(null);
  const [valueFits, setValueFits] = useState(true);

  // When the card is squeezed (small widget), the value line is clipped by the card's `overflow: hidden`.
  // Detect that and hide it, surfacing the value in a tooltip instead. The value keeps its layout space
  // (visibility, not display) so toggling it does not change the measurement and flap. The ref lives on
  // the value (not the Card) so the Tooltip can attach its own ref to the Card.
  useEffect(() => {
    const value = valueRef.current;
    const card = value?.offsetParent as HTMLElement | null; // the position:relative Card
    if (!value || !card) return;
    const measure = () => {
      setValueFits(value.getBoundingClientRect().bottom <= card.getBoundingClientRect().bottom + 1);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(card);
    return () => observer.disconnect();
  }, [displayText, healthy]);

  const unhealthyLabel = t("widget.systemDisks.status.unhealthy");

  return (
    <Tooltip
      label={healthy ? displayText : `${displayText} (${unhealthyLabel})`}
      disabled={valueFits || isAdvanced}
      position="top"
      withinPortal
    >
      <Card
        radius={board.itemRadius}
        py="xs"
        bg={scheme.colorScheme === "dark" ? "dark.7" : "gray.1"}
        style={{ overflow: "hidden", position: "relative" }}
      >
        <Group justify="space-between" style={{ zIndex: 1 }}>
          <div>
            <Text fw={700} size={isAdvanced ? "sm" : undefined} truncate="end">
              {deviceName}
            </Text>
            {integrationName && (
              <Text size="xs" c="dimmed" truncate="end">
                {integrationName}
              </Text>
            )}
            <p ref={valueRef} style={{ margin: 0, visibility: valueFits ? "visible" : "hidden" }}>
              <span>{displayText}</span>
              {!healthy && <span style={{ marginLeft: 5 }}>{unhealthyLabel}</span>}
            </p>
            {isAdvanced && secondaryText && (
              <Text size="xs" c="dimmed">
                {secondaryText}
              </Text>
            )}
          </div>
          <div>
            {temperature !== null && temperature !== undefined ? <p style={{ margin: 0 }}>{temperature}°C</p> : null}
          </div>
        </Group>
        <Box
          bg={healthy ? "green" : "red"}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: `${clampPercentage(percentage)}%`,
            height: "100%",
            zIndex: 0,
            display: showBackgroundBar ? "block" : "none",
          }}
        ></Box>
      </Card>
    </Tooltip>
  );
};

export default function SystemResources({
  integrationIds,
  options,
  width,
  displayMode: surfaceMode,
}: WidgetComponentProps<"systemDisks">) {
  const queryInput = { integrationIds };
  const { data = [] } = clientApi.widget.healthMonitoring.getSystemHealthStatus.useQuery(queryInput);

  if (data.length === 0) return <WidgetEmptyState />;

  const disks = data.flatMap((entry) => {
    const fileSystem = filterStorageVolumes(
      entry.healthInfo.fileSystem,
      options.visibleStorageVolumes,
      entry.integrationId,
    );
    const smart = filterStorageVolumes(entry.healthInfo.smart, options.visibleStorageVolumes, entry.integrationId);
    return fileSystem.map((item) => ({
      integrationId: entry.integrationId,
      integrationName: entry.integrationName,
      item,
      smartItem: smart.find(
        (candidate) => normalizeStorageDeviceName(candidate.deviceName) === normalizeStorageDeviceName(item.deviceName),
      ),
    }));
  });

  if (data.every((entry) => entry.healthInfo.fileSystem.length === 0)) throw new NoIntegrationDataError();
  if (disks.length === 0) return <WidgetEmptyState />;

  const isAdvanced = surfaceMode === "advanced";
  const columns = isAdvanced ? Math.max(1, Math.min(disks.length, Math.floor(width / 320))) : 1;

  return (
    <ScrollArea h="100%">
      <SimpleGrid cols={columns} spacing="xs" p="xs">
        {disks.map(({ integrationId, integrationName, item, smartItem }) => (
          <SystemDiskCard
            key={`${integrationId}:${item.deviceName}`}
            deviceName={item.deviceName}
            percentage={item.percentage}
            displayText={getDisplayText(item, options.displayMode)}
            temperature={options.showTemperatureIfAvailable ? smartItem?.temperature : undefined}
            healthy={smartItem?.healthy ?? true} // fall back to healthy if no information is available
            showBackgroundBar={options.showBackgroundBar}
            integrationName={isAdvanced || data.length > 1 ? integrationName : undefined}
            secondaryText={getAbsoluteText(item)}
            isAdvanced={isAdvanced}
          />
        ))}
      </SimpleGrid>
    </ScrollArea>
  );
}
