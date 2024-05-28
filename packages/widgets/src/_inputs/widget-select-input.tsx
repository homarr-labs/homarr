"use client";

import { Select } from "@mantine/core";

import { translateIfNecessary } from "@homarr/translation";
import type { stringOrTranslation } from "@homarr/translation";
import { useI18n } from "@homarr/translation/client";

import type { CommonWidgetInputProps } from "./common";
import { useWidgetInputTranslation } from "./common";
import { useFormContext } from "./form";

export type SelectOption =
  | {
      value: string;
      label: stringOrTranslation;
    }
  | string;

export type inferSelectOptionValue<TOption extends SelectOption> = TOption extends {
  value: infer TValue;
}
  ? TValue
  : TOption;

export const WidgetSelectInput = ({ property, kind, options }: CommonWidgetInputProps<"select">) => {
  const t = useI18n();
  const tWidget = useWidgetInputTranslation(kind, property);
  const form = useFormContext();

  return (
    <Select
      label={tWidget("label")}
      data={options.options.map((option) =>
        typeof option === "string"
          ? option
          : {
              value: option.value,
              label: translateIfNecessary(t, option.label)!,
            },
      )}
      description={options.withDescription ? tWidget("description") : undefined}
      searchable={options.searchable}
      {...form.getInputProps(`options.${property}`)}
    />
  );
};
