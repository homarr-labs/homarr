import type { WidgetOptionType } from "../options";
import { WidgetMultiSelectInput } from "./widget-multiselect-input";
import { WidgetNumberInput } from "./widget-number-input";
import { WidgetSelectInput } from "./widget-select-input";
import { WidgetSliderInput } from "./widget-slider-input";
import { WidgetSwitchInput } from "./widget-switch-input";
import { WidgetTextInput } from "./widget-text-input";

const mapping = {
  text: WidgetTextInput,
  location: () => null,
  multiSelect: WidgetMultiSelectInput,
  multiText: () => null,
  number: WidgetNumberInput,
  select: WidgetSelectInput,
  slider: WidgetSliderInput,
  switch: WidgetSwitchInput,
} satisfies Record<WidgetOptionType, unknown>;

export const getInputForType = <TType extends WidgetOptionType>(
  type: TType,
) => {
  return mapping[type];
};
