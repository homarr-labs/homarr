import { IconBadgeCc, IconServerOff } from "@tabler/icons-react";

import { createWidgetDefinition } from "../definition";
import { optionsBuilder } from "../options";

export const { definition, componentLoader } = createWidgetDefinition("bazarr", {
  icon: IconBadgeCc,
  supportedIntegrations: ["bazarr"],
  integrationsRequired: true,
  createOptions() {
    return optionsBuilder.from((factory) => ({
      showMissingEpisodes: factory.switch({
        defaultValue: true,
        withDescription: true,
      }),
      showMissingMovies: factory.switch({
        defaultValue: true,
        withDescription: true,
      }),
      showProviderIssues: factory.switch({
        defaultValue: true,
        withDescription: true,
      }),
      showHealthIssues: factory.switch({
        defaultValue: true,
        withDescription: true,
      }),
    }));
  },
  errors: {
    INTERNAL_SERVER_ERROR: {
      icon: IconServerOff,
      message: (t) => t("widget.bazarr.error.internalServerError"),
    },
  },
}).withDynamicImport(() => import("./component"));
