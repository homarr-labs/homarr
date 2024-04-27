import Link from "next/link";
import {
  ActionIcon,
  ActionIconGroup,
  Anchor,
  Avatar,
  Button,
  Card,
  Container,
  Group,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { IconApps, IconPencil } from "@tabler/icons-react";

import type { RouterOutputs } from "@homarr/api";
import { api } from "@homarr/api/server";
import { getI18n } from "@homarr/translation/server";

import { AppDeleteButton } from "./_app-delete-button";

export default async function AppsPage() {
  const apps = await api.app.all();

  return (
    <Container>
      <Stack>
        <Group justify="space-between" align="center">
          <Title>Apps</Title>
          <Button component={Link} href="/apps/new">
            New app
          </Button>
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
    </Container>
  );
}

interface AppCardProps {
  app: RouterOutputs["app"]["all"][number];
}

const AppCard = ({ app }: AppCardProps) => {
  return (
    <Card>
      <Group justify="space-between">
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
            <Text fw={500}>{app.name}</Text>
            {app.description && (
              <Text size="sm" c="gray.6">
                {app.description}
              </Text>
            )}
            {app.href && (
              <Anchor href={app.href} size="sm" w="min-content">
                {app.href}
              </Anchor>
            )}
          </Stack>
        </Group>
        <Group>
          <ActionIconGroup>
            <ActionIcon
              component={Link}
              href={`/apps/edit/${app.id}`}
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
        <Anchor href="/apps/new">
          {t("app.page.list.noResults.description")}
        </Anchor>
      </Stack>
    </Card>
  );
};
