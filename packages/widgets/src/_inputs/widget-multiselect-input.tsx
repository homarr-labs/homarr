"use client";

import { MultiSelect } from "@mantine/core";

import { translateIfNecessary } from "@homarr/translation";

import type { CommonWidgetInputProps } from "./common";
import { useWidgetInputTranslation } from "./common";
import { useFormContext } from "./form";

export const WidgetMultiSelectInput = ({
  property,
  kind,
  options,
}: CommonWidgetInputProps<"multiSelect">) => {
  const t = useWidgetInputTranslation(kind, property);
  const form = useFormContext();

  return (
    <MultiSelect
      label={t("label")}
      data={options.options.map((option) =>
        typeof option === "string"
          ? option
          : {
              value: option.value,
              label: translateIfNecessary(t, option.label)!,
            },
      )}
      description={options.withDescription ? t("description") : undefined}
      searchable={options.searchable}
      {...form.getInputProps(`options.${property}`)}
    />
  );
};
