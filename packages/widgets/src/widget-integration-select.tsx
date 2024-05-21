"use client";

import type { FocusEventHandler } from "react";
import {
  Avatar,
  CheckIcon,
  CloseButton,
  Combobox,
  Group,
  Input,
  Pill,
  PillsInput,
  Stack,
  Text,
  useCombobox,
} from "@mantine/core";

import type { IntegrationKind } from "@homarr/definitions";
import { getIconUrl } from "@homarr/definitions";
import { useI18n } from "@homarr/translation/client";

import classes from "./widget-integration-select.module.css";

interface WidgetIntegrationSelectProps {
  label: string;
  onChange: (value: string[]) => void;
  value?: string[];
  error?: string;
  onFocus?: FocusEventHandler<HTMLInputElement>;
  onBlur?: FocusEventHandler<HTMLInputElement>;

  data: IntegrationSelectOption[];
}
export const WidgetIntegrationSelect = ({
  data,
  onChange,
  value: valueProp,
  ...props
}: WidgetIntegrationSelectProps) => {
  const t = useI18n();
  const multiSelectValues = valueProp ?? [];

  const combobox = useCombobox({
    onDropdownClose: () => combobox.resetSelectedOption(),
    onDropdownOpen: () => combobox.updateSelectedOptionIndex("active"),
  });

  const handleValueSelect = (selectedValue: string) =>
    onChange(
      multiSelectValues.includes(selectedValue)
        ? multiSelectValues.filter((value) => value !== selectedValue)
        : [...multiSelectValues, selectedValue],
    );

  const handleValueRemove = (valueToRemove: string) =>
    onChange(multiSelectValues.filter((value) => value !== valueToRemove));

  const values = multiSelectValues.map((item) => (
    <IntegrationPill
      key={item}
      option={data.find((integration) => integration.id === item)!}
      onRemove={() => handleValueRemove(item)}
    />
  ));

  const options = data.map((item) => {
    return (
      <Combobox.Option value={item.id} key={item.id} active={multiSelectValues.includes(item.id)}>
        <Group gap="sm" align="center">
          {multiSelectValues.includes(item.id) ? <CheckIcon size={12} /> : null}
          <Group gap={7} align="center">
            <Avatar src={getIconUrl(item.kind)} size="sm" />
            <Stack gap={0}>
              <span>{item.name}</span>
              <Text size="xs" c="gray.6">
                {item.url}
              </Text>
            </Stack>
          </Group>
        </Group>
      </Combobox.Option>
    );
  });

  return (
    <Combobox store={combobox} onOptionSubmit={handleValueSelect} withinPortal={false}>
      <Combobox.DropdownTarget>
        <PillsInput pointer onClick={() => combobox.toggleDropdown()} {...props}>
          <Pill.Group>
            {values.length > 0 ? values : <Input.Placeholder>{t("common.multiSelect.placeholder")}</Input.Placeholder>}

            <Combobox.EventsTarget>
              <PillsInput.Field
                type="hidden"
                onBlur={() => combobox.closeDropdown()}
                onKeyDown={(event) => {
                  if (event.key !== "Backspace") return;

                  event.preventDefault();
                  handleValueRemove(multiSelectValues[multiSelectValues.length - 1]!);
                }}
              />
            </Combobox.EventsTarget>
          </Pill.Group>
        </PillsInput>
      </Combobox.DropdownTarget>

      <Combobox.Dropdown>
        <Combobox.Options>{options}</Combobox.Options>
      </Combobox.Dropdown>
    </Combobox>
  );
};

export interface IntegrationSelectOption {
  id: string;
  name: string;
  url: string;
  kind: IntegrationKind;
}

interface IntegrationPillProps {
  option: IntegrationSelectOption;
  onRemove: () => void;
}

const IntegrationPill = ({ option, onRemove }: IntegrationPillProps) => (
  <Group align="center" wrap="nowrap" gap={0} className={classes.pill}>
    <Avatar src={getIconUrl(option.kind)} size={14} mr={6} />
    <Text span size="xs" lh={1} fw={500}>
      {option.name}
    </Text>
    <CloseButton onMouseDown={onRemove} variant="transparent" color="gray" size={22} iconSize={14} tabIndex={-1} />
  </Group>
);
