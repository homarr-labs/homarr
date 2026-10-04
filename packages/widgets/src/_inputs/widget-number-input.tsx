"use client";

import { NumberInput } from "@mantine/core";

import { useSettings } from "@homarr/settings";

import type { CommonWidgetInputProps } from "./common";
import { useWidgetInputTranslation } from "./common";
import { useFormContext } from "./form";

const KIBIBYTE = 1024;
const KILOBYTE = 1000;

export const WidgetNumberInput = ({ property, kind, options }: CommonWidgetInputProps<"number">) => {
  const t = useWidgetInputTranslation(kind, property);
  const form = useFormContext();
  const { byteUnitSystem } = useSettings();
  const inputProps = form.getInputProps(`options.${property}`);

  let value = inputProps.value;
  let onChange = inputProps.onChange;
  let suffix: string | undefined;
  let decimalScale: number | undefined;

  if (options.storedUnit === "kibibytesPerSecond") {
    let bytesPerDisplayedUnit = KIBIBYTE;
    suffix = " KiB/s";
    if (byteUnitSystem === "decimal") {
      bytesPerDisplayedUnit = KILOBYTE;
      suffix = " KB/s";
    }

    const displayFactor = KIBIBYTE / bytesPerDisplayedUnit;
    if (typeof value === "number") value *= displayFactor;
    onChange = (nextValue: string | number) => {
      if (typeof nextValue !== "number") {
        inputProps.onChange(nextValue);
        return;
      }
      inputProps.onChange(nextValue / displayFactor);
    };
    decimalScale = 6;
  }

  return (
    <NumberInput
      label={t("label")}
      description={options.withDescription ? t("description") : undefined}
      min={options.validate.minValue ?? undefined}
      max={options.validate.maxValue ?? undefined}
      step={options.step}
      suffix={suffix}
      decimalScale={decimalScale}
      {...inputProps}
      value={value}
      onChange={onChange}
    />
  );
};
