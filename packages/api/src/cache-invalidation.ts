// ponytail: invalidation is wired now; `cacheTag()` on RSC read paths is Phase 1 follow-up.
// Until reads use `"use cache"` + `cacheTag()`, these calls affect only Next.js-internal
// cached segments (layout shells, static params) via cacheComponents, not cross-request DB queries.
//
// Two-tier invalidation:
// - `invalidateIntegrationCache`: for integration CONFIG changes (CRUD, permissions).
//   Clears module cache + Next tags + Redis session store.
// - `invalidateIntegrationDataCache` (from integration-data-cache.ts): for integration DATA changes
//   (widget interact mutations). Clears module cache only — pair with requestHandler.invalidateCache().

import { cacheTags } from "./cache-tags";
import { invalidateIntegrationDataCache } from "./integration-data-cache";

// ponytail: revalidateTag throws outside Next.js request context (tests, tasks, websocket).
// Ceiling: if Next.js context detection changes, update the try-catch.
const safeRevalidateTag = (tag: string) => {
  try {
    // Dynamic import avoidance — revalidateTag is only available within Next.js runtime.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { revalidateTag } = require("next/cache") as typeof import("next/cache");
    revalidateTag(tag, "max");
  } catch {
    // Not in a Next.js request context — no-op
  }
};

export const invalidateBoardCache = (boardId: string, boardName?: string) => {
  safeRevalidateTag(cacheTags.board(boardId));
  if (boardName) safeRevalidateTag(cacheTags.boardByName(boardName));
  safeRevalidateTag(cacheTags.boardList());
};

export const invalidateIntegrationCache = (integrationId: string) => {
  invalidateIntegrationDataCache(integrationId);
  safeRevalidateTag(cacheTags.integration(integrationId));
};

export const invalidateUserCache = (userId: string) => {
  safeRevalidateTag(cacheTags.user(userId));
};

export const invalidateServerSettingsCache = () => {
  safeRevalidateTag(cacheTags.serverSettings());
};
