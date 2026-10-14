import {
  ActionIcon,
  ActionIconGroup,
  Alert,
  Avatar,
  Badge,
  Breadcrumbs,
  Button,
  Group,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { IconBox, IconPencil, IconSearch, IconTrash } from "@tabler/icons-react";
import { useState } from "react";

import { ManageCollectionItem, ManageCollectionPage } from "@homarr/ui/source-views/manage/collection";

const displayApps = [
  { name: "Media library", description: "Synthetic display item for collection layout feedback." },
  { name: "Home automation", description: "Synthetic display item. No service is connected." },
  { name: "Network dashboard", description: "Synthetic display item. No private resources are loaded." },
] as const;

export function PlayablePreview() {
  const [search, setSearch] = useState("");
  const visibleApps = displayApps.filter((app) => app.name.toLowerCase().includes(search.trim().toLowerCase()));

  return (
    <Stack gap="xl">
      <Alert title="Disposable display preview" color="yellow">
        Original Homarr collection components with synthetic display data. This is not a signed-in session. Create,
        edit, delete, integrations and all private backend operations are unavailable. Document branding and English
        metadata use original preview defaults, not private settings. Original Inter font assets are unavailable; full
        visual parity is not claimed.
      </Alert>
      <ManageCollectionPage
        title="Apps"
        breadcrumb={
          <Breadcrumbs>
            <Text size="sm">Display preview</Text>
            <Text size="sm">Apps</Text>
          </Breadcrumbs>
        }
        floatingActionBottomOffset={48}
        ariaLabel="Synthetic apps"
        itemCount={visibleApps.length}
        emptyState={<Text c="dimmed">No synthetic apps match this display filter.</Text>}
        primaryAction={<Button disabled>Create app unavailable</Button>}
        toolbar={
          <TextInput
            aria-label="Filter synthetic apps"
            placeholder="Filter synthetic apps..."
            value={search}
            onChange={(event) => setSearch(event.currentTarget.value)}
            leftSection={<IconSearch size={18} stroke={1.5} />}
          />
        }
      >
        {visibleApps.map((app) => (
          <ManageCollectionItem
            key={app.name}
            leading={
              <Avatar size={36} radius="sm">
                <IconBox size={20} stroke={1.5} />
              </Avatar>
            }
            title={
              <Text component="span" fw={600} lineClamp={1}>
                {app.name}
              </Text>
            }
            description={
              <Text size="sm" c="dimmed" lineClamp={2}>
                {app.description}
              </Text>
            }
            badges={
              <Badge variant="light" color="gray">
                Synthetic
              </Badge>
            }
            actions={
              <ActionIconGroup>
                <ActionIcon
                  disabled
                  variant="subtle"
                  color="gray"
                  size={44}
                  aria-label={`Edit ${app.name} unavailable`}
                >
                  <IconPencil size={18} stroke={1.5} />
                </ActionIcon>
                <ActionIcon
                  disabled
                  variant="subtle"
                  color="red"
                  size={44}
                  aria-label={`Delete ${app.name} unavailable`}
                >
                  <IconTrash size={18} stroke={1.5} />
                </ActionIcon>
              </ActionIconGroup>
            }
          />
        ))}
      </ManageCollectionPage>
      <Group justify="center">
        <Text size="sm" c="dimmed">
          Display filtering is local only. Product routes remain held.
        </Text>
      </Group>
    </Stack>
  );
}
