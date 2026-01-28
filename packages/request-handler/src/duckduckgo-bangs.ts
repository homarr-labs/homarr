import dayjs from "dayjs";
import { z } from "zod";

import { env } from "@homarr/common/env";
import { ResponseError } from "@homarr/common/server";
import { fetchWithTrustedCertificatesAsync } from "@homarr/core/infrastructure/http";
import { withTimeoutAsync } from "@homarr/core/infrastructure/http/timeout";
import { createChannelWithLatestAndEvents } from "@homarr/redis";
import { createCachedRequestHandler } from "@homarr/request-handler/lib/cached-request-handler";

export type DuckDuckGoBang = z.infer<typeof duckDuckGoBangSchema>;

const DUCKDUCKGO_BANGS_URL = "https://duckduckgo.com/bang.js";

/**
 * DuckDuckGo `bang.js` uses short keys (to reduce the payload size):
 * - `t`: bang token (e.g. `"yt"`)
 * - `s`: display name
 * - `d`: domain (optional)
 * - `u`: URL template (contains `{{{s}}}`)
 * - `c`: category (optional)
 * - `sc`: subcategory (optional)
 * - `r`: rank (optional)
 */
export const duckDuckGoBangSchema = z.object({
  t: z.string(),
  s: z.string(),
  d: z.string().optional(),
  u: z.string(),
  c: z.string().optional(),
  sc: z.string().optional(),
  r: z.number().optional(),
});

const duckDuckGoBangsResponseSchema = z.array(duckDuckGoBangSchema);

const normalizeBangToken = (token: string) => token.toLowerCase().trim();

const compareBangTokenAsc = (left: DuckDuckGoBang, right: DuckDuckGoBang) => left.t.localeCompare(right.t);

export const duckDuckGoBangsRequestHandler = createCachedRequestHandler({
  queryKey: "duckduckgo-bangs",
  cacheDuration: dayjs.duration(1, "day"),
  async requestAsync(_) {
    if (env.NO_EXTERNAL_CONNECTION) {
      return [];
    }

    const res = await withTimeoutAsync(async (signal) => {
      return await fetchWithTrustedCertificatesAsync(DUCKDUCKGO_BANGS_URL, {
        signal,
        headers: {
          accept: "application/json,text/plain,*/*",
        },
      });
    });

    if (!res.ok) {
      throw new ResponseError(res);
    }

    const json: unknown = await res.json();
    const bangs = await duckDuckGoBangsResponseSchema.parseAsync(json);

    const normalized = bangs
      .map((bang) => ({
        ...bang,
        t: normalizeBangToken(bang.t),
      }))
      .filter((bang) => bang.t.length > 0);

    normalized.sort(compareBangTokenAsc);

    return normalized;
  },
  createRedisChannel() {
    return createChannelWithLatestAndEvents<DuckDuckGoBang[]>("homarr:duckduckgo-bangs");
  },
});
