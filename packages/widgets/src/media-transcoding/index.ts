import { IconTransform } from "@tabler/icons-react";
import { z } from "zod/v4";

import { capitalize } from "@homarr/common";

import { createWidgetDefinition, matchesWidgetRuntimeQuery } from "../definition";
import { optionsBuilder } from "../options";

export const views = ["workers", "queue", "statistics"] as const;

export const { componentLoader, definition } = createWidgetDefinition("mediaTranscoding", {
  icon: IconTransform,
  supportsAdvancedFocus: true,
  queryMatcher: matchesWidgetRuntimeQuery,
  createOptions() {
    return optionsBuilder.from((factory) => ({
      defaultView: factory.select({
        defaultValue: "statistics",
        options: views.map((view) => ({ label: capitalize(view), value: view })),
      }),
      queuePageSize: factory.number({ defaultValue: 10, validate: z.number().min(1).max(30) }),
    }));
  },
}).withDynamicImport(() => import("./component"));
