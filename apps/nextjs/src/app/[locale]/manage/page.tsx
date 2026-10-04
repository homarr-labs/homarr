import type { Metadata } from "next";
import { Card, Group, SimpleGrid, Space, Stack, Text } from "@mantine/core";
import { IconArrowRight } from "@tabler/icons-react";

import { api } from "@homarr/api/server";
import { getI18n } from "@homarr/translation/server";
import { Link } from "@homarr/ui";

import { DynamicBreadcrumb } from "~/components/navigation/dynamic-breadcrumb";
import { HeroBanner } from "./_components/hero-banner";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getI18n("management");

  return {
    title: t("metaTitle"),
  };
}

export default async function ManagementPage() {
  const statistics = await api.home.getStats();
  const t = await getI18n("management.page.home");
  const tEntities = await getI18n("common.entity");
  const statisticEntities = {
    app: "apps",
    board: "boards",
    group: "groups",
    integration: "integrations",
    invite: "invites",
    media: "media",
    searchEngine: "searchEngines",
    user: "users",
  } as const;
  const getStatisticTitle = (titleKey: (typeof statistics)[number]["titleKey"]) => {
    return tEntities(statisticEntities[titleKey]);
  };

  return (
    <>
      <DynamicBreadcrumb />
      <HeroBanner />
      <Space h="md" />
      <SimpleGrid cols={{ xs: 1, sm: 2, md: 3 }}>
        {statistics.map((statistic) => {
          const title = getStatisticTitle(statistic.titleKey);
          return (
            <Card
              component={Link}
              href={statistic.path}
              key={statistic.path}
              aria-label={`${statistic.count} ${title}`}
            >
              <Group justify="space-between" wrap="nowrap">
                <Group wrap="nowrap">
                  <Text size="xl" fw={700}>
                    {statistic.count}
                  </Text>
                  <Stack gap={0}>
                    <Text c="dimmed" size="xs">
                      {t(`statisticLabel.${statistic.subtitleKey}`)}
                    </Text>
                    <Text fw={600}>{title}</Text>
                  </Stack>
                </Group>
                <IconArrowRight size={16} stroke={1.5} color="var(--mantine-color-dimmed)" aria-hidden="true" />
              </Group>
            </Card>
          );
        })}
      </SimpleGrid>
    </>
  );
}
