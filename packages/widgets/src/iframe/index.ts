import { IconBrowser } from "@tabler/icons-react";

import { createWidgetDefinition } from "../definition";
import { optionsBuilder } from "../options";

export const { definition, componentLoader } = createWidgetDefinition("iframe", {
  icon: IconBrowser,
  options: optionsBuilder.from((factory) => ({
    embedUrl: factory.text(),
    allowFullScreen: factory.switch(),
    allowScrolling: factory.switch({
      defaultValue: true,
    }),
    allowTransparency: factory.switch(),
    allowPayment: factory.switch(),
    allowAutoPlay: factory.switch(),
    allowMicrophone: factory.switch(),
    allowCamera: factory.switch(),
    allowGeolocation: factory.switch(),
  })),
}).withDynamicImport(() => import("./component"));
