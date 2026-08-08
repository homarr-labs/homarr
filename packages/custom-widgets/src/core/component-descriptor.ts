import type {
  CustomJsxComponentCategory,
  CustomJsxComponentPackage,
  CustomJsxComponentSafety,
} from "./component-types";
export type * from "./component-types";

export interface CustomJsxComponentDescriptor {
  name: string;
  package: CustomJsxComponentPackage;
  safety: CustomJsxComponentSafety;
  supportedProps: readonly string[];
  blockedProps: readonly { name: string; reason: string }[];
  reason?: string;
}

export const subcomponentsByName: Readonly<Record<string, readonly string[]>> = {
  Accordion: ["Accordion.Item", "Accordion.Control", "Accordion.Panel"],
  Avatar: ["Avatar.Group"],
  Card: ["Card.Section"],
  Chip: ["Chip.Group"],
  DataList: ["DataList.Item", "DataList.ItemLabel", "DataList.ItemValue"],
  EmptyState: ["EmptyState.Indicator", "EmptyState.Title", "EmptyState.Description", "EmptyState.Actions"],
  Grid: ["Grid.Col"],
  List: ["List.Item"],
  Menu: ["Menu.Target", "Menu.Dropdown", "Menu.Item", "Menu.Label", "Menu.Divider"],
  Progress: ["Progress.Section"],
  Table: ["Table.Thead", "Table.Tbody", "Table.Tfoot", "Table.Caption", "Table.Tr", "Table.Th", "Table.Td"],
  Tabs: ["Tabs.List", "Tabs.Tab", "Tabs.Panel"],
  Timeline: ["Timeline.Item"],
};

export const accessibilityByCategory: Record<CustomJsxComponentCategory, readonly string[]> = {
  layout: ["Keep visual order consistent with reading order."],
  content: ["Provide meaningful text alternatives for non-text content."],
  feedback: ["Do not rely on color alone to communicate status."],
  navigation: ["Provide an accessible label for controls without visible text."],
  charts: ["Include a nearby text summary of the chart data."],
  dates: ["Include a textual date when the visual calendar carries meaning."],
  interaction: ["Provide a visible label or aria-label."],
  network: ["Action labels must describe their effect; destructive actions require confirmation."],
  blocked: [],
};

export function documentationUrl(packageName: CustomJsxComponentPackage, name: string): string {
  if (packageName === "@homarr/widgets") return "https://homarr.dev/docs/management/custom-widgets/";
  const section = packageName === "@mantine/core" ? "core" : packageName === "@mantine/charts" ? "charts" : "dates";
  const slug = (name.split(".")[0] ?? "")
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1-$2")
    .toLowerCase();
  return `https://mantine.dev/${section}/${slug}/`;
}
