"use client";

import type { UseFormReturnType } from "@homarr/form";
import { useScopedI18n } from "@homarr/translation/client";

import { SectionCard } from "~/components/manage/section-card";
import type { FormValues } from "./settings-form";
import { SwitchSetting } from "./setting-switch";

interface AnalyticsSettingsProps {
  form: UseFormReturnType<FormValues>;
}

export const AnalyticsSettings = ({ form }: AnalyticsSettingsProps) => {
  const t = useScopedI18n("management.page.settings.section.analytics");

  return (
    <SectionCard title={t("title")}>
      <SwitchSetting form={form} formKey="enableGeneral" title={t("general.title")} text={t("general.text")} />
    </SectionCard>
  );
};
