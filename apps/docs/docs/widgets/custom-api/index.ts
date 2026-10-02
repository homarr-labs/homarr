import { WidgetDefinition } from "@site/src/types";
import { IconApi } from "@tabler/icons-react";

export const customApiWidget: WidgetDefinition = {
  icon: IconApi,
  name: "Custom API",
  description:
    "Renders an administrator-defined Custom JSX v2 widget with server-side API requests, options, and actions.",
  path: "../../widgets/custom-api",
};
