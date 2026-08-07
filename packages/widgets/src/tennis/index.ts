import { IconBallTennis, IconKeyOff } from "@tabler/icons-react";
import { z } from "zod/v4";

import { createWidgetDefinition } from "../definition";
import { optionsBuilder } from "../options";

export const tennisTours = ["all", "atp", "wta", "challenger", "itf", "juniors"] as const;
export const tennisStatuses = ["live", "upcoming", "completed"] as const;

export const { definition, componentLoader } = createWidgetDefinition("tennis", {
  icon: IconBallTennis,
  refetchInterval: 60,
  createOptions() {
    return optionsBuilder.from((factory) => ({
      tour: factory.select({
        defaultValue: "all",
        options: tennisTours.map((value) => ({
          value,
          label: (t) => t(`widget.tennis.option.tour.option.${value}.label`),
        })),
      }),
      status: factory.select({
        defaultValue: "live",
        options: tennisStatuses.map((value) => ({
          value,
          label: (t) => t(`widget.tennis.option.status.option.${value}.label`),
        })),
      }),
      matchCount: factory.slider({
        defaultValue: 5,
        validate: z.number().int().min(1).max(20),
        step: 1,
        withDescription: true,
      }),
      showTournament: factory.switch({
        defaultValue: true,
      }),
      showRanking: factory.switch({
        defaultValue: false,
      }),
    }));
  },
  errors: {
    UNAUTHORIZED: {
      icon: IconKeyOff,
      message: (t) => t("widget.tennis.error.unauthorized"),
      hideLogsLink: true,
    },
  },
}).withDynamicImport(() => import("./component"));
