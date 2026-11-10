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
  const observations = states
    .map((item) => {
      const parsed = Number(item.state);
      let value: number | null = null;
      if (item.state.trim().length > 0 && Number.isFinite(parsed)) value = parsed;
      return { time: Math.max(item.time, start), value };
    })
    .toSorted((left, right) => left.time - right.time);
  if (observations.length === 0 || samples < 2) return [];

  const step = (end - start) / (samples - 1);
  const points: SmartHomeHistoryPoint[] = [];
  let cursor = 0;
  let current: number | null = null;

  for (let index = 0; index < samples; index++) {
    const time = Math.round(start + step * index);
    let sum = 0;
    let count = 0;
    while (cursor < observations.length && (observations[cursor]?.time ?? Number.POSITIVE_INFINITY) <= time) {
      const value = observations[cursor]?.value ?? null;
      current = value;
      cursor++;
      if (value === null) {
        sum = 0;
        count = 0;
        continue;
      }
      sum += value;
      count++;
    }
    if (count > 0) {
      points.push({ time, value: Math.round((sum / count) * 100) / 100 });
      continue;
    }
    points.push({ time, value: current });
  }
  return points;
};
