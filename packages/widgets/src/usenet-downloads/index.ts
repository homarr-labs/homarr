import { IconDownload } from "@tabler/icons-react";

import { createWidgetDefinition } from "../definition";

export const { definition, componentLoader, serverDataLoader } = createWidgetDefinition("usenet-downloads", {
  icon: IconDownload,
  options: {},
  supportedIntegrations: ['sabNzbd', "nzbGet"],
})
  .withServerData(() => import("./serverData"))
  .withDynamicImport(() => import("./component"));
