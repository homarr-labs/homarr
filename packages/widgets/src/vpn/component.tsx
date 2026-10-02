"use client";

import { Center, Flex, ScrollArea, SimpleGrid, Stack, Text } from "@mantine/core";

import { clientApi } from "@homarr/api/client";
import { useCurrentIntlLocale, useI18n } from "@homarr/translation/client";

import type { WidgetComponentProps } from "../definition";
import { getUsableWidgetQueryData } from "../common/query-state";
import { VpnIntegrationCard } from "./vpn-card";

export default function VpnWidget({ options, integrationIds, width, height }: WidgetComponentProps<"vpn">) {
  const summariesQuery = clientApi.widget.vpn.getSummaries.useQuery({
    ...options,
    integrationIds,
  });
  const integrations = getUsableWidgetQueryData(summariesQuery) ?? [];
  const { isPending } = summariesQuery;
  const t = useI18n("widget.vpn");
  const tCommon = useI18n("common");
  const locale = useCurrentIntlLocale();
  const dense = width < 240 || height < 120;

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
  if (integrations.length === 1 && vpn) {
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

  return (
    <ScrollArea className="scroll-area-w100" w="100%" h="100%" p="xs">
      <SimpleGrid cols={width >= 640 ? 2 : 1} spacing="sm">
        {integrations.map((result) => (
          <Stack key={result.integration.id} gap={4}>
            <VpnIntegrationCard
              vpn={result.summary}
              integrationName={result.integration.name}
              variant="list"
              dense={dense}
            />
            {height >= 180 && !result.error && new Date(result.integration.updatedAt).getTime() > 0 && (
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
