export type {
  CustomJsxComponentCategory,
  CustomJsxComponentDescriptor,
  CustomJsxComponentPackage,
  CustomJsxComponentSafety,
} from "./component-descriptor";

import { customJsxDeniedComponentRegistry } from "./component-registry-denied";
import { customJsxEnabledComponentRegistry } from "./component-registry-enabled";

export const customJsxComponentRegistry = [
  ...customJsxEnabledComponentRegistry,
  ...customJsxDeniedComponentRegistry,
] as const;
export const enabledCustomJsxComponents = customJsxEnabledComponentRegistry;
export const customJsxComponentByName = new Map(customJsxComponentRegistry.map((entry) => [entry.name, entry]));
export const customJsxSupportedPropsByName = new Map(
  customJsxComponentRegistry.map((entry) => [entry.name, new Set(entry.supportedProps)]),
);

export const customJsxBindableComponentNames: ReadonlySet<string> = new Set([
  "Accordion",
  "Autocomplete",
  "Calendar",
  "Checkbox",
  "Checkbox.Group",
  "Chip.Group",
  "ColorInput",
  "ColorPicker",
  "DateInput",
  "DatePicker",
  "DatePickerInput",
  "DateTimePicker",
  "HoverCard",
  "JsonInput",
  "InlineDateTimePicker",
  "MaskInput",
  "Menu",
  "MiniCalendar",
  "MonthPicker",
  "MonthPickerInput",
  "MultiSelect",
  "NativeSelect",
  "NumberInput",
  "Pagination",
  "PasswordInput",
  "PinInput",
  "Popover",
  "Radio.Group",
  "RangeSlider",
  "Rating",
  "SegmentedControl",
  "Select",
  "Slider",
  "Stepper",
  "Switch",
  "Switch.Group",
  "Tabs",
  "TagsInput",
  "TextInput",
  "Textarea",
  "TimeInput",
  "TimePicker",
  "TreeSelect",
  "YearPicker",
  "YearPickerInput",
]);

export type CustomJsxBindingType = "string" | "number" | "boolean" | "string[]" | "number[]";

const booleanBindingComponents = new Set(["Checkbox", "HoverCard", "Menu", "Popover", "Switch"]);
const numberBindingComponents = new Set(["NumberInput", "Pagination", "Rating", "Slider", "Stepper"]);
const stringArrayBindingComponents = new Set(["Checkbox.Group", "MultiSelect", "Switch.Group", "TagsInput"]);

export function getCustomJsxBindingType(
  componentName: string,
  props: Readonly<Record<string, unknown>> = {},
): CustomJsxBindingType | null {
  if (!customJsxBindableComponentNames.has(componentName)) return null;
  if (booleanBindingComponents.has(componentName)) return "boolean";
  if (numberBindingComponents.has(componentName)) return "number";
  if (componentName === "RangeSlider") return "number[]";
  if (stringArrayBindingComponents.has(componentName)) return "string[]";
  if (["Calendar", "DatePicker"].includes(componentName) && ["multiple", "range"].includes(String(props.type)))
    return "string[]";
  if (componentName === "Chip.Group" && props.multiple === true) return "string[]";
  return "string";
}
