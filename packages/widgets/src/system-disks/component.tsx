"use client";

import { Box, Card, Group, Stack, useMantineColorScheme } from "@mantine/core";

import { clientApi } from "@homarr/api/client";
import { useRequiredBoard } from "@homarr/boards/context";
import { useI18n } from "@homarr/translation/client";

import type { WidgetComponentProps } from "../definition";
import { NoIntegrationDataError } from "../errors/no-data-integration";

type DisplayMode = WidgetComponentProps<"systemDisks">["options"]["displayMode"];

const getDisplayText = (item: { used: string; available: string; percentage: number }, displayMode: DisplayMode) => {
  switch (displayMode) {
    case "percentage":
      return `${Math.round(item.percentage)}%`;
    case "absolute":
      return `${item.used} / ${item.available}`;
    case "free":
      return `${Math.round(100 - item.percentage)}% free`;
    default:
      return `${Math.round(item.percentage)}%`;
  }
};

export default function SystemResources({ integrationIds, options }: WidgetComponentProps<"systemDisks">) {
  const queryInput = { integrationIds };
  const [data] = clientApi.widget.healthMonitoring.getSystemHealthStatus.useSuspenseQuery(queryInput);
  const utils = clientApi.useUtils();

  const board = useRequiredBoard();
  const scheme = useMantineColorScheme();
  const t = useI18n();

  const lastItem = data.at(-1);

  if (!lastItem) return null;
  const { fileSystem, smart } = lastItem.healthInfo;

  clientApi.widget.healthMonitoring.subscribeSystemHealthStatus.useSubscription(queryInput, {
    onData(data) {
      utils.widget.healthMonitoring.getSystemHealthStatus.setData(queryInput, (oldData) =>
        oldData?.map((item) => (item.integrationId === data.integrationId ? { ...item, ...data } : item)),
      );
    },
  });

  if (fileSystem.length === 0) {
    throw new NoIntegrationDataError();
  }

  return (
    <Stack gap="xs" p="xs" h="100%">
      {fileSystem.map((item) => {
        const smartItem = smart.find((smart) => smart.deviceName === item.deviceName);
        const healthy = smartItem?.healthy ?? true; // fall back to healthy if no information is available

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
                  <span>{getDisplayText(item, options.displayMode)}</span>
                  {!healthy && <span style={{ marginLeft: 5 }}>{t("widget.systemDisks.status.unhealthy")}</span>}
                </p>
              </div>
              <div>
                {smartItem?.temperature && options.showTemperatureIfAvailable ? (
                  <p style={{ margin: 0 }}>{smartItem.temperature}°C</p>
                ) : null}
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
