"use client";

import React from "react";
import { Combobox, Group, InputBase, Text, useCombobox } from "@mantine/core";
import { IconCheck, IconDeviceDesktop, IconMoon, IconSun } from "@tabler/icons-react";

import type { ColorScheme } from "@homarr/definitions";
import { colorSchemes } from "@homarr/definitions";
import { useScopedI18n } from "@homarr/translation/client";

const schemeIcons: Record<ColorScheme, React.ElementType> = {
  auto: IconDeviceDesktop,
  light: IconSun,
  dark: IconMoon,
};

interface ColorSchemeComboboxProps {
  value: ColorScheme;
  onChange: (value: ColorScheme) => void;
  width?: string;
}

export const ColorSchemeCombobox = ({ value, onChange, width }: ColorSchemeComboboxProps) => {
  const tOptions = useScopedI18n("common.colorScheme.options");

  const combobox = useCombobox({
    onDropdownClose: () => combobox.resetSelectedOption(),
  });

  const handleOnOptionSubmit = React.useCallback(
    (val: string) => {
      if (!val) return;
      onChange(val as ColorScheme);
      combobox.closeDropdown();
    },
    [onChange, combobox],
  );

  const handleOnClick = React.useCallback(() => {
    combobox.toggleDropdown();
  }, [combobox]);

  return (
    <Combobox store={combobox} onOptionSubmit={handleOnOptionSubmit}>
      <Combobox.Target>
        <InputBase
          component="button"
          type="button"
          pointer
          rightSection={<Combobox.Chevron />}
          rightSectionPointerEvents="none"
          onClick={handleOnClick}
          variant="filled"
          w={width}
        >
          <OptionItem scheme={value} currentScheme={value} tOptions={tOptions} />
        </InputBase>
      </Combobox.Target>
      <Combobox.Dropdown>
        <Combobox.Options>
          {colorSchemes.map((scheme) => (
            <Combobox.Option value={scheme} key={scheme}>
              <OptionItem scheme={scheme} currentScheme={value} tOptions={tOptions} showCheck />
            </Combobox.Option>
          ))}
        </Combobox.Options>
      </Combobox.Dropdown>
    </Combobox>
  );
};

const OptionItem = ({
  scheme,
  currentScheme,
  tOptions,
  showCheck,
}: {
  scheme: ColorScheme;
  currentScheme: ColorScheme;
  tOptions: (key: ColorScheme) => string;
  showCheck?: boolean;
}) => {
  const Icon = schemeIcons[scheme];

  return (
    <Group wrap="nowrap" justify="space-between">
      <Group wrap="nowrap">
        <Icon size={16} stroke={1.5} />
        <Text>{tOptions(scheme)}</Text>
      </Group>
      {showCheck && scheme === currentScheme && <IconCheck color="currentColor" size={16} />}
    </Group>
  );
};
