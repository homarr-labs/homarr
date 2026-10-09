interface ContainerFilterOptions {
  containerFilter: string[];
  filterIsWhitelist: boolean;
  filterCaseSensitive: boolean;
  filterAllowWildcards: boolean;
}

export function matchesContainerFilter(name: string, options: ContainerFilterOptions): boolean {
  if (options.containerFilter.length === 0) return true;

  let candidate = name;
  if (!options.filterCaseSensitive) candidate = candidate.toLowerCase();

  const matches = options.containerFilter.some((filter) => {
    let pattern = filter;
    if (!options.filterCaseSensitive) pattern = pattern.toLowerCase();
    if (!options.filterAllowWildcards || !pattern.includes("*")) return candidate === pattern;

    const parts = pattern.split("*");
    const first = parts[0] ?? "";
    if (!candidate.startsWith(first)) return false;

    let offset = first.length;
    for (const part of parts.slice(1, -1)) {
      const index = candidate.indexOf(part, offset);
      if (index === -1) return false;
      offset = index + part.length;
    }

    const last = parts.at(-1) ?? "";
    return candidate.endsWith(last) && candidate.length - last.length >= offset;
  });

  return options.filterIsWhitelist === matches;
}
