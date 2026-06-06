"use client";

import { NumberInput, Switch, TextInput } from "@mantine/core";

import type { ServerSettings } from "@homarr/server-settings";
import { useScopedI18n } from "@homarr/translation/client";

import { CommonSettingsForm } from "./common-form";

export const DockerSettingsForm = ({ defaultValues }: { defaultValues: ServerSettings["docker"] }) => {
  const tDocker = useScopedI18n("management.page.settings.section.docker" as never) as unknown as (
    key: string,
  ) => string;

  return (
    <CommonSettingsForm settingKey="docker" defaultValues={defaultValues}>
      {(form) => (
        <>
          <TextInput
            {...form.getInputProps("targetBoardName")}
            value={form.getInputProps("targetBoardName").value ?? ""}
            label={tDocker("targetBoardName.label")}
            description={tDocker("targetBoardName.description")}
          />
          <Switch
            {...form.getInputProps("readHomepageLabels", { type: "checkbox" })}
            label={tDocker("readHomepageLabels.label")}
            description={tDocker("readHomepageLabels.description")}
          />
          <Switch
            {...form.getInputProps("createIntegrations", { type: "checkbox" })}
            label={tDocker("createIntegrations.label")}
            description={tDocker("createIntegrations.description")}
          />
          <Switch
            {...form.getInputProps("pruneRemoved", { type: "checkbox" })}
            label={tDocker("pruneRemoved.label")}
            description={tDocker("pruneRemoved.description")}
          />
          <NumberInput
            {...form.getInputProps("defaultItemWidth")}
            label={tDocker("defaultItemWidth.label")}
            description={tDocker("defaultItemWidth.description")}
            min={1}
            max={10}
          />
          <NumberInput
            {...form.getInputProps("defaultItemHeight")}
            label={tDocker("defaultItemHeight.label")}
            description={tDocker("defaultItemHeight.description")}
            min={1}
            max={10}
          />
        </>
      )}
    </CommonSettingsForm>
  );
};
