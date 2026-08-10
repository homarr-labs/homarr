export type NumericSummary = {
  count: number;
  min: number | null;
  median: number | null;
  p95: number | null;
  max: number | null;
  standardDeviation: number | null;
  outliers: number[];
};

export const normalizeTrpcPath = (requestUrl: string) => {
  try {
    const url = new URL(requestUrl, "http://benchmark.invalid");
    url.searchParams.sort();
    return url.pathname + url.search;
  } catch {
    return requestUrl;
  }
};

export const countDuplicateTrpcPaths = (requestUrls: string[]) => {
  const paths = requestUrls.map(normalizeTrpcPath);
  return Math.max(0, paths.length - new Set(paths).size);
};

const values = (numbers: Array<number | null | undefined>) =>
  numbers.filter((value): value is number => typeof value === "number" && value >= 0).toSorted((a, b) => a - b);

export const summarize = (numbers: Array<number | null | undefined>): NumericSummary => {
  const sorted = values(numbers);
  if (sorted.length === 0) {
    return { count: 0, min: null, median: null, p95: null, max: null, standardDeviation: null, outliers: [] };
  }

  const middleIndex = Math.floor(sorted.length / 2);
  let median = sorted[middleIndex] ?? 0;
  if (sorted.length % 2 === 0) {
    median = ((sorted[middleIndex - 1] ?? 0) + median) / 2;
  }
  const p95Index = Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1);
  const mean = sorted.reduce((total, value) => total + value, 0) / sorted.length;
  const variance = sorted.reduce((total, value) => total + (value - mean) ** 2, 0) / sorted.length;
  const firstQuartile = sorted[Math.floor((sorted.length - 1) * 0.25)] ?? 0;
  const thirdQuartile = sorted[Math.floor((sorted.length - 1) * 0.75)] ?? 0;
  const iqr = thirdQuartile - firstQuartile;
  const outlierLimit = thirdQuartile + Math.max(1, iqr * 1.5);

  return {
    count: sorted.length,
    min: sorted[0] ?? null,
    median,
    p95: sorted.length >= 20 ? (sorted[p95Index] ?? null) : null,
    max: sorted.at(-1) ?? null,
    standardDeviation: Math.round(Math.sqrt(variance)),
    outliers: sorted.filter((value) => value > outlierLimit),
  };
};

export const validateBrowserMeasurement = (measurement: {
  responseStatus: number | null;
  domContentLoadedMs: number;
  boardHydratedMs: number | null;
  widgetsReadyMs?: number | null;
  widgetCount?: number;
  coldImmediateInteractionMs?: number | null;
  postIdleWarmInteractionMs?: number | null;
  error?: string;
}) => {
  const errors: string[] = [];
  if (measurement.error) errors.push(measurement.error);
  if (measurement.responseStatus === null) errors.push("browser navigation returned no response");
  else if (measurement.responseStatus < 200 || measurement.responseStatus >= 300)
    errors.push(`browser navigation returned HTTP ${measurement.responseStatus}`);
  if (measurement.domContentLoadedMs < 0) errors.push("DOMContentLoaded timing is missing");
  if (measurement.boardHydratedMs === null) errors.push("board hydration marker is missing");
  if (measurement.widgetsReadyMs === null) errors.push("widget readiness marker is missing");
  if (measurement.widgetCount === 0) errors.push("representative board contains no widgets");
  if (measurement.coldImmediateInteractionMs === null) errors.push("cold immediate interaction timing is missing");
  if (measurement.postIdleWarmInteractionMs === null) errors.push("post-idle warm interaction timing is missing");
  return errors;
};
