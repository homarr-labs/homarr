import { IconBrandDocker } from "@tabler/icons-react";

import { getWidgetIntegrationConfig } from "@homarr/definitions";

import type { WidgetDefinition } from "../definition";
import { optionsBuilder } from "../options";

export const definition = {
  kind: "wud",
  icon: IconBrandDocker,
  supportsAdvancedFocus: true,
  refetchInterval: null,
  ...getWidgetIntegrationConfig("wud"),
  createOptions() {
    return optionsBuilder.from((factory) => ({
      showTitle: factory.switch({ defaultValue: true }),
      showRing: factory.switch({ defaultValue: true }),
      layout: factory.select({
        options: (["horizontal", "vertical"] as const).map((value) => ({
          value,
          label: (t) => t(`widget.common.layout.option.${value}`),
        })),
        defaultValue: "horizontal",
      }),
      showUpdateList: factory.switch({ defaultValue: false, withDescription: true }),
    }));
  },
} satisfies WidgetDefinition & { kind: "wud" };
