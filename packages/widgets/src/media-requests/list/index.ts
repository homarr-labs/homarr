import { IconZoomQuestion } from "@tabler/icons-react";

import { getIntegrationKindsByCategory } from "@homarr/definitions";

import { createWidgetDefinition } from "../../definition";
import { optionsBuilder } from "../../options";

export const { componentLoader, definition, serverDataLoader } = createWidgetDefinition("mediaRequests-requestList", {
  icon: IconZoomQuestion,
  options: optionsBuilder.from((factory) => ({
    linksTargetNewTab: factory.switch({
      defaultValue: true,
    }),
  })),
  supportedIntegrations: getIntegrationKindsByCategory("mediaRequest"),
})
  .withServerData(() => import("./serverData"))
  .withDynamicImport(() => import("./component"));
