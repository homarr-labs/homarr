export type NumericSummary = {
  count: number;
  medianMs: number | null;
  p95Ms: number | null;
  standardDeviationMs: number | null;
  outliersMs: number[];
};

export const normalizeTrpcPath = (requestUrl: string) => {
  try {
    const url = new URL(requestUrl, "http://benchmark.invalid");
    url.searchParams.delete("input");
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
    return { count: 0, medianMs: null, p95Ms: null, standardDeviationMs: null, outliersMs: [] };
  }

  const medianIndex = Math.floor(sorted.length / 2);
  const p95Index = Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1);
  const mean = sorted.reduce((total, value) => total + value, 0) / sorted.length;
  const variance = sorted.reduce((total, value) => total + (value - mean) ** 2, 0) / sorted.length;
  const firstQuartile = sorted[Math.floor((sorted.length - 1) * 0.25)] ?? 0;
  const thirdQuartile = sorted[Math.floor((sorted.length - 1) * 0.75)] ?? 0;
  const iqr = thirdQuartile - firstQuartile;
  const outlierLimit = thirdQuartile + Math.max(1, iqr * 1.5);

  return {
    count: sorted.length,
    medianMs: sorted[medianIndex] ?? 0,
    p95Ms: sorted[p95Index] ?? 0,
    standardDeviationMs: Math.round(Math.sqrt(variance)),
    outliersMs: sorted.filter((value) => value > outlierLimit),
  };
};

export const validateBrowserMeasurement = (measurement: {
  responseStatus: number | null;
  domContentLoadedMs: number;
  boardHydratedMs: number | null;
  firstInteractionMs: number | null;
  error?: string;
}) => {
  const errors: string[] = [];
  if (measurement.error) errors.push(measurement.error);
  if (measurement.responseStatus === null) errors.push("browser navigation returned no response");
  else if (measurement.responseStatus < 200 || measurement.responseStatus >= 300)
    errors.push(`browser navigation returned HTTP ${measurement.responseStatus}`);
  if (measurement.domContentLoadedMs < 0) errors.push("DOMContentLoaded timing is missing");
  if (measurement.boardHydratedMs === null) errors.push("board hydration marker is missing");
  if (measurement.firstInteractionMs === null) errors.push("first interaction timing is missing");
  return errors;
};
