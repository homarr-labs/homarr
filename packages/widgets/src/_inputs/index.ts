import type { WidgetOptionType } from "../options";
import { WidgetAppInput } from "./widget-app-input";
import { WidgetLocationInput } from "./widget-location-input";
import { WidgetMultiTextInput } from "./widget-multi-text-input";
import { WidgetMultiSelectInput } from "./widget-multiselect-input";
import { WidgetNumberInput } from "./widget-number-input";
import { WidgetSelectInput } from "./widget-select-input";
import { WidgetSliderInput } from "./widget-slider-input";
import { WidgetSwitchInput } from "./widget-switch-input";
import { WidgetTextInput } from "./widget-text-input";
import {WidgetOrderedObjectListInput} from "./widget-ordered-object-list-input";

const mapping = {
  text: WidgetTextInput,
  location: WidgetLocationInput,
  multiSelect: WidgetMultiSelectInput,
  multiText: WidgetMultiTextInput,
  number: WidgetNumberInput,
  select: WidgetSelectInput,
  slider: WidgetSliderInput,
  switch: WidgetSwitchInput,
  app: WidgetAppInput,
  orderedObjectList: WidgetOrderedObjectListInput
} satisfies Record<WidgetOptionType, unknown>;

export const getInputForType = <TType extends WidgetOptionType>(type: TType) => {
  return mapping[type];
};
