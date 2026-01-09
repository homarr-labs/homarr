"use client";

import { useState } from "react";
import { Box, Card, Group, Stack, useMantineColorScheme } from "@mantine/core";

import { clientApi } from "@homarr/api/client";
import { useRequiredBoard } from "@homarr/boards/context";
import { useI18n } from "@homarr/translation/client";

import type { WidgetComponentProps } from "../definition";
import { NoIntegrationDataError } from "../errors/no-data-integration";

export default function SystemResources({ integrationIds, options }: WidgetComponentProps<"systemDisks">) {
  const [data] = clientApi.widget.healthMonitoring.getSystemHealthStatus.useSuspenseQuery({
    integrationIds,
  });

  const board = useRequiredBoard();
  const scheme = useMantineColorScheme();
  const t = useI18n();

  const lastItem = data.at(-1);

  if (!lastItem) return null;

  const [disks, setDisks] = useState<{
    fileSystem: { deviceName: string; used: string; available: string; percentage: number }[];
    smart: { deviceName: string; temperature: number | null; healthy: boolean }[];
  }>({
    fileSystem: lastItem.healthInfo.fileSystem,
    smart: lastItem.healthInfo.smart,
  });

  clientApi.widget.healthMonitoring.subscribeSystemHealthStatus.useSubscription(
    {
      integrationIds,
    },
    {
      onData(data) {
        setDisks({
          fileSystem: data.healthInfo.fileSystem,
          smart: data.healthInfo.smart,
        });
      },
    },
  );

  if (disks.fileSystem.length === 0) {
    throw new NoIntegrationDataError();
  }

  const getDisplayText = (item: { used: string; available: string; percentage: number }) => {
    switch (options.displayMode) {
      case "percentage":
        return `${Math.round(item.percentage)}%`;
      case "absolute":
        // Note: Due to data model differences, 'available' may represent total size (TrueNAS, Unraid)
        // or free space (DashDot), so this displays: "used / total" or "used / free"
        return `${item.used} / ${item.available}`;
      case "free":
        // Calculate free space description based on percentage
        const freePercentage = Math.round(100 - item.percentage);
        return `${freePercentage}% free`;
      default:
        return `${Math.round(item.percentage)}%`;
    }
  };

  return (
    <Stack gap="xs" p="xs" h="100%">
      {disks.fileSystem.map((item) => {
        const smart = disks.smart.find((smart) => smart.deviceName === item.deviceName);
        const healthy = smart?.healthy ?? true; // fall back to healthy if no information is available

        return (
          <Card
            radius={board.itemRadius}
            py={"xs"}
            bg={scheme.colorScheme === "dark" ? "dark.7" : "gray.1"}
            key={`disk-${item.deviceName}`}
            style={{ overflow: "hidden", position: "relative" }}
          >
            <Group justify="space-between" style={{ zIndex: 1 }}>
              <div>
                <p style={{ margin: 0 }}>
                  <b>{item.deviceName}</b>
                </p>
                <p style={{ margin: 0 }}>
                  <span>{getDisplayText(item)}</span>
                  {!healthy && <span style={{ marginLeft: 5 }}>{t("widget.systemDisks.status.unhealthy")}</span>}
                </p>
              </div>
              <div>
                {smart?.temperature && options.showTemperatureIfAvailable && (
                  <p style={{ margin: 0 }}>{smart.temperature}°C</p>
                )}
              </div>
            </Group>
            <Box
              bg={healthy ? "green" : "red"}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: `${item.percentage}%`,
                height: "100%",
                zIndex: 0,
                display: options.showBackgroundBar ? "block" : "none",
              }}
            ></Box>
          </Card>
        );
      })}
    </Stack>
  );
}
