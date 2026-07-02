"use client";

import { Flex, ScrollArea, Stack } from "@mantine/core";

import { clientApi } from "@homarr/api/client";

import type { WidgetComponentProps } from "../definition";
import { VpnIntegrationCard } from "./vpn-card";

export default function VpnWidget({ options, integrationIds }: WidgetComponentProps<"vpn">) {
  const { data: integrations = [] } = clientApi.widget.vpn.getSummaries.useQuery({
    ...options,
    integrationIds,
  });

  const [vpn] = integrations;
  if (integrations.length === 1 && vpn) {
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
