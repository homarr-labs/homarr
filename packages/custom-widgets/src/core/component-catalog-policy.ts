const exactDeniedComponentReasons = new Map<string, string>([
  ["Affix", "Escapes the widget layout boundary"],
  ["ColorSchemeScript", "Writes global document state"],
  ["Dialog", "Escapes the widget layout and focus boundary"],
  ["FloatingWindow", "Creates a separate browser window"],
  ["InlineStyles", "Writes unscoped style rules"],
  ["RemoveScroll", "Changes global page scrolling"],
  ["TableOfContents", "Observes headings and scrolling outside the widget root"],
  ["Transition", "Requires an authored render callback"],
  ["AreaGradient", "Low-level chart implementation helper"],
  ["HiddenDatesInput", "Internal date-input primitive"],
  ["PickerInputBase", "Internal date-input primitive"],
]);

const deniedComponentFamilies: ReadonlyArray<[RegExp, string]> = [
  [
    /^(?:AppShell|Drawer|FloatingWindow|Modal|RemoveScroll)/u,
    "Escapes or replaces the widget layout, focus, scrolling, or overlay boundary",
  ],
  [
    /^(?:Combobox|Input|Menubar|OptionsDropdown|PillsInput)/u,
    "Low-level composition primitive that requires authored callbacks",
  ],
  [
    /^(?:DatesProvider|DirectionProvider|HeadlessMantineProvider|MantineProvider|MantineThemeProvider)/u,
    "Replaces a Homarr-owned provider boundary",
  ],
  [/(?:Context|Provider)$/u, "Exposes or replaces an internal React context boundary"],
  [/(?:Portal)$/u, "Can render outside the widget root"],
  [/^(?:FileButton|FileInput)/u, "Requests local file-system access"],
  [/^(?:FocusTrap)/u, "Can capture focus outside the widget interaction flow"],
];

const blockedComponentProps: Readonly<Record<string, readonly { name: string; reason: string }[]>> = {
  Tooltip: [{ name: "target", reason: "String targets can select elements outside the widget root" }],
  DatePickerInput: pickerModalProps(),
  DateTimePicker: pickerModalProps(),
  MonthPickerInput: pickerModalProps(),
  YearPickerInput: pickerModalProps(),
};

function pickerModalProps() {
  return [
    { name: "dropdownType", reason: "Modal picker mode escapes the widget overlay boundary" },
    { name: "modalProps", reason: "Modal picker configuration escapes the widget overlay boundary" },
  ] as const;
}

export function getCatalogDeniedComponentReason(name: string): string | undefined {
  return exactDeniedComponentReasons.get(name) ?? deniedComponentFamilies.find(([pattern]) => pattern.test(name))?.[1];
}

export function getCatalogBlockedComponentProps(name: string) {
  return blockedComponentProps[name] ?? [];
}
