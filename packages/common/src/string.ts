export const capitalize = <T extends string>(str: T) => {
  return (str.charAt(0).toUpperCase() + str.slice(1)) as Capitalize<T>;
};

export const isNullOrWhitespace = (value: string | null): value is null => {
  return value == null || value.trim() === "";
};

export const bestMatch = <TItem extends Record<string, unknown>>(
  search: string,
  options: TItem[],
  by: (item: TItem) => string,
) => {
  if (options.length === 0) return null;

  const normalizedSearch = search.toLowerCase().trim();

  return options.reduce<TItem | null>((best, current) => {
    const currentMatchIndex = by(current).toLowerCase().indexOf(normalizedSearch);

    if (currentMatchIndex === -1) return best;
    if (best === null) return current;

    const bestMatchIndex = by(best).toLowerCase().indexOf(normalizedSearch);

    if (currentMatchIndex < bestMatchIndex) return current;
    if (by(current).length < by(best).length && currentMatchIndex === bestMatchIndex) return current;
    return best;
  }, null);
};
