import { z } from "zod/v4";

export const pushoverLimitsResponseSchema = z.object({
  status: z.number(),
  request: z.string(),
  limit: z.number().optional(),
  remaining: z.number().optional(),
  reset: z.number().optional(),
});
