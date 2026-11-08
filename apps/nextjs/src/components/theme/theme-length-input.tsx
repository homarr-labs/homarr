"use client";

import type { ElementProps, InputBaseProps } from "@mantine/core";
import { ActionIcon, Combobox, Group, InputBase, useCombobox } from "@mantine/core";
import { IconChevronDown, IconMinus, IconPlus } from "@tabler/icons-react";

import { useI18n } from "@homarr/translation/client";

import { parseThemeLength } from "./theme-length";

interface ThemeLengthInputProps
  extends
    Omit<InputBaseProps, "value" | "onChange">,
    ElementProps<"input", keyof InputBaseProps | "value" | "onChange"> {
  value: string;
  onChange: (value: string) => void;
  unit?: "rem" | "em";
  options?: string[];
  name: string;
  "aria-label": string;
}

export const ThemeLengthInput = ({
  value,
  onChange,
  onBlur,
  unit = "rem",
  options,
  ...props
}: ThemeLengthInputProps) => {
  const t = useI18n("common.customTheme.studio");
  const combobox = useCombobox({
    onDropdownClose: () => combobox.resetSelectedOption(),
    onDropdownOpen: () => {
      if (!combobox.selectActiveOption()) combobox.selectFirstOption();
    },
  });
  const length = parseThemeLength(value);
  const currentUnit = length?.unit || unit;
  let suggestions = [0, 0.125, 0.25, 0.5, 0.75, 1, 1.5, 2].map((number) => `${number}${currentUnit}`);
  if (currentUnit === "px") suggestions = [0, 2, 4, 8, 12, 16, 24, 32].map((number) => `${number}px`);
  if (currentUnit === "em") suggestions = [20, 36, 48, 62, 75, 88, 100].map((number) => `${number}em`);
  if (options) suggestions = options;
  const canStep = Boolean(length || options?.includes(value) || value === "");

  const step = (direction: number, multiplier = 1) => {
    if (props.disabled) return;
    const index = options?.indexOf(value) ?? -1;
    if (options && index !== -1) {
      onChange(options[Math.max(0, Math.min(options.length - 1, index + direction))] ?? value);
      return;
    }
    if (!length && value !== "") return;
    let increment = 0.0625;
    if (currentUnit !== "rem") increment = 1;
    const next = Math.max(0, (length?.number ?? 0) + direction * increment * multiplier);
    onChange(`${Number(next.toFixed(4))}${currentUnit}`);
  };

  return (
    <Combobox
      store={combobox}
      readOnly={props.disabled}
      onOptionSubmit={(next) => {
        onChange(next);
        combobox.closeDropdown();
      }}
    >
      <Combobox.Target withKeyboardNavigation={combobox.dropdownOpened} withExpandedAttribute>
        <InputBase
          {...props}
          value={value}
          maxLength={300}
          title={t("dimensionHint")}
          onChange={(event) => onChange(event.currentTarget.value)}
          onBlur={(event) => {
            combobox.closeDropdown();
            onBlur?.(event);
          }}
          onKeyDown={(event) => {
            if (event.nativeEvent.isComposing) return;
            if (event.altKey && event.key === "ArrowDown") {
              event.preventDefault();
              combobox.openDropdown();
              return;
            }
            if (combobox.dropdownOpened) return;
            if (event.key === "Enter") {
              event.preventDefault();
              combobox.openDropdown();
            }
            if (event.key === "ArrowUp" || event.key === "ArrowDown") {
              event.preventDefault();
              let direction = 1;
              let multiplier = 1;
              if (event.key === "ArrowDown") direction = -1;
              if (event.shiftKey) multiplier = 10;
              step(direction, multiplier);
            }
          }}
          rightSectionWidth={84}
          rightSectionPointerEvents="all"
          rightSection={
            <Group gap={0} wrap="nowrap">
              <ActionIcon
                variant="subtle"
                size="sm"
                disabled={props.disabled || !canStep}
                aria-label={t("decreaseControl", { control: props["aria-label"] })}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => step(-1)}
              >
                <IconMinus size={14} />
              </ActionIcon>
              <ActionIcon
                variant="subtle"
                size="sm"
                disabled={props.disabled || !canStep}
                aria-label={t("increaseControl", { control: props["aria-label"] })}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => step(1)}
              >
                <IconPlus size={14} />
              </ActionIcon>
              <ActionIcon
                variant="subtle"
                size="sm"
                disabled={props.disabled}
                aria-label={t("chooseControl", { control: props["aria-label"] })}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => combobox.toggleDropdown()}
              >
                <IconChevronDown size={14} />
              </ActionIcon>
            </Group>
          }
        />
      </Combobox.Target>
      <Combobox.Dropdown>
        <Combobox.Options aria-label={props["aria-label"]}>
          {suggestions.map((option) => (
            <Combobox.Option key={option} value={option} active={value === option}>
              {option}
            </Combobox.Option>
          ))}
        </Combobox.Options>
      </Combobox.Dropdown>
    </Combobox>
  );
};
