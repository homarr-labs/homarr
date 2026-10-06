import * as Charts from "@mantine/charts";
import * as Core from "@mantine/core";
import * as Dates from "@mantine/dates";

import { subcomponentsByName } from "./component-descriptor";
import type { CustomJsxComponentCategory, CustomJsxComponentPackage } from "./component-types";

type Namespace = Readonly<Record<string, unknown>>;

const packageDefinitions: ReadonlyArray<{
  package: CustomJsxComponentPackage;
  namespace: Namespace;
}> = [
  { package: "@mantine/core", namespace: Core as Namespace },
  { package: "@mantine/dates", namespace: Dates as Namespace },
  { package: "@mantine/charts", namespace: Charts as Namespace },
];

function looksLikePublicComponent(name: string, value: unknown) {
  if (!/^[A-Z][A-Za-z0-9]*$/u.test(name) || !/[a-z]/u.test(name)) return false;
  if (typeof value === "function") return true;
  if (value === null || typeof value !== "object") return false;
  const reactType = (value as { $$typeof?: unknown }).$$typeof;
  return reactType === Symbol.for("react.forward_ref") || reactType === Symbol.for("react.memo");
}

function inferCoreCategory(name: string): CustomJsxComponentCategory {
  if (
    /^(?:Alert|Loader|LoadingOverlay|Notification|Overlay|Progress|RingProgress|SemiCircleProgress|Skeleton)/u.test(
      name,
    )
  ) {
    return "feedback";
  }
  if (
    /^(?:Accordion|Anchor|Breadcrumbs|Collapse|HoverCard|Menu|NavLink|Popover|Spoiler|Stepper|Tabs|Tooltip|Transition|Tree)/u.test(
      name,
    )
  ) {
    return "navigation";
  }
  if (
    /(?:Button|Checkbox|Chip|Input|Pagination|Picker|Radio|Rating|Select|Slider|Switch)$/u.test(name) ||
    /^(?:ActionIcon|Autocomplete|Burger|CloseButton|CopyButton|MultiSelect|NumberInput|PasswordInput|PinInput|SegmentedControl|TagsInput|TextInput|Textarea)/u.test(
      name,
    )
  ) {
    return "interaction";
  }
  if (
    /^(?:AspectRatio|Box|Card|Center|Container|Divider|Fieldset|Flex|FloatingIndicator|Grid|Group|Paper|ScrollArea|SimpleGrid|Space|Splitter|Stack|Typography)/u.test(
      name,
    )
  ) {
    return "layout";
  }
  return "content";
}

export interface DiscoveredMantineComponent {
  name: string;
  package: CustomJsxComponentPackage;
  category: CustomJsxComponentCategory;
}

export const discoveredSubcomponentsByName: Readonly<Record<string, readonly string[]>> = {};

export const discoveredMantineComponents: readonly DiscoveredMantineComponent[] = packageDefinitions.flatMap(
  ({ package: packageName, namespace }) =>
    Object.entries(namespace).flatMap(([name, value]) => {
      if (!looksLikePublicComponent(name, value)) return [];
      const category =
        packageName === "@mantine/charts"
          ? "charts"
          : packageName === "@mantine/dates"
            ? "dates"
            : inferCoreCategory(name);
      const reflectedSubcomponents =
        value && (typeof value === "object" || typeof value === "function")
          ? Object.entries(value).flatMap(([property, child]) =>
              looksLikePublicComponent(property, child) ? [`${name}.${property}`] : [],
            )
          : [];
      const subcomponents = [...new Set([...(subcomponentsByName[name] ?? []), ...reflectedSubcomponents])];
      (discoveredSubcomponentsByName as Record<string, readonly string[]>)[name] = subcomponents;
      return [name, ...subcomponents].map((componentName) => ({
        name: componentName,
        package: packageName,
        category,
      }));
    }),
);
