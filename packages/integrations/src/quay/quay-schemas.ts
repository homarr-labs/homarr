import { z } from "zod";

export const releasesResponseSchema = z.object({
  description: z.string().optional(),
  tags: z.record(
    z.object({
      name: z.string(),
      last_modified: z.string(),
    }),
  ),
});
