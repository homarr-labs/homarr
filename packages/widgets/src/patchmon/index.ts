import { IconServerOff, IconShieldCheck } from "@tabler/icons-react";

import { createWidgetDefinition } from "../definition";
import { optionsBuilder } from "../options";

export const { definition, componentLoader } = createWidgetDefinition("patchmon", {
  icon: IconShieldCheck,
  supportedIntegrations: ["patchmon"],
  integrationsRequired: true,
  createOptions() {
    return optionsBuilder.from(
      (factory) => ({
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
        showOsDistribution: factory.switch({
          defaultValue: false,
          withDescription: true,
        }),
        osDistributionLimit: factory.select({
          defaultValue: "5",
          withDescription: true,
          options: [
            { value: "3", label: (t) => t("widget.patchmon.option.osDistributionLimit.option.3") },
            { value: "5", label: (t) => t("widget.patchmon.option.osDistributionLimit.option.5") },
            { value: "10", label: (t) => t("widget.patchmon.option.osDistributionLimit.option.10") },
            { value: "0", label: (t) => t("widget.patchmon.option.osDistributionLimit.option.all") },
          ] as const,
        }),
        showOsVersion: factory.switch({
          defaultValue: true,
          withDescription: true,
        }),
      }),
      {
        osDistributionLimit: {
          shouldHide: (options) => !options.showOsDistribution,
        },
        showOsVersion: {
          shouldHide: (options) => !options.showOsDistribution,
        },
      },
    );
  },
  errors: {
    INTERNAL_SERVER_ERROR: {
      icon: IconServerOff,
      message: (t) => t("widget.patchmon.error.internalServerError"),
    },
  },
}).withDynamicImport(() => import("./component"));
