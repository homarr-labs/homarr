import { IconPhoto } from "@tabler/icons-react";

import { createWidgetDefinition } from "../definition";
import { optionsBuilder } from "../options";

export const { definition, componentLoader } = createWidgetDefinition("immich-albumCarousel", {
  icon: IconPhoto,
  supportedIntegrations: ["immich"],
  integrationsRequired: true,
  createOptions() {
    return optionsBuilder.from((factory) => ({
      albumId: factory.text({
        defaultValue: "",
        withDescription: true,
      }),
      rotationIntervalSeconds: factory.number({
        defaultValue: 5,
        min: 1,
        max: 3600,
        withDescription: true,
      }),
      showPhotoInfo: factory.switch({
        defaultValue: false,
        withDescription: true,
      }),
    }));
  },
}).withDynamicImport(() => import("./component"));
