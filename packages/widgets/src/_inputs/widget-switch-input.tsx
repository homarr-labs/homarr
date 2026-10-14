"use client";

import { Switch } from "@mantine/core";
import type { SwitchProps } from "@mantine/core";

import type { CommonWidgetInputProps } from "./common";
import { useWidgetInputTranslation } from "./common";
import { useFormContext } from "./form";
import { useStaticWidgetInputOwner } from "./static-owner";

export const WidgetSwitchInput = ({ property, kind, options }: CommonWidgetInputProps<"switch">) => {
  const t = useWidgetInputTranslation(kind, property);
  const form = useFormContext();
  const owner = useStaticWidgetInputOwner(kind, property);
  const { onChange, onFocus, onBlur, ...inputProps } = form.getInputProps(`options.${property}`, {
    type: "checkbox",
  });

  return (
    <Switch
      label={t("label")}
      description={options.withDescription ? t("description") : undefined}
      {...inputProps}
      onChange={(...args: Parameters<NonNullable<SwitchProps["onChange"]>>) => {
        if (!owner.isCurrent()) return;
        return onChange(...args);
      }}
      onFocus={(...args: Parameters<NonNullable<SwitchProps["onFocus"]>>) => {
        if (!owner.isCurrent()) return;
        return onFocus?.(...args);
      }}
      onBlur={(...args: Parameters<NonNullable<SwitchProps["onBlur"]>>) => {
        if (!owner.isCurrent()) return;
        return onBlur?.(...args);
      }}
    />
  );
};
