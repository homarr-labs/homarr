"use client";

import { Switch } from "@homarr/ui";

import type { WidgetSort } from "..";
import type { CommonWidgetInputProps } from "./common";
import { useWidgetInputTranslation } from "./common";
import { useFormContext } from "./form";

export const WidgetSwitchInput = <TSort extends WidgetSort>({
  property,
  sort,
  options,
}: CommonWidgetInputProps<TSort, "switch">) => {
  const t = useWidgetInputTranslation(sort, property);
  const form = useFormContext();

  return (
    <Switch
      label={t("label")}
      description={options.withDescription ? t("description") : undefined}
      {...form.getInputProps(property, { type: "checkbox" })}
    />
  );
};
