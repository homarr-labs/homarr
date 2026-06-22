"use client";

import React from "react";
import { Flex, ScrollArea, Stack } from "@mantine/core";

import { clientApi } from "@homarr/api/client";

import type { WidgetComponentProps } from "../definition";
import { updateVpnInfoFromSubscription } from "./helpers";
import { VpnIntegrationCard } from "./vpn-card";

export default function VpnWidget({ options, integrationIds }: WidgetComponentProps<"vpn">) {
  const [integrations] = clientApi.widget.vpn.getSummaries.useSuspenseQuery(
    {
      ...options,
      integrationIds,
    },
    {
      // Initial load only. Live updates arrive via the subscription below, which is
      // fed by the VPN cron job publishing to the integration channel.
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: false,
    },
  );
  const utils = clientApi.useUtils();

  clientApi.widget.vpn.subscribeSummaries.useSubscription(
    {
      integrationIds,
    },
    {
      onData: (data) => {
        utils.widget.vpn.getSummaries.setData(
          {
            ...options,
            integrationIds,
          },
          (prevData) => updateVpnInfoFromSubscription(prevData, data),
        );
      },
    },
  );

  if (integrations.length === 1) {
    // It will always have at least one integration as otherwise the NoIntegrationSelectedError would be thrown in item-content.tsx
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const vpn = integrations[0]!;

    return (
      <Flex align="center" justify="center" w="100%" h="100%" px="xs" py="sm">
        <VpnIntegrationCard vpn={vpn.summary} integrationName={vpn.integration.name} />
      </Flex>
    );
  }

  return (
    <ScrollArea className="scroll-area-w100" w="100%" h="100%" offsetScrollbars>
      <Stack w="100%" gap="sm" py="xs" px="xs">
        {integrations.map((vpn) => (
          <VpnIntegrationCard
            key={vpn.integration.id}
            vpn={vpn.summary}
            integrationName={vpn.integration.name}
            variant="list"
          />
        ))}
      </Stack>
    </ScrollArea>
  );
}
