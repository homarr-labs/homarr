import { IconServerOff, IconShieldBolt } from "@tabler/icons-react";
import { z } from "zod/v4";

import { getWidgetIntegrationConfig } from "@homarr/definitions";

import { createWidgetDefinition } from "../definition";
import { optionsBuilder } from "../options";

export const { definition, componentLoader } = createWidgetDefinition("wazuhAlerts", {
  icon: IconShieldBolt,
  ...getWidgetIntegrationConfig("wazuhAlerts"),
  createOptions() {
    return optionsBuilder.from((factory) => ({
      minLevel: factory.number({
        defaultValue: 7,
        step: 1,
        withDescription: true,
        validate: z.number().int().min(0).max(16),
      }),
      hours: factory.number({
        defaultValue: 24,
        step: 1,
        validate: z.number().int().min(1).max(720),
      }),
      limit: factory.number({
        defaultValue: 25,
        step: 1,
        validate: z.number().int().min(1).max(100),
      }),
      showMitre: factory.switch({ defaultValue: true }),
      showAgent: factory.switch({ defaultValue: true }),
      showSourceIp: factory.switch({ defaultValue: true }),
      showRuleId: factory.switch({ defaultValue: false }),
    }));
  },
  errors: {
    INTERNAL_SERVER_ERROR: {
      icon: IconServerOff,
      message: (t) => t("widget.wazuh.error.unknown.title", { target: "Wazuh" }),
    },
  },
}).withDynamicImport(() => import("./component"));
