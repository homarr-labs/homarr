"use client";

import { Fieldset, SimpleGrid, Stack, Switch } from "@mantine/core";

import type { UseFormReturnType } from "@homarr/form";
import { useI18n } from "@homarr/translation/client";
import { BoardColorInput, ColorSchemeCombobox, CornerStylePicker } from "@homarr/ui";

import { AdvancedSettings } from "~/components/manage/advanced-settings";
import { ThemeSettings } from "~/components/theme/theme-settings";
import { CustomCssEditor } from "~/components/custom-css/custom-css-editor";
import { WorkshopCssImportButton } from "~/components/workshop/workshop-css-import-button";

import type { FormValues } from "./settings-form";

interface AppearanceSettingsFormProps {
  form: UseFormReturnType<FormValues>;
}

export const AppearanceSettingsForm = ({ form }: AppearanceSettingsFormProps) => {
  const tAppearance = useI18n("management.page.settings.section.appearance");
  const t = useI18n("management.page.settings.section.branding");
  const branding = form.values.branding;

  return (
    <Fieldset legend={tAppearance("title")} p="md">
      <Stack gap="md">
        <ThemeSettings editorHref="/manage/settings/theme" themeId={branding.themeId} />
        <ColorSchemeCombobox
          label={tAppearance("defaultColorScheme.label")}
          variant="default"
          {...form.getInputProps("defaultColorScheme")}
          value={form.values.defaultColorScheme}
          withinPortal
        />
        <AdvancedSettings>
          <Stack gap="md">
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
              <BoardColorInput
                label={t("primaryColor.label")}
                defaultColor="#fa5252"
                {...form.getInputProps("branding.primaryColor")}
              />
              <BoardColorInput
                label={t("secondaryColor.label")}
                defaultColor="#fd7e14"
                {...form.getInputProps("branding.secondaryColor")}
              />
            </SimpleGrid>
            <Switch
              label={t("lockPrimaryColor.label")}
              {...form.getInputProps("branding.lockPrimaryColor", { type: "checkbox" })}
            />
            <CornerStylePicker
              compact
              label={t("defaultRadius.label")}
              {...form.getInputProps("branding.defaultRadius")}
              value={branding.defaultRadius}
            />
            <CustomCssEditor
              id="global-custom-css"
              label={t("customCss.label")}
              actions={
                <WorkshopCssImportButton
                  size="compact-xs"
                  onImport={(css) => form.setFieldValue("branding.customCss", css)}
                />
              }
              {...form.getInputProps("branding.customCss")}
            />
          </Stack>
        </AdvancedSettings>
      </Stack>
    </Fieldset>
  );
};
