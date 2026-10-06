"use client";

import { Anchor } from "@mantine/core";
import { IconExternalLink } from "@tabler/icons-react";

import { createDocumentationLink } from "@homarr/definitions";
import type { UseFormReturnType } from "@homarr/form";
import { useI18n } from "@homarr/translation/client";

import { SectionCard } from "~/components/manage/section-card";
import type { FormValues } from "./settings-form";
import { SwitchSetting } from "./setting-switch";

interface AnalyticsSettingsProps {
  form: UseFormReturnType<FormValues>;
}

export const AnalyticsSettings = ({ form }: AnalyticsSettingsProps) => {
  const t = useI18n("management.page.settings.section");

  return (
    <SectionCard title={t("analytics.title")}>
      <SwitchSetting
        form={form}
        formKey="enableGeneral"
        title={t("analytics.general.title")}
        text={t("analytics.general.text")}
      />
      <Anchor
        href={createDocumentationLink("/docs/management/settings", "#analytics")}
        target="_blank"
        rel="noopener noreferrer"
        size="sm"
      >
        {t("analyticsDocumentation")}
        <IconExternalLink size={14} style={{ marginInlineStart: 4, verticalAlign: "middle" }} />
      </Anchor>
    </SectionCard>
  );
};
