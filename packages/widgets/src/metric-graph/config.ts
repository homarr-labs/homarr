import { z } from "zod/v4";

export const MAX_METRIC_GRAPH_ENTRIES = 4;

export const metricGraphColors = ["blue", "red", "yellow", "green", "violet", "orange", "cyan", "pink"] as const;

const baseEntrySchema = z.object({
  id: z.string().min(1).max(128),
  integrationId: z.string().min(1).max(128),
  label: z.string().max(128).default(""),
  color: z.enum(metricGraphColors).default("blue"),
});

export const metricGraphEntrySchema = z.discriminatedUnion("source", [
  baseEntrySchema.extend({ source: z.literal("stats"), metric: z.string().min(1).max(128) }),
  baseEntrySchema.extend({ source: z.literal("smartHome"), entityId: z.string().min(1).max(255) }),
]);

export const metricGraphEntriesSchema = z
  .array(metricGraphEntrySchema)
  .max(MAX_METRIC_GRAPH_ENTRIES)
  .refine((entries) => new Set(entries.map((entry) => entry.id)).size === entries.length, {
    message: "Metric entry identifiers must be unique",
  });

export type MetricGraphEntry = z.infer<typeof metricGraphEntrySchema>;

export const metricGraphTimeRanges = { "15m": 15, "1h": 60, "6h": 360, "24h": 1440 } as const;
export type MetricGraphTimeRange = keyof typeof metricGraphTimeRanges;

export const getEntrySeriesKey = (entry: MetricGraphEntry) =>
  entry.source === "stats" ? entry.metric : entry.entityId;
