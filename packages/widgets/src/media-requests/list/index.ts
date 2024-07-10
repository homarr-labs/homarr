import { IconZoomQuestion } from "@tabler/icons-react";
import { createWidgetDefinition } from "../../definition";

export const { componentLoader, definition, serverDataLoader } = createWidgetDefinition("mediaRequests-requestList", {
  icon: IconZoomQuestion,
  options: {},
  supportedIntegrations: ["overseerr", "jellyseerr"],
})
  .withServerData(() => import("./serverData"))
  .withDynamicImport(() => import("./component"));