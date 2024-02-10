"use client";

import { MultiSelect } from "@homarr/ui";

import type { CommonWidgetInputProps } from "./common";
import { useWidgetInputTranslation } from "./common";
import { useFormContext } from "./form";

export type SelectOption =
  | {
      value: string;
      label: string;
    }
  | string;

export type inferSelectOptionValue<TOption extends SelectOption> =
  TOption extends {
    value: infer TValue;
  }
    ? TValue
    : TOption;

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
