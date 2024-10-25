"use client";

import { Group, Text } from "@mantine/core";
import { SelectWithCustomItems } from "node_modules/@homarr/ui/src/components/select-with-custom-items";

import { objectEntries } from "@homarr/common";
import type { ServerSettings } from "@homarr/server-settings";
import type { SupportedLanguage } from "@homarr/translation";
import { localeAttributes } from "@homarr/translation";
import { useScopedI18n } from "@homarr/translation/client";

import { CommonSettingsForm } from "./common-form";

export const CultureSettingsForm = ({ defaultValues }: { defaultValues: ServerSettings["culture"] }) => {
  const tCulture = useScopedI18n("management.page.settings.section.culture");

  return (
    <CommonSettingsForm settingKey="culture" defaultValues={defaultValues}>
      {(form) => (
        <>
          <SelectWithCustomItems
            label={tCulture("defaultLocale.label")}
            data={objectEntries(localeAttributes).map(([value, { name }]) => ({
              value,
              label: name,
            }))}
            defaultValue={defaultValues.defaultLocale}
            SelectOption={({ value, label }: { value: SupportedLanguage; label: string }) => {
              const currentConfig = localeAttributes[value];

              return (
                <Group>
                  <span className={`fi fi-${currentConfig.flagIcon}`} style={{ borderRadius: 4 }}></span>
                  <Text fz="sm" fw={500}>
                    {label}
                  </Text>
                </Group>
              );
            }}
            {...form.getInputProps("defaultLocale")}
          />
        </>
      )}
    </CommonSettingsForm>
  );
};
