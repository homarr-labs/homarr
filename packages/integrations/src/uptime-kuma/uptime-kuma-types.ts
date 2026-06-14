import { z } from "zod";

export const uptimeKumaHeartbeatStatus = {
  down: 0,
  up: 1,
  pending: 2,
  maintenance: 3,
} as const;

export type UptimeKumaMonitorCategory = "up" | "down" | "paused";

export const uptimeKumaHeartbeatCategoryMap: Record<number, UptimeKumaMonitorCategory> = {
  [uptimeKumaHeartbeatStatus.down]: "down",
  [uptimeKumaHeartbeatStatus.up]: "up",
  [uptimeKumaHeartbeatStatus.pending]: "paused",
  [uptimeKumaHeartbeatStatus.maintenance]: "paused",
};

export const uptimeKumaStatusPageMonitorSchema = z.object({
  id: z.number().int(),
  name: z.string(),
});

export const uptimeKumaStatusPageGroupSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  monitorList: z.array(uptimeKumaStatusPageMonitorSchema),
});

export const uptimeKumaStatusPageResponseSchema = z.object({
  publicGroupList: z.array(uptimeKumaStatusPageGroupSchema),
});

export const uptimeKumaHeartbeatEntrySchema = z.object({
  status: z.number().int(),
  time: z.string(),
  ping: z.number().nullable().optional(),
});

export const uptimeKumaHeartbeatResponseSchema = z.object({
  heartbeatList: z.record(z.string(), z.array(uptimeKumaHeartbeatEntrySchema)),
  uptimeList: z.record(z.string(), z.number()),
});

export interface UptimeKumaMonitor {
  id: number;
  name: string;
  status: UptimeKumaMonitorCategory;
  uptimePercent24h: number | null;
}

export interface UptimeKumaDashboardData {
  totalMonitors: number;
  upCount: number;
  downCount: number;
  pausedCount: number;
  averageUptimePercent: number;
  monitors: UptimeKumaMonitor[];
}

export type UptimeKumaStatusPageResponse = z.infer<typeof uptimeKumaStatusPageResponseSchema>;
export type UptimeKumaHeartbeatResponse = z.infer<typeof uptimeKumaHeartbeatResponseSchema>;
