"use client";

import { useState } from "react";
import { Group, Loader, Select } from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import { IconCheck } from "@tabler/icons-react";

import { translateIfNecessary } from "@homarr/translation";
import { useI18n, useScopedI18n } from "@homarr/translation/client";
import { iconSizes } from "@homarr/ui";

import type { CommonWidgetInputProps } from "./common";
import { useWidgetInputTranslation } from "./common";
import { useFormContext } from "./form";

export interface DynamicSelectOption {
  value: string;
  label: string;
}

export const WidgetDynamicSelectInput = ({
  property,
  kind,
  options,
  itemId,
  boardId,
}: CommonWidgetInputProps<"dynamicSelect">) => {
  const t = useI18n();
  const tSelect = useScopedI18n("widget.dynamicSelect");
  const tWidget = useWidgetInputTranslation(kind, property);
  const form = useFormContext();
  const inputProps = form.getInputProps(`options.${property}`);
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebouncedValue(search, 300);
  const {
    error: optionsError,
    isPending,
    options: selectOptions,
  } = options.useOptions(debouncedSearch, form.values.integrationIds, form.values.options, itemId, boardId);
  const currentOption = inputProps.value as DynamicSelectOption | null;
  const onChange = inputProps.onChange as (value: DynamicSelectOption | null) => void;

  const getLabelForValue = (selectedValue: string) => {
    const matched = selectOptions.find((option) =>
      typeof option === "string" ? option === selectedValue : option.value === selectedValue,
    );
    if (!matched) {
      return selectedValue;
    }
    if (typeof matched === "string") {
      return matched;
    }
    return translateIfNecessary(t, matched.label) ?? selectedValue;
  };

  return (
    <Select
      label={tWidget("label")}
      data={selectOptions
        .map((option) =>
          typeof option === "string"
            ? option
            : {
                value: option.value,
                label: translateIfNecessary(t, option.label) ?? option.value,
              },
        )
        .concat(
          currentOption !== null &&
            !selectOptions.some((option) =>
              typeof option === "string" ? option === currentOption.value : option.value === currentOption.value,
            )
            ? {
                value: currentOption.value,
                label: currentOption.label,
              }
            : [],
        )}
      searchValue={search}
      onSearchChange={setSearch}
      placeholder={tWidget("placeholder")}
      nothingFoundMessage={tSelect("noResults")}
      leftSection={isPending && <Loader size="xs" />}
      renderOption={({ option, checked }) => {
        return (
          <Group flex="1" gap="xs">
            {option.label}
            {checked && (
              <IconCheck
                style={{ ...iconSizes.lg, marginInlineStart: "auto" }}
                color="currentColor"
                opacity={0.6}
                stroke={1.5}
              />
            )}
          </Group>
        );
      }}
      description={options.withDescription ? tWidget("description") : undefined}
      searchable
      {...inputProps}
      error={inputProps.error ?? optionsError}
      value={currentOption === null ? null : currentOption.value}
      onChange={(selectedValue: string | null) => {
        if (selectedValue === null) {
          onChange(null);
          return;
        }
        onChange({
          value: selectedValue,
          label: getLabelForValue(selectedValue),
        });
      }}
    />
  );
};
