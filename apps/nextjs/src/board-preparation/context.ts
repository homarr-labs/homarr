import type { Session } from "@homarr/auth";
import { getIntegrationsWithPermissionsAsync } from "@homarr/auth/server";
import { getBoardForSessionAsync } from "@homarr/api/board-server";
import { getLayoutIdForViewportWidth } from "@homarr/boards/layout-selection";
import type { DeviceType } from "@homarr/common/server";
import { createLogger } from "@homarr/core/infrastructure/logs";
import { getIntegrationCacheGenerationAsync } from "@homarr/redis";
import type { SupportedLanguage } from "@homarr/translation";

import { loadRootLayoutDataAsync } from "~/app/[locale]/_root-layout-data";
import type { RootLayoutData } from "~/app/[locale]/_root-layout-data";
import type { BoardPreparationContext, BoardPreparationSpec } from "./store";

const logger = createLogger({ module: "boardPreparation", scope: "context" });

export const loadBoardPreparationContextAsync = async ({
  session,
  name,
  deviceType,
  locale,
  viewportWidth,
  colorScheme,
}: {
  session: Session | null;
  name?: string;
  deviceType: DeviceType;
  locale: SupportedLanguage;
  viewportWidth: number;
  colorScheme?: RootLayoutData["colorScheme"];
}): Promise<BoardPreparationContext | null> => {
  const [board, root, integrations] = await Promise.all([
    getBoardForSessionAsync({ session, name, deviceType }),
    loadRootLayoutDataAsync(Promise.resolve(session)),
    getIntegrationsWithPermissionsAsync(session),
  ]);
  // First-time setup stays on the existing route, including its interactive tour.
  if (session && (!root.user || !root.user.completedBoardTour)) {
    logger.debug("Board preparation context unavailable", { boardId: board.id, reason: "user_setup_incomplete" });
    return null;
  }
  if (root.assistantAvailability === "error") {
    logger.debug("Board preparation context unavailable", { boardId: board.id, reason: "assistant_availability" });
    return null;
  }
  const existing = new Set(integrations.map(({ id }) => id));
  const ids = [...new Set(board.items.flatMap((item) => item.integrationIds))].toSorted();
  if (ids.some((id) => !existing.has(id))) {
    logger.debug("Board preparation context unavailable", { boardId: board.id, reason: "missing_integration" });
    return null;
  }
  const generations: Record<string, string> = {};
  const values = await Promise.all(
    ids.map(async (id) => ({ id, generation: await getIntegrationCacheGenerationAsync(id) })),
  );
  for (const { id, generation } of values) {
    if (!generation.isShared) {
      logger.debug("Board preparation context unavailable", { boardId: board.id, reason: "unshared_generation" });
      return null;
    }
    generations[id] = generation.value;
  }
  return {
    board,
    root: { ...root, colorScheme: colorScheme ?? root.serverSettings.appearance.defaultColorScheme },
    integrations,
    generations,
    locale,
    viewportWidth,
    layoutId: getLayoutIdForViewportWidth(board.layouts, viewportWidth),
  };
};

export const getBoardPreparationSpec = (context: BoardPreparationContext): BoardPreparationSpec => ({
  boardId: context.board.id,
  boardName: context.board.name,
  viewerId: context.root.session?.user.id ?? null,
  sessionExpires: context.root.session?.expires ?? null,
  locale: context.locale,
  viewportWidth: context.viewportWidth,
  colorScheme: context.root.colorScheme,
});
