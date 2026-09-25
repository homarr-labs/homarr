import { IconRobot, IconServerOff } from "@tabler/icons-react";

import { createWidgetDefinition } from "../definition";
import { optionsBuilder } from "../options";
import { HERMES_FONT_OPTIONS, HERMES_THEME_PRESET_OPTIONS } from "./theme-data";

export const { definition, componentLoader } = createWidgetDefinition("hermesAgent", {
  icon: IconRobot,
  refetchInterval: 30,
  createOptions() {
    return optionsBuilder.from(
      (factory) => ({
        brandTheme: factory.switch({ defaultValue: true, withDescription: true }),
        themePreset: factory.select({
          defaultValue: "default",
          options: [...HERMES_THEME_PRESET_OPTIONS],
          searchable: true,
          withDescription: true,
        }),
        fontFamily: factory.select({
          defaultValue: "theme",
          options: HERMES_FONT_OPTIONS,
          searchable: true,
          withDescription: true,
        }),
        showPlatforms: factory.switch({ defaultValue: true, withDescription: true }),
        showSessions: factory.switch({ defaultValue: true, withDescription: true }),
        showJobs: factory.switch({ defaultValue: true, withDescription: true }),
        showSkills: factory.switch({ defaultValue: true, withDescription: true }),
      }),
      {
        themePreset: { shouldHide: (options) => !options.brandTheme },
      },
    );
  },
  supportedIntegrations: ["hermesAgent"],
  errors: {
    INTERNAL_SERVER_ERROR: {
      icon: IconServerOff,
      message: (t) => t("widget.hermesAgent.error.internalServerError"),
    },
  },
}).withDynamicImport(() => import("./component"));
