"use client";

import { Center, Flex, ScrollArea, SimpleGrid, Stack, Text } from "@mantine/core";

import { clientApi } from "@homarr/api/client";
import { useCurrentLocale, useScopedI18n } from "@homarr/translation/client";

import type { WidgetComponentProps } from "../definition";
import { VpnIntegrationCard } from "./vpn-card";

export default function VpnWidget({
  options,
  integrationIds,
  width,
  height,
  displayMode = "compact",
}: WidgetComponentProps<"vpn">) {
  const { data: integrations = [], isPending } = clientApi.widget.vpn.getSummaries.useQuery({
    ...options,
    integrationIds,
  });
  const t = useScopedI18n("widget.vpn");
  const tCommon = useScopedI18n("common");
  const locale = useCurrentLocale();
  const dense = displayMode === "compact" && (width < 240 || height < 120);

  if (isPending || integrations.length === 0) {
    return (
      <Center h="100%" p="sm">
        <Text c="dimmed" size="sm" ta="center">
          {isPending ? tCommon("action.loading") : t("serviceUnavailable")}
        </Text>
      </Center>
    );
  }

  const [vpn] = integrations;
  if (displayMode === "compact" && integrations.length === 1 && vpn) {
    return (
      <Flex align="center" justify="center" w="100%" h="100%" px="xs" py="sm">
        <VpnIntegrationCard
          vpn={vpn.summary}
          integrationName={vpn.integration.name}
          variant={width < 240 ? "list" : "single"}
          dense={dense}
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
                  {new Date(result.integration.updatedAt).toLocaleString(locale)}
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
            dense={dense}
          />
        ))}
      </Stack>
    </ScrollArea>
  );
}
