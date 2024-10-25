"use client";

import { Group, Text } from "@mantine/core";
import { IconMoon, IconSun } from "@tabler/icons-react";
import { SelectWithCustomItems } from "node_modules/@homarr/ui/src/components/select-with-custom-items";

import type { ColorScheme } from "@homarr/definitions";
import { colorSchemes } from "@homarr/definitions";
import type { ServerSettings } from "@homarr/server-settings";

import { CommonSettingsForm } from "./common-form";

export const AppearanceSettingsForm = ({ defaultValues }: { defaultValues: ServerSettings["appearance"] }) => {
  return (
    <CommonSettingsForm settingKey="appearance" defaultValues={defaultValues}>
      {(form) => (
        <>
          <SelectWithCustomItems
            label="Default color scheme"
            data={colorSchemes.map((scheme) => ({
              value: scheme,
              label: scheme,
            }))}
            {...form.getInputProps("defaultColorScheme")}
            SelectOption={ApperanceCustomOption}
          />
        </>
      )}
    </CommonSettingsForm>
  );
};

const appearanceIcons = {
  light: IconSun,
  dark: IconMoon,
};

const ApperanceCustomOption = ({ value, label }: { value: ColorScheme; label: string }) => {
  const Icon = appearanceIcons[value];

  return (
    <Group>
      <Icon size={16} stroke={1.5} />
      <Text fz="sm" fw={500}>
        {label}
      </Text>
    </Group>
  );
};
