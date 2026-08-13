export const BESZEL_ALERTS_ADVANCED_MIN_HISTORY_ITEMS = 50;
const BESZEL_ALERTS_MAX_HISTORY_ITEMS = 100;

interface BeszelAlertsDisplayOptions {
  showHistory: boolean;
  maxHistoryItems: number;
}

export const getBeszelAlertsQueryInput = (
  integrationIds: string[],
  options: BeszelAlertsDisplayOptions,
  isAdvanced: boolean,
) => ({
  integrationIds,
  includeHistory: isAdvanced || options.showHistory,
  maxHistoryItems: isAdvanced
    ? Math.min(
        BESZEL_ALERTS_MAX_HISTORY_ITEMS,
        Math.max(BESZEL_ALERTS_ADVANCED_MIN_HISTORY_ITEMS, options.maxHistoryItems),
      )
    : options.maxHistoryItems,
});
