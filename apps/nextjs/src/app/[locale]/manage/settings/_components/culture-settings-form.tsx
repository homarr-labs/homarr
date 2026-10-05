"use client";

import type { UseFormReturnType } from "@homarr/form";
import type { SupportedLanguage } from "@homarr/translation";
import { useI18n } from "@homarr/translation/client";

import { LanguageCombobox } from "~/components/language/language-combobox";
import { SectionCard } from "~/components/manage/section-card";
import type { FormValues } from "./settings-form";

interface CultureSettingsFormProps {
  form: UseFormReturnType<FormValues>;
}

export const CultureSettingsForm = ({ form }: CultureSettingsFormProps) => {
  const tCulture = useI18n("management.page.settings.section.culture");
  const localeInputProps = form.getInputProps("defaultLocale");

  return (
    <SectionCard title={tCulture("title")}>
      <LanguageCombobox
        label={tCulture("defaultLocale.label")}
        {...localeInputProps}
        value={localeInputProps.value as SupportedLanguage}
        withinPortal
      />
    </SectionCard>
  );
};
