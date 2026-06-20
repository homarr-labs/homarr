"use client";

import { useEffect, useRef, useState } from "react";
import { Box, Card, Group, Stack, Tooltip, useMantineColorScheme } from "@mantine/core";

import { clientApi } from "@homarr/api/client";
import { useRequiredBoard } from "@homarr/boards/context";
import { humanFileSize } from "@homarr/common";
import { useI18n } from "@homarr/translation/client";

import { WidgetEmptyState } from "../common/empty-state";
import type { WidgetComponentProps } from "../definition";
import { NoIntegrationDataError } from "../errors/no-data-integration";

type DisplayMode = WidgetComponentProps<"systemDisks">["options"]["displayMode"];

const getDisplayText = (item: { used: string; available: string; percentage: number }, displayMode: DisplayMode) => {
  switch (displayMode) {
    case "percentage":
      return `${Math.round(item.percentage)}%`;
    case "absolute": {
      const availableInBytes = Number(item.available);
      const availableText = Number.isFinite(availableInBytes)
        ? humanFileSize(Math.round(availableInBytes))
        : item.available;
      return `${item.used} / ${availableText}`;
    }
    case "free":
      return `${Math.round(100 - item.percentage)}% free`;
    default:
      return `${Math.round(item.percentage)}%`;
  }
};

interface SystemDiskCardProps {
  deviceName: string;
  percentage: number;
  displayText: string;
  temperature: number | null | undefined;
  healthy: boolean;
  showBackgroundBar: boolean;
}

const SystemDiskCard = ({
  deviceName,
  percentage,
  displayText,
  temperature,
  healthy,
  showBackgroundBar,
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
      disabled={valueFits}
      position="top"
      withinPortal
    >
      <Card
        radius={board.itemRadius}
        py={"xs"}
        bg={scheme.colorScheme === "dark" ? "dark.7" : "gray.1"}
        style={{ overflow: "hidden", position: "relative" }}
      >
        <Group justify="space-between" style={{ zIndex: 1 }}>
          <div>
            <p style={{ margin: 0 }}>
              <b>{deviceName}</b>
            </p>
            <p ref={valueRef} style={{ margin: 0, visibility: valueFits ? "visible" : "hidden" }}>
              <span>{displayText}</span>
              {!healthy && <span style={{ marginLeft: 5 }}>{unhealthyLabel}</span>}
            </p>
          </div>
          <div>{temperature ? <p style={{ margin: 0 }}>{temperature}°C</p> : null}</div>
        </Group>
        <Box
          bg={healthy ? "green" : "red"}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: `${percentage}%`,
            height: "100%",
            zIndex: 0,
            display: showBackgroundBar ? "block" : "none",
          }}
        ></Box>
      </Card>
    </Tooltip>
  );
};

export default function SystemResources({ integrationIds, options }: WidgetComponentProps<"systemDisks">) {
  const queryInput = { integrationIds };
  const { data = [] } = clientApi.widget.healthMonitoring.getSystemHealthStatus.useQuery(queryInput, {
    staleTime: 5 * 1000,
  });
  const utils = clientApi.useUtils();

  clientApi.widget.healthMonitoring.subscribeSystemHealthStatus.useSubscription(queryInput, {
    onData(data) {
      utils.widget.healthMonitoring.getSystemHealthStatus.setData(queryInput, (oldData) =>
        oldData?.map((item) => (item.integrationId === data.integrationId ? { ...item, ...data } : item)),
      );
    },
  });

  const lastItem = data.at(-1);

  if (!lastItem) return <WidgetEmptyState />;
  const { fileSystem, smart } = lastItem.healthInfo;

  if (fileSystem.length === 0) {
    throw new NoIntegrationDataError();
  }

  return (
    <Stack gap="xs" p="xs" h="100%">
      {fileSystem.map((item) => {
        const smartItem = smart.find((smart) => smart.deviceName === item.deviceName);

        return (
          <SystemDiskCard
            key={`disk-${item.deviceName}`}
            deviceName={item.deviceName}
            percentage={item.percentage}
            displayText={getDisplayText(item, options.displayMode)}
            temperature={options.showTemperatureIfAvailable ? smartItem?.temperature : undefined}
            healthy={smartItem?.healthy ?? true} // fall back to healthy if no information is available
            showBackgroundBar={options.showBackgroundBar}
          />
        );
      })}
    </Stack>
  );
}
