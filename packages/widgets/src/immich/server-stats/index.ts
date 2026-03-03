import { IconGraphFilled } from "@tabler/icons-react";

import { createWidgetDefinition } from "../../definition";
import { optionsBuilder } from "../../options";

export const { definition, componentLoader } = createWidgetDefinition("immich-serverStats", {
  icon: IconGraphFilled,
  supportedIntegrations: ["immich"],
  integrationsRequired: true,
  createOptions() {
    return optionsBuilder.from((factory) => ({
      showUsers: factory.switch({
        defaultValue: true,
        withDescription: true,
      }),
      showPhotos: factory.switch({
        defaultValue: true,
        withDescription: true,
      }),
      showVideos: factory.switch({
        defaultValue: true,
        withDescription: true,
      }),
      showStorage: factory.switch({
        defaultValue: true,
        withDescription: true,
      }),
    }));
  },
}).withDynamicImport(() => import("./component"));
