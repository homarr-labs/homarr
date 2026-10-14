"use client";

import { Center, Flex, ScrollArea, SimpleGrid, Stack, Text } from "@mantine/core";
import type { ReactNode } from "react";

import { useCurrentIntlLocale, useI18n } from "@homarr/translation/client";

export interface VpnViewProps {
  integrations: {
    integration: { id: string; updatedAt: Date };
    error?: string;
    card: ReactNode;
  }[];
  isPending: boolean;
  width: number;
  height: number;
}

export function VpnView({ integrations, isPending, width, height }: VpnViewProps) {
  const t = useI18n("widget.vpn");
  const tCommon = useI18n("common");
  const locale = useCurrentIntlLocale();

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
        {vpn.card}
      </Flex>
    );
  }

  return (
    <ScrollArea className="scroll-area-w100" w="100%" h="100%" p="xs">
      <SimpleGrid cols={width >= 640 ? 2 : 1} spacing="sm">
        {integrations.map((result) => (
          <Stack key={result.integration.id} gap={4}>
            {result.card}
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
