"use client";

import { Group, Select } from "@mantine/core";
import type { SelectProps } from "@mantine/core";
import { IconCheck } from "@tabler/icons-react";
import type { KeyboardEvent as ReactKeyboardEvent, SyntheticEvent } from "react";
import { useEffect, useRef } from "react";

import { translateIfNecessary } from "@homarr/translation";
import { useI18n } from "@homarr/translation/client";

import type { CommonWidgetInputProps } from "./common";
import { useWidgetInputTranslation } from "./common";
import { useFormContext } from "./form";
import type { SelectOption } from "./select-contracts";
import type { CapturedStaticWidgetInputOwner } from "./static-owner";
import { useStaticWidgetInputOwner } from "./static-owner";

export type { SelectOption, inferSelectOptionValue } from "./select-contracts";

type StaticDropdownInteraction<TArgs extends unknown[]> =
  | {
      type: "dropdown" | "direct";
      owner: CapturedStaticWidgetInputOwner;
      onChange: (...args: TArgs) => unknown;
    }
  | { type: "closed"; owner: CapturedStaticWidgetInputOwner };

export const useStaticWidgetInputDropdown = <TArgs extends unknown[]>(
  owner: CapturedStaticWidgetInputOwner,
  onChange: (...args: TArgs) => unknown,
) => {
  const interaction = useRef<StaticDropdownInteraction<TArgs> | null>(null);
  const isCurrent = () => {
    if (!owner.isCurrent()) return false;
    const operation = interaction.current;
    return !operation || operation.owner.isCurrent();
  };
  const startDirect = () => {
    const operation = interaction.current;
    if (operation?.type === "dropdown" || !owner.isCurrent()) return;
    interaction.current = { type: "direct", owner, onChange };
  };
  const guardSearch = (event: SyntheticEvent) => {
    const operation = interaction.current;
    if (operation?.type !== "dropdown") startDirect();
    if (!isCurrent()) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
  };
  const startKey = (event: ReactKeyboardEvent) => {
    if (!event.repeat) startDirect();
  };

  useEffect(
    () => () => {
      const operation = interaction.current;
      if (operation) interaction.current = { type: "closed", owner: operation.owner };
    },
    [],
  );

  return {
    isCurrent,
    wrapperProps: {
      onPointerDownCapture: startDirect,
      onKeyDownCapture: startKey,
      onChangeCapture: guardSearch,
      onFocusCapture: startDirect,
    },
    onDropdownOpen: () => {
      const operation = interaction.current;
      if (operation?.type === "dropdown" || operation?.type === "closed") return;
      if (operation?.type === "direct") {
        interaction.current = { ...operation, type: "dropdown" };
        return;
      }
      interaction.current = { type: "dropdown", owner, onChange };
    },
    onDropdownClose: () => {
      const operation = interaction.current;
      if (operation?.type === "dropdown") interaction.current = { type: "closed", owner: operation.owner };
    },
    onOptionSubmit: () => {
      const operation = interaction.current;
      if (operation?.type === "dropdown") return;
      interaction.current = { type: "closed", owner };
    },
    onChange: (...args: TArgs) => {
      if (!owner.isCurrent()) return;
      const operation = interaction.current;
      if (!operation) return onChange(...args);
      if (operation.type === "closed" || !operation.owner.isCurrent()) return;
      return operation.onChange(...args);
    },
  };
};

const getIconFor = (options: SelectOption[], value: string) => {
  const current = options.find((option) => (typeof option === "string" ? option : option.value) === value);
  if (!current) return null;
  if (typeof current === "string") return null;
  return current.icon;
};

export const WidgetSelectInput = ({ property, kind, options }: CommonWidgetInputProps<"select">) => {
  const t = useI18n();
  const tWidget = useWidgetInputTranslation(kind, property);
  const form = useFormContext();
  const owner = useStaticWidgetInputOwner(kind, property);
  const { onChange, onFocus, onBlur, ...inputProps } = form.getInputProps(`options.${property}`);
  const { isCurrent: isDropdownCurrent, ...dropdownProps } = useStaticWidgetInputDropdown(
    owner,
    (...args: Parameters<NonNullable<SelectProps["onChange"]>>) => {
      if (!owner.isCurrent()) return;
      return onChange(...args);
    },
  );
  const CurrentIcon = getIconFor(options.options, inputProps.value as string);

  return (
    <Select
      label={tWidget("label")}
      data={options.options.map((option) =>
        typeof option === "string"
          ? option
          : {
              value: option.value,
              label: translateIfNecessary(t, option.label) ?? option.value,
            },
      )}
      leftSection={CurrentIcon && <CurrentIcon size="var(--mantine-font-size-md)" stroke={1.5} />}
      renderOption={({ option, checked }) => {
        const Icon = getIconFor(options.options, String(option.value));

        return (
          <Group flex="1" gap="xs">
            {Icon && <Icon color="currentColor" opacity={0.6} size="var(--mantine-font-size-lg)" stroke={1.5} />}
            {option.label}
            {checked && (
              <IconCheck
                style={{ marginInlineStart: "auto" }}
                color="currentColor"
                opacity={0.6}
                size="var(--mantine-font-size-lg)"
                stroke={1.5}
              />
            )}
          </Group>
        );
      }}
      description={options.withDescription ? tWidget("description") : undefined}
      placeholder={options.withPlaceholder ? tWidget("placeholder") : undefined}
      searchable={options.searchable}
      {...inputProps}
      {...dropdownProps}
      onFocus={(...args: Parameters<NonNullable<SelectProps["onFocus"]>>) => {
        if (!owner.isCurrent() || !isDropdownCurrent()) return;
        return onFocus?.(...args);
      }}
      onBlur={(...args: Parameters<NonNullable<SelectProps["onBlur"]>>) => {
        if (!owner.isCurrent() || !isDropdownCurrent()) return;
        return onBlur?.(...args);
      }}
    />
  );
};
