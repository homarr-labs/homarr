import { IconRocket } from "@tabler/icons-react";
import { z } from "zod";

import { createWidgetDefinition } from "../definition";
import { optionsBuilder } from "../options";

export const { definition, componentLoader } = createWidgetDefinition("releases", {
  icon: IconRocket,
  createOptions() {
    return optionsBuilder.from((factory) => ({
      newReleaseWithin: factory.text({
        defaultValue: "1w",
        withDescription: true,
        validate: z
          .string()
          .regex(/^\d+[hdwmy]$/)
          .or(z.literal("")),
      }),
      staleReleaseWithin: factory.text({
        defaultValue: "6m",
        withDescription: true,
        validate: z
          .string()
          .regex(/^\d+[hdwmy]$/)
          .or(z.literal("")),
      }),
      showOnlyHighlighted: factory.switch({
        withDescription: true,
        defaultValue: true,
      }),
      showDetails: factory.switch({
        defaultValue: true,
      }),
      repositories: factory.multiReleaseRepositories({
        defaultValue: [],
        validate: z.array(
          z.object({
            provider: z.object({
              name: z.string().min(1),
              iconUrl: z.string().url().or(z.literal("")),
            }),
            identifier: z.string().min(1),
            versionFilter: z
              .object({
                prefix: z.string().optional(),
                precision: z.number(),
                suffix: z.string().optional(),
                regex: z.string().optional(),
              })
              .optional(),
            iconUrl: z.string().url().optional(),
          }),
        ),
      }),
    }));
  },
}).withDynamicImport(() => import("./component"));
