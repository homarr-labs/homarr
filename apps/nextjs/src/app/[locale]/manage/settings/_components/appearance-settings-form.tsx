"use client";

import { Group, Text } from "@mantine/core";
import { IconDeviceDesktop, IconMoon, IconSun } from "@tabler/icons-react";

import type { ColorScheme } from "@homarr/definitions";
import { colorSchemes } from "@homarr/definitions";
import type { UseFormReturnType } from "@homarr/form";
import { useI18n } from "@homarr/translation/client";
import { SelectWithCustomItems } from "@homarr/ui";

import { SectionCard } from "~/components/manage/section-card";
import type { FormValues } from "./settings-form";

interface AppearanceSettingsFormProps {
  form: UseFormReturnType<FormValues>;
}

export const AppearanceSettingsForm = ({ form }: AppearanceSettingsFormProps) => {
  const tAppearance = useI18n("management.page.settings.section.appearance");
  const tColorScheme = useI18n("common.colorScheme.options");

  return (
    <SectionCard title={tAppearance("title")}>
      <SelectWithCustomItems
        label={tAppearance("defaultColorScheme.label")}
        data={colorSchemes.map((scheme) => ({
          value: scheme,
          label: tColorScheme(scheme),
        }))}
        {...form.getInputProps("defaultColorScheme")}
        SelectOption={AppearanceCustomOption}
        withinPortal
      />
    </SectionCard>
  );
};

const appearanceIcons = {
  auto: IconDeviceDesktop,
  light: IconSun,
  dark: IconMoon,
};

const AppearanceCustomOption = ({ value, label }: { value: ColorScheme; label: string }) => {
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
