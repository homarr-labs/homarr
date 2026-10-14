import { ORPCError } from "@orpc/server";
import { parse } from "superjson";
import type { BoardLane } from "@homarr/definitions";

import { createBoardAccessHelpers } from "./access";
import type { BoardProcedureResources } from "./resources";
import type { BoardReadScope } from "./scope";

export const defaultManageOverviewPreviewRows = 12;
export const maxManageOverviewPreviewRows = 48;

export function createBoardOverviewReader(resources: BoardProcedureResources) {
  const { boardUserPermissions, apps, itemLayouts, sectionLayouts, sections } = resources.tables;
  const { and, eq, inArray, gte, lt, gt } = resources.operators;
  const { boardLanes, getRootSectionLane, getBoardLaneColumnCount } = resources.definitions;
  const { getBoardAccessContextAsync, getBoardGroupPermissionWhere, getCanViewAllBoards, getAccessibleBoardsWhere } =
    createBoardAccessHelpers(resources);

  return async function getManageOverviewAsync(
    scope: BoardReadScope,
    input: { fullPreview: boolean; previewRowLimit?: number; userId?: string } | undefined,
  ) {
    const { db, identity, readAsync } = scope;
    const sessionUserId = identity.type === "authenticated" ? identity.userId : undefined;
    const userId = input?.userId ?? sessionUserId;
    if (userId !== sessionUserId && !(identity.type === "authenticated" && identity.permissions.includes("admin")))
      throw new ORPCError("FORBIDDEN", { message: "You are not allowed to view boards for this user" });
    const { boardIds, currentUser, groupMemberships } = await getBoardAccessContextAsync(scope, userId);
    const groupPermissionWhere = getBoardGroupPermissionWhere(groupMemberships);
    const canViewAllBoards = getCanViewAllBoards(groupMemberships);
    let previewRowLimit = input?.previewRowLimit ?? defaultManageOverviewPreviewRows;
    if (input?.fullPreview) previewRowLimit = maxManageOverviewPreviewRows;

    const dbBoards = await readAsync(() =>
      db.query.boards.findMany({
        columns: { id: true, name: true, logoImageUrl: true, isPublic: true },
        with: {
          creator: { columns: { id: true, name: true, image: true } },
          userPermissions: { columns: { permission: true }, where: eq(boardUserPermissions.userId, userId ?? "") },
          groupPermissions: { columns: { permission: true }, where: groupPermissionWhere },
          layouts: {
            columns: {
              id: true,
              columnCount: true,
              leftGutterColumnCount: true,
              rightGutterColumnCount: true,
              breakpoint: true,
              role: true,
            },
            orderBy: (layout, { desc, sql }) => [
              sql`CASE WHEN ${layout.role} = 'base' THEN 0 ELSE 1 END`,
              desc(layout.breakpoint),
            ],
            limit: 1,
          },
          sections: {
            columns: { id: true, kind: true, xOffset: true },
            where: eq(sections.kind, "empty"),
            orderBy: (section, { asc }) => [asc(section.xOffset), asc(section.id)],
          },
        },
        where: getAccessibleBoardsWhere(canViewAllBoards, userId, boardIds),
      }),
    );

    const previewLayoutIds = dbBoards.flatMap((board) => board.layouts.map((layout) => layout.id));
    const rootSectionIds = dbBoards.flatMap((board) => board.sections.map((section) => section.id));
    const [rootPreviewItemLayouts, previewSectionLayouts] =
      previewLayoutIds.length > 0 && rootSectionIds.length > 0
        ? await Promise.all([
            readAsync(() =>
              db.query.itemLayouts.findMany({
                columns: {
                  itemId: true,
                  layoutId: true,
                  sectionId: true,
                  xOffset: true,
                  yOffset: true,
                  width: true,
                  height: true,
                },
                with: { item: { columns: { kind: true, options: true } } },
                where: and(
                  inArray(itemLayouts.layoutId, previewLayoutIds),
                  inArray(itemLayouts.sectionId, rootSectionIds),
                  gte(itemLayouts.xOffset, 0),
                  gte(itemLayouts.yOffset, 0),
                  lt(itemLayouts.yOffset, previewRowLimit),
                  gt(itemLayouts.width, 0),
                  gt(itemLayouts.height, 0),
                ),
              }),
            ),
            readAsync(() =>
              db.query.sectionLayouts.findMany({
                columns: {
                  sectionId: true,
                  layoutId: true,
                  parentSectionId: true,
                  xOffset: true,
                  yOffset: true,
                  width: true,
                  height: true,
                },
                with: { section: { columns: { kind: true } } },
                where: and(
                  inArray(sectionLayouts.layoutId, previewLayoutIds),
                  inArray(sectionLayouts.parentSectionId, rootSectionIds),
                  gte(sectionLayouts.xOffset, 0),
                  gte(sectionLayouts.yOffset, 0),
                  lt(sectionLayouts.yOffset, previewRowLimit),
                  gt(sectionLayouts.width, 0),
                  gt(sectionLayouts.height, 0),
                ),
              }),
            ),
          ])
        : [[], []];

    const previewContainerSectionIds = [
      ...new Set(
        previewSectionLayouts.filter((layout) => layout.section.kind === "container").map((layout) => layout.sectionId),
      ),
    ];
    const nestedPreviewItemLayouts =
      previewLayoutIds.length > 0 && previewContainerSectionIds.length > 0
        ? await readAsync(() =>
            db.query.itemLayouts.findMany({
              columns: {
                itemId: true,
                layoutId: true,
                sectionId: true,
                xOffset: true,
                yOffset: true,
                width: true,
                height: true,
              },
              with: { item: { columns: { kind: true, options: true } } },
              where: and(
                inArray(itemLayouts.layoutId, previewLayoutIds),
                inArray(itemLayouts.sectionId, previewContainerSectionIds),
                gte(itemLayouts.xOffset, 0),
                gte(itemLayouts.yOffset, 0),
                lt(itemLayouts.yOffset, previewRowLimit),
                gt(itemLayouts.width, 0),
                gt(itemLayouts.height, 0),
              ),
            }),
          )
        : [];
    const previewItemLayouts = [...rootPreviewItemLayouts, ...nestedPreviewItemLayouts];
    const appIdByItemId = new Map(
      previewItemLayouts.flatMap((layout) => {
        if (layout.item.kind !== "app") return [];
        try {
          const { appId } = parse<{ appId?: unknown }>(layout.item.options);
          return typeof appId === "string" ? [[layout.itemId, appId] as const] : [];
        } catch {
          return [];
        }
      }),
    );
    const previewAppIds = [...new Set(appIdByItemId.values())];
    const previewApps =
      previewAppIds.length > 0
        ? await readAsync(() =>
            db.query.apps.findMany({ columns: { id: true, iconUrl: true }, where: inArray(apps.id, previewAppIds) }),
          )
        : [];
    const appIconUrlById = new Map(previewApps.map((app) => [app.id, app.iconUrl]));

    return dbBoards.map(({ layouts: boardLayouts, sections: boardSections, ...board }) => {
      const previewLayout = boardLayouts.at(0);
      const rootsByLane = new Map<BoardLane, (typeof boardSections)[number]>();
      for (const section of boardSections) {
        const lane = getRootSectionLane(section.xOffset);
        if (!rootsByLane.has(lane)) rootsByLane.set(lane, section);
      }
      const previewRoots = boardLanes.flatMap((lane) => {
        const root = rootsByLane.get(lane);
        return root ? [{ id: root.id, kind: "empty" as const, xOffset: root.xOffset, layouts: [] }] : [];
      });
      const rootColumnCountById = new Map(
        boardLanes.flatMap((lane) => {
          const root = rootsByLane.get(lane);
          return root && previewLayout ? [[root.id, getBoardLaneColumnCount(previewLayout, lane)] as const] : [];
        }),
      );
      const isInsideRootLane = (layout: { sectionId: string; xOffset: number }) => {
        const columnCount = rootColumnCountById.get(layout.sectionId);
        return columnCount !== undefined && columnCount > 0 && layout.xOffset < columnCount;
      };
      const isInsideParentRootLane = (layout: { parentSectionId: string | null; xOffset: number }) => {
        if (!layout.parentSectionId) return false;
        const columnCount = rootColumnCountById.get(layout.parentSectionId);
        return columnCount !== undefined && columnCount > 0 && layout.xOffset < columnCount;
      };
      const containerPreview = previewLayout
        ? previewSectionLayouts
            .filter(
              (layout) =>
                layout.layoutId === previewLayout.id &&
                layout.section.kind === "container" &&
                isInsideParentRootLane(layout),
            )
            .map((layout) => ({ id: layout.sectionId, kind: "container" as const, xOffset: null, layouts: [layout] }))
        : [];
      const visibleContainerSizeById = new Map(
        containerPreview.map((section) => [section.id, section.layouts[0]] as const),
      );
      const isInsideVisibleContainer = (layout: { sectionId: string; xOffset: number; yOffset: number }) => {
        const containerLayout = visibleContainerSizeById.get(layout.sectionId);
        return (
          containerLayout !== undefined &&
          layout.xOffset < containerLayout.width &&
          layout.yOffset < containerLayout.height
        );
      };
      const itemPreview = previewLayout
        ? previewItemLayouts
            .filter(
              (layout) =>
                layout.layoutId === previewLayout.id && (isInsideRootLane(layout) || isInsideVisibleContainer(layout)),
            )
            .map((layout) => {
              const appId = appIdByItemId.get(layout.itemId);
              return {
                id: layout.itemId,
                kind: layout.item.kind,
                iconUrl: appId ? appIconUrlById.get(appId) : undefined,
                layouts: [layout],
              };
            })
        : [];
      return {
        ...board,
        isHome: currentUser?.homeBoardId === board.id,
        isMobileHome: currentUser?.mobileHomeBoardId === board.id,
        preview: previewLayout
          ? { layouts: [previewLayout], sections: [...previewRoots, ...containerPreview], items: itemPreview }
          : null,
      };
    });
  };
}
