"use client";

import { NumberInput } from "@homarr/ui";

import type { WidgetSort } from "..";
import type { CommonWidgetInputProps } from "./common";
import { useWidgetInputTranslation } from "./common";
import { useFormContext } from "./form";

export const WidgetNumberInput = <TSort extends WidgetSort>({
  property,
  sort,
  options,
}: CommonWidgetInputProps<TSort, "number">) => {
  const t = useWidgetInputTranslation(sort, property);
  const form = useFormContext();

  return (
    <NumberInput
      label={t("label")}
      description={options.withDescription ? t("description") : undefined}
      min={options.validate.minValue ?? undefined}
      max={options.validate.maxValue ?? undefined}
      step={options.step}
      {...form.getInputProps(property)}
    />
  );
};
