const DUCKDUCKGO_BANGS_URL = "https://duckduckgo.com/bang.js";

export type DuckDuckGoBang = {
  /** Bang token (e.g. "yt") */
  t: string;
  /** Display name */
  s: string;
  /** Domain */
  d?: string;
  /** Url template (contains {{{s}}}) */
  u: string;
  /** Category */
  c?: string;
  /** Subcategory */
  sc?: string;
  /** Rank */
  r?: number;
};

type CachedBangs = {
  fetchedAtMs: number;
  bangs: DuckDuckGoBang[];
};

const DAY_MS = 24 * 60 * 60 * 1000;
const cache: { value: CachedBangs | null; inFlight: Promise<CachedBangs> | null } = { value: null, inFlight: null };

const normalizeToken = (token: string) => token.toLowerCase().trim();

const byTokenAsc = (a: DuckDuckGoBang, b: DuckDuckGoBang) => a.t.localeCompare(b.t);

const isCacheValid = (cached: CachedBangs, nowMs: number) => nowMs - cached.fetchedAtMs < DAY_MS;

const fetchBangsAsync = async (): Promise<CachedBangs> => {
  const res = await fetch(DUCKDUCKGO_BANGS_URL, {
    headers: {
      accept: "application/json,text/plain,*/*",
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch DuckDuckGo bangs: ${res.status} ${res.statusText}`);
  }

  const json = (await res.json()) as unknown;
  if (!Array.isArray(json)) {
    throw new Error("Invalid DuckDuckGo bangs payload: expected array");
  }

  const parsed: DuckDuckGoBang[] = [];
  for (const item of json) {
    if (!item || typeof item !== "object") continue;
    const t = (item as Record<string, unknown>).t;
    const s = (item as Record<string, unknown>).s;
    const u = (item as Record<string, unknown>).u;
    if (typeof t !== "string" || typeof s !== "string" || typeof u !== "string") continue;

    const token = normalizeToken(t);
    if (!token) continue;

    parsed.push({
      t: token,
      s,
      u,
      d: typeof (item as Record<string, unknown>).d === "string" ? ((item as Record<string, unknown>).d as string) : undefined,
      c: typeof (item as Record<string, unknown>).c === "string" ? ((item as Record<string, unknown>).c as string) : undefined,
      sc: typeof (item as Record<string, unknown>).sc === "string" ? ((item as Record<string, unknown>).sc as string) : undefined,
      r: typeof (item as Record<string, unknown>).r === "number" ? ((item as Record<string, unknown>).r as number) : undefined,
    });
  }

  parsed.sort(byTokenAsc);
  return { fetchedAtMs: Date.now(), bangs: parsed };
};

export const getDuckDuckGoBangsAsync = async (nowMs = Date.now()): Promise<CachedBangs> => {
  if (cache.value && isCacheValid(cache.value, nowMs)) {
    return cache.value;
  }

  if (!cache.inFlight) {
    cache.inFlight = fetchBangsAsync()
      .then((value) => {
        cache.value = value;
        return value;
      })
      .finally(() => {
        cache.inFlight = null;
      });
  }

  return await cache.inFlight;
};

const lowerBound = (arr: DuckDuckGoBang[], tokenPrefix: string) => {
  let lo = 0;
  let hi = arr.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (arr[mid]!.t < tokenPrefix) lo = mid + 1;
    else hi = mid;
  }
  return lo;
};

export const searchDuckDuckGoBangsAsync = async (input: {
  query: string;
  limit: number;
}): Promise<DuckDuckGoBang[]> => {
  const q = normalizeToken(input.query);
  if (!q) return [];

  const { bangs } = await getDuckDuckGoBangsAsync();
  const start = lowerBound(bangs, q);
  const out: DuckDuckGoBang[] = [];

  for (let i = start; i < bangs.length; i++) {
    const bang = bangs[i]!;
    if (!bang.t.startsWith(q)) break;
    out.push(bang);
    if (out.length >= input.limit) break;
  }

  return out;
};


