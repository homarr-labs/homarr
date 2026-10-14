"use client";

import { MultiSelect } from "@mantine/core";
import type { MultiSelectProps } from "@mantine/core";

import { translateIfNecessary } from "@homarr/translation";
import { useI18n } from "@homarr/translation/client";

import type { CommonWidgetInputProps } from "./common";
import { useWidgetInputTranslation } from "./common";
import { useFormContext } from "./form";
import { useStaticWidgetInputOwner } from "./static-owner";
import { useStaticWidgetInputDropdown } from "./widget-select-input";

export const WidgetMultiSelectInput = ({ property, kind, options }: CommonWidgetInputProps<"multiSelect">) => {
  const t = useI18n();
  const tWidget = useWidgetInputTranslation(kind, property);
  const form = useFormContext();
  const owner = useStaticWidgetInputOwner(kind, property);
  const { onChange, onFocus, onBlur, ...inputProps } = form.getInputProps(`options.${property}`);
  const { isCurrent: isDropdownCurrent, ...dropdownProps } = useStaticWidgetInputDropdown(
    owner,
    (...args: Parameters<NonNullable<MultiSelectProps["onChange"]>>) => {
      if (!owner.isCurrent()) return;
      return onChange(...args);
    },
  );

  return (
    <MultiSelect
      label={tWidget("label")}
      data={options.options.map((option) =>
        typeof option === "string"
          ? option
          : {
              value: option.value,
              label: translateIfNecessary(t, option.label) ?? option.value,
            },
      )}
      description={options.withDescription ? tWidget("description") : undefined}
      searchable={options.searchable}
      {...inputProps}
      {...dropdownProps}
      onFocus={(...args: Parameters<NonNullable<MultiSelectProps["onFocus"]>>) => {
        if (!owner.isCurrent() || !isDropdownCurrent()) return;
        return onFocus?.(...args);
      }}
      onBlur={(...args: Parameters<NonNullable<MultiSelectProps["onBlur"]>>) => {
        if (!owner.isCurrent() || !isDropdownCurrent()) return;
        return onBlur?.(...args);
      }}
    />
  );
};
