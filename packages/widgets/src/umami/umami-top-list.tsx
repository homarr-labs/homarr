"use client";

import { Group, ScrollArea, Stack, Text } from "@mantine/core";

import { clientApi } from "@homarr/api/client";
import type { UmamiMetricItem } from "@homarr/integrations/types";
import { useScopedI18n } from "@homarr/translation/client";

interface UmamiTopListProps {
  integrationIds: string[];
  websiteId: string;
  timeFrame: string;
  limit: number;
}

export function UmamiTopPagesContent({ integrationIds, websiteId, timeFrame, limit }: UmamiTopListProps) {
  const t = useScopedI18n("widget.umami");
  const [data] = clientApi.widget.umami.getTopPages.useSuspenseQuery({
    integrationId: integrationIds[0] ?? "",
    websiteId,
    timeFrame,
    limit,
  });
  return <UmamiTopList items={data} heading={t("option.viewMode.option.topPages")} emptyLabel={t("topPages.direct")} />;
}

export function UmamiTopReferrersContent({ integrationIds, websiteId, timeFrame, limit }: UmamiTopListProps) {
  const t = useScopedI18n("widget.umami");
  const [data] = clientApi.widget.umami.getTopReferrers.useSuspenseQuery({
    integrationId: integrationIds[0] ?? "",
    websiteId,
    timeFrame,
    limit,
  });
  return (
    <UmamiTopList
      items={data}
      heading={t("option.viewMode.option.topReferrers")}
      emptyLabel={t("topReferrers.direct")}
    />
  );
}

function UmamiTopList({
  items,
  heading,
  emptyLabel,
}: {
  items: UmamiMetricItem[];
  heading: string;
  emptyLabel: string;
}) {
  return (
    <Stack gap={2} h="100%">
      <Text size="xs" c="dimmed" fw={500}>
        {heading}
      </Text>
      <ScrollArea style={{ flex: 1 }} scrollbars="y">
        <Stack gap={2}>
          {items.map((item, i) => (
            <Group key={item.x} gap="xs" wrap="nowrap" px={2}>
              <Text size="xs" c="dimmed" w={18} ta="right" flex="0 0 auto">
                {i + 1}.
              </Text>
              <Text size="xs" truncate="end" style={{ flex: 1 }}>
                {item.x || emptyLabel}
              </Text>
              <Text size="xs" fw={600} flex="0 0 auto">
                {item.y.toLocaleString()}
              </Text>
            </Group>
          ))}
        </Stack>
      </ScrollArea>
    </Stack>
  );
}
