"use client";

import { MultiSelect } from "@homarr/ui";

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
      data={options.options as unknown as string[]}
      description={options.withDescription ? t("description") : undefined}
      {...form.getInputProps(`options.${property}`)}
    />
  );
};
