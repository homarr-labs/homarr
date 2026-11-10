interface HistoryPoint {
  index: number;
  value: number;
}

export const getHistoryValues = (history: readonly (number | null)[]) =>
  history.filter((value): value is number => value !== null && Number.isFinite(value));

export const getHistorySegments = (history: readonly (number | null)[]) => {
  const segments: HistoryPoint[][] = [];
  let segment: HistoryPoint[] = [];
  for (const [index, value] of history.entries()) {
    if (value === null || !Number.isFinite(value)) {
      if (segment.length > 0) segments.push(segment);
      segment = [];
      continue;
    }
    segment.push({ index, value });
  }
  if (segment.length > 0) segments.push(segment);
  return segments;
};
