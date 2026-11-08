"use client";

import Link from "next/link";
import { Button, Group, Stack, Text } from "@mantine/core";
import { IconAdjustments } from "@tabler/icons-react";

import { themeNames } from "@homarr/definitions";
import { useI18n } from "@homarr/translation/client";

import type { ThemeSelection } from "~/theme/branding";

interface ThemeSettingsProps extends ThemeSelection {
  editorHref: string;
  inherit?: boolean;
  onChange: (selection: ThemeSelection) => void;
}

export const ThemeSettings = ({ themeId, customTheme, editorHref, inherit, onChange }: ThemeSettingsProps) => {
  const t = useI18n("common.customTheme");
  let label = t("serverDefault");
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
        {inherit && themeId !== null && (
          <Button variant="subtle" size="xs" onClick={() => onChange({ themeId: null, customTheme })}>
            {t("studio.useServer")}
          </Button>
        )}
      </Group>
    </Stack>
  );
};
