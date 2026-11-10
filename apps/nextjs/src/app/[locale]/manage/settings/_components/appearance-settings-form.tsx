"use client";

import { Stack } from "@mantine/core";

import type { UseFormReturnType } from "@homarr/form";
import { useI18n } from "@homarr/translation/client";
import { ColorSchemeCombobox } from "@homarr/ui";

import { ThemeSettings } from "~/components/theme/theme-settings";

import type { FormValues } from "./settings-form";

interface AppearanceSettingsFormProps {
  form: UseFormReturnType<FormValues>;
}

export const AppearanceSettingsForm = ({ form }: AppearanceSettingsFormProps) => {
  const tAppearance = useI18n("management.page.settings.section.appearance");
  const branding = form.values.branding;

  return (
    <Stack gap="md">
      <ThemeSettings
        editorHref="/manage/settings/theme"
        themeId={branding.themeId}
        hasCustomTheme={Boolean(branding.customTheme)}
        onChange={(themeId) => form.setFieldValue("branding.themeId", themeId)}
      />
      <ColorSchemeCombobox
        label={tAppearance("defaultColorScheme.label")}
        variant="default"
        {...form.getInputProps("defaultColorScheme")}
        value={form.values.defaultColorScheme}
        withinPortal
      />
    </Stack>
  );
};
