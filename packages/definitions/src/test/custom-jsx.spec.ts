import { describe, expect, test } from "vitest";

import { customJsxComponentByName, customJsxComponentRegistry } from "../custom-jsx";

const mantineCore941ComponentExports = [
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

const mantineCharts941ComponentExports = [
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
] as const;

const mantineDates941ComponentExports = [
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
    ["ChartTooltip", "allowed"],
    ["ChartLegend", "allowed"],
    ["VisuallyHidden", "allowed"],
    ["SubFetch", "wrapped"],
    ["Portal", "denied"],
    ["TextInput", "denied"],
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

  test("publishes complete authoring metadata for every component", () => {
    for (const component of customJsxComponentRegistry) {
      expect(component.documentationUrl, component.name).toMatch(/^https:\/\//);
      expect(component.supportedProps, component.name).toBeInstanceOf(Array);
      expect(component.subcomponents, component.name).toBeInstanceOf(Array);
      expect(component.accessibilityRequirements, component.name).toBeInstanceOf(Array);
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
    ...mantineCore941ComponentExports,
    ...mantineCharts941ComponentExports,
    ...mantineDates941ComponentExports,
  ])("classifies the Mantine 9.4.1 export %s", (name) => {
    expect(customJsxComponentByName.has(name), `${name} is not classified`).toBe(true);
  });
});
