"use client";

import Link from "next/link";
import { Box, Button, Group, Paper, SimpleGrid, Stack, Text, Title } from "@mantine/core";
import { IconAdjustments, IconArrowRight } from "@tabler/icons-react";

import { themeNames } from "@homarr/definitions";
import { ThemeSelect } from "@homarr/ui/theme-select";
import type { ThemeSelectionId } from "@homarr/validation/theme";
import { useI18n } from "@homarr/translation/client";

import type { ThemeSelection } from "~/theme/branding";

interface ThemeSettingsProps extends Pick<ThemeSelection, "themeId"> {
  editorHref: string;
  hasCustomTheme: boolean;
  onChange: (themeId: ThemeSelectionId) => void;
}

export const ThemeSettings = ({ themeId, editorHref, hasCustomTheme, onChange }: ThemeSettingsProps) => {
  const t = useI18n("common.customTheme");
  let label = themeNames.default;
  if (themeId === "custom") label = t("custom");
  else if (themeId) label = themeNames[themeId];
  return (
    <Paper bg="var(--mantine-color-default-hover)" radius="md" p={{ base: "md", sm: "xl" }}>
      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xl">
        <Stack justify="center" gap="lg">
          <Stack gap={4}>
            <Text size="xs" fw={700} tt="uppercase" c="dimmed">
              {t("label")}
            </Text>
            <Title order={4} size="h1">
              {label}
            </Title>
          </Stack>
          <ThemeSelect value={themeId} hasCustomTheme={hasCustomTheme} onChange={onChange} />
          <Button
            component={Link}
            href={editorHref}
            prefetch={false}
            size="md"
            w={{ base: "100%", sm: "fit-content" }}
            leftSection={<IconAdjustments size={20} />}
            rightSection={<IconArrowRight size={18} />}
          >
            {t("customize")}
          </Button>
        </Stack>
        <ThemeSwatch />
      </SimpleGrid>
    </Paper>
  );
};

const ThemeSwatch = () => (
  <Paper aria-hidden withBorder visibleFrom="sm" p="md" bg="var(--mantine-color-body)">
    <Stack gap="md">
      <Group justify="space-between" wrap="nowrap">
        <Group gap="xs" wrap="nowrap">
          <Box w={14} h={14} bdrs="sm" bg="var(--mantine-primary-color-filled)" />
          <Text fw={700}>Aa</Text>
        </Group>
        <Box w={44} h={5} bdrs="xl" bg="var(--mantine-color-default-border)" />
      </Group>
      <Group gap="sm" wrap="nowrap" align="stretch">
        <Stack gap="xs" w={24} pt={4}>
          {[24, 16, 20].map((width) => (
            <Box key={width} w={width} h={5} bdrs="xl" bg="var(--mantine-color-default-border)" />
          ))}
        </Stack>
        <Stack flex={1} gap="xs">
          <SimpleGrid cols={2} spacing="xs">
            <Paper withBorder p="sm" bg="var(--mantine-color-default)">
              <Box w={28} h={6} bdrs="xl" bg="var(--mantine-primary-color-filled)" />
            </Paper>
            <Paper withBorder p="sm" bg="var(--mantine-color-default)">
              <Box w={28} h={6} bdrs="xl" bg="var(--mantine-color-text)" />
            </Paper>
          </SimpleGrid>
          <Paper withBorder p="sm" bg="var(--mantine-color-default)">
            <Group gap={6} wrap="nowrap" align="end">
              {[14, 32, 22, 40, 26].map((height) => (
                <Box key={height} flex={1} h={height} bdrs="sm" bg="var(--mantine-primary-color-filled)" />
              ))}
            </Group>
          </Paper>
        </Stack>
      </Group>
    </Stack>
  </Paper>
);
