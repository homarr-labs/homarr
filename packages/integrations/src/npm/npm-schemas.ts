import { z } from "zod/v4";

export const releasesResponseSchema = z.object({
  time: z.record(z.string().transform((value) => new Date(value))).transform((version) =>
    Object.entries(version).map(([key, value]) => ({
      latestRelease: key,
      latestReleaseAt: value,
    })),
  ),
  versions: z.record(z.object({ description: z.string() })),
  name: z.string(),
});
