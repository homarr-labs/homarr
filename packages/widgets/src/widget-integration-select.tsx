"use client";

import type { FocusEventHandler } from "react";
import {
  Anchor,
  Avatar,
  CheckIcon,
  CloseButton,
  Combobox,
  Group,
  Pill,
  PillsInput,
  Stack,
  Text,
  useCombobox,
} from "@mantine/core";

import type { IntegrationKind } from "@homarr/definitions";
import { getIconUrl } from "@homarr/definitions";
import { useI18n } from "@homarr/translation/client";
import { Link } from "@homarr/ui";

import classes from "./widget-integration-select.module.css";

interface WidgetIntegrationSelectProps {
  label: string;
  onChange: (value: string[]) => void;
  value?: string[];
  error?: string;
  onFocus?: FocusEventHandler<HTMLInputElement>;
  onBlur?: FocusEventHandler<HTMLInputElement>;
  canSelectMultiple?: boolean;
  data: IntegrationSelectOption[];
  withAsterisk?: boolean;
  onOpenNewIntegration?: () => void;
}
export const WidgetIntegrationSelect = ({
  data,
  onChange,
  value: valueProp,
  label,
  canSelectMultiple = true,
  withAsterisk = false,
  onOpenNewIntegration,
  ...props
}: WidgetIntegrationSelectProps) => {
  const t = useI18n();
  const multiSelectValues = valueProp ?? [];

  const combobox = useCombobox({
    onDropdownClose: () => combobox.resetSelectedOption(),
    onDropdownOpen: () => combobox.updateSelectedOptionIndex("active"),
  });

  const handleValueSelect = (selectedValue: string) => {
    if (multiSelectValues.includes(selectedValue)) {
      onChange(multiSelectValues.filter((value) => value !== selectedValue));
    } else if (canSelectMultiple) {
      onChange([...multiSelectValues, selectedValue]);
    } else {
      onChange([selectedValue]);
    }

    if (!canSelectMultiple) {
      combobox.closeDropdown();
    }
  };

  const handleValueRemove = (valueToRemove: string) =>
    onChange(multiSelectValues.filter((value) => value !== valueToRemove));

  const values = multiSelectValues.map((item) => {
    const option = data.find((integration) => integration.id === item);
    if (!option) {
      return null;
    }

    return (
      <IntegrationPill
        key={item}
        option={option}
        onRemove={() => handleValueRemove(item)}
        showRemoveButton={canSelectMultiple}
        removeLabel={t("item.edit.field.integrations.removeLabel", { name: option.name })}
      />
    );
  });

  const options = data.map((item) => {
    return (
      <Combobox.Option value={item.id} key={item.id} active={multiSelectValues.includes(item.id)}>
        <Group gap="sm" align="center">
          {multiSelectValues.includes(item.id) ? <CheckIcon size="var(--mantine-font-size-xs)" /> : null}
          <Group gap={7} align="center">
            <Avatar src={getIconUrl(item.kind)} size="sm" />
            <Stack gap={0}>
              <span>{item.name}</span>
              <Text size="xs" c="dimmed">
                {item.url}
              </Text>
            </Stack>
          </Group>
        </Group>
      </Combobox.Option>
    );
  });

  return (
    <Combobox store={combobox} onOptionSubmit={handleValueSelect}>
      <Combobox.DropdownTarget>
        <PillsInput
          inputWrapperOrder={["label", "input", "description", "error"]}
          description={
            onOpenNewIntegration ? (
              <Text size="xs" span>
                <Anchor size="xs" component="button" type="button" onClick={onOpenNewIntegration}>
                  {t("integration.action.create")}
                </Anchor>
              </Text>
            ) : (
              <Text size="xs" span>
                <Anchor size="xs" component={Link} target="_blank" href="/manage/integrations">
                  {t("widget.common.integration.manage")}
                </Anchor>
              </Text>
            )
          }
          pointer
          onClick={() => combobox.openDropdown()}
          label={label}
          withAsterisk={withAsterisk}
          {...props}
        >
          <Pill.Group>
            {values}

            <Combobox.EventsTarget>
              <PillsInput.Field
                readOnly
                aria-label={label}
                placeholder={values.length === 0 ? t("common.multiSelect.placeholder") : undefined}
                onFocus={() => combobox.openDropdown()}
                onBlur={() => combobox.closeDropdown()}
                onKeyDown={(event) => {
                  if (["ArrowDown", "Enter", " "].includes(event.key)) {
                    event.preventDefault();
                    combobox.openDropdown();
                    return;
                  }
                  if (event.key === "Escape") {
                    combobox.closeDropdown();
                    return;
                  }
                  if (event.key === "Backspace" && canSelectMultiple && multiSelectValues.length > 0) {
                    event.preventDefault();
                    const lastValue = multiSelectValues.at(-1);
                    if (lastValue) handleValueRemove(lastValue);
                  }
                }}
              />
            </Combobox.EventsTarget>
          </Pill.Group>
        </PillsInput>
      </Combobox.DropdownTarget>

      <Combobox.Dropdown>
        <Combobox.Options>
          {options.length >= 1 ? (
            options
          ) : (
            <Text p={4} size="sm" ta="center" c="var(--mantine-color-dimmed)">
              {t("widget.common.integration.noData")}
            </Text>
          )}
        </Combobox.Options>
      </Combobox.Dropdown>
    </Combobox>
  );
};

export interface IntegrationSelectOption {
  id: string;
  name: string;
  url: string;
  kind: IntegrationKind;
  permissions?: {
    hasUseAccess: boolean;
    hasInteractAccess: boolean;
    hasFullAccess: boolean;
  };
}

interface IntegrationPillProps {
  option: IntegrationSelectOption;
  onRemove: () => void;
  showRemoveButton: boolean;
  removeLabel: string;
}

const IntegrationPill = ({ option, onRemove, showRemoveButton, removeLabel }: IntegrationPillProps) => (
  <Group align="center" wrap="nowrap" gap={0} className={classes.pill} mih={24} pr={!showRemoveButton ? 10 : undefined}>
    <Avatar src={getIconUrl(option.kind)} size={14} mr={6} />
    <Text span size="xs" lh={1} fw={500}>
      {option.name}
    </Text>
    {showRemoveButton && (
      <CloseButton
        onClick={(event) => {
          event.stopPropagation();
          onRemove();
        }}
        aria-label={removeLabel}
        variant="transparent"
        color="gray"
        size={24}
        iconSize={14}
      />
    )}
  </Group>
);
