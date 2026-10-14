import type { DuckDuckGoBang } from "@homarr/request-handler/duckduckgo-bangs";

export interface NormalizedBangsDataset {
  getDataAsync(signal: AbortSignal): Promise<{ readonly data: readonly DuckDuckGoBang[] }>;
}

export const normalizeBangToken = (token: string) => token.toLowerCase().trim();

export const lowerBound = (arr: readonly DuckDuckGoBang[], tokenPrefix: string) => {
  let low = 0;
  let high = arr.length;
  while (low < high) {
    const mid = (low + high) >> 1;
    const midBang = arr[mid];
    if (!midBang || midBang.t.localeCompare(tokenPrefix) >= 0) {
      high = mid;
      continue;
    }
    low = mid + 1;
  }
  return low;
};

export async function searchDuckDuckGoBangsAsync(
  input: { query: string; limit: number },
  dataset: NormalizedBangsDataset,
  signal: AbortSignal,
): Promise<DuckDuckGoBang[]> {
  signal.throwIfAborted();
  const queryTokenPrefix = normalizeBangToken(input.query);
  if (!queryTokenPrefix) return [];
  const { data: allBangs } = await dataset.getDataAsync(signal);
  signal.throwIfAborted();
  const startIndex = lowerBound(allBangs, queryTokenPrefix);
  const matches: DuckDuckGoBang[] = [];
  for (let index = startIndex; index < allBangs.length; index++) {
    const bang = allBangs[index];
    if (!bang || !bang.t.startsWith(queryTokenPrefix)) break;
    matches.push(bang);
    if (matches.length >= input.limit) break;
  }
  return matches;
}
