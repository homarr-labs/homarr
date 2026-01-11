"use client";

import { Switch } from "@mantine/core";

import type { ServerSettings } from "@homarr/server-settings";
import { useScopedI18n } from "@homarr/translation/client";

import { CommonSettingsForm } from "./common-form";

export const UserSettingsForm = ({ defaultValues }: { defaultValues: ServerSettings["user"] }) => {
  const tUser = useScopedI18n("management.page.settings.section.user");

  return (
    <CommonSettingsForm settingKey="user" defaultValues={defaultValues}>
      {(form) => {
        const gravatarLabel = tUser("enableGravatar.label");
        const gravatarDescription = tUser("enableGravatar.description");

        return (
          <Switch
            {...form.getInputProps("enableGravatar", { type: "checkbox" })}
            label={gravatarLabel}
            description={gravatarDescription}
          />
        );
      }}
    </CommonSettingsForm>
  );
};
