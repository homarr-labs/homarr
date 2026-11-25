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

  let best: TItem | null = null;
  let bestMatchIndex = Infinity;
  let bestLength = Infinity;
  for (const current of options) {
    const value = by(current);
    const currentMatchIndex = value.toLowerCase().indexOf(normalizedSearch);
    if (currentMatchIndex === -1) continue;
    if (currentMatchIndex < bestMatchIndex || (currentMatchIndex === bestMatchIndex && value.length < bestLength)) {
      best = current;
      bestMatchIndex = currentMatchIndex;
      bestLength = value.length;
    }
  }
  return best;
};

export const normalizeImageName = (value: string) => {
  const fileName = value.split(/[?#]/, 1)[0]?.split("/").pop() ?? value;
  const withoutExtension = fileName.replace(/\.(?:avif|gif|jpe?g|png|svg|webp)$/i, "");

  return withoutExtension
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^\p{L}\p{M}\p{N}]+/gu, " ")
    .trim()
    .toLowerCase();
};

export const getImageMatchRank = (normalizedSearch: string, candidateValue: string): number | null => {
  const candidate = normalizeImageName(candidateValue);
  if (!candidate) return null;

  const compactSearch = normalizedSearch.replaceAll(" ", "");
  const compactCandidate = candidate.replaceAll(" ", "");
  if (candidate === normalizedSearch) return 0;
  if (compactCandidate === compactSearch) return 1;
  if (candidate.startsWith(`${normalizedSearch} `)) return 2;

  const searchTokens = normalizedSearch.split(" ");
  const candidateTokens = candidate.split(" ");
  if (searchTokens.every((term) => candidateTokens.some((token) => token === term))) return 3;
  if (searchTokens.every((term) => candidateTokens.some((token) => token.startsWith(term)))) return 4;
  if (candidate.includes(normalizedSearch)) return 5;
  return null;
};
