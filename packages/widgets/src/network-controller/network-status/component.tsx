"use client";

import { Badge, Box, Card, Center, Group, ScrollArea, SimpleGrid, Stack, Text } from "@mantine/core";

import { clientApi } from "@homarr/api/client";
import { useCurrentIntlLocale, useI18n } from "@homarr/translation/client";

import type { WidgetComponentProps } from "../../definition";
import { IntegrationErrorIndicator } from "../../common/integration-error-indicator";
import { getUsableWidgetQueryData } from "../../common/query-state";
import { getNetworkControllerStatusLayout } from "./layout";
import { WifiVariant } from "./variants/wifi-variant";
import { WiredVariant } from "./variants/wired-variant";

const neutralBorderColor = "rgb(from var(--mantine-color-default-border) r g b / calc(var(--opacity, 1) * 0.45))";

export default function NetworkControllerNetworkStatusWidget({
  options,
  integrationIds,
  displayMode,
  width,
  height,
  displayScale = 1,
}: WidgetComponentProps<"networkControllerStatus">) {
  const summaryQuery = clientApi.widget.networkController.summary.useQuery({
    integrationIds,
  });
  const isAdvanced = displayMode === "advanced";
  let results = summaryQuery.data ?? [];
  if (isAdvanced) {
    results = getUsableWidgetQueryData(summaryQuery) ?? [];
  }
  const summaries = results.filter(
    (result): result is typeof result & { summary: NonNullable<typeof result.summary> } => result.summary !== null,
  );
  const tWidgetCommon = useI18n("widget.common");
  const tCommon = useI18n("common");
  const locale = useCurrentIntlLocale();

  const countWifiGuests = summaries.reduce((sum, { summary }) => sum + summary.wifi.guests, 0);
  const countWifiUsers = summaries.reduce((sum, { summary }) => sum + summary.wifi.users, 0);
  const countLanGuests = summaries.reduce((sum, { summary }) => sum + summary.lan.guests, 0);
  const countLanUsers = summaries.reduce((sum, { summary }) => sum + summary.lan.users, 0);
  let responsiveWidth = width;
  let responsiveHeight = height;
  if (!isAdvanced && Number.isFinite(displayScale) && displayScale > 0) {
    responsiveWidth *= displayScale;
    responsiveHeight *= displayScale;
  }
  const layout = getNetworkControllerStatusLayout({
    width: responsiveWidth,
    height: responsiveHeight,
    displayMode,
    content: options.content,
  });
  const indicatorResults =
    results.length > 0 || !summaryQuery.error
      ? results
      : integrationIds.map((integrationId) => ({ integrationId, error: "query" }));
  const queryIndicators = (
    <Group gap={0} justify="flex-end">
      <IntegrationErrorIndicator results={indicatorResults} />
    </Group>
  );

  if (!isAdvanced) {
    return (
      <Box h="100%" p={layout.padding} pos="relative">
        <Box pos="absolute" top={4} right={8} style={{ zIndex: 2 }}>
          {queryIndicators}
        </Box>
        {options.content === "wifi" ? (
          <WifiVariant
            countGuests={countWifiGuests}
            countUsers={countWifiUsers}
            compact={layout.compact}
            horizontal={layout.horizontalStats}
            inline={layout.inlineStats}
          />
        ) : (
          <WiredVariant
            countGuests={countLanGuests}
            countUsers={countLanUsers}
            compact={layout.compact}
            horizontal={layout.horizontalStats}
            inline={layout.inlineStats}
          />
        )}
      </Box>
    );
  }

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
                <Card p={layout.cardPadding} withBorder bg="transparent" style={{ borderColor: neutralBorderColor }}>
                  <WifiVariant countGuests={summary.wifi.guests} countUsers={summary.wifi.users} advanced />
                </Card>
                <Card p={layout.cardPadding} withBorder bg="transparent" style={{ borderColor: neutralBorderColor }}>
                  <WiredVariant countGuests={summary.lan.guests} countUsers={summary.lan.users} advanced />
                </Card>
              </SimpleGrid>
            </Stack>
          </Card>
        ))}
      </SimpleGrid>
    </ScrollArea>
  );
}
