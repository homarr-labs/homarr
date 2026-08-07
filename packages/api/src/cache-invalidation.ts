// ponytail: invalidation is wired now; `cacheTag()` on RSC read paths is Phase 1 follow-up.
// Until reads use `"use cache"` + `cacheTag()`, these calls affect only Next.js-internal
// cached segments (layout shells, static params) via cacheComponents, not cross-request DB queries.
//
// Two-tier invalidation:
// - `invalidateIntegrationCache`: for integration CONFIG changes (CRUD, permissions).
//   Clears module cache + Next tags + Redis session store.
// - `invalidateIntegrationDataCache` (from integration-data-cache.ts): for integration DATA changes
//   (widget interact mutations). Clears module cache only — pair with requestHandler.invalidateCache().

import { revalidateTag } from "next/cache";

import { cacheTags } from "./cache-tags";
import { invalidateIntegrationDataCache } from "./integration-data-cache";

export const invalidateBoardCache = (boardId: string, boardName?: string) => {
  revalidateTag(cacheTags.board(boardId), "max");
  if (boardName) revalidateTag(cacheTags.boardByName(boardName), "max");
  revalidateTag(cacheTags.boardList(), "max");
};

export const invalidateIntegrationCache = (integrationId: string) => {
  invalidateIntegrationDataCache(integrationId);
  revalidateTag(cacheTags.integration(integrationId), "max");
};

export const invalidateUserCache = (userId: string) => {
  revalidateTag(cacheTags.user(userId), "max");
};

export const invalidateServerSettingsCache = () => {
  revalidateTag(cacheTags.serverSettings(), "max");
};
