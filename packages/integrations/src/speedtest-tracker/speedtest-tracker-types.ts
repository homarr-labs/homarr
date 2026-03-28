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
      url: z.string(),
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
  download_bits: z.number().int().nullable(),
  upload_bits: z.number().int().nullable(),
  download_bits_human: z.string().nullable(),
  upload_bits_human: z.string().nullable(),
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

export const speedtestTrackerStatsSchema = z.object({
  total_results: z.number().int(),
  avg_ping: z.number(),
  avg_download: z.number(),
  avg_upload: z.number(),
  min_ping: z.number(),
  min_download: z.number(),
  min_upload: z.number(),
  max_ping: z.number(),
  max_download: z.number(),
  max_upload: z.number(),
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
