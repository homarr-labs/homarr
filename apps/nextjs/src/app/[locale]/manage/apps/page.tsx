import Link from "next/link";
import { redirect } from "next/navigation";
import { ActionIcon, ActionIconGroup, Anchor, Avatar, Card, Group, Stack, Text, Title } from "@mantine/core";
import { IconBox, IconPencil } from "@tabler/icons-react";

import type { RouterOutputs } from "@homarr/api";
import { api } from "@homarr/api/server";
import { auth } from "@homarr/auth/next";
import { getI18n, getScopedI18n } from "@homarr/translation/server";

import { ManageContainer } from "~/components/manage/manage-container";
import { MobileAffixButton } from "~/components/manage/mobile-affix-button";
import { DynamicBreadcrumb } from "~/components/navigation/dynamic-breadcrumb";
import { NoResults } from "~/components/no-results";
import { AppDeleteButton } from "./_app-delete-button";

export default async function AppsPage() {
  const session = await auth();

  if (!session) {
    redirect("/auth/login");
  }

  const apps = await api.app.all();
  const t = await getScopedI18n("app");

  return (
    <ManageContainer>
      <DynamicBreadcrumb />
      <Stack>
        <Group justify="space-between" align="center">
          <Title>{t("page.list.title")}</Title>
          {session.user.permissions.includes("app-create") && (
            <MobileAffixButton component={Link} href="/manage/apps/new">
              {t("page.create.title")}
            </MobileAffixButton>
          )}
        </Group>
        {apps.length === 0 && <AppNoResults />}
        {apps.length > 0 && (
          <Stack gap="sm">
            {apps.map((app) => (
              <AppCard key={app.id} app={app} />
            ))}
          </Stack>
        )}
      </Stack>
    </ManageContainer>
  );
}

interface AppCardProps {
  app: RouterOutputs["app"]["all"][number];
}

const AppCard = async ({ app }: AppCardProps) => {
  const t = await getScopedI18n("app");
  const session = await auth();

  return (
    <Card withBorder>
      <Group justify="space-between" wrap="nowrap">
        <Group align="top" justify="start" wrap="nowrap">
          <Avatar
            size="sm"
            src={app.iconUrl}
            radius={0}
            styles={{
              image: {
                objectFit: "contain",
              },
            }}
          />
          <Stack gap={0}>
            <Text fw={500} lineClamp={1}>
              {app.name}
            </Text>
            {app.description && (
              <Text size="sm" c="gray.6" lineClamp={4}>
                {app.description}
              </Text>
            )}
            {app.href && (
              <Anchor href={app.href} lineClamp={1} size="sm" w="min-content">
                {app.href}
              </Anchor>
            )}
          </Stack>
        </Group>
        <Group>
          <ActionIconGroup>
            {session?.user.permissions.includes("app-modify-all") && (
              <ActionIcon
                component={Link}
                href={`/manage/apps/edit/${app.id}`}
                variant="subtle"
                color="gray"
                aria-label={t("page.edit.title")}
              >
                <IconPencil size={16} stroke={1.5} />
              </ActionIcon>
            )}
            {session?.user.permissions.includes("app-full-all") && <AppDeleteButton app={app} />}
          </ActionIconGroup>
        </Group>
      </Group>
    </Card>
  );
};

const AppNoResults = async () => {
  const t = await getI18n();
  const session = await auth();

  return (
    <NoResults
      icon={IconBox}
      title={t("app.page.list.noResults.title")}
      action={{
        label: t("app.page.list.noResults.action"),
        href: "/manage/apps/new",
        hidden: !session?.user.permissions.includes("app-create"),
      }}
    />
  );
};
