import { z } from "zod/v4";

export const umamiWebsiteSchema = z.object({
  id: z.string(),
  name: z.string(),
  domain: z.string(),
});

export type UmamiWebsite = z.infer<typeof umamiWebsiteSchema>;

export const umamiAuthResponseSchema = z.object({
  token: z.string(),
});

export type UmamiAuthResponse = z.infer<typeof umamiAuthResponseSchema>;

export const umamiStatsSchema = z.object({
  pageviews: z.number(),
  visitors: z.number(),
  visits: z.number(),
  bounces: z.number(),
  totaltime: z.number(),
});

export type UmamiStats = z.infer<typeof umamiStatsSchema>;

export const umamiPageviewDataPointSchema = z.object({
  x: z.string(),
  y: z.number(),
});

export type UmamiPageviewDataPoint = z.infer<typeof umamiPageviewDataPointSchema>;

export const umamiPageviewsSchema = z.object({
  pageviews: z.array(umamiPageviewDataPointSchema),
  sessions: z.array(umamiPageviewDataPointSchema),
});

export type UmamiPageviews = z.infer<typeof umamiPageviewsSchema>;

export const umamiMetricItemSchema = z.object({
  // x can be null for direct traffic (no referrer) in the referrers endpoint
  x: z
    .string()
    .nullable()
    .transform((v) => v ?? ""),
  y: z.number(),
});

export type UmamiMetricItem = z.infer<typeof umamiMetricItemSchema>;

export const umamiEventRecordSchema = z.object({
  id: z.string(),
  eventName: z.string(),
  createdAt: z.string(),
});

export type UmamiEventRecord = z.infer<typeof umamiEventRecordSchema>;

export const umamiActiveVisitorsSchema = z.object({
  x: z.number(),
});

export type UmamiActiveVisitors = z.infer<typeof umamiActiveVisitorsSchema>;

// Internal aggregated type returned by the integration — not a direct API response
export interface UmamiEventSeries {
  eventName: string;
  dataPoints: UmamiPageviewDataPoint[];
}

export interface UmamiVisitorStats {
  domain: string;
  websiteId: string;
  websiteName: string;
  totalVisitors: number;
  totalPageviews: number;
  totalVisits: number;
  bounceRate: number;
  avgDuration: number;
  dataPoints: { timestamp: string; visitors: number; events?: number }[];
  timeFrame: string;
  eventCount?: number;
}
