import { IconMessage } from "@tabler/icons-react";

import { getWidgetIntegrationConfig } from "@homarr/definitions";

import { createWidgetDefinition, widgetQueryInputMatches } from "../definition";
import { optionsBuilder } from "../options";
import { widgetQuery } from "../data";

export const { componentLoader, definition } = createWidgetDefinition("notifications", {
  supportsAdvancedFocus: true,
  icon: IconMessage,
  queryKey: [["widget", "notifications", "getNotifications"]],
  queryMatcher: ({ input }, scope) =>
    widgetQueryInputMatches(input, {
      hideLogos: scope.options.hideLogos,
      integrationIds: scope.integrationIds,
    }),
  createOptions() {
    return optionsBuilder.from((factory) => ({
      hideLogos: factory.switch({ defaultValue: false }),
      messageFormat: factory.select({
        defaultValue: "auto",
        options: (["auto", "plain", "markdown", "html"] as const).map((value) => ({
          value,
          label: (t) => t(`widget.notifications.option.messageFormat.option.${value}`),
        })),
      }),
    }));
  },
  ...getWidgetIntegrationConfig("notifications"),
})
  .withData({
    mode: "queries",
    queries: ({ integrationIds, options }) => ({
      main: widgetQuery("widget.notifications.getNotifications", { ...options, integrationIds }),
    }),
  })
  .withDynamicImport(() => import("./component"));
