"use client";

import { useState } from "react";
import { Group, Loader, Select } from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import { IconCheck } from "@tabler/icons-react";

import { translateIfNecessary } from "@homarr/translation";
import { useI18n } from "@homarr/translation/client";

import type { CommonWidgetInputProps } from "./common";
import { useWidgetInputTranslation } from "./common";
import { useFormContext } from "./form";

export interface DynamicSelectOption {
  value: string;
  label: string;
}

export const WidgetDynamicSelectInput = ({ property, kind, options }: CommonWidgetInputProps<"dynamicSelect">) => {
  const t = useI18n();
  const tWidget = useWidgetInputTranslation(kind, property);
  const form = useFormContext();
  const inputProps = form.getInputProps(`options.${property}`);
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebouncedValue(search, 300);
  const { isPending, options: selectOptions } = options.useOptions(debouncedSearch, form.values.integrationIds);
  const value = inputProps.value as DynamicSelectOption | null;
  const onChange = inputProps.onChange as (value: DynamicSelectOption | null) => void;

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
          typeof value === "object" &&
            value !== null &&
            !selectOptions.some((option) =>
              typeof option === "string" ? option === value.value : option.value === value.value,
            )
            ? {
                value: value.value,
                label: value.label,
              }
            : [],
        )}
      searchValue={search}
      onSearchChange={setSearch}
      leftSection={isPending && <Loader size="xs" />}
      renderOption={({ option, checked }) => {
        return (
          <Group flex="1" gap="xs">
            {option.label}
            {checked && (
              <IconCheck
                style={{ marginInlineStart: "auto" }}
                color="currentColor"
                opacity={0.6}
                size={18}
                stroke={1.5}
              />
            )}
          </Group>
        );
      }}
      description={options.withDescription ? tWidget("description") : undefined}
      searchable
      {...inputProps}
      value={value?.value ?? null}
      onChange={(value) =>
        onChange(
          value
            ? {
                value,
                label:
                  selectOptions.filter((option) => typeof option === "object").find((option) => option.value === value)
                    ?.label ?? value,
              }
            : null,
        )
      }
    />
  );
};
