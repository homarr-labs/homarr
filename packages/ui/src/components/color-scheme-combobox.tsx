"use client";

import type { ComponentPropsWithRef, ComponentPropsWithoutRef, ElementType } from "react";
import { Combobox, Group, InputBase, Text, useCombobox } from "@mantine/core";
import type { InputBaseProps } from "@mantine/core";
import { IconCheck, IconDeviceDesktop, IconMoon, IconSun } from "@tabler/icons-react";

import type { ColorScheme } from "@homarr/definitions";
import { colorSchemes } from "@homarr/definitions";
import { useI18n } from "@homarr/translation/client";

const schemeIcons: Record<ColorScheme, ElementType> = {
  auto: IconDeviceDesktop,
  light: IconSun,
  dark: IconMoon,
};

interface ColorSchemeComboboxProps
  extends
    Pick<InputBaseProps, "label" | "description" | "error" | "disabled" | "required" | "withAsterisk" | "variant">,
    Pick<
      ComponentPropsWithoutRef<"button">,
      "id" | "name" | "onBlur" | "onFocus" | "aria-label" | "aria-labelledby" | "aria-describedby"
    > {
  value: ColorScheme;
  onChange: (value: ColorScheme) => void;
  width?: string;
  readOnly?: boolean;
  withinPortal?: boolean;
}

export const ColorSchemeCombobox = ({
  value,
  onChange,
  width,
  readOnly,
  disabled,
  withinPortal = false,
  variant = "filled",
  "aria-describedby": ariaDescribedBy,
  ...inputProps
}: ColorSchemeComboboxProps) => {
  const tOptions = useI18n("common.colorScheme.options");
  const combobox = useCombobox({
    onDropdownClose: () => combobox.resetSelectedOption(),
    onDropdownOpen: () => combobox.updateSelectedOptionIndex("active"),
  });

  return (
    <Combobox
      store={combobox}
      withinPortal={withinPortal}
      readOnly={readOnly || disabled}
      onOptionSubmit={(nextValue) => {
        if (disabled || readOnly) return;
        onChange(nextValue as ColorScheme);
        combobox.closeDropdown();
      }}
    >
      <Combobox.Target targetType="button" withExpandedAttribute>
        <InputBase
          {...inputProps}
          component="button"
          type="button"
          pointer
          disabled={disabled}
          aria-readonly={readOnly || undefined}
          rightSection={<Combobox.Chevron />}
          rightSectionPointerEvents="none"
          onClick={() => {
            if (!readOnly && !disabled) combobox.toggleDropdown();
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown" || event.key === "ArrowUp") {
              event.stopPropagation();
            }
          }}
          variant={variant}
          w={width}
          renderRoot={(buttonProps: ComponentPropsWithRef<"button">) => (
            <button
              {...buttonProps}
              aria-describedby={
                [buttonProps["aria-describedby"], ariaDescribedBy].filter(Boolean).join(" ") || undefined
              }
            />
          )}
        >
          <OptionItem scheme={value} currentScheme={value} tOptions={tOptions} />
        </InputBase>
      </Combobox.Target>
      <Combobox.Dropdown>
        <Combobox.Options>
          {colorSchemes.map((scheme) => (
            <Combobox.Option value={scheme} key={scheme} active={scheme === value}>
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
