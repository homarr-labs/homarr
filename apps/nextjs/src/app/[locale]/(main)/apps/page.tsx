import Link from "next/link";

import type { RouterOutputs } from "@homarr/api";
import {
  ActionIcon,
  ActionIconGroup,
  Anchor,
  Avatar,
  Button,
  Card,
  Container,
  Group,
  IconPencil,
  IconTrash,
  Stack,
  Text,
  Title,
} from "@homarr/ui";

import { api } from "~/trpc/server";

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
        <Stack gap="sm">
          {apps.map((app) => (
            <AppCard key={app.id} app={app} />
          ))}
        </Stack>
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
              href={`/apps/edit/<id>`}
              variant="subtle"
              color="gray"
              aria-label="Edit app"
            >
              <IconPencil size={16} stroke={1.5} />
            </ActionIcon>
            <ActionIcon variant="subtle" color="red" aria-label="Delete app">
              <IconTrash color="red" size={16} stroke={1.5} />
            </ActionIcon>
          </ActionIconGroup>
        </Group>
      </Group>
    </Card>
  );
};
