"use client";

import { NumberInput, Switch } from "@mantine/core";

import type { ServerSettings } from "@homarr/server-settings";
import { useScopedI18n } from "@homarr/translation/client";

import { CommonSettingsForm } from "./common-form";

export const IdleRestartSettingsForm = ({ defaultValues }: { defaultValues: ServerSettings["idleRestart"] }) => {
  const t = useScopedI18n("management.page.settings.section.idleRestart");

  return (
    <CommonSettingsForm settingKey="idleRestart" defaultValues={defaultValues}>
      {(form) => (
        <>
          <Switch
            {...form.getInputProps("enabled", { type: "checkbox" })}
            label={t("enabled.label")}
            description={t("enabled.description")}
          />
          <NumberInput
            {...form.getInputProps("gracePeriodMinutes")}
            label={t("gracePeriodMinutes.label")}
            description={t("gracePeriodMinutes.description")}
            min={1}
            max={1440}
            disabled={!form.values.enabled}
          />
        </>
      )}
    </CommonSettingsForm>
  );
};
