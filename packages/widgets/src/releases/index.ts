import { IconRocket } from "@tabler/icons-react";
import { z } from "zod/v4";

import { createId } from "@homarr/common";
import { releaseProviderKinds } from "@homarr/definitions";

import { createWidgetDefinition } from "../definition";
import { optionsBuilder } from "../options";

const relativeDateSchema = z
  .string()
  .regex(/^\d+[hdwmyHDWMY]$/)
  .or(z.literal(""));

export const { definition, componentLoader } = createWidgetDefinition("releases", {
  icon: IconRocket,
  createOptions() {
    return optionsBuilder.from((factory) => ({
      newReleaseWithin: factory.text({
        defaultValue: "1w",
        withDescription: true,
        validate: relativeDateSchema,
      }),
      staleReleaseWithin: factory.text({
        defaultValue: "6M",
        withDescription: true,
        validate: relativeDateSchema,
      }),
      showOnlyHighlighted: factory.switch({
        withDescription: true,
        defaultValue: true,
      }),
      showDetails: factory.switch({
        defaultValue: true,
      }),
      showOnlyIcon: factory.switch({
        defaultValue: false,
      }),
      topReleases: factory.number({
        withDescription: true,
        defaultValue: 0,
        validate: z.number().min(0),
      }),
      repositories: factory.multiReleasesRepositories({
        defaultValue: [
          {
            id: createId(),
            provider: "github" as const,
            identifier: "homarr-labs/homarr",
            name: "Homarr",
            iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/homarr.png",
            versionFilter: { prefix: "v", precision: 3 },
          },
        ],
        validate: z.array(
          z.object({
            id: z.string().default(() => createId()),
            provider: z.enum(releaseProviderKinds).optional(),
            identifier: z.string().min(1),
            name: z.string().optional(),
            versionFilter: z
              .object({
                prefix: z.string().optional(),
                precision: z.number(),
                suffix: z.string().optional(),
              })
              .optional(),
            iconUrl: z.string().optional(),
            providerUrl: z.string().url().optional(),
          }),
        ),
      }),
    }));
  },
}).withDynamicImport(() => import("./component"));
