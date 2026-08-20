"use client";

import { Switch } from "@mantine/core";

import type { UseFormReturnType } from "@homarr/form";
import { useI18n } from "@homarr/translation/client";

import { SectionCard } from "~/components/manage/section-card";
import type { FormValues } from "./_settings-form";

interface Props {
  form: UseFormReturnType<FormValues>;
}

export const BehaviorSettingsContent = ({ form }: Props) => {
  const t = useI18n("board");

  return (
    <SectionCard title={t("setting.section.behavior.title")}>
      <Switch
        label={t("field.disableStatus.label")}
        description={t("field.disableStatus.description")}
        {...form.getInputProps("disableStatus", { type: "checkbox" })}
      />
    </SectionCard>
  );
};
