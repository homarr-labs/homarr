"use client";

import { Group, ScrollArea, Stack, Text } from "@mantine/core";

import { clientApi } from "@homarr/api/client";
import type { UmamiMetricItem } from "@homarr/integrations/types";
import { useCurrentIntlLocale, useI18n } from "@homarr/translation/client";
import classes from "./component.module.css";

import { useUmamiQueryOptions } from "./umami-utils";
import { getUsableWidgetQueryData } from "../common/query-state";
import type { RouterInputs } from "@homarr/api";

interface UmamiTopListProps {
  input: RouterInputs["widget"]["umami"]["getTopPages"];
}

export function UmamiTopPagesContent({ input }: UmamiTopListProps) {
  const t = useI18n("widget.umami");
  const umamiQueryOptions = useUmamiQueryOptions();
  const data = getUsableWidgetQueryData(clientApi.widget.umami.getTopPages.useQuery(input, umamiQueryOptions)) ?? [];
  return <UmamiTopList items={data} heading={t("option.viewMode.option.topPages")} emptyLabel={t("top.direct")} />;
}

export function UmamiTopReferrersContent({ input }: UmamiTopListProps) {
  const t = useI18n("widget.umami");
  const umamiQueryOptions = useUmamiQueryOptions();
  const data =
    getUsableWidgetQueryData(clientApi.widget.umami.getTopReferrers.useQuery(input, umamiQueryOptions)) ?? [];
  return <UmamiTopList items={data} heading={t("option.viewMode.option.topReferrers")} emptyLabel={t("top.direct")} />;
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
  const locale = useCurrentIntlLocale();

  return (
    <Stack className={classes.listSurface} gap={2} h="100%">
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
                {item.y.toLocaleString(locale)}
              </Text>
            </Group>
          ))}
        </Stack>
      </ScrollArea>
    </Stack>
  );
}
