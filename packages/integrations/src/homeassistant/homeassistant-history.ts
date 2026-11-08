import type { SmartHomeHistoryPoint } from "../interfaces/smart-home/smart-home-types";

interface HistoryState {
  state: string;
  time: number;
}

interface BucketOptions {
  start: number;
  end: number;
  samples: number;
}

export const bucketHistory = (
  states: HistoryState[],
  { start, end, samples }: BucketOptions,
): SmartHomeHistoryPoint[] => {
  const numeric = states
    .map((item) => ({ time: Math.max(item.time, start), value: Number.parseFloat(item.state) }))
    .filter((item) => Number.isFinite(item.value))
    .toSorted((left, right) => left.time - right.time);
  if (numeric.length === 0 || samples < 2) return [];

  const step = (end - start) / (samples - 1);
  const points: SmartHomeHistoryPoint[] = [];
  let cursor = 0;
  let current: number | null = null;

  for (let index = 0; index < samples; index++) {
    const time = Math.round(start + step * index);
    let sum = 0;
    let count = 0;
    while (cursor < numeric.length && (numeric[cursor]?.time ?? Number.POSITIVE_INFINITY) <= time) {
      const value = numeric[cursor]?.value ?? 0;
      current = value;
      sum += value;
      count++;
      cursor++;
    }
    if (count > 0) {
      points.push({ time, value: Math.round((sum / count) * 100) / 100 });
      continue;
    }
    if (current !== null) points.push({ time, value: current });
  }
  return points;
};
