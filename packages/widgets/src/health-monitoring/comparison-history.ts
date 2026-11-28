import { historyWindowSeconds } from "./display";
import type { HealthOptions } from "./display";
import { finiteReading } from "./model";
import type { HealthSample, HealthSystemSnapshot } from "./model";

export type HistoryMetric = "cpu" | "memory" | "networkDown" | "networkUp" | "temperature";

const bucketMs = 10_000;

export function comparisonHistory(
  snapshots: HealthSystemSnapshot[],
  metric: HistoryMetric,
  historyWindow: HealthOptions["historyWindow"],
  fahrenheit: boolean,
  locale: string,
) {
  const lastTime = Math.max(
    0,
    ...snapshots.flatMap((snapshot) => snapshot.system.history.map((sample) => sample.time)),
  );
  const cutoff = lastTime - historyWindowSeconds(historyWindow) * 1000;
  const points = new Map<number, Record<string, number | string | null>>();
  const formatter = new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit", second: "2-digit" });
  const pointAt = (time: number) => {
    let point = points.get(time);
    if (!point) {
      point = { time: formatter.format(time), rawTime: new Date(time).toISOString() };
      for (const snapshot of snapshots) point[snapshot.system.id] = null;
      points.set(time, point);
    }
    return point;
  };
  for (const snapshot of snapshots) {
    let previous: HealthSample | undefined;
    let missingBucket: number | undefined;
    let recovery: { time: number; value: number } | undefined;
    for (const sample of snapshot.system.history) {
      if (!Number.isFinite(sample.time) || sample.time < cutoff) continue;
      if (previous && sample.time - previous.time > Math.max(30_000, (snapshot.system.refreshInterval ?? 10) * 3000))
        pointAt(Math.floor(previous.time / bucketMs) * bucketMs + bucketMs);
      previous = sample;
      let time = sample.time;
      if (snapshots.length > 1) time = Math.floor(sample.time / bucketMs) * bucketMs;
      let value = finiteReading(sample[metric]);
      if (metric === "temperature" && value !== null && fahrenheit) value = value * 1.8 + 32;
      const point = pointAt(time);
      if (value === null) {
        missingBucket = time;
        point[snapshot.system.id] = null;
        recovery = undefined;
      } else if (time === missingBucket) {
        // A later value in the same fleet bucket must not draw through an outage.
        recovery = { time: sample.time, value };
      } else {
        point[snapshot.system.id] = value;
        recovery = undefined;
      }
    }
    // Keep the newest recovery at its observed time. Interior buckets remain
    // aligned across hosts, so a gap in one series never interrupts its peers.
    if (recovery && missingBucket === Math.floor(lastTime / bucketMs) * bucketMs)
      pointAt(recovery.time)[snapshot.system.id] = recovery.value;
  }
  return [...points.entries()].toSorted(([leftTime], [rightTime]) => leftTime - rightTime).map(([, point]) => point);
}
