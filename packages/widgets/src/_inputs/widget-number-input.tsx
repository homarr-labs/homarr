"use client";

import { NumberInput } from "@mantine/core";
import type { NumberInputProps } from "@mantine/core";

import { useSettings } from "@homarr/settings";

import type { CommonWidgetInputProps } from "./common";
import { useWidgetInputTranslation } from "./common";
import { useFormContext } from "./form";
import { useStaticWidgetInputOwner } from "./static-owner";
import { useStaticWidgetInputGesture } from "./widget-slider-input";

const KIBIBYTE = 1024;
const KILOBYTE = 1000;
const numberKeys = ["ArrowUp", "ArrowDown"];

export const WidgetNumberInput = ({ property, kind, options }: CommonWidgetInputProps<"number">) => {
  const t = useWidgetInputTranslation(kind, property);
  const form = useFormContext();
  const { byteUnitSystem } = useSettings();
  const owner = useStaticWidgetInputOwner(kind, property);
  const { onChange: originalOnChange, onFocus, onBlur, ...inputProps } = form.getInputProps(`options.${property}`);

  let value = inputProps.value;
  let suffix: string | undefined;
  let decimalScale: number | undefined;
  let displayFactor = 1;

  if (options.storedUnit === "kibibytesPerSecond") {
    let bytesPerDisplayedUnit = KIBIBYTE;
    suffix = " KiB/s";
    if (byteUnitSystem === "decimal") {
      bytesPerDisplayedUnit = KILOBYTE;
      suffix = " KB/s";
    }

    displayFactor = KIBIBYTE / bytesPerDisplayedUnit;
    if (typeof value === "number") value *= displayFactor;
    decimalScale = 6;
  }

  const gesture = useStaticWidgetInputGesture(
    owner,
    (nextValue: string | number) => {
      if (options.storedUnit === "kibibytesPerSecond" && typeof nextValue === "number") {
        nextValue /= displayFactor;
      }
      if (!owner.isCurrent()) return;
      return originalOnChange(nextValue);
    },
    numberKeys,
    false,
    true,
  );

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
      onChange={gesture.onChange}
      onFocus={(...args: Parameters<NonNullable<NumberInputProps["onFocus"]>>) => {
        if (!owner.isCurrent()) return;
        return onFocus?.(...args);
      }}
      onBlur={(...args: Parameters<NonNullable<NumberInputProps["onBlur"]>>) => {
        try {
          if (!owner.isCurrent()) return;
          return onBlur?.(...args);
        } finally {
          gesture.cancel();
        }
      }}
      wrapperProps={{
        onPointerDownCapture: (event) => {
          if (event.target instanceof Element && event.target.closest("button[data-direction]")) {
            gesture.startPointer();
            return;
          }
          gesture.startDirect();
        },
        onPointerOutCapture: (event) => {
          if (!(event.target instanceof Element)) return;
          const control = event.target.closest("button[data-direction]");
          if (!control) return;
          if (event.relatedTarget instanceof Node && control.contains(event.relatedTarget)) return;
          gesture.endPointer();
        },
        onKeyDownCapture: (event) => {
          if (numberKeys.includes(event.key)) {
            gesture.startKey(event);
            return;
          }
          gesture.startDirect();
        },
        onChangeCapture: gesture.startDirect,
        onBlurCapture: gesture.startDirect,
      }}
    />
  );
};
