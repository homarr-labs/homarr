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
