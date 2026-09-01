import { describe, expect, test } from "vitest";

import {
  customJsxComponentByName,
  customJsxComponentRegistry,
  getCustomJsxBindingType,
} from "../core/component-registry";

const mantineCore960ComponentExports = [
  "RemoveScroll",
  "Collapse",
  "ScrollArea",
  "UnstyledButton",
  "VisuallyHidden",
  "Paper",
  "Popover",
  "ActionIcon",
  "CloseButton",
  "Group",
  "Loader",
  "Overlay",
  "ModalBase",
  "Input",
  "InputBase",
  "Flex",
  "FloatingIndicator",
  "Accordion",
  "ActionBar",
  "Affix",
  "Alert",
  "Anchor",
  "AngleSlider",
  "AppShell",
  "AspectRatio",
  "Autocomplete",
  "Avatar",
  "BackgroundImage",
  "Badge",
  "Blockquote",
  "Breadcrumbs",
  "Burger",
  "Button",
  "Card",
  "Cascader",
  "Center",
  "Checkbox",
  "Chip",
  "Code",
  "ColorPicker",
  "ColorInput",
  "ColorSwatch",
  "Combobox",
  "ComboboxPopover",
  "Container",
  "CopyButton",
  "DataList",
  "Dialog",
  "Divider",
  "Drawer",
  "EmptyState",
  "Fieldset",
  "FileButton",
  "FileInput",
  "FloatingWindow",
  "FocusTrap",
  "Grid",
  "Highlight",
  "HoverCard",
  "Image",
  "Indicator",
  "JsonInput",
  "Kbd",
  "List",
  "LoadingOverlay",
  "Mark",
  "Marquee",
  "MaskInput",
  "Menu",
  "Menubar",
  "Modal",
  "MultiSelect",
  "NativeSelect",
  "NavLink",
  "Notification",
  "NumberFormatter",
  "NumberInput",
  "OverflowList",
  "Pagination",
  "PasswordInput",
  "Pill",
  "PillsInput",
  "PinInput",
  "Portal",
  "Progress",
  "Radio",
  "Rating",
  "RollingNumber",
  "RingProgress",
  "Scroller",
  "SegmentedControl",
  "Select",
  "SemiCircleProgress",
  "SimpleGrid",
  "Skeleton",
  "Slider",
  "Space",
  "Splitter",
  "Spoiler",
  "Stack",
  "Stepper",
  "Switch",
  "Table",
  "TableOfContents",
  "Tabs",
  "TagsInput",
  "Text",
  "Textarea",
  "TextInput",
  "ThemeIcon",
  "Timeline",
  "Title",
  "Tooltip",
  "Transition",
  "Tree",
  "TreeSelect",
  "Typography",
] as const;

const mantineCharts960ComponentExports = [
  "ChartTooltip",
  "ChartLegend",
  "AreaChart",
  "BarChart",
  "LineChart",
  "Sparkline",
  "DonutChart",
  "PieChart",
  "RadarChart",
  "ScatterChart",
  "BubbleChart",
  "CompositeChart",
  "RadialBarChart",
  "FunnelChart",
  "Heatmap",
  "BarsList",
  "Treemap",
  "SankeyChart",
  "BulletChart",
  "CandlestickChart",
  "ChartBrush",
  "GaugeChart",
  "MatrixChart",
  "SunburstChart",
  "WaffleChart",
] as const;

const mantineDates960ComponentExports = [
  "DatesProvider",
  "HiddenDatesInput",
  "TimeInput",
  "TimePicker",
  "TimeValue",
  "Day",
  "WeekdaysRow",
  "Month",
  "PickerControl",
  "YearsList",
  "MonthsList",
  "CalendarHeader",
  "DecadeLevel",
  "YearLevel",
  "MonthLevel",
  "LevelsGroup",
  "DecadeLevelGroup",
  "YearLevelGroup",
  "MonthLevelGroup",
  "PickerInputBase",
  "Calendar",
  "YearPicker",
  "MonthPicker",
  "DatePicker",
  "DateInput",
  "DateTimePicker",
  "InlineDateTimePicker",
  "YearPickerInput",
  "MonthPickerInput",
  "DatePickerInput",
  "TimeGrid",
  "MiniCalendar",
] as const;

describe("customJsxComponentRegistry", () => {
  test("classifies every component name exactly once", () => {
    const names = customJsxComponentRegistry.map(({ name }) => name);
    expect(new Set(names).size).toBe(names.length);
  });

  test.each([
    ["ChartTooltip", "wrapped"],
    ["ChartLegend", "wrapped"],
    ["VisuallyHidden", "wrapped"],
    ["SubFetch", "wrapped"],
    ["Portal", "denied"],
    ["TextInput", "wrapped"],
    ["ModalRoot", "denied"],
    ["AppShellMain", "denied"],
    ["ActionBar", "denied"],
    ["ActionBar.Divider", "denied"],
    ["GaugeChart", "wrapped"],
  ] as const)("classifies %s as %s", (name, safety) => {
    expect(customJsxComponentByName.get(name)?.safety).toBe(safety);
  });

  test("documents why every denied component is unavailable", () => {
    for (const component of customJsxComponentRegistry) {
      if (component.safety === "denied") {
        expect(component.reason, component.name).toBeTruthy();
      }
    }
  });

  test("publishes the minimal safe runtime metadata for every component", () => {
    for (const component of customJsxComponentRegistry) {
      expect(component.supportedProps, component.name).toBeInstanceOf(Array);
      expect(component.blockedProps, component.name).toBeInstanceOf(Array);
      expect(component.supportedProps, component.name).not.toContain("renderOption");
      expect(component.supportedProps, component.name).not.toContain("rootRef");
      expect(component.supportedProps, component.name).not.toContain("popoverTarget");
    }
  });

  test.each([
    ["Tabs.List", "grow"],
    ["ScrollArea", "offsetScrollbars"],
    ["SubData", "fit"],
    ["SubData", "alt"],
  ] as const)("supports the %s.%s authoring prop", (component, prop) => {
    expect(customJsxComponentByName.get(component)?.supportedProps).toContain(prop);
  });

  test.each([
    ...mantineCore960ComponentExports,
    ...mantineCharts960ComponentExports,
    ...mantineDates960ComponentExports,
  ])("classifies the Mantine 9.6.0 export %s", (name) => {
    expect(customJsxComponentByName.has(name), `${name} is not classified`).toBe(true);
  });

  test.each([
    ["TextInput", "string"],
    ["NumberInput", "number"],
    ["Switch", "boolean"],
    ["Select", "string"],
    ["MultiSelect", "string[]"],
    ["DateInput", "string"],
    ["DatePicker", "string"],
    ["Tabs", "string"],
    ["Popover", "boolean"],
    ["RangeSlider", "number[]"],
  ] as const)("infers %s bindings as %s", (component, type) => {
    expect(getCustomJsxBindingType(component)).toBe(type);
  });

  test("advertises resetKey only for declaratively bindable controls", () => {
    expect(customJsxComponentByName.get("Pagination")?.supportedProps).toEqual(
      expect.arrayContaining(["bind", "resetKey"]),
    );
    expect(customJsxComponentByName.get("Text")?.supportedProps).not.toContain("resetKey");
  });

  test("infers range and multiple date controls from their authored props", () => {
    for (const component of [
      "DatePicker",
      "DatePickerInput",
      "MonthPicker",
      "MonthPickerInput",
      "YearPicker",
      "YearPickerInput",
    ]) {
      expect(getCustomJsxBindingType(component, { type: "multiple" })).toBe("string[]");
      expect(getCustomJsxBindingType(component, { type: "range" })).toBe("string[]");
    }
    expect(getCustomJsxBindingType("DateTimePicker", { type: "range" })).toBe("string[]");
    expect(getCustomJsxBindingType("DateTimePicker", { type: "multiple" })).toBe("string");
    expect(getCustomJsxBindingType("InlineDateTimePicker", { type: "range" })).toBe("string[]");
    expect(getCustomJsxBindingType("InlineDateTimePicker", { type: "multiple" })).toBe("string");
    expect(getCustomJsxBindingType("Accordion", { multiple: true })).toBe("string[]");
    expect(getCustomJsxBindingType("TreeSelect", { mode: "multiple" })).toBe("string[]");
    expect(getCustomJsxBindingType("TreeSelect", { mode: "checkbox" })).toBe("string[]");
    expect(getCustomJsxBindingType("Chip.Group", { multiple: true })).toBe("string[]");
    expect(getCustomJsxBindingType("ChipGroup", { multiple: true })).toBe("string[]");
    expect(getCustomJsxBindingType("RadioGroup")).toBe("string");
    expect(getCustomJsxBindingType("CheckboxGroup")).toBe("string[]");
    expect(getCustomJsxBindingType("SwitchGroup")).toBe("string[]");
    expect(getCustomJsxBindingType("Calendar")).toBeNull();
    expect(getCustomJsxBindingType("HoverCard")).toBeNull();
    expect(getCustomJsxBindingType("Text", {})).toBeNull();
  });
});
