import { z } from "zod/v4";

export const statsEntrySchema = z.object({
  id: z.string().min(1).max(128),
  integrationId: z.string().min(1).max(128),
  metric: z.string().min(1).max(128),
  label: z.string().max(128).default(""),
  hidden: z.boolean().default(false),
  compact: z.boolean().default(false),
});
export const statsEntriesSchema = z
  .array(statsEntrySchema)
  .max(100)
  .refine((entries) => new Set(entries.map((entry) => entry.id)).size === entries.length, {
    message: "Metric entry identifiers must be unique",
  });
export type StatsEntry = z.infer<typeof statsEntrySchema>;
