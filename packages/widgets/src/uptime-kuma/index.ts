import { IconHeartbeat, IconServerOff } from "@tabler/icons-react";

import { getWidgetIntegrationConfig } from "@homarr/definitions";
import { uptimeKumaStatusPageSlugSchema } from "@homarr/validation/uptime-kuma";

import { createWidgetDefinition } from "../definition";
import { widgetQuery } from "../data";
import { optionsBuilder } from "../options";

export const { definition, componentLoader } = createWidgetDefinition("uptimeKuma", {
  icon: IconHeartbeat,
  supportsAdvancedFocus: true,
  createOptions() {
    return optionsBuilder.from((factory) => ({
      statusPageSlug: factory.text({
        defaultValue: "",
        validate: uptimeKumaStatusPageSlugSchema,
        withDescription: true,
      }),
      summaryOnly: factory.switch({ defaultValue: false, withDescription: true }),
      showSummary: factory.switch({ defaultValue: true, withDescription: true }),
      showIncidents: factory.switch({ defaultValue: true, withDescription: true }),
      groupByStatusPageGroup: factory.switch({ defaultValue: false, withDescription: true }),
      showOnlyProblems: factory.switch({ defaultValue: false, withDescription: true }),
      sortBy: factory.select({
        defaultValue: "status",
        options: [
          { value: "status", label: (t) => t("widget.uptimeKuma.option.sortBy.option.status") },
          { value: "statusPage", label: (t) => t("widget.uptimeKuma.option.sortBy.option.statusPage") },
          { value: "name", label: (t) => t("widget.uptimeKuma.option.sortBy.option.name") },
          { value: "uptime", label: (t) => t("widget.uptimeKuma.option.sortBy.option.uptime") },
        ],
      }),
      showHeartbeatBar: factory.switch({ defaultValue: true, withDescription: true }),
      showUptime: factory.switch({ defaultValue: true }),
      showResponseTime: factory.switch({ defaultValue: true }),
      showCertificateExpiry: factory.switch({ defaultValue: true, withDescription: true }),
    }));
  },
  ...getWidgetIntegrationConfig("uptimeKuma"),
  errors: {
    INTERNAL_SERVER_ERROR: {
      icon: IconServerOff,
      message: (t) => t("widget.uptimeKuma.error.internalServerError"),
    },
  },
})
  .withData({
    mode: "queries",
    queries: ({ options, integrationIds }) => ({
      main: widgetQuery("widget.uptimeKuma.getStatusPages", { integrationIds, statusPageSlug: options.statusPageSlug }),
    }),
  })
  .withDynamicImport(() => import("./component"));
