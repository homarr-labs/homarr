export const KOMODO_DEFAULT_REFRESH_INTERVAL_SECONDS = 30;
export const KOMODO_MIN_REFRESH_INTERVAL_SECONDS = 5;
export const KOMODO_MAX_REFRESH_INTERVAL_SECONDS = 3600;

export const getKomodoRefreshIntervalMs = (value: number) => {
  const intervalSeconds = Number.isFinite(value)
    ? Math.min(KOMODO_MAX_REFRESH_INTERVAL_SECONDS, Math.max(KOMODO_MIN_REFRESH_INTERVAL_SECONDS, value))
    : KOMODO_DEFAULT_REFRESH_INTERVAL_SECONDS;

  return intervalSeconds * 1000;
};
