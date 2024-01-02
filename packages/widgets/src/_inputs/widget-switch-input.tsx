"use client";

import { Switch } from "@homarr/ui";

import type { CommonWidgetInputProps } from "./common";
import { useWidgetInputTranslation } from "./common";
import { useFormContext } from "./form";

export const WidgetSwitchInput = ({
  property,
  sort,
  options,
}: CommonWidgetInputProps<"switch">) => {
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
