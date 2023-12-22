"use client";

import { Select } from "@homarr/ui";

import type { WidgetSort } from "..";
import type { CommonWidgetInputProps } from "./common";
import { useWidgetInputTranslation } from "./common";
import { useFormContext } from "./form";

export const WidgetSelectInput = <TSort extends WidgetSort>({
  property,
  sort,
  options,
}: CommonWidgetInputProps<TSort, "select">) => {
  const t = useWidgetInputTranslation(sort, property);
  const form = useFormContext();

  return (
    <Select
      label={t("label")}
      data={options.options as unknown as string[]}
      description={options.withDescription ? t("description") : undefined}
      {...form.getInputProps(property)}
    />
  );
};
