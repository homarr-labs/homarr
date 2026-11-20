"use client";

import { Autocomplete, Combobox, TextInput } from "@mantine/core";

import type { CommonWidgetInputProps } from "./common";
import { useWidgetInputTranslation } from "./common";
import { useFormContext } from "./form";

export const WidgetTextInput = ({ property, kind, options }: CommonWidgetInputProps<"text">) => {
  const t = useWidgetInputTranslation(kind, property);
  const form = useFormContext();
  const inputProps = {
    label: t("label"),
    description: options.withDescription ? t("description") : undefined,
    ...form.getInputProps(`options.${property}`),
  };

  if (options.suggestions) {
    return (
      <Autocomplete
        {...inputProps}
        data={options.suggestions}
        filter={({ options: suggestions }) => suggestions}
        rightSection={<Combobox.Chevron />}
        rightSectionPointerEvents="none"
      />
    );
  }

  return <TextInput {...inputProps} />;
};
