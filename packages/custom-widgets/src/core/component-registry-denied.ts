import { accessibilityByCategory, documentationUrl } from "./component-descriptor";
import type { CustomJsxComponentDescriptor } from "./component-descriptor";
import { discoveredMantineComponents } from "./component-discovery";

const exactReasons = new Map<string, string>([
  ["Affix", "Escapes the widget layout boundary"],
  ["ColorSchemeScript", "Writes global document state"],
  ["Dialog", "Escapes the widget layout and focus boundary"],
  ["FloatingWindow", "Creates a separate browser window"],
  ["InlineStyles", "Writes unscoped style rules"],
  ["RemoveScroll", "Changes global page scrolling"],
  ["Transition", "Requires an authored render callback"],
  ["AreaGradient", "Low-level chart implementation helper"],
  ["HiddenDatesInput", "Internal date-input primitive"],
  ["PickerInputBase", "Internal date-input primitive"],
]);

const familyReasons: ReadonlyArray<[RegExp, string]> = [
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

export function getDeniedCustomJsxComponentReason(name: string): string | undefined {
  const exact = exactReasons.get(name);
  if (exact) return exact;
  return familyReasons.find(([pattern]) => pattern.test(name))?.[1];
}

export const customJsxDeniedComponentRegistry: readonly CustomJsxComponentDescriptor[] =
  discoveredMantineComponents.flatMap(({ name, package: packageName }) => {
    const reason = getDeniedCustomJsxComponentReason(name);
    if (!reason) return [];
    return [
      {
        name,
        package: packageName,
        category: "blocked" as const,
        safety: "denied" as const,
        supportedProps: [],
        subcomponents: [],
        accessibilityRequirements: accessibilityByCategory.blocked,
        documentationUrl: documentationUrl(packageName, name),
        reason,
      },
    ];
  });

export const deniedCustomJsxComponentNames = new Set(customJsxDeniedComponentRegistry.map((entry) => entry.name));
