"use client";

import { MultiSelect } from "@mantine/core";

import type { CommonWidgetInputProps } from "./common";
import { useWidgetInputTranslation } from "./common";
import { useFormContext } from "./form";
import type { SelectOption } from "./widget-select-input";

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
      data={options.options as unknown as SelectOption[]}
      description={options.withDescription ? t("description") : undefined}
      searchable={options.searchable}
      {...form.getInputProps(`options.${property}`)}
    />
  );
};
