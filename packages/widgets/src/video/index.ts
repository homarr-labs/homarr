import { IconDeviceCctv } from "@homarr/ui";

import { createWidgetDefinition } from "../definition";
import { optionsBuilder } from "../options";

export const { definition, componentLoader } = createWidgetDefinition("video", {
  icon: IconDeviceCctv,
  options: optionsBuilder.from((factory) => ({
    feedUrl: factory.text({
      defaultValue: "",
    }),
    hasAutoPlay: factory.switch({
      withDescription: true,
    }),
    isMuted: factory.switch({
      defaultValue: true,
    }),
    hasControls: factory.switch(),
  })),
}).withDynamicImport(() => import("./component"));
