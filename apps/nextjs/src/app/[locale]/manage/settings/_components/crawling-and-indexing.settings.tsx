"use client";

import { Text } from "@mantine/core";

import type { UseFormReturnType } from "@homarr/form";
import { useI18n } from "@homarr/translation/client";

import { SectionCard } from "~/components/manage/section-card";
import type { FormValues } from "./settings-form";
import { SwitchSetting } from "./setting-switch";

interface CrawlingAndIndexingSettingsProps {
  form: UseFormReturnType<FormValues>;
}

export const CrawlingAndIndexingSettings = ({ form }: CrawlingAndIndexingSettingsProps) => {
  const t = useI18n("management.page.settings.section.crawlingAndIndexing");

  return (
    <SectionCard title={t("title")}>
      <Text c="dimmed" size="sm">
        {t("warning")}
      </Text>
      <SwitchSetting form={form} formKey="noIndex" title={t("noIndex.title")} text={t("noIndex.text")} />
      <SwitchSetting form={form} formKey="noFollow" title={t("noFollow.title")} text={t("noFollow.text")} />
      <SwitchSetting form={form} formKey="noTranslate" title={t("noTranslate.title")} text={t("noTranslate.text")} />
      <SwitchSetting
        form={form}
        formKey="noSiteLinksSearchBox"
        title={t("noSiteLinksSearchBox.title")}
        text={t("noSiteLinksSearchBox.text")}
      />
    </SectionCard>
  );
};
