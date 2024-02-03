"use client";

import { MultiSelect } from "@homarr/ui";

import type { CommonWidgetInputProps } from "./common";
import { useWidgetInputTranslation } from "./common";
import { useFormContext } from "./form";

export const WidgetMultiSelectInput = ({
  property,
  sort,
  options,
}: CommonWidgetInputProps<"multiSelect">) => {
  const t = useWidgetInputTranslation(sort, property);
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
