import { WidgetDefinition } from "@site/src/types";
import { IconApi } from "@tabler/icons-react";

export const customApiWidget: WidgetDefinition = {
  icon: IconApi,
  name: "Custom API",
  description: "Displays data from a custom API endpoint using configurable display types and optional JSX templates.",
  path: "../../widgets/custom-api",
};
