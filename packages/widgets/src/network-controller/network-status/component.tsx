"use client";

import { useMemo } from "react";
import { Badge, Card, Center, Group, ScrollArea, SimpleGrid, Stack, Text } from "@mantine/core";

import { clientApi } from "@homarr/api/client";
import { useCurrentIntlLocale, useI18n } from "@homarr/translation/client";

import type { WidgetComponentProps } from "../../definition";
import { IntegrationErrorIndicator } from "../../common/integration-error-indicator";
import { getUsableWidgetQueryData } from "../../common/query-state";
import { WidgetQueryErrorIndicator } from "../../common/query-state-indicator";
import { getNetworkControllerStatusLayout } from "./layout";
import { WifiVariant } from "./variants/wifi-variant";
import { WiredVariant } from "./variants/wired-variant";

const neutralBorderColor =
  "rgb(from var(--mantine-color-default-border) r g b / calc(var(--opacity, 1) * 0.45))";

export default function NetworkControllerNetworkStatusWidget({
  options,
  integrationIds,
  displayMode,
  width,
  height,
}: WidgetComponentProps<"networkControllerStatus">) {
  const summaryQuery = clientApi.widget.networkController.summary.useQuery({
    integrationIds,
  });
  const results = getUsableWidgetQueryData(summaryQuery) ?? [];
  const summaries = useMemo(
    () =>
      results.filter(
        (result): result is typeof result & { summary: NonNullable<typeof result.summary> } => result.summary !== null,
      ),
    [results],
  );
  const t = useI18n("widget.networkControllerStatus");
  const tWidgetCommon = useI18n("widget.common");
  const tCommon = useI18n("common");
  const locale = useCurrentIntlLocale();

  const countWifiGuests = summaries.reduce((sum, { summary }) => sum + summary.wifi.guests, 0);
  const countWifiUsers = summaries.reduce((sum, { summary }) => sum + summary.wifi.users, 0);
  const countLanGuests = summaries.reduce((sum, { summary }) => sum + summary.lan.guests, 0);
  const countLanUsers = summaries.reduce((sum, { summary }) => sum + summary.lan.users, 0);
  const layout = getNetworkControllerStatusLayout({ width, height, displayMode, content: options.content });
  const isAdvanced = displayMode === "advanced";
  const queryIndicators = (
    <Group gap={0} justify="flex-end">
      <IntegrationErrorIndicator results={results} />
      <WidgetQueryErrorIndicator error={summaryQuery.error} label={t("name")} />
    </Group>
  );

  if (summaryQuery.isPending || summaries.length === 0) {
    return (
      <Stack h="100%" gap={0}>
        {queryIndicators}
        <Center p="sm" style={{ flex: 1 }}>
          <Text c="dimmed" size="sm" ta="center">
            {summaryQuery.isPending ? tCommon("action.loading") : tWidgetCommon("integrationDisconnected")}
          </Text>
        </Center>
      </Stack>
    );
  }

  if (isAdvanced) {
    return (
      <ScrollArea h="100%" p={layout.padding}>
        {queryIndicators}
        <SimpleGrid cols={summaries.length > 1 ? layout.sourceColumns : 1} spacing="sm">
          {summaries.map(({ integration, summary, updatedAt }) => (
            <Card key={integration.id} withBorder p="sm" bg="transparent" style={{ borderColor: neutralBorderColor }}>
              <Stack gap="sm">
                <Group justify="space-between" wrap="nowrap">
                  <Stack gap={0} miw={0}>
                    <Text fw={600} size="sm" truncate="end">
                      {integration.name}
                    </Text>
                    {updatedAt && (
                      <Text size="xs" c="dimmed">
                        {tWidgetCommon("updatedAt", { date: new Date(updatedAt).toLocaleString(locale) })}
                      </Text>
                    )}
                  </Stack>
                  <Badge size="xs" variant="light">
                    {integration.kind}
                  </Badge>
                </Group>
                <SimpleGrid cols={layout.columns} spacing="sm">
                  <Card
                    p={layout.cardPadding}
                    withBorder
                    bg="transparent"
                    style={{ borderColor: neutralBorderColor }}
                  >
                    <WifiVariant countGuests={summary.wifi.guests} countUsers={summary.wifi.users} />
                  </Card>
                  <Card
                    p={layout.cardPadding}
                    withBorder
                    bg="transparent"
                    style={{ borderColor: neutralBorderColor }}
                  >
                    <WiredVariant countGuests={summary.lan.guests} countUsers={summary.lan.users} />
                  </Card>
                </SimpleGrid>
              </Stack>
            </Card>
          ))}
        </SimpleGrid>
      </ScrollArea>
    );
  }

  return (
    <Stack p={layout.padding} h="100%" gap={0}>
      {queryIndicators}
      <SimpleGrid cols={layout.columns} spacing="sm" style={{ flex: 1, alignItems: "stretch" }}>
        {layout.showWifi && (
          <Card
            p={layout.cardPadding}
            withBorder={layout.withBorder}
            bg="transparent"
            h="100%"
            style={{ borderColor: neutralBorderColor }}
          >
            <WifiVariant
              countGuests={countWifiGuests}
              countUsers={countWifiUsers}
              compact={layout.compact}
              horizontal={layout.horizontalStats}
            />
          </Card>
        )}
        {layout.showWired && (
          <Card
            p={layout.cardPadding}
            withBorder={layout.withBorder}
            bg="transparent"
            h="100%"
            style={{ borderColor: neutralBorderColor }}
          >
            <WiredVariant
              countGuests={countLanGuests}
              countUsers={countLanUsers}
              compact={layout.compact}
              horizontal={layout.horizontalStats}
            />
          </Card>
        )}
      </SimpleGrid>
    </Stack>
  );
}
