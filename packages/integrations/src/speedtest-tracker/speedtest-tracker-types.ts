import { z } from "zod/v4";

// ─── Nested data payload ──────────────────────────────────────────────────────

export const speedtestTrackerPingDetailsSchema = z.object({
  low: z.number(),
  high: z.number(),
  jitter: z.number(),
  latency: z.number(),
});

export const speedtestTrackerBandwidthLatencySchema = z.object({
  iqm: z.number(),
  low: z.number(),
  high: z.number(),
  jitter: z.number(),
});

export const speedtestTrackerBandwidthSchema = z.object({
  bytes: z.number().int(),
  elapsed: z.number().int(),
  bandwidth: z.number().int(),
  latency: speedtestTrackerBandwidthLatencySchema,
});

export const speedtestTrackerServerInfoSchema = z.object({
  id: z.number().int(),
  ip: z.string(),
  host: z.string(),
  name: z.string(),
  port: z.number().int(),
  country: z.string(),
  location: z.string(),
});

export const speedtestTrackerInterfaceInfoSchema = z.object({
  name: z.string(),
  isVpn: z.boolean(),
  macAddr: z.string(),
  externalIp: z.string(),
  internalIp: z.string(),
});

export const speedtestTrackerResultPayloadSchema = z.object({
  isp: z.string().optional(),
  type: z.string().optional(),
  ping: speedtestTrackerPingDetailsSchema.optional(),
  download: speedtestTrackerBandwidthSchema.optional(),
  upload: speedtestTrackerBandwidthSchema.optional(),
  server: speedtestTrackerServerInfoSchema.optional(),
  interface: speedtestTrackerInterfaceInfoSchema.optional(),
  timestamp: z.string().optional(),
  packetLoss: z.number().optional(),
  result: z
    .object({
      id: z.string(),
      url: z.string().optional(), // absent when persisted=false
      persisted: z.boolean(),
    })
    .optional(),
});

// ─── Top-level Result ─────────────────────────────────────────────────────────

export const speedtestTrackerResultSchema = z.object({
  id: z.number().int(),
  service: z.string(),
  ping: z.number().nullable(),
  download: z.number().int().nullable(),
  upload: z.number().int().nullable(),
  // These are conditionally omitted (not null) when download/upload is falsy
  download_bits: z.number().int().nullish(),
  upload_bits: z.number().int().nullish(),
  download_bits_human: z.string().nullish(),
  upload_bits_human: z.string().nullish(),
  healthy: z.boolean().nullable(),
  status: z.string(),
  scheduled: z.boolean(),
  comments: z.string().nullable(),
  data: speedtestTrackerResultPayloadSchema.nullable(),
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
