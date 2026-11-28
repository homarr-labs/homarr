import { historyWindowSeconds } from "./display";
import type { HealthOptions } from "./display";
import { finiteReading } from "./model";
import type { HealthSystemSnapshot } from "./model";

export type HistoryMetric = "cpu" | "memory" | "networkDown" | "networkUp" | "temperature";

type HistoryPoint = { time: number; rawTime: string } & Record<string, number | string | null>;

export function comparisonTimeDomain(
  snapshots: HealthSystemSnapshot[],
  window: HealthOptions["historyWindow"],
): [number, number] {
  let latest = 0;
  for (const snapshot of snapshots) latest = Math.max(latest, snapshot.system.history.at(-1)?.time ?? 0);
  return [latest - historyWindowSeconds(window) * 1000, latest];
}

export function comparisonHistory(
  snapshots: HealthSystemSnapshot[],
  metric: HistoryMetric,
  cutoff: number,
  fahrenheit: boolean,
) {
  const byTime = new Map<number, HistoryPoint>();
  const byHost = new Map<string, { data: HistoryPoint[]; hasIsolated: boolean }>();
  let mostReadings = 0;
  for (const { system } of snapshots) {
    const data: HistoryPoint[] = [];
    let readingCount = 0;
    for (const sample of system.history) {
      if (sample.time < cutoff || !Number.isFinite(sample.time)) continue;
      let point = byTime.get(sample.time);
      if (!point) {
        point = { time: sample.time, rawTime: new Date(sample.time).toISOString() };
        byTime.set(sample.time, point);
      }
      let reading = finiteReading(sample[metric]);
      if (reading !== null) {
        readingCount++;
        if (metric === "temperature" && fahrenheit) reading = reading * 1.8 + 32;
      }
      point[system.id] = reading;
      // The shared axis includes every timestamp. Only this host's own observations
      // belong to its line, including explicit nulls that mark interruptions.
      data.push(point);
    }
    const hasIsolated = data.some(
      (point, index) =>
        point[system.id] !== null && data[index - 1]?.[system.id] == null && data[index + 1]?.[system.id] == null,
    );
    byHost.set(system.id, { data, hasIsolated });
    mostReadings = Math.max(mostReadings, readingCount);
  }
  return { data: [...byTime.values()].toSorted((left, right) => left.time - right.time), byHost, mostReadings };
}
