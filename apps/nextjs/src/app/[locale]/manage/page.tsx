import Link from "next/link";
import { Card, Group, SimpleGrid, Space, Stack, Text } from "@mantine/core";
import { IconArrowRight } from "@tabler/icons-react";

import { api } from "@homarr/api/server";
import { getScopedI18n } from "@homarr/translation/server";

import { HeroBanner } from "./_components/hero-banner";

interface LinkProps {
  title: string;
  subtitle: string;
  count: number;
  href: string;
}

export async function generateMetadata() {
  const t = await getScopedI18n("management");
  const metaTitle = `${t("metaTitle")} • Homarr`;

  return {
    title: metaTitle,
  };
}

export default async function ManagementPage() {
  const statistics = await api.home.getStats();
  const t = await getScopedI18n("management.page.home");

  const links: LinkProps[] = [
    {
      count: statistics.countBoards,
      href: "/manage/boards",
      subtitle: t("statisticLabel.boards"),
      title: t("statistic.countBoards"),
    },
    {
      count: statistics.countUsers,
      href: "/manage/boards",
      subtitle: t("statisticLabel.authentication"),
      title: t("statistic.createUser"),
    },
    {
      count: statistics.countInvites,
      href: "/manage/boards",
      subtitle: t("statisticLabel.authentication"),
      title: t("statistic.createInvite"),
    },
    {
      count: statistics.countIntegrations,
      href: "/manage/integrations",
      subtitle: t("statisticLabel.resources"),
      title: t("statistic.addIntegration"),
    },
    {
      count: statistics.countApps,
      href: "/manage/apps",
      subtitle: t("statisticLabel.resources"),
      title: t("statistic.addApp"),
    },
    {
      count: statistics.countGroups,
      href: "/manage/users/groups",
      subtitle: t("statisticLabel.authorization"),
      title: t("statistic.manageRoles"),
    },
  ];
  return (
    <>
      <HeroBanner />
      <Space h="md" />
      <SimpleGrid cols={{ xs: 1, sm: 2, md: 3 }}>
        {links.map((link, index) => (
          <Card
            component={Link}
            href={link.href}
            key={`link-${index}`}
            withBorder
          >
            <Group justify="space-between">
              <Group>
                <Text size="2.4rem" fw="bolder">
                  {link.count}
                </Text>
                <Stack gap={0}>
                  <Text c="red" size="xs">
                    {link.subtitle}
                  </Text>
                  <Text fw="bold">{link.title}</Text>
                </Stack>
              </Group>
              <IconArrowRight />
            </Group>
          </Card>
        ))}
      </SimpleGrid>
    </>
  );
}
