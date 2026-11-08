"use client";

import Link from "next/link";
import { Button, Group, Stack, Text } from "@mantine/core";
import { IconAdjustments } from "@tabler/icons-react";

import { themeNames } from "@homarr/definitions";
import { useI18n } from "@homarr/translation/client";

import type { ThemeSelection } from "~/theme/branding";

interface ThemeSettingsProps extends Pick<ThemeSelection, "themeId"> {
  editorHref: string;
}

export const ThemeSettings = ({ themeId, editorHref }: ThemeSettingsProps) => {
  const t = useI18n("common.customTheme");
  let label = themeNames.default;
  if (themeId === "custom") label = t("custom");
  else if (themeId) label = themeNames[themeId];
  return (
    <Stack gap="xs">
      <Text size="sm">
        {t("label")}:{" "}
        <Text component="span" fw={600}>
          {label}
        </Text>
      </Text>
      <Group gap="xs">
        <Button
          component={Link}
          href={editorHref}
          prefetch={false}
          variant="default"
          size="xs"
          leftSection={<IconAdjustments size={16} />}
        >
          {t("customize")}
        </Button>
      </Group>
    </Stack>
  );
};
