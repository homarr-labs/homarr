import { WidgetDefinition } from "@site/src/types";
import { IconApi } from "@tabler/icons-react";

export const customApiWidget: WidgetDefinition = {
  icon: IconApi,
  name: "Custom API",
  description: "Displays data from a custom API endpoint using configurable display types and optional JSX templates.",
  data: "Displays data from user-defined API endpoints with configurable display types like values, tables, charts, and status indicators.",
  path: "../../widgets/custom-api",
};
