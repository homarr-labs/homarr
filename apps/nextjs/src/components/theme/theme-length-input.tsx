"use client";

import { useRef } from "react";
import type { ElementProps, InputBaseProps } from "@mantine/core";
import { ActionIcon, Combobox, Group, InputBase, Stack, useCombobox } from "@mantine/core";
import { IconChevronDown, IconMinus, IconPlus } from "@tabler/icons-react";

import { useI18n } from "@homarr/translation/client";

import { parseThemeLength, themeLengthPixels } from "./theme-length";

interface ThemeLengthInputProps
  extends
    Omit<InputBaseProps, "value" | "onChange">,
    ElementProps<"input", keyof InputBaseProps | "value" | "onChange"> {
  value: string;
  onChange: (value: string) => void;
  unit?: "rem" | "em";
  options?: string[];
  defaultValue?: string;
  name: string;
  "aria-label": string;
}

export const ThemeLengthInput = ({
  value,
  onChange,
  onBlur,
  onKeyDown,
  defaultValue,
  unit = "rem",
  options,
  ...props
}: ThemeLengthInputProps) => {
  const initialValue = useRef(value);
  const t = useI18n("common.customTheme.studio");
  const combobox = useCombobox({
    onDropdownClose: () => combobox.resetSelectedOption(),
    onDropdownOpen: () => {
      if (!combobox.selectActiveOption()) combobox.selectFirstOption();
    },
  });
  const length = parseThemeLength(value);
  const currentUnit = length?.unit || unit;
  let numbers = [0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 1, 1.25, 1.5, 2, 2.5, 3, 4];
  if (currentUnit === "px") numbers = [0, 2, 4, 6, 8, 10, 12, 16, 20, 24, 32, 40, 48, 64];
  if (currentUnit === "em") numbers = [20, 36, 48, 62, 75, 88, 100];
  let suggestions = numbers.map((number) => `${number}${currentUnit}`);
  if (options) suggestions = [...options];
  for (const fallback of [defaultValue, initialValue.current]) {
    if (!fallback) continue;
    let option = fallback;
    if (!options) {
      const parsed = parseThemeLength(fallback);
      if (!parsed) continue;
      let number = parsed.number;
      if (parsed.unit !== currentUnit) {
        const pixels = themeLengthPixels(fallback);
        if (pixels === null || currentUnit === "%") continue;
        number = pixels;
        if (currentUnit === "rem" || currentUnit === "em") number /= 16;
      }
      option = `${number}${currentUnit}`;
    }
    if (!suggestions.includes(option)) suggestions.push(option);
  }
  if (!options) suggestions.sort((a, b) => Number.parseFloat(a) - Number.parseFloat(b));

  const nextValue = (direction: number) => {
    const index = suggestions.indexOf(value);
    if (index !== -1) return suggestions[Math.max(0, Math.min(suggestions.length - 1, index + direction))];
    if (!options && length) {
      if (direction > 0) return suggestions.find((item) => Number.parseFloat(item) > length.number);
      return suggestions.findLast((item) => Number.parseFloat(item) < length.number);
    }
    if (direction > 0) return suggestions[0];
    return suggestions.at(-1);
  };
  const step = (direction: number) => {
    const next = nextValue(direction);
    if (!props.disabled && next !== undefined) onChange(next);
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
          onChange={(event) => onChange(event.currentTarget.value)}
          onBlur={(event) => {
            combobox.closeDropdown();
            onBlur?.(event);
          }}
          onKeyDown={(event) => {
            onKeyDown?.(event);
            if (event.defaultPrevented || event.nativeEvent.isComposing) return;
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
              if (event.key === "ArrowDown") direction = -1;
              step(direction);
            }
          }}
          rightSectionWidth={48}
          rightSectionPointerEvents="all"
          rightSection={
            <Group gap={0} wrap="nowrap">
              <Stack gap={0}>
                <ActionIcon
                  variant="subtle"
                  size={16}
                  tabIndex={-1}
                  disabled={props.disabled || nextValue(1) === undefined || nextValue(1) === value}
                  aria-label={t("increaseControl", { control: props["aria-label"] })}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => step(1)}
                >
                  <IconPlus size={12} />
                </ActionIcon>
                <ActionIcon
                  variant="subtle"
                  size={16}
                  tabIndex={-1}
                  disabled={props.disabled || nextValue(-1) === undefined || nextValue(-1) === value}
                  aria-label={t("decreaseControl", { control: props["aria-label"] })}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => step(-1)}
                >
                  <IconMinus size={12} />
                </ActionIcon>
              </Stack>
              <ActionIcon
                variant="subtle"
                size="sm"
                tabIndex={-1}
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
