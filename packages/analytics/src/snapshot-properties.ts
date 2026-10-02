const snapshotIntervalMs = 7 * 24 * 60 * 60 * 1_000;

export const isSnapshotDue = (lastSuccessfulSnapshotAt: string | null, now: Date) => {
  if (!lastSuccessfulSnapshotAt) return true;
  const lastSent = Date.parse(lastSuccessfulSnapshotAt);
  if (!Number.isFinite(lastSent)) return true;
  return now.getTime() - lastSent >= snapshotIntervalMs;
};

export const getSnapshotPeriod = (now: Date) => Math.floor(now.getTime() / snapshotIntervalMs);

export const getItemCountBucket = (itemCount: number) => {
  if (itemCount === 0) return "empty";
  if (itemCount === 1) return "one";
  if (itemCount <= 3) return "two-to-three";
  if (itemCount <= 7) return "four-to-seven";
  if (itemCount <= 15) return "eight-to-fifteen";
  return "sixteen-plus";
};

export const omitZeroCounts = (properties: Record<string, unknown>) => {
  return Object.fromEntries(
    Object.entries(properties).filter(([key, value]) => !key.startsWith("count") || value !== 0),
  );
};
