import { z } from "zod";

export const summaryResponseSchema = z.object({
  status: z.enum(["enabled", "disabled"]),
  domains_being_blocked: z.number(),
  ads_blocked_today: z.number(),
  dns_queries_today: z.number(),
  ads_percentage_today: z.number(),
});

export const controlsInputSchema = z.object({
  duration: z.number().optional(),
});
