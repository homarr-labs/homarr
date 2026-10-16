"use client";

import type { UseFormReturnType } from "@homarr/form";
import { useI18n } from "@homarr/translation/client";
import { ColorSchemeCombobox, SectionCard } from "@homarr/ui";

import type { FormValues } from "./settings-form";

interface AppearanceSettingsFormProps {
  form: UseFormReturnType<FormValues>;
}

export const AppearanceSettingsForm = ({ form }: AppearanceSettingsFormProps) => {
  const tAppearance = useI18n("management.page.settings.section.appearance");

  return (
    <SectionCard title={tAppearance("title")}>
      <ColorSchemeCombobox
        label={tAppearance("defaultColorScheme.label")}
        variant="default"
        {...form.getInputProps("defaultColorScheme")}
        value={form.values.defaultColorScheme}
        withinPortal
      />
    </SectionCard>
  );
};
