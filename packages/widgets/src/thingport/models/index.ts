import { IconClockPlus, IconCube3dSphere, IconEye, IconPrinter } from "@tabler/icons-react";
import { z } from "zod/v4";

import { getWidgetIntegrationConfig } from "@homarr/definitions";

import { createWidgetDefinition, matchesWidgetRuntimeQuery } from "../../definition";
import { optionsBuilder } from "../../options";

export const { definition, componentLoader } = createWidgetDefinition("thingport-models", {
  icon: IconCube3dSphere,
  supportsAdvancedFocus: false,
  queryKey: [["widget", "thingport", "getModels"]],
  queryMatcher: matchesWidgetRuntimeQuery,
  refetchInterval: null,
  ...getWidgetIntegrationConfig("thingport-models"),
  createOptions() {
    return optionsBuilder.from((factory) => ({
      showTitle: factory.switch({ defaultValue: false }),
      defaultTab: factory.select({
        options: [
          {
            label: (t) => t("widget.thingport-models.tab.recentlyAdded"),
            value: "recentlyAdded",
            icon: IconClockPlus,
          },
          {
            label: (t) => t("widget.thingport-models.tab.topViewed"),
            value: "topViewed",
            icon: IconEye,
          },
          {
            label: (t) => t("widget.thingport-models.tab.topPrinted"),
            value: "topPrinted",
            icon: IconPrinter,
          },
        ] as const,
        defaultValue: "recentlyAdded",
      }),
      itemCount: factory.number({
        defaultValue: 10,
        validate: z.number().int().min(1).max(50),
      }),
      showThumbnails: factory.switch({ defaultValue: true }),
      openInNewTab: factory.switch({ defaultValue: true }),
    }));
  },
}).withDynamicImport(() => import("./component"));
