"use client";

import { TextInput } from "@homarr/ui";

import type { WidgetSort } from "..";
import type { CommonWidgetInputProps } from "./common";
import { useWidgetInputTranslation } from "./common";
import { useFormContext } from "./form";

export const WidgetTextInput = <TSort extends WidgetSort>({
  property,
  sort: widgetSort,
  options,
}: CommonWidgetInputProps<TSort, "text">) => {
  const t = useWidgetInputTranslation(widgetSort, property);
  const form = useFormContext();

  return (
    <TextInput
      label={t("label")}
      description={options.withDescription ? t("description") : undefined}
      {...form.getInputProps(property)}
    />
  );
};
