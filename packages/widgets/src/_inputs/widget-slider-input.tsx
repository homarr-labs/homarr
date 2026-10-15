"use client";

import { Group, InputWrapper, NumberInput, Slider } from "@mantine/core";

import type { CommonWidgetInputProps } from "./common";
import { useWidgetInputTranslation } from "./common";
import { useFormContext } from "./form";

export const WidgetSliderInput = ({ property, kind, options }: CommonWidgetInputProps<"slider">) => {
  const t = useWidgetInputTranslation(kind, property);
  const form = useFormContext();
  const { error, ...inputProps } = form.getInputProps(`options.${property}`);
  const min = options.validate.minValue ?? undefined;
  const max = options.validate.maxValue ?? undefined;
  const slider = (
    <Slider
      min={min}
      max={max}
      step={options.step}
      thumbLabel={t("label")}
      label={(value) => `${value}${options.suffix ?? ""}`}
      {...inputProps}
      value={typeof inputProps.value === "number" ? inputProps.value : (min ?? 0)}
      style={options.withNumberInput ? { flex: 1, minWidth: 0 } : undefined}
    />
  );

  return (
    <InputWrapper
      label={t("label")}
      description={options.withDescription ? t("description") : undefined}
      error={error}
      inputWrapperOrder={["label", "input", "description", "error"]}
    >
      {options.withNumberInput ? (
        <Group gap="md" wrap="nowrap">
          {slider}
          <NumberInput
            aria-label={t("label")}
            min={min}
            max={max}
            step={options.step}
            suffix={options.suffix}
            w={110}
            style={{ flexShrink: 0 }}
            {...inputProps}
            error={Boolean(error)}
          />
        </Group>
      ) : (
        slider
      )}
    </InputWrapper>
  );
};
