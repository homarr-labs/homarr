import { z } from "zod/v4";

export const loginResponseSchema = z.object({
  status: z.literal("ok"),
  token: z.string(),
  // info.version is returned when includeInfo=true is passed; used to determine the API path set.
  info: z.object({ version: z.string() }).optional(),
});

export const statsGetResponseSchema = z.object({
  status: z.literal("ok"),
  response: z.object({
    stats: z.object({
      totalQueries: z.number(),
      totalBlocked: z.number(),
      blockedZones: z.number(),
      blockListZones: z.number(),
    }),
  }),
});

export const settingsGetResponseSchema = z.object({
  status: z.literal("ok"),
  response: z.object({
    enableBlocking: z.boolean(),
    temporaryDisableBlockingTill: z.string().nullable().optional(),
  }),
});
