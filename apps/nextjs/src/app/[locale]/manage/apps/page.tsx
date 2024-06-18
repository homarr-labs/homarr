import Link from "next/link";
import { ActionIcon, ActionIconGroup, Anchor, Avatar, Card, Group, Stack, Text, Title } from "@mantine/core";
import { IconApps, IconPencil } from "@tabler/icons-react";

import type { RouterOutputs } from "@homarr/api";
import { api } from "@homarr/api/server";
import { getI18n, getScopedI18n } from "@homarr/translation/server";

import { ManageContainer } from "~/components/manage/manage-container";
import { MobileAffixButton } from "~/components/manage/mobile-affix-button";
import { AppDeleteButton } from "./_app-delete-button";

export default async function AppsPage() {
  const apps = await api.app.all();
  const t = await getScopedI18n("app");

  return (
    <ManageContainer>
      <Stack>
        <Group justify="space-between" align="center">
          <Title>{t("page.list.title")}</Title>
          <MobileAffixButton component={Link} href="/manage/apps/new">
            {t("page.create.title")}
          </MobileAffixButton>
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

const AppCard = ({ app }: AppCardProps) => {
  return (
    <Card>
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
            <ActionIcon
              component={Link}
              href={`/manage/apps/edit/${app.id}`}
              variant="subtle"
              color="gray"
              aria-label="Edit app"
            >
              <IconPencil size={16} stroke={1.5} />
            </ActionIcon>
            <AppDeleteButton app={app} />
          </ActionIconGroup>
        </Group>
      </Group>
    </Card>
  );
};

const AppNoResults = async () => {
  const t = await getI18n();

  return (
    <Card withBorder bg="transparent">
      <Stack align="center" gap="sm">
        <IconApps size="2rem" />
        <Text fw={500} size="lg">
          {t("app.page.list.noResults.title")}
        </Text>
        <Anchor href="/manage/apps/new">{t("app.page.list.noResults.description")}</Anchor>
      </Stack>
    </Card>
  );
};
