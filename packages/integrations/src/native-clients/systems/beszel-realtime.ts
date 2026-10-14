import { z } from "zod";

import type { BeszelSystem, LiveStatsEvent } from "../../beszel/beszel-types";
import type { PocketBaseSseFrame } from "../../beszel/pocketbase-realtime";
import { beszelStatsSchema, beszelContainerStatsSchema } from "./beszel-schemas";

export { PocketBaseSseParser, createRealtimeMetricsTopic } from "../../beszel/pocketbase-realtime";

const snapshotSchema = z.object({
  stats: beszelStatsSchema.optional(),
  container: z.array(beszelContainerStatsSchema).optional(),
});
const retryDelaysMs = [200, 300, 500, 1_000, 1_500, 2_000] as const;

export function assertBeszelRealtimeSystem(system: BeszelSystem | undefined) {
  if (!system) throw new Error("Selected Beszel system was not found");
  if (system.status !== "up") throw new Error(`Beszel system is ${system.status}; Live mode requires an online system`);
  const [major = 0, minor = 0] = system.info.v.replace(/^v/, "").split(".").map(Number);
  if (!(major > 0 || minor >= 13))
    throw new Error(`Beszel agent ${system.info.v} does not support Live mode; version 0.13.0 or newer is required`);
}

export function normalizeBeszelRealtimeSnapshot(
  payload: unknown,
  systemId: string,
  receivedAt = new Date(),
): LiveStatsEvent[] {
  const snapshot = snapshotSchema.parse(payload);
  const created = receivedAt.toISOString();
  const id = `realtime-${receivedAt.getTime()}`;
  const events: LiveStatsEvent[] = [];
  if (snapshot.stats)
    events.push({
      type: "system_stats",
      record: { id, system: systemId, stats: snapshot.stats, type: "1m", created, updated: created },
    });
  if (snapshot.container)
    events.push({
      type: "container_stats",
      record: { id, system: systemId, stats: snapshot.container, type: "1m", created, updated: created },
    });
  return events;
}

export type BeszelRealtimeFrame =
  | { kind: "connect"; clientId: string }
  | { kind: "snapshot"; events: LiveStatsEvent[] }
  | { kind: "ignore" };

export function parseBeszelRealtimeFrame(
  frame: PocketBaseSseFrame,
  systemId: string,
  receivedAt = new Date(),
): BeszelRealtimeFrame {
  if (frame.event === "PB_CONNECT") {
    let fallback: string | undefined;
    try {
      fallback = z.object({ clientId: z.string().optional() }).parse(JSON.parse(frame.data)).clientId;
    } catch {
      fallback = undefined;
    }
    const clientId = frame.id || fallback;
    if (!clientId) throw new Error("PocketBase PB_CONNECT event did not include a client ID");
    return { kind: "connect", clientId };
  }
  if (!frame.event.startsWith("rt_metrics")) return { kind: "ignore" };
  const payload: unknown = JSON.parse(frame.data);
  return { kind: "snapshot", events: normalizeBeszelRealtimeSnapshot(payload, systemId, receivedAt) };
}

export function beszelRealtimeRetry(
  status: number | undefined,
  attempt: number,
):
  | { kind: "stop" }
  | { kind: "reauthenticate"; nextAttempt: number }
  | { kind: "backoff"; delayMs: number; nextAttempt: number } {
  if (status === 401 && attempt === 0) return { kind: "reauthenticate", nextAttempt: attempt + 1 };
  if (status !== undefined && status < 500 && status !== 429) return { kind: "stop" };
  return {
    kind: "backoff",
    delayMs: retryDelaysMs[Math.min(attempt, retryDelaysMs.length - 1)] ?? 2_000,
    nextAttempt: attempt + 1,
  };
}
