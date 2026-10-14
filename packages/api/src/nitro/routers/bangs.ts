import { z } from "zod/v4";

import type { AppsSearchSourceBinding } from "./-apps-search/resources";

export { lowerBound, normalizeBangToken, searchDuckDuckGoBangsAsync } from "./-apps-search/bangs";
export type { NormalizedBangsDataset } from "./-apps-search/bangs";

export const bangsSearchInputSchema = z.object({
  query: z.string(),
  limit: z.number().int().min(1).max(50).default(20),
});
export const bangsImplementedPaths = [] as const;
export const bangsPendingPaths = [
  {
    path: "bangs.search",
    sourceFile: "packages/api/src/router/bangs/bangs-router.ts",
    status: "pending",
    reason:
      "The actual prefix-search helper is ported, but the source normalized/sorted DuckDuckGo dataset requires an accepted bounded cache/trusted-fetch/timeout resource. Trust lifecycle is held; no fabricated dataset loader or native endpoint is registered.",
  },
] as const satisfies readonly AppsSearchSourceBinding[];
export const bangsSourceBindings = bangsPendingPaths;
