"use client";

import { Select } from "@homarr/ui";

import type { CommonWidgetInputProps } from "./common";
import { useWidgetInputTranslation } from "./common";
import { useFormContext } from "./form";

export const WidgetSelectInput = ({
  property,
  kind,
  options,
}: CommonWidgetInputProps<"select">) => {
  const t = useWidgetInputTranslation(kind, property);
  const form = useFormContext();

  return (
    <Select
      label={t("label")}
      data={options.options as unknown as string[]}
      description={options.withDescription ? t("description") : undefined}
      {...form.getInputProps(`options.${property}`)}
    />
  );
};
