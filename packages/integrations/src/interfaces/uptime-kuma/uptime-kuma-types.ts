import { z } from "zod";

// Basic description of a health check returned by Uptime Kuma.
export const uptimeKumaCheckSchema = z.object({
  id: z.number(),
  name: z.string(),
  url: z.string().optional().nullable(),
  status: z.union([z.string(), z.number()]),
  type: z.number().optional(),
  interval: z.number().optional(),
  // additional properties from the API may be present but are ignored
});

export type UptimeKumaCheck = z.infer<typeof uptimeKumaCheckSchema>;
