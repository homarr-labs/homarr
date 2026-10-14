"use client";

import { TextInput } from "@mantine/core";
import type { TextInputProps } from "@mantine/core";

import type { CommonWidgetInputProps } from "./common";
import { useWidgetInputTranslation } from "./common";
import { useFormContext } from "./form";
import { useStaticWidgetInputOwner } from "./static-owner";

export const WidgetTextInput = ({ property, kind, options }: CommonWidgetInputProps<"text">) => {
  const t = useWidgetInputTranslation(kind, property);
  const form = useFormContext();
  const owner = useStaticWidgetInputOwner(kind, property);
  const { onChange, onFocus, onBlur, ...inputProps } = form.getInputProps(`options.${property}`);

  return (
    <TextInput
      label={t("label")}
      description={options.withDescription ? t("description") : undefined}
      {...inputProps}
      onChange={(...args: Parameters<NonNullable<TextInputProps["onChange"]>>) => {
        if (!owner.isCurrent()) return;
        return onChange(...args);
      }}
      onFocus={(...args: Parameters<NonNullable<TextInputProps["onFocus"]>>) => {
        if (!owner.isCurrent()) return;
        return onFocus?.(...args);
      }}
      onBlur={(...args: Parameters<NonNullable<TextInputProps["onBlur"]>>) => {
        if (!owner.isCurrent()) return;
        return onBlur?.(...args);
      }}
    />
  );
};
