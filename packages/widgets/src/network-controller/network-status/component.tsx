"use client";

import { useMemo } from "react";
import { Box, Card, SimpleGrid } from "@mantine/core";
import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";
import objectSupport from "dayjs/plugin/objectSupport";
import relativeTime from "dayjs/plugin/relativeTime";

import { clientApi } from "@homarr/api/client";

import type { WidgetComponentProps } from "../../definition";
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
}: WidgetComponentProps<"networkControllerStatus">) {
  const { data: summaries = [] } = clientApi.widget.networkController.summary.useQuery({
    integrationIds,
  });

  const data = useMemo(() => summaries.flatMap(({ summary }) => summary), [summaries]);
  const isAdvanced = displayMode === "advanced";
  const countWifiGuests = data.reduce((sum, summary) => sum + summary.wifi.guests, 0);
  const countWifiUsers = data.reduce((sum, summary) => sum + summary.wifi.users, 0);
  const countLanGuests = data.reduce((sum, summary) => sum + summary.lan.guests, 0);
  const countLanUsers = data.reduce((sum, summary) => sum + summary.lan.users, 0);

  return (
    <Box p={isAdvanced ? "md" : "sm"} h="100%">
      <SimpleGrid cols={isAdvanced && width >= 560 ? 2 : 1} h="100%" spacing="sm">
        {(isAdvanced || options.content === "wifi") && (
          <Card p={isAdvanced ? "md" : 0} withBorder={isAdvanced}>
            <WifiVariant countGuests={countWifiGuests} countUsers={countWifiUsers} compact={!isAdvanced} />
          </Card>
        )}
        {(isAdvanced || options.content === "wired") && (
          <Card p={isAdvanced ? "md" : 0} withBorder={isAdvanced}>
            <WiredVariant countGuests={countLanGuests} countUsers={countLanUsers} compact={!isAdvanced} />
          </Card>
        )}
      </SimpleGrid>
    </Box>
  );
}
