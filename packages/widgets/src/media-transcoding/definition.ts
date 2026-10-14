import { IconTransform } from "@tabler/icons-react";
import { z } from "zod/v4";

import { capitalize } from "@homarr/common";
import { getWidgetIntegrationConfig } from "@homarr/definitions";

import type { WidgetDefinition } from "../definition";
import { matchesWidgetRuntimeQuery } from "../definition";
import { optionsBuilder } from "../options";
import { views } from "./views";

export const definition = {
  kind: "mediaTranscoding",
  icon: IconTransform,
  supportsAdvancedFocus: true,
  queryKey: [["widget", "mediaTranscoding", "getDataAsync"]],
  queryMatcher: matchesWidgetRuntimeQuery,
  ...getWidgetIntegrationConfig("mediaTranscoding"),
  refetchInterval: null,
  createOptions() {
    return optionsBuilder.from((factory) => ({
      defaultView: factory.select({
        defaultValue: "statistics",
        options: views.map((view) => ({ label: capitalize(view), value: view })),
      }),
      queuePageSize: factory.number({ defaultValue: 10, validate: z.number().min(1).max(30) }),
    }));
  },
} satisfies WidgetDefinition & { kind: "mediaTranscoding" };
