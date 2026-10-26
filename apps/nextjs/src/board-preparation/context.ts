import type { Session } from "@homarr/auth";
import { getIntegrationsWithPermissionsAsync } from "@homarr/auth/server";
import { getBoardForSessionAsync } from "@homarr/api/board-server";
import { getRepresentativeLayoutWidth } from "@homarr/boards/layout-preview";
import { getLayoutIdForViewportWidth } from "@homarr/boards/layout-selection";
import type { DeviceType } from "@homarr/common/server";
import { createLogger } from "@homarr/core/infrastructure/logs";
import { db, inArray } from "@homarr/db";
import { apps } from "@homarr/db/schema";
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
  layout,
  colorScheme,
}: {
  session: Session | null;
  name?: string;
  deviceType: DeviceType;
  locale: SupportedLanguage;
  layout: { viewportWidth: number } | { layoutId: string };
  colorScheme?: RootLayoutData["colorScheme"];
}): Promise<BoardPreparationContext | null> => {
  const [board, root, integrations] = await Promise.all([
    getBoardForSessionAsync({ session, name, deviceType }),
    loadRootLayoutDataAsync(Promise.resolve(session)),
    getIntegrationsWithPermissionsAsync(session),
  ]);
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
  const appIds = [
    ...new Set(
      board.items.flatMap((item) => {
        if (item.kind === "app" && typeof item.options.appId === "string") return [item.options.appId];
        if (item.kind === "bookmarks" && Array.isArray(item.options.items)) {
          return item.options.items.filter((id): id is string => typeof id === "string");
        }
        return [];
      }),
    ),
  ];
  // App targets live outside the Board row, but are actionable in prepared HTML.
  // Include their current values so edits/deletions invalidate the captured links.
  const linkedApps = await db.query.apps.findMany({
    where: inArray(apps.id, appIds),
    orderBy: apps.id,
  });
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
  let layoutId: string;
  if ("layoutId" in layout) layoutId = layout.layoutId;
  else layoutId = getLayoutIdForViewportWidth(board.layouts, layout.viewportWidth);
  const context = withPreparedLayout(
    {
      board,
      root: { ...root, colorScheme: colorScheme ?? root.serverSettings.appearance.defaultColorScheme },
      integrations,
      generations,
      apps: linkedApps,
      locale,
      viewportWidth: 0,
      layoutId,
    },
    layoutId,
  );
  if (!context) logger.debug("Board preparation context unavailable", { boardId: board.id, reason: "missing_layout" });
  return context;
};

export const withPreparedLayout = (
  context: BoardPreparationContext,
  layoutId: string,
): BoardPreparationContext | null => {
  const layout = context.board.layouts.find(({ id }) => id === layoutId);
  if (!layout) return null;
  return { ...context, layoutId, viewportWidth: getRepresentativeLayoutWidth(layout, context.board.layouts) };
};

export const getBoardPreparationSpec = (
  context: BoardPreparationContext,
  route: Pick<BoardPreparationSpec, "pathname" | "deviceType">,
): BoardPreparationSpec => ({
  boardId: context.board.id,
  boardName: context.board.name,
  viewerId: context.root.session?.user.id ?? null,
  sessionExpires: context.root.session?.expires ?? null,
  locale: context.locale,
  layoutId: context.layoutId,
  colorScheme: context.root.colorScheme,
  pathname: route.pathname,
  deviceType: route.deviceType,
});
