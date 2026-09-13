import { z } from "zod/v4";

export const widgetCollectorSchema = z.object({
  id: z.string(),
  itemId: z.string(),
  installationId: z.string(),
  userId: z.string(),
  name: z.string().min(1).max(128),
  handler: z.string().min(1),
  input: z.unknown().default({}),
  valuePath: z.string().max(256).default(""),
  unit: z.string().max(64).default(""),
  intervalSeconds: z.number().int().min(15).max(86_400).default(60),
  retentionDays: z.number().int().min(1).max(365).default(7),
  maximumPoints: z.number().int().min(10).max(10_000).default(2000),
  enabled: z.boolean().default(false),
});
export type WidgetCollector = z.infer<typeof widgetCollectorSchema>;
export interface WidgetHistorySample {
  timestamp: number;
  value: unknown;
}
export interface WidgetHistory {
  samples: WidgetHistorySample[];
  sourceDigest: string;
  unit: string;
  lastAttempt: number;
  lastError?: string;
}

export function selectCollectedValue(value: unknown, path: string): unknown {
  if (!path) return value;
  for (const key of path.split(".")) {
    if (value === null || typeof value !== "object" || !Object.hasOwn(value, key)) return null;
    value = (value as Record<string, unknown>)[key];
  }
  return value;
}
