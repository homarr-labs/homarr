"use client";

import { Switch, Slider, Stack } from "@mantine/core";

import type { ServerSettings } from "@homarr/server-settings";
import { useScopedI18n } from "@homarr/translation/client";

import { CommonSettingsForm } from "./common-form";

export const UserSettingsForm = ({ defaultValues }: { defaultValues: ServerSettings["user"] }) => {
  const tUser = useScopedI18n("management.page.settings.section.user");

  return (
    <CommonSettingsForm settingKey="user" defaultValues={defaultValues}>
      {(form) => (
        <Stack>
          <Switch
            {...form.getInputProps("enableGravatar", { type: "checkbox" })}
            label={tUser("enableGravatar.label")}
            description={tUser("enableGravatar.description")}
          />
          <Switch
            {...form.getInputProps("requireNumberInPassword", { type: "checkbox" })}
            label={tUser("requireNumberInPassword.label")}
            description={tUser("requireNumberInPassword.description")}
          />
          <Slider
            {...form.getInputProps("minPasswordLength")}
            label={tUser("minPasswordLength.label")}
            min={6}
            max={64}
            step={1}
          />
        </Stack>
      )}
    </CommonSettingsForm>
  );
};
