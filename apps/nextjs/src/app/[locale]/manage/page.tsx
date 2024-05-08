import Link from "next/link";
import { Card, Group, SimpleGrid, Space, Stack, Text } from "@mantine/core";
import { IconArrowRight } from "@tabler/icons-react";

import { getScopedI18n } from "@homarr/translation/server";

import { HeroBanner } from "./_components/hero-banner";

interface LinkProps {
  title: string;
  subtitle: string;
  count: number;
  href: string;
}

const links: LinkProps[] = [
  {
    count: 1,
    href: "/manage/boards",
    subtitle: "Boards",
    title: "View boards",
  },
  {
    count: 1,
    href: "/manage/boards",
    subtitle: "Users",
    title: "Create new user",
  },
  {
    count: 1,
    href: "/manage/boards",
    subtitle: "Security",
    title: "Create user invite",
  },
  {
    count: 1,
    href: "/manage/users",
    subtitle: "Security",
    title: "Manage users",
  },
  {
    count: 4,
    href: "/manage/users/groups",
    subtitle: "Security",
    title: "Manage roles",
  },
];

export async function generateMetadata() {
  const t = await getScopedI18n("management");
  const metaTitle = `${t("metaTitle")} • Homarr`;

  return {
    title: metaTitle,
  };
}

export default function ManagementPage() {
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
