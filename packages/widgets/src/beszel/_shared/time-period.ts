export const beszelTimePeriods = ["1m", "1h", "12h", "24h", "1w", "30d"] as const;
export type BeszelTimePeriod = (typeof beszelTimePeriods)[number];

export const beszelTimePeriodConfig: Record<
  BeszelTimePeriod,
  {
    beszelStatType: string;
    perPage: number;
    refetchMs: number;
    serverCacheSeconds: number;
  }
> = {
  "1m": { beszelStatType: "1m", perPage: 60, refetchMs: 0, serverCacheSeconds: 5 },
  "1h": { beszelStatType: "1m", perPage: 60, refetchMs: 60_000, serverCacheSeconds: 60 },
  "12h": { beszelStatType: "10m", perPage: 72, refetchMs: 300_000, serverCacheSeconds: 300 },
  "24h": { beszelStatType: "20m", perPage: 72, refetchMs: 600_000, serverCacheSeconds: 600 },
  "1w": { beszelStatType: "120m", perPage: 84, refetchMs: 1_800_000, serverCacheSeconds: 1800 },
  "30d": { beszelStatType: "480m", perPage: 90, refetchMs: 3_600_000, serverCacheSeconds: 3600 },
};
