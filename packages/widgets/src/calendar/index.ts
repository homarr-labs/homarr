import { IconCalendar } from "@tabler/icons-react";

import { createWidgetDefinition } from "../definition";
import { optionsBuilder } from "../options";

export const { definition, componentLoader } = createWidgetDefinition("calendar", {
  icon: IconCalendar,
  options: optionsBuilder.from((factory) => ({})),
  supportedIntegrations: ['sonarr', 'radarr', 'lidarr', 'readarr']
}).withDynamicImport(() => import("./component"));
