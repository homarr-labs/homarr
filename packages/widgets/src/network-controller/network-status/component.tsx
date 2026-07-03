"use client";

import { useMemo } from "react";
import { Box } from "@mantine/core";
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
}: WidgetComponentProps<"networkControllerStatus">) {
  const { data: summaries = [] } = clientApi.widget.networkController.summary.useQuery({
    integrationIds,
  });

  const data = useMemo(() => summaries.flatMap(({ summary }) => summary), [summaries]);

  return (
    <Box p={"sm"}>
      {options.content === "wifi" ? (
        <WifiVariant
          countGuests={data.reduce((sum, summary) => sum + summary.wifi.guests, 0)}
          countUsers={data.reduce((sum, summary) => sum + summary.wifi.users, 0)}
        />
      ) : (
        <WiredVariant
          countGuests={data.reduce((sum, summary) => sum + summary.lan.guests, 0)}
          countUsers={data.reduce((sum, summary) => sum + summary.lan.users, 0)}
        />
      )}
    </Box>
  );
}
