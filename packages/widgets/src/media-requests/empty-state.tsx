"use client";

import { Button, Stack, Text, ThemeIcon } from "@mantine/core";
import { IconMovieOff, IconSearch } from "@tabler/icons-react";

import { openMediaRequestSearch } from "@homarr/spotlight";
import { useI18n } from "@homarr/translation/client";

interface MediaRequestsEmptyStateProps {
  title: string;
  description: string;
  integrationIds: string[];
  isEditMode: boolean;
}

export const MediaRequestsEmptyState = ({
  title,
  description,
  integrationIds,
  isEditMode,
}: MediaRequestsEmptyStateProps) => {
  const tSearch = useI18n("search.mode.media");

  return (
    <Stack h="100%" align="center" justify="center" gap="xs" p="md">
      <ThemeIcon variant="light" size="xl" radius="xl">
        <IconMovieOff />
      </ThemeIcon>
      <Stack gap={2} align="center">
        <Text fw={600} ta="center">
          {title}
        </Text>
        <Text c="dimmed" size="sm" ta="center" maw="28ch">
          {description}
        </Text>
      </Stack>
      {!isEditMode ? (
        <Button
          variant="light"
          size="compact-sm"
          leftSection={<IconSearch size="var(--mantine-font-size-md)" />}
          onClick={() => openMediaRequestSearch({ integrationIds })}
        >
          {tSearch("action.search.label")}
        </Button>
      ) : null}
    </Stack>
  );
};
