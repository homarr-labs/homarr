import { z } from "zod/v4";

import { optionsBuilder } from "../options";

const relativeDateSchema = z
  .string()
  .regex(/^\d+[hdwmyHDWMY]$/)
  .or(z.literal(""));

export const serverDefinition = {
  createOptions() {
    return optionsBuilder.from((factory) => ({
      newReleaseWithin: factory.text({ defaultValue: "1w", withDescription: true, validate: relativeDateSchema }),
      staleReleaseWithin: factory.text({ defaultValue: "6M", withDescription: true, validate: relativeDateSchema }),
      showOnlyHighlighted: factory.switch({ withDescription: true, defaultValue: true }),
      showDetails: factory.switch({ defaultValue: true }),
      showOnlyIcon: factory.switch({ defaultValue: false }),
      topReleases: factory.number({ withDescription: true, defaultValue: 0, validate: z.number().min(0) }),
      repositories: factory.multiReleasesRepositories({
        defaultValue: [],
        validate: z.array(
          z.object({
            providerIntegrationId: z.string().optional(),
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
          }),
        ),
      }),
    }));
  },
};
