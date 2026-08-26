import { IconBrowser, IconExternalLink } from "@tabler/icons-react";

import { createWidgetDefinition } from "../definition";
import { optionsBuilder } from "../options";

const createOptions = () =>
  optionsBuilder.from((factory) => ({
    embedUrl: factory.text(),
    allowFullScreen: factory.switch(),
    allowScrolling: factory.switch({
      defaultValue: true,
    }),
    allowPayment: factory.switch(),
    allowAutoPlay: factory.switch(),
    allowMicrophone: factory.switch(),
    allowCamera: factory.switch(),
    allowGeolocation: factory.switch(),
    allowModals: factory.switch(),
  }));

export const { definition, componentLoader } = createWidgetDefinition("iframe", {
  supportsAdvancedFocus: false,
  icon: IconBrowser,
  contextActions: ({ options }) => {
    const embedUrl = options.embedUrl;
    if (typeof embedUrl !== "string" || embedUrl.trim() === "") return [];

    return [
      {
        key: "open-iframe",
        label: "widget.common.openInNewTab.label",
        icon: IconExternalLink,
        onClick: () => window.open(embedUrl, "_blank", "noopener,noreferrer"),
      },
    ];
  },
  createOptions,
}).withDynamicImport(() => import("./component"));
