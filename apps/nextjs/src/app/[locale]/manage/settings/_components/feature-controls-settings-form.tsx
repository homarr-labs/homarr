"use client";

import { SimpleGrid, Switch } from "@mantine/core";

import type { UseFormReturnType } from "@homarr/form";
import { useI18n } from "@homarr/translation/client";

import { SectionCard } from "~/components/manage/section-card";
import type { FormValues } from "./settings-form";

interface FeatureControlsSettingsFormProps {
  form: UseFormReturnType<FormValues>;
}

export const FeatureControlsSettingsForm = ({ form }: FeatureControlsSettingsFormProps) => {
  const t = useI18n("management.page.settings.section.featureControls");

  return (
    <SectionCard title={t("title")}>
      <SimpleGrid cols={{ base: 1, md: 3 }} spacing="md" verticalSpacing="sm">
        <Switch
          label={t("assistant.label")}
          description={t("assistant.description")}
          {...form.getInputProps("featureControls.assistantEnabled", { type: "checkbox" })}
        />
        <Switch
          label={t("boardSwitcher.label")}
          description={t("boardSwitcher.description")}
          {...form.getInputProps("featureControls.boardSwitcherEnabled", { type: "checkbox" })}
        />
        <Switch
          label={t("widgetContextMenu.label")}
          description={t("widgetContextMenu.description")}
          {...form.getInputProps("featureControls.widgetContextMenuEnabled", { type: "checkbox" })}
        />
      </SimpleGrid>
    </SectionCard>
  );
};
