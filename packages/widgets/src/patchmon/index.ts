import { IconServerOff, IconShieldCheck } from "@tabler/icons-react";

import { createWidgetDefinition } from "../definition";
import { optionsBuilder } from "../options";

export const { definition, componentLoader } = createWidgetDefinition("patchmon", {
  icon: IconShieldCheck,
  supportedIntegrations: ["patchmon"],
  integrationsRequired: true,
  createOptions() {
    return optionsBuilder.from((factory) => ({
      showTotalHosts: factory.switch({
        defaultValue: true,
        withDescription: true,
      }),
      showHostsNeedingUpdates: factory.switch({
        defaultValue: true,
        withDescription: true,
      }),
      showSecurityUpdates: factory.switch({
        defaultValue: true,
        withDescription: true,
      }),
      showUpToDateHosts: factory.switch({
        defaultValue: false,
        withDescription: true,
      }),
      showHostsWithSecurityUpdates: factory.switch({
        defaultValue: false,
        withDescription: true,
      }),
      showRecentUpdates24h: factory.switch({
        defaultValue: false,
        withDescription: true,
      }),
      showTotalOutdatedPackages: factory.switch({
        defaultValue: false,
        withDescription: true,
      }),
      showTotalRepos: factory.switch({
        defaultValue: false,
        withDescription: true,
      }),
    }));
  },
  errors: {
    INTERNAL_SERVER_ERROR: {
      icon: IconServerOff,
      message: (t) => t("widget.patchmon.error.internalServerError"),
    },
  },
}).withDynamicImport(() => import("./component"));
