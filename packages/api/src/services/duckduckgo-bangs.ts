import { duckDuckGoBangsRequestHandler } from "@homarr/request-handler/duckduckgo-bangs";
import type { DuckDuckGoBang } from "@homarr/request-handler/duckduckgo-bangs";

// DuckDuckGo bang keys are intentionally short:
// - `t`: token (e.g. "yt"), `s`: display name, `u`: URL template (contains `{{{s}}}`)
// - `d`: domain, `c`: category, `sc`: subcategory, `r`: rank (optional)

const normalizeBangToken = (token: string) => token.toLowerCase().trim();

/**
 * Binary search to find the first index where bang.t >= tokenPrefix.
 * This is O(log n) vs O(n) for findIndex, which matters because DuckDuckGo
 * has ~13,000+ bangs. Combined with the pre-sorted data, this allows
 * efficient prefix matching by finding the start position and iterating
 * only through consecutive matches.
 */
const lowerBound = (arr: DuckDuckGoBang[], tokenPrefix: string) => {
  let low = 0;
  let high = arr.length;
  while (low < high) {
    const mid = (low + high) >> 1;
    const midBang = arr[mid];
    // Must use the same ordering as the source list sort (localeCompare),
    // otherwise binary search can miss tokens with symbols like "&" or "_".
    if (!midBang || midBang.t.localeCompare(tokenPrefix) >= 0) {
      high = mid;
      continue;
    }

    low = mid + 1;
  }
  return low;
};

export const searchDuckDuckGoBangsAsync = async (input: {
  query: string;
  limit: number;
}): Promise<DuckDuckGoBang[]> => {
  const queryTokenPrefix = normalizeBangToken(input.query);
  if (!queryTokenPrefix) return [];

  const { data: allBangs } = await duckDuckGoBangsRequestHandler.handler({}).getCachedOrUpdatedDataAsync({});
  const startIndex = lowerBound(allBangs, queryTokenPrefix);
  const matches: DuckDuckGoBang[] = [];

  for (let index = startIndex; index < allBangs.length; index++) {
    const bang = allBangs[index];
    if (!bang) break;
    if (!bang.t.startsWith(queryTokenPrefix)) break;
    matches.push(bang);
    if (matches.length >= input.limit) break;
  }

  return matches;
};
