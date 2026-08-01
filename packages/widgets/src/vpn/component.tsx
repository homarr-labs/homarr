"use client";

import { Flex, ScrollArea, SimpleGrid, Stack, Text } from "@mantine/core";

import { clientApi } from "@homarr/api/client";

import type { WidgetComponentProps } from "../definition";
import { VpnIntegrationCard } from "./vpn-card";

export default function VpnWidget({
  options,
  integrationIds,
  width,
  displayMode = "compact",
}: WidgetComponentProps<"vpn">) {
  const { data: integrations = [] } = clientApi.widget.vpn.getSummaries.useQuery({
    ...options,
    integrationIds,
  });

  const [vpn] = integrations;
  if (displayMode === "compact" && integrations.length === 1 && vpn) {
    return (
      <Flex align="center" justify="center" w="100%" h="100%" px="xs" py="sm">
        <VpnIntegrationCard
          vpn={vpn.summary}
          integrationName={vpn.integration.name}
          variant={width < 240 ? "list" : "single"}
        />
      </Flex>
    );
  }

  if (displayMode === "advanced") {
    return (
      <ScrollArea h="100%" p="md">
        <SimpleGrid cols={width >= 760 ? 2 : 1} spacing="md">
          {integrations.map((result) => (
            <Stack key={result.integration.id} gap={4} p="sm">
              <VpnIntegrationCard vpn={result.summary} integrationName={result.integration.name} variant="list" />
              {!result.error && new Date(result.integration.updatedAt).getTime() > 0 && (
                <Text size="xs" c="dimmed" ta="right">
                  {new Date(result.integration.updatedAt).toLocaleString()}
                </Text>
              )}
            </Stack>
          ))}
        </SimpleGrid>
      </ScrollArea>
    );
  }

  return (
    <ScrollArea className="scroll-area-w100" w="100%" h="100%" offsetScrollbars>
      <Stack w="100%" gap="sm" py="xs" px="xs">
        {integrations.map((result) => (
          <VpnIntegrationCard
            key={result.integration.id}
            vpn={result.summary}
            integrationName={result.integration.name}
            variant="list"
          />
        ))}
      </Stack>
    </ScrollArea>
  );
}
