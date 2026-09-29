import { IconBug, IconServerOff } from "@tabler/icons-react";
import { z } from "zod/v4";

import { getWidgetIntegrationConfig } from "@homarr/definitions";

import { createWidgetDefinition } from "../definition";
import { optionsBuilder } from "../options";

export const { definition, componentLoader } = createWidgetDefinition("wazuhVulnerabilities", {
  icon: IconBug,
  ...getWidgetIntegrationConfig("wazuhVulnerabilities"),
  createOptions() {
    return optionsBuilder.from((factory) => ({
      cveOrder: factory.select({
        defaultValue: "score",
        options: [
          { value: "score", label: "Highest score" },
          { value: "agents", label: "Most affected agents" },
        ],
      }),
      minSeverity: factory.select({
        defaultValue: "all",
        options: [
          { value: "all", label: "All severities" },
          { value: "medium", label: "Medium and above" },
          { value: "high", label: "High and above" },
          { value: "critical", label: "Critical only" },
        ],
      }),
      cveLimit: factory.number({ defaultValue: 8, step: 1, validate: z.number().int().min(1).max(50) }),
      agentLimit: factory.number({ defaultValue: 5, step: 1, validate: z.number().int().min(1).max(50) }),
      showAgents: factory.switch({ defaultValue: true }),
    }));
  },
  errors: {
    INTERNAL_SERVER_ERROR: {
      icon: IconServerOff,
      message: (t) => t("widget.wazuh.error.unknown.title", { target: "Wazuh" }),
    },
  },
}).withDynamicImport(() => import("./component"));
