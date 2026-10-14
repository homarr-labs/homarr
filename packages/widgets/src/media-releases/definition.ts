import { IconTicket } from "@tabler/icons-react";

import { getWidgetIntegrationConfig } from "@homarr/definitions";

import type { WidgetDefinition } from "../definition";
import { optionsBuilder } from "../options";

export const definition = {
  kind: "mediaReleases",
  icon: IconTicket,
  supportsAdvancedFocus: true,
  queryKey: [["widget", "mediaRelease"]],
  refetchInterval: null,
  createOptions() {
    return optionsBuilder.from((factory) => ({
      layout: factory.select({
        defaultValue: "backdrop",
        options: [
          {
            value: "backdrop",
            label: (t) => t("widget.mediaReleases.option.layout.option.backdrop.label"),
          },
          {
            value: "poster",
            label: (t) => t("widget.mediaReleases.option.layout.option.poster.label"),
          },
        ],
      }),
      showDescriptionTooltip: factory.switch({
        defaultValue: true,
      }),
      showType: factory.switch({
        defaultValue: true,
      }),
      showSource: factory.switch({
        defaultValue: true,
      }),
    }));
  },
  ...getWidgetIntegrationConfig("mediaReleases"),
} satisfies WidgetDefinition & { kind: "mediaReleases" };
