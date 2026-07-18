import { accessibilityByCategory, describe, documentationUrl, subcomponentsByName } from "./component-descriptor";
import type { CustomJsxComponentDescriptor } from "./component-descriptor";
import { discoveredMantineComponents, discoveredSubcomponentsByName } from "./component-discovery";
import { deniedCustomJsxComponentNames } from "./component-registry-denied";
import { categorySafeProps, commonSafeProps } from "./component-props";
import generatedComponentProps from "./component-props.generated.json";

const enabledMantineComponents = discoveredMantineComponents.flatMap(
  ({ name, package: packageName, category }): CustomJsxComponentDescriptor[] =>
    deniedCustomJsxComponentNames.has(name)
      ? []
      : [
          {
            name,
            package: packageName,
            category,
            safety: "wrapped",
            supportedProps: [
              ...new Set([
                ...commonSafeProps,
                ...categorySafeProps[category],
                ...((generatedComponentProps as Record<string, string[]>)[name] ?? []),
                "bind",
              ]),
            ],
            subcomponents: discoveredSubcomponentsByName[name] ?? subcomponentsByName[name] ?? [],
            accessibilityRequirements: accessibilityByCategory[category],
            documentationUrl: documentationUrl(packageName, name),
          },
        ],
);

export const customJsxEnabledComponentRegistry: readonly CustomJsxComponentDescriptor[] = [
  ...enabledMantineComponents,
  ...describe("@homarr/widgets", "interaction", "allowed", [
    "PaginatedList",
    "TabsContainer",
    "TabPanel",
    "Collapsible",
    "StatBar",
    "TypeBadge",
  ]),
  ...describe("@homarr/widgets", "network", "wrapped", [
    "SubFetch",
    "SubData",
    "ActionButton",
    "ToggleSwitch",
    "RefreshButton",
  ]),
  {
    name: "TablerIcon",
    package: "@homarr/widgets",
    category: "content",
    safety: "wrapped",
    supportedProps: ["name", "size", "color", "stroke"],
    subcomponents: [],
    accessibilityRequirements: accessibilityByCategory.content,
    documentationUrl: documentationUrl("@homarr/widgets", "TablerIcon"),
  },
];
