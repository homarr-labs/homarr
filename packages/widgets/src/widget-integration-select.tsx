"use client";

import type { FocusEventHandler } from "react";

import type { IntegrationKind } from "@homarr/definitions";
import { getIconUrl } from "@homarr/definitions";
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
} from "@homarr/ui";

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
  const value = valueProp ?? [];

  const combobox = useCombobox({
    onDropdownClose: () => combobox.resetSelectedOption(),
    onDropdownOpen: () => combobox.updateSelectedOptionIndex("active"),
  });

  const handleValueSelect = (val: string) =>
    onChange(
      value.includes(val) ? value.filter((v) => v !== val) : [...value, val],
    );

  const handleValueRemove = (val: string) =>
    onChange(value.filter((v) => v !== val));

  const values = value.map((item) => (
    <IntegrationPill
      key={item}
      option={data.find((i) => i.id === item)!}
      onRemove={() => handleValueRemove(item)}
    />
  ));

  const options = data.map((item) => {
    return (
      <Combobox.Option
        value={item.id}
        key={item.id}
        active={value.includes(item.id)}
      >
        <Group gap="sm" align="center">
          {value.includes(item.id) ? <CheckIcon size={12} /> : null}
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
    <Combobox
      store={combobox}
      onOptionSubmit={handleValueSelect}
      withinPortal={false}
    >
      <Combobox.DropdownTarget>
        <PillsInput
          pointer
          onClick={() => combobox.toggleDropdown()}
          {...props}
        >
          <Pill.Group>
            {values.length > 0 ? (
              values
            ) : (
              <Input.Placeholder>Pick one or more values</Input.Placeholder>
            )}

            <Combobox.EventsTarget>
              <PillsInput.Field
                type="hidden"
                onBlur={() => combobox.closeDropdown()}
                onKeyDown={(event) => {
                  if (event.key === "Backspace") {
                    event.preventDefault();
                    handleValueRemove(value[value.length - 1]!);
                  }
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
    <CloseButton
      onMouseDown={onRemove}
      variant="transparent"
      color="gray"
      size={22}
      iconSize={14}
      tabIndex={-1}
    />
  </Group>
);
