"use client";

import { Switch } from "@mantine/core";

import type { UseFormReturnType } from "@homarr/form";
import { useScopedI18n } from "@homarr/translation/client";

import { SectionCard } from "~/components/manage/section-card";
import type { FormValues } from "./settings-form";

interface UserSettingsFormProps {
  form: UseFormReturnType<FormValues>;
}

export const UserSettingsForm = ({ form }: UserSettingsFormProps) => {
  const tUser = useScopedI18n("management.page.settings.section.user");

  return (
    <SectionCard title={tUser("title")}>
      <Switch
        {...form.getInputProps("enableGravatar", { type: "checkbox" })}
        label={tUser("enableGravatar.label")}
        description={tUser("enableGravatar.description")}
      />
    </SectionCard>
  );
};
