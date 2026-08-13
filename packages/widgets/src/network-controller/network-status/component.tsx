"use client";

import { useMemo } from "react";
import { Box, Card, Center, SimpleGrid, Text } from "@mantine/core";
import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";
import objectSupport from "dayjs/plugin/objectSupport";
import relativeTime from "dayjs/plugin/relativeTime";

import { clientApi } from "@homarr/api/client";
import { useScopedI18n } from "@homarr/translation/client";

import type { WidgetComponentProps } from "../../definition";
import { IntegrationErrorIndicator } from "../../common/integration-error-indicator";
import { getNetworkControllerStatusLayout } from "./layout";
import { WifiVariant } from "./variants/wifi-variant";
import { WiredVariant } from "./variants/wired-variant";

dayjs.extend(objectSupport);
dayjs.extend(relativeTime);
dayjs.extend(duration);

export default function NetworkControllerNetworkStatusWidget({
  options,
  integrationIds,
  displayMode,
  width,
  height,
}: WidgetComponentProps<"networkControllerStatus">) {
  const {
    data: summaries,
    error,
    isPending,
  } = clientApi.widget.networkController.summary.useQuery({
    integrationIds,
  });
  const t = useScopedI18n("widget.networkControllerStatus");
  const tCommon = useScopedI18n("common");

  const data = useMemo(() => (summaries ?? []).flatMap(({ summary }) => (summary ? [summary] : [])), [summaries]);
  const countWifiGuests = data.reduce((sum, summary) => sum + summary.wifi.guests, 0);
  const countWifiUsers = data.reduce((sum, summary) => sum + summary.wifi.users, 0);
  const countLanGuests = data.reduce((sum, summary) => sum + summary.lan.guests, 0);
  const countLanUsers = data.reduce((sum, summary) => sum + summary.lan.users, 0);
  const layout = getNetworkControllerStatusLayout({ width, height, displayMode, content: options.content });

  if (error && summaries === undefined) throw error;

  if (isPending || data.length === 0) {
    return (
      <Center h="100%" p="sm">
        <Text c="dimmed" size="sm" ta="center">
          {isPending ? tCommon("action.loading") : t("error.integrationsDisconnected")}
        </Text>
      </Center>
    );
  }

  return (
    <Box p={layout.padding} h="100%" pos="relative">
      <Box pos="absolute" top={4} right={8} style={{ zIndex: 2 }}>
        <IntegrationErrorIndicator results={summaries ?? []} />
      </Box>
      <SimpleGrid cols={layout.columns} h="100%" spacing="sm">
        {layout.showWifi && (
          <Card p={layout.cardPadding} withBorder={layout.withBorder}>
            <WifiVariant
              countGuests={countWifiGuests}
              countUsers={countWifiUsers}
              compact={layout.compact}
              horizontal={layout.horizontalStats}
            />
          </Card>
        )}
        {layout.showWired && (
          <Card p={layout.cardPadding} withBorder={layout.withBorder}>
            <WiredVariant
              countGuests={countLanGuests}
              countUsers={countLanUsers}
              compact={layout.compact}
              horizontal={layout.horizontalStats}
            />
          </Card>
        )}
      </SimpleGrid>
    </Box>
  );
}
