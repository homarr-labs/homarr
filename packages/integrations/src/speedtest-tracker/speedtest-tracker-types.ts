import { z } from "zod/v4";

// ─── API envelope ─────────────────────────────────────────────────────────────
// Most Speedtest Tracker endpoints wrap their payload in `{ data: <payload> }`.

export const speedtestTrackerEnvelopeSchema = z.object({ data: z.unknown() });

// ─── Top-level Result ─────────────────────────────────────────────────────────
// The nested `data` payload varies by result status (completed vs failed/log),
// and the widget never reads it — so we accept any object here.

export const speedtestTrackerResultSchema = z.object({
  id: z.number().int(),
  service: z.string(),
  ping: z.number().nullable(),
  download: z.number().int().nullable(),
  upload: z.number().int().nullable(),
  // Conditionally omitted (not null) when download/upload is falsy
  download_bits: z.number().int().nullish(),
  upload_bits: z.number().int().nullish(),
  download_bits_human: z.string().nullish(),
  upload_bits_human: z.string().nullish(),
  healthy: z.boolean().nullable(),
  status: z.string(),
  scheduled: z.boolean(),
  comments: z.string().nullable(),
  // Opaque payload — shape differs between completed/failed/log results
  data: z.record(z.string(), z.unknown()).nullable().optional(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type SpeedtestTrackerResult = z.infer<typeof speedtestTrackerResultSchema>;

// Aliases used by the integration class for the /api/v1/results/latest endpoint
export const speedtestTrackerLatestResultSchema = speedtestTrackerResultSchema;
export type SpeedtestTrackerLatestResult = SpeedtestTrackerResult;

// ─── Stats ────────────────────────────────────────────────────────────────────
// StatResource returns nested: { ping: {avg,min,max}, download: {...}, upload: {...}, total_results }

export const speedtestTrackerStatsBandwidthSchema = z.object({
  avg: z.number(),
  avg_bits: z.number().optional(),
  avg_bits_human: z.string().optional(),
  min: z.number(),
  min_bits: z.number().optional(),
  min_bits_human: z.string().optional(),
  max: z.number(),
  max_bits: z.number().optional(),
  max_bits_human: z.string().optional(),
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

// ─── Results collection (paginated) ──────────────────────────────────────────

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

// ─── Combined dashboard data ──────────────────────────────────────────────────

export interface SpeedtestTrackerDashboardData {
  latestResult: SpeedtestTrackerResult | null;
  stats: SpeedtestTrackerStats | null;
  recentResults: SpeedtestTrackerResult[];
}
