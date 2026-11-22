export const getHistoryValues = (history: readonly (number | null)[]) =>
  history.filter((value): value is number => value !== null && Number.isFinite(value));
