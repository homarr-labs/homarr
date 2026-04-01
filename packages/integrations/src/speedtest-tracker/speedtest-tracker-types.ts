import { z } from "zod/v4";

const createEnvelopeSchema = <T extends z.ZodType>(dataSchema: T) =>
  z.object({ data: z.unknown() }).transform((envelope) => dataSchema.parse(envelope.data) as z.infer<T>);

const parseTimestamp = (timestamp: string): Date => new Date(`${timestamp.replace(" ", "T")}Z`);

export const speedtestTrackerResultSchema = z.object({
  id: z.number().int(),
  ping: z.number().nullable(),
  download_bits: z.number().int().nullish(),
  upload_bits: z.number().int().nullish(),
  healthy: z.boolean().nullable(),
  created_at: z.string().transform(parseTimestamp),
});

export type SpeedtestTrackerResult = z.infer<typeof speedtestTrackerResultSchema>;

export const speedtestTrackerLatestResultEnvelopeSchema = createEnvelopeSchema(speedtestTrackerResultSchema);

export const speedtestTrackerStatsBandwidthSchema = z.object({
  avg: z.number(),
  avg_bits: z.number().optional(),
  min: z.number(),
  max: z.number(),
});

export const speedtestTrackerStatsSchema = z.object({
  ping: z.object({
    avg: z.number(),
    min: z.number(),
    max: z.number(),
  }),
  download: speedtestTrackerStatsBandwidthSchema,
  upload: speedtestTrackerStatsBandwidthSchema,
  total_results: z.number().int(),
});

export type SpeedtestTrackerStats = z.infer<typeof speedtestTrackerStatsSchema>;

export const speedtestTrackerStatsEnvelopeSchema = createEnvelopeSchema(speedtestTrackerStatsSchema);

export const speedtestTrackerResultsCollectionSchema = z.object({
  data: z.array(speedtestTrackerResultSchema),
  meta: z.object({
    current_page: z.number().int(),
    last_page: z.number().int(),
    total: z.number().int(),
    per_page: z.number().int().optional(),
  }),
});

export type SpeedtestTrackerResultsCollection = z.infer<typeof speedtestTrackerResultsCollectionSchema>;

export interface SpeedtestTrackerDashboardData {
  latestResult: SpeedtestTrackerResult | null;
  stats: SpeedtestTrackerStats | null;
  recentResults: SpeedtestTrackerResult[];
}
