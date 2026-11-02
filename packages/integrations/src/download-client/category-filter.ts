const normalizeCategory = (value: string) => value.trim().toLowerCase();

/**
 * The widget stores one category list for every selected client.
 * Whitelist mode keeps jobs in those categories. Jobs with no category stay
 * visible, because clients such as aria2 cannot assign one. Turning the
 * whitelist off ignores the list instead of excluding every match.
 */
export function matchesDownloadCategoryFilter(
  category: string | readonly string[] | null | undefined,
  categoryFilter: readonly string[],
  filterIsWhitelist: boolean,
): boolean {
  const filters = categoryFilter.map(normalizeCategory).filter((filter) => filter.length > 0);
  if (filters.length === 0 || !filterIsWhitelist) return true;

  const values = Array.isArray(category) ? category : category == null ? [] : [category];
  const categories = values.map(normalizeCategory).filter((value) => value.length > 0);
  if (categories.length === 0) return true;
  return filters.some((filter) => categories.includes(filter));
}
