import { IconChartAreaLine, IconServerOff } from "@tabler/icons-react";
import { z } from "zod/v4";

import { getWidgetIntegrationConfig } from "@homarr/definitions";

import { createWidgetDefinition } from "../definition";
import { optionsBuilder } from "../options";
import { wazuhTimeRangeOptions } from "../wazuh/_shared/options";

export const { definition, componentLoader } = createWidgetDefinition("wazuhTimeline", {
  icon: IconChartAreaLine,
  ...getWidgetIntegrationConfig("wazuhTimeline"),
  createOptions() {
    return optionsBuilder.from((factory) => ({
      range: factory.select({ defaultValue: "24h", options: [...wazuhTimeRangeOptions] }),
      interval: factory.select({
        defaultValue: "auto",
        options: [
          { value: "auto", label: "Automatic" },
          { value: "1m", label: "1 minute" },
          { value: "5m", label: "5 minutes" },
          { value: "15m", label: "15 minutes" },
          { value: "30m", label: "30 minutes" },
          { value: "1h", label: "1 hour" },
          { value: "3h", label: "3 hours" },
          { value: "6h", label: "6 hours" },
          { value: "12h", label: "12 hours" },
          { value: "1d", label: "1 day" },
        ],
      }),
      chartType: factory.select({
        defaultValue: "area",
        options: [
          { value: "area", label: "Stacked area" },
          { value: "bar", label: "Stacked bars" },
        ],
      }),
      yScale: factory.select({
        defaultValue: "linear",
        withDescription: true,
        options: [
          { value: "linear", label: "Linear" },
          { value: "sqrt", label: "Square root (makes rare severities visible)" },
        ],
      }),
      minLevel: factory.number({ defaultValue: 0, step: 1, validate: z.number().int().min(0).max(16) }),
      showLegend: factory.switch({ defaultValue: true }),
    }));
  },
  errors: {
    INTERNAL_SERVER_ERROR: {
      icon: IconServerOff,
      message: (t) => t("widget.wazuh.error.unknown.title", { target: "Wazuh" }),
    },
  },
}).withDynamicImport(() => import("./component"));
