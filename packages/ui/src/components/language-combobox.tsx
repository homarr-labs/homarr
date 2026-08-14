"use client";

import React from "react";
import { Combobox, Group, InputBase, Loader, ScrollArea, Text, useCombobox } from "@mantine/core";
import { IconCheck } from "@tabler/icons-react";

import type { SupportedLanguage } from "@homarr/translation";
import { localeConfigurations, supportedLanguages } from "@homarr/translation";

import { LanguageIcon } from "./language-icon";

interface LanguageComboboxProps {
  label?: string;
  value: SupportedLanguage;
  onChange: (value: SupportedLanguage) => void;
  isPending?: boolean;
  width?: string;
  withinPortal?: boolean;
}

export const LanguageCombobox = ({
  label,
  value,
  onChange,
  isPending,
  width,
  withinPortal = false,
}: LanguageComboboxProps) => {
  const combobox = useCombobox({ onDropdownClose: () => combobox.resetSelectedOption() });

  return (
    <Combobox
      store={combobox}
      withinPortal={withinPortal}
      onOptionSubmit={(nextValue) => {
        onChange(nextValue as SupportedLanguage);
        combobox.closeDropdown();
      }}
    >
      <Combobox.Target>
        <InputBase
          component="button"
          type="button"
          pointer
          label={label}
          leftSection={isPending ? <Loader size={16} /> : null}
          rightSection={<Combobox.Chevron />}
          rightSectionPointerEvents="none"
          onClick={() => combobox.toggleDropdown()}
          variant="filled"
          w={width}
        >
          <OptionItem currentLocale={value} localeKey={value} />
        </InputBase>
      </Combobox.Target>
      <Combobox.Dropdown>
        <ScrollArea h={300}>
          <Combobox.Options>
            {supportedLanguages.map((locale) => (
              <Combobox.Option value={locale} key={locale}>
                <OptionItem currentLocale={value} localeKey={locale} showCheck />
              </Combobox.Option>
            ))}
          </Combobox.Options>
        </ScrollArea>
      </Combobox.Dropdown>
    </Combobox>
  );
};

const OptionItem = ({
  currentLocale,
  localeKey,
  showCheck,
}: {
  currentLocale: SupportedLanguage;
  localeKey: SupportedLanguage;
  showCheck?: boolean;
}) => (
  <Group wrap="nowrap" justify="space-between">
    <Group wrap="nowrap">
      <LanguageIcon icon={localeConfigurations[localeKey].icon} />
      <Group wrap="nowrap" gap="xs">
        <Text>{localeConfigurations[localeKey].name}</Text>
        <Text size="xs" c="dimmed" inherit>
          ({localeConfigurations[localeKey].translatedName})
        </Text>
      </Group>
    </Group>
    {showCheck && localeKey === currentLocale && <IconCheck color="currentColor" size={16} />}
  </Group>
);
