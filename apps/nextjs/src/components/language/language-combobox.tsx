"use client";

import React from "react";
import { Combobox, Group, InputBase, Loader, ScrollArea, Text, useCombobox } from "@mantine/core";
import { IconCheck } from "@tabler/icons-react";

import type { SupportedLanguage } from "@homarr/translation";
import { localeConfigurations, supportedLanguages } from "@homarr/translation";
import { useChangeLocale, useCurrentLocale } from "@homarr/translation/client";

import classes from "./language-combobox.module.css";

export const LanguageCombobox = () => {
  const combobox = useCombobox({
    onDropdownClose: () => combobox.resetSelectedOption(),
  });
  const currentLocale = useCurrentLocale();
  const { changeLocale, isPending } = useChangeLocale();

  const handleOnOptionSubmit = React.useCallback(
    (value: string) => {
      if (!value) {
        return;
      }
      changeLocale(value as SupportedLanguage);
      combobox.closeDropdown();
    },
    [changeLocale, combobox],
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
          leftSection={isPending ? <Loader size={16} /> : null}
          rightSection={<Combobox.Chevron />}
          rightSectionPointerEvents="none"
          onClick={handleOnClick}
          variant="filled"
        >
          <OptionItem currentLocale={currentLocale} localeKey={currentLocale} />
        </InputBase>
      </Combobox.Target>
      <Combobox.Dropdown>
        <ScrollArea h={300}>
          <Combobox.Options>
            {supportedLanguages.map((languageKey) => (
              <Combobox.Option value={languageKey} key={languageKey}>
                <OptionItem currentLocale={currentLocale} localeKey={languageKey} showCheck />
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
}) => {
  return (
    <Group wrap="nowrap" justify="space-between">
      <Group wrap="nowrap">
        <span className={`fi fi-${localeConfigurations[localeKey].flagIcon} ${classes.flagIcon}`}></span>
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
};
