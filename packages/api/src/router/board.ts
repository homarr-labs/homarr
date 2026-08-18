import { TRPCError } from "@trpc/server";
import superjson from "superjson";
import { z } from "zod/v4";

import { constructBoardPermissions } from "@homarr/auth/shared";
import { createId, generateResponsiveGridFor } from "@homarr/common";
import type { GridAlgorithmItem } from "@homarr/common";
import type { DeviceType } from "@homarr/common/server";
import { createLogger } from "@homarr/core/infrastructure/logs";
import type { Database, InferInsertModel, InferSelectModel, SQL } from "@homarr/db";
import { and, asc, eq, gt, gte, handleTransactionsAsync, inArray, isNull, like, lt, not, or, sql } from "@homarr/db";
import { createDbInsertCollectionWithoutTransaction } from "@homarr/db/collection";
import { seedProtectedBoardLayoutsAsync } from "@homarr/db/migrations/seed";
import { getServerSettingByKeyAsync } from "@homarr/db/queries";
import {
  boardGroupPermissions,
  boards,
  boardUserPermissions,
  groupMembers,
  groupPermissions,
  groups,
  integrationGroupPermissions,
  integrationItems,
  integrationUserPermissions,
  integrations,
  apps,
  itemLayouts,
  items,
  layouts,
  sectionCollapseStates,
  sectionLayouts,
  sections,
  users,
} from "@homarr/db/schema";
import type { BoardLane, IntegrationKind, WidgetKind } from "@homarr/definitions";
import {
  boardLanes,
  emptySuperJSON,
  everyoneGroup,
  getBoardLaneColumnCount,
  getRootSectionLane,
  getWidgetIntegrationIssue,
  getWidgetIntegrationIssueMessage,
  getPermissionsWithChildren,
  getPermissionsWithParents,
  normalizeBoardLayoutRoles,
  rootSectionOffsets,
  widgetDefaultSizes,
  widgetKinds,
} from "@homarr/definitions";
import {
  addItemToBoardSchema,
  boardByNameSchema,
  boardChangeVisibilitySchema,
  boardCreateSchema,
  boardDuplicateSchema,
  boardRenameSchema,
  boardResetLayoutSchema,
  boardSaveLayoutsSchema,
  boardSavePartialSettingsSchema,
  boardSavePermissionsSchema,
  boardSaveSchema,
  boardSettingsSchema,
  boardSummarySchema,
} from "@homarr/validation/board";
import { byIdSchema } from "@homarr/validation/common";
import { zodUnionFromArray } from "@homarr/validation/enums";
import type { BoardItemAdvancedOptions } from "@homarr/validation/shared";
import { sectionSchema, sharedItemSchema } from "@homarr/validation/shared";

import { createTRPCRouter, permissionRequiredProcedure, protectedProcedure, publicProcedure } from "../trpc";
import { throwIfActionForbiddenAsync } from "./board/board-access";
import { throwIfActionForbiddenAsync as throwIfIntegrationActionForbiddenAsync } from "./integration/integration-access";
import {
  throwIfCustomWidgetBoardDuplicationForbidden,
  throwIfCustomWidgetPlacementChangeForbidden,
} from "./board/custom-widget-placement-access";
import { validateTimetableOptionsChangeAsync } from "./widgets/timetable";

interface BoardItemPlacementRectangle {
  xOffset: number;
  yOffset: number;
  width: number;
  height: number;
}

const boardItemPlacementTails = new Map<string, Promise<void>>();
const maxManageOverviewPreviewRows = 12;

const serializeBoardItemPlacementAsync = async <T>(boardId: string, operation: () => Promise<T>) => {
  const previous = boardItemPlacementTails.get(boardId) ?? Promise.resolve();
  const { promise: current, resolve: release } = Promise.withResolvers<void>();
  const tail = previous.then(() => current);
  boardItemPlacementTails.set(boardId, tail);
  await previous;

  try {
    return await operation();
  } finally {
    release();
    if (boardItemPlacementTails.get(boardId) === tail) boardItemPlacementTails.delete(boardId);
  }
};

const findFirstAvailableBoardItemPosition = (
  placements: readonly BoardItemPlacementRectangle[],
  columnCount: number,
  size: { width: number; height: number },
) => {
  for (let yOffset = 0; yOffset < 9999; yOffset++) {
    for (let xOffset = 0; xOffset + size.width <= columnCount; xOffset++) {
      const overlaps = placements.some(
        (placement) =>
          placement.yOffset < yOffset + size.height &&
          placement.yOffset + placement.height > yOffset &&
          placement.xOffset < xOffset + size.width &&
          placement.xOffset + placement.width > xOffset,
      );
      if (!overlaps) return { xOffset, yOffset };
    }
  }
  return null;
};

export const boardRouter = createTRPCRouter({
  exists: permissionRequiredProcedure
    .requiresPermission("board-create")
    .input(z.string())
    .query(async ({ ctx, input: name }) => {
      try {
        await noBoardWithSimilarNameAsync(ctx.db, name);
        return false;
      } catch (error) {
        if (error instanceof TRPCError && error.code === "CONFLICT") {
          return true;
        }
        throw error;
      }
    }),
  getPublicBoards: publicProcedure.query(async ({ ctx }) => {
    return await ctx.db.query.boards.findMany({
      columns: {
        id: true,
        name: true,
        logoImageUrl: true,
      },
      where: eq(boards.isPublic, true),
    });
  }),
  getBoardsForGroup: permissionRequiredProcedure
    .requiresPermission("admin")
    .input(z.object({ groupId: z.string() }))
    .query(async ({ ctx, input }) => {
      const dbEveryoneAndCurrentGroup = await ctx.db.query.groups.findMany({
        where: or(eq(groups.name, everyoneGroup), eq(groups.id, input.groupId)),
        with: {
          boardPermissions: true,
          permissions: true,
        },
      });

      const distinctPermissions = new Set(
        dbEveryoneAndCurrentGroup.flatMap((group) => group.permissions.map(({ permission }) => permission)),
      );
      const canViewAllBoards = getPermissionsWithChildren([...distinctPermissions]).includes("board-view-all");

      const boardIds = dbEveryoneAndCurrentGroup.flatMap((group) =>
        group.boardPermissions.map(({ boardId }) => boardId),
      );
      const boardWhere = canViewAllBoards ? undefined : or(eq(boards.isPublic, true), inArray(boards.id, boardIds));

      return await ctx.db.query.boards.findMany({
        columns: {
          id: true,
          name: true,
          logoImageUrl: true,
        },
        where: boardWhere,
      });
    }),
  getAllBoards: publicProcedure
    .input(z.void())
    .output(z.array(boardSummarySchema))
    .meta({
      openapi: { method: "GET", path: "/api/boards", tags: ["boards"], protect: true },
      mcp: {
        enabled: true,
        description:
          "List all boards the current user can access. Returns id, name, logoImageUrl, isPublic, creator, isHome and isMobileHome flags",
      },
    })
    .query(async ({ ctx }) => {
      const userId = ctx.session?.user.id;
      const { boardIds, currentUser, groupMemberships } = await getBoardAccessContextAsync(ctx.db, userId);
      const groupPermissionWhere = getBoardGroupPermissionWhere(groupMemberships);

      const dbBoards = await ctx.db.query.boards.findMany({
        columns: {
          id: true,
          name: true,
          logoImageUrl: true,
          isPublic: true,
        },
        with: {
          creator: {
            columns: {
              id: true,
              name: true,
              image: true,
              email: true,
            },
          },
          userPermissions: {
            where: eq(boardUserPermissions.userId, ctx.session?.user.id ?? ""),
          },
          groupPermissions: {
            where: groupPermissionWhere,
          },
        },
        where: getAccessibleBoardsWhere(ctx.session?.user.permissions.includes("board-view-all"), userId, boardIds),
      });
      return dbBoards.map((board) => ({
        ...board,
        isHome: currentUser?.homeBoardId === board.id,
        isMobileHome: currentUser?.mobileHomeBoardId === board.id,
      }));
    }),
  getManageOverview: publicProcedure.query(async ({ ctx }) => {
    const userId = ctx.session?.user.id;
    const { boardIds, currentUser, groupMemberships } = await getBoardAccessContextAsync(ctx.db, userId);
    const groupPermissionWhere = getBoardGroupPermissionWhere(groupMemberships);

    const dbBoards = await ctx.db.query.boards.findMany({
      columns: {
        id: true,
        name: true,
        logoImageUrl: true,
        isPublic: true,
      },
      with: {
        creator: {
          columns: {
            id: true,
            name: true,
            image: true,
          },
        },
        userPermissions: {
          columns: { permission: true },
          where: eq(boardUserPermissions.userId, userId ?? ""),
        },
        groupPermissions: {
          columns: { permission: true },
          where: groupPermissionWhere,
        },
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
          columns: {
            id: true,
            kind: true,
            xOffset: true,
          },
          where: eq(sections.kind, "empty"),
          orderBy: (section, { asc }) => [asc(section.xOffset), asc(section.id)],
        },
      },
      where: getAccessibleBoardsWhere(ctx.session?.user.permissions.includes("board-view-all"), userId, boardIds),
    });

    const previewLayoutIds = dbBoards.flatMap((board) => board.layouts.map((layout) => layout.id));
    const rootSectionIds = dbBoards.flatMap((board) => board.sections.map((section) => section.id));
    const [rootPreviewItemLayouts, previewSectionLayouts] =
      previewLayoutIds.length > 0 && rootSectionIds.length > 0
        ? await Promise.all([
            ctx.db.query.itemLayouts.findMany({
              columns: {
                itemId: true,
                layoutId: true,
                sectionId: true,
                xOffset: true,
                yOffset: true,
                width: true,
                height: true,
              },
              with: {
                item: {
                  columns: { kind: true, options: true },
                },
              },
              where: and(
                inArray(itemLayouts.layoutId, previewLayoutIds),
                inArray(itemLayouts.sectionId, rootSectionIds),
                gte(itemLayouts.xOffset, 0),
                gte(itemLayouts.yOffset, 0),
                lt(itemLayouts.yOffset, maxManageOverviewPreviewRows),
                gt(itemLayouts.width, 0),
                gt(itemLayouts.height, 0),
              ),
            }),
            ctx.db.query.sectionLayouts.findMany({
              columns: {
                sectionId: true,
                layoutId: true,
                parentSectionId: true,
                xOffset: true,
                yOffset: true,
                width: true,
                height: true,
              },
              with: {
                section: {
                  columns: { kind: true },
                },
              },
              where: and(
                inArray(sectionLayouts.layoutId, previewLayoutIds),
                inArray(sectionLayouts.parentSectionId, rootSectionIds),
                gte(sectionLayouts.xOffset, 0),
                gte(sectionLayouts.yOffset, 0),
                lt(sectionLayouts.yOffset, maxManageOverviewPreviewRows),
                gt(sectionLayouts.width, 0),
                gt(sectionLayouts.height, 0),
              ),
            }),
          ])
        : [[], []];

    const previewContainerSectionIds = [
      ...new Set(
        previewSectionLayouts.filter((layout) => layout.section.kind === "container").map((layout) => layout.sectionId),
      ),
    ];
    const nestedPreviewItemLayouts =
      previewLayoutIds.length > 0 && previewContainerSectionIds.length > 0
        ? await ctx.db.query.itemLayouts.findMany({
            columns: {
              itemId: true,
              layoutId: true,
              sectionId: true,
              xOffset: true,
              yOffset: true,
              width: true,
              height: true,
            },
            with: {
              item: {
                columns: { kind: true, options: true },
              },
            },
            where: and(
              inArray(itemLayouts.layoutId, previewLayoutIds),
              inArray(itemLayouts.sectionId, previewContainerSectionIds),
              gte(itemLayouts.xOffset, 0),
              gte(itemLayouts.yOffset, 0),
              lt(itemLayouts.yOffset, maxManageOverviewPreviewRows),
              gt(itemLayouts.width, 0),
              gt(itemLayouts.height, 0),
            ),
          })
        : [];
    const previewItemLayouts = [...rootPreviewItemLayouts, ...nestedPreviewItemLayouts];

    const appIdByItemId = new Map(
      previewItemLayouts.flatMap((layout) => {
        if (layout.item.kind !== "app") return [];
        try {
          const { appId } = superjson.parse<{ appId?: unknown }>(layout.item.options);
          return typeof appId === "string" ? [[layout.itemId, appId] as const] : [];
        } catch {
          return [];
        }
      }),
    );
    const previewAppIds = [...new Set(appIdByItemId.values())];
    const previewApps =
      previewAppIds.length > 0
        ? await ctx.db.query.apps.findMany({
            columns: { id: true, iconUrl: true },
            where: inArray(apps.id, previewAppIds),
          })
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
            .map((layout) => ({
              id: layout.sectionId,
              kind: "container" as const,
              xOffset: null,
              layouts: [layout],
            }))
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
          ? {
              layouts: [previewLayout],
              sections: [...previewRoots, ...containerPreview],
              items: itemPreview,
            }
          : null,
      };
    });
  }),
  search: publicProcedure
    .input(z.object({ query: z.string(), limit: z.number().min(1).max(100).default(10) }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session?.user.id;
      const permissionsOfCurrentUserWhenPresent = await ctx.db.query.boardUserPermissions.findMany({
        where: eq(boardUserPermissions.userId, userId ?? ""),
      });

      const permissionsOfCurrentUserGroupsWhenPresent = await ctx.db.query.groupMembers.findMany({
        where: eq(groupMembers.userId, userId ?? ""),
        with: {
          group: {
            with: {
              boardPermissions: {},
            },
          },
        },
      });
      const boardIds = permissionsOfCurrentUserWhenPresent
        .map((permission) => permission.boardId)
        .concat(
          permissionsOfCurrentUserGroupsWhenPresent
            .map((groupMember) => groupMember.group.boardPermissions.map((permission) => permission.boardId))
            .flat(),
        );

      const currentUserWhenPresent = await ctx.db.query.users.findFirst({
        where: eq(users.id, userId ?? ""),
      });

      const foundBoards = await ctx.db.query.boards.findMany({
        where: and(
          like(boards.name, `%${input.query}%`),
          ctx.session?.user.permissions.includes("board-view-all")
            ? undefined
            : or(
                eq(boards.isPublic, true),
                eq(boards.creatorId, ctx.session?.user.id ?? ""),
                inArray(boards.id, boardIds),
              ),
        ),
        limit: input.limit,
        columns: {
          id: true,
          name: true,
          creatorId: true,
          isPublic: true,
          logoImageUrl: true,
        },
        with: {
          userPermissions: {
            where: eq(boardUserPermissions.userId, ctx.session?.user.id ?? ""),
          },
          groupPermissions: {
            where:
              permissionsOfCurrentUserGroupsWhenPresent.length >= 1
                ? inArray(
                    boardGroupPermissions.groupId,
                    permissionsOfCurrentUserGroupsWhenPresent.map((groupMember) => groupMember.groupId),
                  )
                : undefined,
          },
        },
      });

      return foundBoards.map((board) => ({
        id: board.id,
        name: board.name,
        logoImageUrl: board.logoImageUrl,
        permissions: constructBoardPermissions(board, ctx.session),
        isHome: currentUserWhenPresent?.homeBoardId === board.id,
        isMobileHome: currentUserWhenPresent?.mobileHomeBoardId === board.id,
      }));
    }),
  createBoard: permissionRequiredProcedure
    .requiresPermission("board-create")
    .meta({
      openapi: { method: "POST", path: "/api/boards", tags: ["boards"], protect: true },
      mcp: {
        enabled: true,
        description:
          "Create a new board with a name, column count (1-24), and isPublic flag. Returns { boardId, name, layoutId }. Requires board-create permission",
      },
    })
    .input(boardCreateSchema)
    .output(z.object({ boardId: z.string(), name: z.string(), layoutId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const boardId = createId();
      const mobileLayoutId = createId();
      const baseLayoutId = createId();

      const user = await ctx.db.query.users.findFirst({
        where: eq(users.id, ctx.session.user.id),
        columns: {
          homeBoardId: true,
        },
      });

      const createBoardCollection = createDbInsertCollectionWithoutTransaction(["boards", "sections", "layouts"]);

      createBoardCollection.boards.push({
        id: boardId,
        name: input.name,
        isPublic: input.isPublic,
        creatorId: ctx.session.user.id,
      });
      createBoardCollection.sections.push({
        id: createId(),
        kind: "empty",
        xOffset: 0,
        yOffset: 0,
        boardId,
      });
      createBoardCollection.layouts.push(
        {
          id: mobileLayoutId,
          name: "Mobile",
          columnCount: 3,
          leftGutterColumnCount: 0,
          rightGutterColumnCount: 0,
          breakpoint: 0,
          role: "mobile",
          boardId,
        },
        {
          id: baseLayoutId,
          name: "Base",
          columnCount: input.columnCount,
          leftGutterColumnCount: 0,
          rightGutterColumnCount: 0,
          breakpoint: 768,
          role: "base",
          boardId,
        },
      );

      await createBoardCollection.insertAllAsync(ctx.db);

      if (!user?.homeBoardId) {
        await ctx.db.update(users).set({ homeBoardId: boardId }).where(eq(users.id, ctx.session.user.id));
      }

      return { boardId, name: input.name, layoutId: baseLayoutId };
    }),
  duplicateBoard: permissionRequiredProcedure
    .requiresPermission("board-create")
    .meta({
      openapi: { method: "POST", path: "/api/boards/{id}/duplicate", tags: ["boards"], protect: true },
      mcp: {
        enabled: true,
        description:
          "Duplicate an existing board into a new board. Requires board-create permission and view permission on the source board. REQUIRED: id (source board ID), name (unique name for the new board). Returns { boardId }",
      },
    })
    .input(boardDuplicateSchema)
    .output(z.object({ boardId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await throwIfActionForbiddenAsync(ctx, eq(boards.id, input.id), "view");
      await noBoardWithSimilarNameAsync(ctx.db, input.name);

      const board = await ctx.db.query.boards.findFirst({
        where: eq(boards.id, input.id),
        with: {
          layouts: true,
          sections: {
            with: {
              collapseStates: true,
              layouts: true,
            },
          },
          items: {
            with: {
              layouts: true,
              integrations: true,
            },
          },
        },
      });

      if (!board) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Board not found",
        });
      }

      const { sections: boardSections, items: boardItems, layouts: boardLayouts, ...boardProps } = board;
      throwIfCustomWidgetBoardDuplicationForbidden(ctx.session.user.permissions.includes("admin"), boardItems);

      const newBoardId = createId();

      const generatedMobileLayoutId = createId();
      const generatedMobilePositions =
        boardLayouts.length === 1 && boardLayouts[0]
          ? getUpdatedBoardLayout(board, {
              previous: {
                layoutId: boardLayouts[0].id,
                columnCount: boardLayouts[0].columnCount,
                leftGutterColumnCount: boardLayouts[0].leftGutterColumnCount,
                rightGutterColumnCount: boardLayouts[0].rightGutterColumnCount,
              },
              current: {
                layoutId: generatedMobileLayoutId,
                columnCount: 3,
                leftGutterColumnCount: 0,
                rightGutterColumnCount: 0,
              },
            })
          : null;
      const normalizedBoardLayouts =
        boardLayouts.length === 0
          ? [
              {
                id: generatedMobileLayoutId,
                name: "Mobile",
                columnCount: 3,
                leftGutterColumnCount: 0,
                rightGutterColumnCount: 0,
                breakpoint: 0,
                role: "mobile" as const,
                boardId: board.id,
              },
              {
                id: createId(),
                name: "Base",
                columnCount: 10,
                leftGutterColumnCount: 0,
                rightGutterColumnCount: 0,
                breakpoint: 768,
                role: "base" as const,
                boardId: board.id,
              },
            ]
          : boardLayouts.length === 1 && boardLayouts[0]
            ? [
                {
                  id: generatedMobileLayoutId,
                  name: "Mobile",
                  columnCount: 3,
                  leftGutterColumnCount: 0,
                  rightGutterColumnCount: 0,
                  breakpoint: 0,
                  role: "mobile" as const,
                  boardId: board.id,
                },
                { ...boardLayouts[0], breakpoint: 768, role: "base" as const },
              ]
            : normalizeBoardLayoutRoles(boardLayouts);
      const layoutsMap = new Map<string, string>(normalizedBoardLayouts.map((layout) => [layout.id, createId()]));
      const layoutsToInsert = normalizedBoardLayouts.map((layout) => ({
        ...layout,
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        id: layoutsMap.get(layout.id)!,
        boardId: newBoardId,
      }));

      const sectionMap = new Map<string, string>(boardSections.map((section) => [section.id, createId()]));
      const sectionsToInsert: InferInsertModel<typeof sections>[] = boardSections.map(
        ({ collapseStates: _, layouts: _layouts, ...section }) => ({
          ...section,
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          id: sectionMap.get(section.id)!,
          boardId: newBoardId,
        }),
      );

      const sectionLayoutsToInsert: InferInsertModel<typeof sectionLayouts>[] = boardSections
        .flatMap((section) =>
          section.layouts.map((layoutSection): InferInsertModel<typeof sectionLayouts> => ({
            ...layoutSection,
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            layoutId: layoutsMap.get(layoutSection.layoutId)!,
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            sectionId: sectionMap.get(layoutSection.sectionId)!,
            parentSectionId: layoutSection.parentSectionId
              ? // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                sectionMap.get(layoutSection.parentSectionId)!
              : layoutSection.parentSectionId,
          })),
        )
        .concat(
          (generatedMobilePositions?.sectionLayouts ?? []).map((layoutSection) => ({
            ...layoutSection,
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            layoutId: layoutsMap.get(layoutSection.layoutId)!,
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            sectionId: sectionMap.get(layoutSection.sectionId)!,
            parentSectionId: layoutSection.parentSectionId
              ? // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                sectionMap.get(layoutSection.parentSectionId)!
              : null,
          })),
        );
      const sectionCollapseStatesToInsert: InferInsertModel<typeof sectionCollapseStates>[] = boardSections.flatMap(
        (section) =>
          section.collapseStates.map((collapseState): InferInsertModel<typeof sectionCollapseStates> => ({
            ...collapseState,
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            sectionId: sectionMap.get(collapseState.sectionId)!,
          })),
      );

      const itemMap = new Map<string, string>(boardItems.map((item) => [item.id, createId()]));
      const itemsToInsert: InferInsertModel<typeof items>[] = boardItems.map(
        ({ integrations: _, layouts: _layouts, ...item }) => ({
          ...item,
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          id: itemMap.get(item.id)!,
          boardId: newBoardId,
        }),
      );

      const itemLayoutsToInsert: InferInsertModel<typeof itemLayouts>[] = boardItems
        .flatMap((item) =>
          item.layouts.map((layoutSection): InferInsertModel<typeof itemLayouts> => ({
            ...layoutSection,
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            sectionId: sectionMap.get(layoutSection.sectionId)!,
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            itemId: itemMap.get(layoutSection.itemId)!,
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            layoutId: layoutsMap.get(layoutSection.layoutId)!,
          })),
        )
        .concat(
          (generatedMobilePositions?.itemSectionLayouts ?? []).map((layoutSection) => ({
            ...layoutSection,
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            sectionId: sectionMap.get(layoutSection.sectionId)!,
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            itemId: itemMap.get(layoutSection.itemId)!,
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            layoutId: layoutsMap.get(layoutSection.layoutId)!,
          })),
        );

      // Creates a list with all integration ids the user has access to
      const hasAccessForAll = ctx.session.user.permissions.includes("integration-use-all");
      const integrationIdsWithAccess = hasAccessForAll
        ? []
        : await ctx.db
            .selectDistinct({
              id: integrationGroupPermissions.integrationId,
            })
            .from(integrationGroupPermissions)
            .leftJoin(groupMembers, eq(integrationGroupPermissions.groupId, groupMembers.groupId))
            .where(eq(groupMembers.userId, ctx.session.user.id))
            .union(
              ctx.db
                .selectDistinct({ id: integrationUserPermissions.integrationId })
                .from(integrationUserPermissions)
                .where(eq(integrationUserPermissions.userId, ctx.session.user.id)),
            )
            .then((result) => result.map((row) => row.id));

      const itemIntegrationsToInsert = boardItems.flatMap((item) =>
        item.integrations
          // Restrict integrations to only those the user has access to
          .filter(({ integrationId }) => integrationIdsWithAccess.includes(integrationId) || hasAccessForAll)
          .map((integration) => ({
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            itemId: itemMap.get(item.id)!,
            integrationId: integration.integrationId,
          })),
      );

      await handleTransactionsAsync(ctx.db, {
        async handleAsync(db, schema) {
          await db.transaction(async (transaction) => {
            await transaction.insert(schema.boards).values({
              ...boardProps,
              id: newBoardId,
              name: input.name,
              creatorId: ctx.session.user.id,
            });

            if (layoutsToInsert.length > 0) {
              await transaction.insert(schema.layouts).values(layoutsToInsert);
            }

            if (sectionsToInsert.length > 0) {
              await transaction.insert(schema.sections).values(sectionsToInsert);
            }

            if (sectionLayoutsToInsert.length > 0) {
              await transaction.insert(schema.sectionLayouts).values(sectionLayoutsToInsert);
            }

            if (sectionCollapseStatesToInsert.length > 0) {
              await transaction.insert(schema.sectionCollapseStates).values(sectionCollapseStatesToInsert);
            }

            if (itemsToInsert.length > 0) {
              await transaction.insert(schema.items).values(itemsToInsert);
            }

            if (itemLayoutsToInsert.length > 0) {
              await transaction.insert(schema.itemLayouts).values(itemLayoutsToInsert);
            }

            if (itemIntegrationsToInsert.length > 0) {
              await transaction.insert(schema.integrationItems).values(itemIntegrationsToInsert);
            }
          });
        },
        handleSync(db) {
          db.transaction((transaction) => {
            transaction
              .insert(boards)
              .values({
                ...boardProps,
                id: newBoardId,
                name: input.name,
                creatorId: ctx.session.user.id,
              })
              .run();

            if (layoutsToInsert.length > 0) {
              transaction.insert(layouts).values(layoutsToInsert).run();
            }

            if (sectionsToInsert.length > 0) {
              transaction.insert(sections).values(sectionsToInsert).run();
            }

            if (sectionLayoutsToInsert.length > 0) {
              transaction.insert(sectionLayouts).values(sectionLayoutsToInsert).run();
            }

            if (sectionCollapseStatesToInsert.length > 0) {
              transaction.insert(sectionCollapseStates).values(sectionCollapseStatesToInsert).run();
            }

            if (itemsToInsert.length > 0) {
              transaction.insert(items).values(itemsToInsert).run();
            }

            if (itemLayoutsToInsert.length > 0) {
              transaction.insert(itemLayouts).values(itemLayoutsToInsert).run();
            }

            if (itemIntegrationsToInsert.length > 0) {
              transaction.insert(integrationItems).values(itemIntegrationsToInsert).run();
            }
          });
        },
      });

      return { boardId: newBoardId };
    }),
  renameBoard: protectedProcedure
    .meta({
      openapi: { method: "PATCH", path: "/api/boards/{id}/name", tags: ["boards"], protect: true },
      mcp: {
        enabled: true,
        description:
          "Rename a board by ID. Requires full permission on the board. REQUIRED: id (board ID), name (new unique board name)",
      },
    })
    .input(boardRenameSchema)
    .output(z.void())
    .mutation(async ({ ctx, input }) => {
      await throwIfActionForbiddenAsync(ctx, eq(boards.id, input.id), "full");

      await noBoardWithSimilarNameAsync(ctx.db, input.name, [input.id]);

      await ctx.db.update(boards).set({ name: input.name }).where(eq(boards.id, input.id));
    }),
  changeBoardVisibility: protectedProcedure
    .meta({
      openapi: { method: "PATCH", path: "/api/boards/{id}/visibility", tags: ["boards"], protect: true },
      mcp: {
        enabled: true,
        description:
          "Change board visibility. Requires full permission on the board. REQUIRED: id (board ID), visibility ('public' or 'private'). Home boards cannot be made private",
      },
    })
    .input(boardChangeVisibilitySchema)
    .output(z.void())
    .mutation(async ({ ctx, input }) => {
      await throwIfActionForbiddenAsync(ctx, eq(boards.id, input.id), "full");
      const boardSettings = await getServerSettingByKeyAsync(ctx.db, "board");

      if (
        input.visibility !== "public" &&
        (boardSettings.homeBoardId === input.id || boardSettings.mobileHomeBoardId === input.id)
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot make home board private",
        });
      }

      await ctx.db
        .update(boards)
        .set({ isPublic: input.visibility === "public" })
        .where(eq(boards.id, input.id));
    }),
  deleteBoard: protectedProcedure
    .meta({
      openapi: { method: "DELETE", path: "/api/boards/{id}", tags: ["boards"], protect: true },
      mcp: {
        enabled: true,
        description:
          "Delete a board by its ID. Requires full permission on the board. Use board_getAllBoards to find the board ID",
      },
    })
    .input(z.object({ id: z.string() }))
    .output(z.void())
    .mutation(async ({ ctx, input }) => {
      await throwIfActionForbiddenAsync(ctx, eq(boards.id, input.id), "full");

      await ctx.db.delete(boards).where(eq(boards.id, input.id));
    }),
  setHomeBoard: protectedProcedure
    .meta({
      openapi: { method: "PATCH", path: "/api/boards/{id}/home", tags: ["boards"], protect: true },
      mcp: {
        enabled: true,
        description:
          "Set the current user's desktop home board. Requires view permission on the board. REQUIRED: id (board ID)",
      },
    })
    .input(z.object({ id: z.string() }))
    .output(z.void())
    .mutation(async ({ ctx, input }) => {
      await throwIfActionForbiddenAsync(ctx, eq(boards.id, input.id), "view");

      await ctx.db.update(users).set({ homeBoardId: input.id }).where(eq(users.id, ctx.session.user.id));
    }),
  setMobileHomeBoard: protectedProcedure
    .meta({
      openapi: { method: "PATCH", path: "/api/boards/{id}/mobile-home", tags: ["boards"], protect: true },
      mcp: {
        enabled: true,
        description:
          "Set the current user's mobile home board. Requires view permission on the board. REQUIRED: id (board ID)",
      },
    })
    .input(z.object({ id: z.string() }))
    .output(z.void())
    .mutation(async ({ ctx, input }) => {
      await throwIfActionForbiddenAsync(ctx, eq(boards.id, input.id), "view");

      await ctx.db.update(users).set({ mobileHomeBoardId: input.id }).where(eq(users.id, ctx.session.user.id));
    }),
  getHomeBoard: publicProcedure.query(async ({ ctx }) => {
    const userId = ctx.session?.user.id;
    const user = userId
      ? ((await ctx.db.query.users.findFirst({
          where: eq(users.id, userId),
        })) ?? null)
      : null;

    const homeBoardId = await getHomeIdBoardAsync(ctx.db, user, ctx.deviceType);

    if (!homeBoardId) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "No home board found",
      });
    }

    const boardWhere = eq(boards.id, homeBoardId);

    await throwIfActionForbiddenAsync(ctx, boardWhere, "view");

    return await getFullBoardWithWhereAsync(ctx.db, boardWhere, ctx.session?.user.id ?? null);
  }),
  getBoardByName: publicProcedure.input(boardByNameSchema).query(async ({ input, ctx }) => {
    const boardWhere = eq(sql`UPPER(${boards.name})`, input.name.toUpperCase());
    await throwIfActionForbiddenAsync(ctx, boardWhere, "view");

    return await getFullBoardWithWhereAsync(ctx.db, boardWhere, ctx.session?.user.id ?? null);
  }),
  getBoardSettings: protectedProcedure
    .meta({
      mcp: {
        enabled: true,
        description:
          "Read the editable visual and behavior settings for one board, including its current custom CSS. Requires modify permission. REQUIRED: id (board ID). Call this before proposing board settings or custom CSS changes",
      },
    })
    .input(z.object({ id: z.string() }))
    .output(boardSettingsSchema)
    .query(async ({ input, ctx }) => {
      const boardWhere = eq(boards.id, input.id);
      await throwIfActionForbiddenAsync(ctx, boardWhere, "modify");

      const board = await ctx.db.query.boards.findFirst({
        columns: {
          id: true,
          name: true,
          pageTitle: true,
          metaTitle: true,
          logoImageUrl: true,
          faviconImageUrl: true,
          backgroundImageUrl: true,
          backgroundImageAttachment: true,
          backgroundImageRepeat: true,
          backgroundImageSize: true,
          primaryColor: true,
          secondaryColor: true,
          opacity: true,
          customCss: true,
          iconColor: true,
          itemRadius: true,
          disableStatus: true,
        },
        where: boardWhere,
      });
      if (!board) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Board not found" });
      }

      return {
        ...board,
        pageTitle: board.pageTitle ?? "",
        metaTitle: board.metaTitle ?? "",
        logoImageUrl: board.logoImageUrl ?? "",
        faviconImageUrl: board.faviconImageUrl ?? "",
        backgroundImageUrl: board.backgroundImageUrl ?? "",
        customCss: board.customCss ?? "",
        iconColor: board.iconColor ?? "",
      };
    }),
  saveLayouts: protectedProcedure
    .input(boardSaveLayoutsSchema)
    .output(boardSaveLayoutsSchema.shape.layouts)
    .mutation(async ({ ctx, input }) => {
      await throwIfActionForbiddenAsync(ctx, eq(boards.id, input.id), "modify");

      const requiredGutterRoots = (["left", "right"] as const).filter((lane) =>
        input.layouts.some((layout) => getBoardLaneColumnCount(layout, lane) > 0),
      );
      await ensureGutterRootSectionsAsync(ctx.db, input.id, requiredGutterRoots);

      const board = await getFullBoardWithWhereAsync(ctx.db, eq(boards.id, input.id), ctx.session.user.id);
      const existingLayoutsById = new Map(board.layouts.map((layout) => [layout.id, layout]));
      const addedLayouts = filterAddedItems(input.layouts, board.layouts);
      const removedLayouts = filterRemovedItems(input.layouts, board.layouts);

      if (addedLayouts.some((layout) => layout.role !== "custom")) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "New layouts must use the custom role" });
      }
      if (removedLayouts.some((layout) => layout.role !== "custom")) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Mobile and Base layouts cannot be removed" });
      }
      if (
        input.layouts.some((layout) => {
          const existingLayout = existingLayoutsById.get(layout.id);
          return existingLayout && existingLayout.role !== layout.role;
        })
      ) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Layout roles cannot be changed" });
      }

      const baseLayout = board.layouts.find((layout) => layout.role === "base");
      if (!baseLayout) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Board must have a Base layout" });
      }

      const layoutsToInsert: InferInsertModel<typeof layouts>[] = [];
      const itemSectionLayoutsToInsert: InferInsertModel<typeof itemLayouts>[] = [];
      const sectionLayoutsToInsert: InferInsertModel<typeof sectionLayouts>[] = [];
      const savedLayoutIds = new Map<string, string>();
      const requestedBaseLayout = input.layouts.find((layout) => layout.id === baseLayout.id);
      const resizedBaseLayout =
        requestedBaseLayout &&
        (requestedBaseLayout.columnCount !== baseLayout.columnCount ||
          requestedBaseLayout.leftGutterColumnCount !== baseLayout.leftGutterColumnCount ||
          requestedBaseLayout.rightGutterColumnCount !== baseLayout.rightGutterColumnCount)
          ? getUpdatedBoardLayout(board, {
              previous: {
                layoutId: baseLayout.id,
                columnCount: baseLayout.columnCount,
                leftGutterColumnCount: baseLayout.leftGutterColumnCount,
                rightGutterColumnCount: baseLayout.rightGutterColumnCount,
              },
              current: {
                layoutId: baseLayout.id,
                columnCount: requestedBaseLayout.columnCount,
                leftGutterColumnCount: requestedBaseLayout.leftGutterColumnCount,
                rightGutterColumnCount: requestedBaseLayout.rightGutterColumnCount,
              },
            })
          : null;
      const baseSourceElements = resizedBaseLayout ? getElementsForProjectedLayout(resizedBaseLayout) : undefined;
      const baseSourceGeometry = {
        layoutId: baseLayout.id,
        columnCount: requestedBaseLayout?.columnCount ?? baseLayout.columnCount,
        leftGutterColumnCount: requestedBaseLayout?.leftGutterColumnCount ?? baseLayout.leftGutterColumnCount,
        rightGutterColumnCount: requestedBaseLayout?.rightGutterColumnCount ?? baseLayout.rightGutterColumnCount,
      };

      for (const addedLayout of addedLayouts) {
        const layoutId = createId();
        savedLayoutIds.set(addedLayout.id, layoutId);
        layoutsToInsert.push({
          id: layoutId,
          name: addedLayout.name,
          columnCount: addedLayout.columnCount,
          leftGutterColumnCount: addedLayout.leftGutterColumnCount,
          rightGutterColumnCount: addedLayout.rightGutterColumnCount,
          breakpoint: addedLayout.breakpoint,
          role: "custom",
          boardId: board.id,
        });

        const projectedLayout = getUpdatedBoardLayout(board, {
          previous: {
            ...baseSourceGeometry,
            elements: baseSourceElements,
          },
          current: {
            layoutId,
            columnCount: addedLayout.columnCount,
            leftGutterColumnCount: addedLayout.leftGutterColumnCount,
            rightGutterColumnCount: addedLayout.rightGutterColumnCount,
          },
        });
        itemSectionLayoutsToInsert.push(...projectedLayout.itemSectionLayouts);
        sectionLayoutsToInsert.push(...projectedLayout.sectionLayouts);
      }

      const itemSectionLayoutsToUpdate: InferInsertModel<typeof itemLayouts>[] = [];
      const sectionLayoutsToUpdate: InferInsertModel<typeof sectionLayouts>[] = [];
      const layoutsToUpdate = filterUpdatedItems(input.layouts, board.layouts);

      for (const updatedLayout of layoutsToUpdate) {
        const dbLayout = existingLayoutsById.get(updatedLayout.id);
        if (
          !dbLayout ||
          (dbLayout.columnCount === updatedLayout.columnCount &&
            dbLayout.leftGutterColumnCount === updatedLayout.leftGutterColumnCount &&
            dbLayout.rightGutterColumnCount === updatedLayout.rightGutterColumnCount)
        )
          continue;

        const projectedLayout =
          updatedLayout.role === "base" && resizedBaseLayout
            ? resizedBaseLayout
            : getUpdatedBoardLayout(board, {
                previous: {
                  layoutId: dbLayout.id,
                  columnCount: dbLayout.columnCount,
                  leftGutterColumnCount: dbLayout.leftGutterColumnCount,
                  rightGutterColumnCount: dbLayout.rightGutterColumnCount,
                },
                current: {
                  layoutId: dbLayout.id,
                  columnCount: updatedLayout.columnCount,
                  leftGutterColumnCount: updatedLayout.leftGutterColumnCount,
                  rightGutterColumnCount: updatedLayout.rightGutterColumnCount,
                },
              });
        itemSectionLayoutsToUpdate.push(...projectedLayout.itemSectionLayouts);
        sectionLayoutsToUpdate.push(...projectedLayout.sectionLayouts);
      }

      const removedLayoutIds = removedLayouts.map((layout) => layout.id);

      await handleTransactionsAsync(ctx.db, {
        async handleAsync(db, schema) {
          await db.transaction(async (transaction) => {
            if (layoutsToInsert.length > 0) await transaction.insert(schema.layouts).values(layoutsToInsert);
            if (itemSectionLayoutsToInsert.length > 0) {
              await transaction.insert(schema.itemLayouts).values(itemSectionLayoutsToInsert);
            }
            if (sectionLayoutsToInsert.length > 0) {
              await transaction.insert(schema.sectionLayouts).values(sectionLayoutsToInsert);
            }

            for (const itemLayout of itemSectionLayoutsToUpdate) {
              await transaction
                .update(schema.itemLayouts)
                .set({
                  height: itemLayout.height,
                  width: itemLayout.width,
                  xOffset: itemLayout.xOffset,
                  yOffset: itemLayout.yOffset,
                  sectionId: itemLayout.sectionId,
                })
                .where(
                  and(
                    eq(schema.itemLayouts.itemId, itemLayout.itemId),
                    eq(schema.itemLayouts.layoutId, itemLayout.layoutId),
                  ),
                );
            }
            for (const sectionLayout of sectionLayoutsToUpdate) {
              await transaction
                .update(schema.sectionLayouts)
                .set({
                  height: sectionLayout.height,
                  width: sectionLayout.width,
                  xOffset: sectionLayout.xOffset,
                  yOffset: sectionLayout.yOffset,
                  parentSectionId: sectionLayout.parentSectionId,
                })
                .where(
                  and(
                    eq(schema.sectionLayouts.sectionId, sectionLayout.sectionId),
                    eq(schema.sectionLayouts.layoutId, sectionLayout.layoutId),
                  ),
                );
            }
            for (const layout of layoutsToUpdate) {
              await transaction
                .update(schema.layouts)
                .set({
                  name: layout.name,
                  columnCount: layout.columnCount,
                  leftGutterColumnCount: layout.leftGutterColumnCount,
                  rightGutterColumnCount: layout.rightGutterColumnCount,
                  breakpoint: layout.breakpoint,
                })
                .where(eq(schema.layouts.id, layout.id));
            }
            if (removedLayoutIds.length > 0) {
              await transaction.delete(schema.layouts).where(inArray(schema.layouts.id, removedLayoutIds));
            }
          });
        },
        handleSync(db) {
          db.transaction((transaction) => {
            if (layoutsToInsert.length > 0) transaction.insert(layouts).values(layoutsToInsert).run();
            if (itemSectionLayoutsToInsert.length > 0) {
              transaction.insert(itemLayouts).values(itemSectionLayoutsToInsert).run();
            }
            if (sectionLayoutsToInsert.length > 0) {
              transaction.insert(sectionLayouts).values(sectionLayoutsToInsert).run();
            }

            for (const itemLayout of itemSectionLayoutsToUpdate) {
              transaction
                .update(itemLayouts)
                .set({
                  height: itemLayout.height,
                  width: itemLayout.width,
                  xOffset: itemLayout.xOffset,
                  yOffset: itemLayout.yOffset,
                  sectionId: itemLayout.sectionId,
                })
                .where(and(eq(itemLayouts.itemId, itemLayout.itemId), eq(itemLayouts.layoutId, itemLayout.layoutId)))
                .run();
            }
            for (const sectionLayout of sectionLayoutsToUpdate) {
              transaction
                .update(sectionLayouts)
                .set({
                  height: sectionLayout.height,
                  width: sectionLayout.width,
                  xOffset: sectionLayout.xOffset,
                  yOffset: sectionLayout.yOffset,
                  parentSectionId: sectionLayout.parentSectionId,
                })
                .where(
                  and(
                    eq(sectionLayouts.sectionId, sectionLayout.sectionId),
                    eq(sectionLayouts.layoutId, sectionLayout.layoutId),
                  ),
                )
                .run();
            }
            for (const layout of layoutsToUpdate) {
              transaction
                .update(layouts)
                .set({
                  name: layout.name,
                  columnCount: layout.columnCount,
                  leftGutterColumnCount: layout.leftGutterColumnCount,
                  rightGutterColumnCount: layout.rightGutterColumnCount,
                  breakpoint: layout.breakpoint,
                })
                .where(eq(layouts.id, layout.id))
                .run();
            }
            if (removedLayoutIds.length > 0)
              transaction.delete(layouts).where(inArray(layouts.id, removedLayoutIds)).run();
          });
        },
      });

      return input.layouts
        .map((layout) => ({
          ...layout,
          id: savedLayoutIds.get(layout.id) ?? layout.id,
          role: existingLayoutsById.get(layout.id)?.role ?? "custom",
        }))
        .toSorted((layoutA, layoutB) => layoutA.breakpoint - layoutB.breakpoint);
    }),
  resetLayout: protectedProcedure
    .meta({
      mcp: {
        enabled: true,
        description:
          "Reset a board's Mobile or custom layout from its Base layout while preserving the target layout settings. Requires modify permission. REQUIRED: boardId (board ID), layoutId (non-Base layout ID)",
      },
    })
    .input(boardResetLayoutSchema)
    .mutation(async ({ ctx, input }) => {
      await throwIfActionForbiddenAsync(ctx, eq(boards.id, input.boardId), "modify");

      const board = await getFullBoardWithWhereAsync(ctx.db, eq(boards.id, input.boardId), ctx.session.user.id);
      const targetLayout = board.layouts.find((layout) => layout.id === input.layoutId);
      const baseLayout = board.layouts.find((layout) => layout.role === "base");

      if (!targetLayout) throw new TRPCError({ code: "NOT_FOUND", message: "Layout not found" });
      if (!baseLayout) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Board must have a Base layout" });
      }
      if (targetLayout.role === "base") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "The Base layout cannot be reset" });
      }

      const projectedLayout = getUpdatedBoardLayout(board, {
        previous: {
          layoutId: baseLayout.id,
          columnCount: baseLayout.columnCount,
          leftGutterColumnCount: baseLayout.leftGutterColumnCount,
          rightGutterColumnCount: baseLayout.rightGutterColumnCount,
        },
        current: {
          layoutId: targetLayout.id,
          columnCount: targetLayout.columnCount,
          leftGutterColumnCount: targetLayout.leftGutterColumnCount,
          rightGutterColumnCount: targetLayout.rightGutterColumnCount,
        },
      });

      await handleTransactionsAsync(ctx.db, {
        async handleAsync(db, schema) {
          await db.transaction(async (transaction) => {
            await transaction.delete(schema.itemLayouts).where(eq(schema.itemLayouts.layoutId, targetLayout.id));
            await transaction.delete(schema.sectionLayouts).where(eq(schema.sectionLayouts.layoutId, targetLayout.id));
            if (projectedLayout.itemSectionLayouts.length > 0) {
              await transaction.insert(schema.itemLayouts).values(projectedLayout.itemSectionLayouts);
            }
            if (projectedLayout.sectionLayouts.length > 0) {
              await transaction.insert(schema.sectionLayouts).values(projectedLayout.sectionLayouts);
            }
          });
        },
        handleSync(db) {
          db.transaction((transaction) => {
            transaction.delete(itemLayouts).where(eq(itemLayouts.layoutId, targetLayout.id)).run();
            transaction.delete(sectionLayouts).where(eq(sectionLayouts.layoutId, targetLayout.id)).run();
            if (projectedLayout.itemSectionLayouts.length > 0) {
              transaction.insert(itemLayouts).values(projectedLayout.itemSectionLayouts).run();
            }
            if (projectedLayout.sectionLayouts.length > 0) {
              transaction.insert(sectionLayouts).values(projectedLayout.sectionLayouts).run();
            }
          });
        },
      });
    }),
  savePartialBoardSettings: protectedProcedure
    .meta({
      openapi: { method: "PATCH", path: "/api/boards/{id}/settings", tags: ["boards"], protect: true },
      mcp: {
        enabled: true,
        description:
          "Update visual and behavior settings for a board. Requires modify permission. REQUIRED: id (board ID). Optional fields include pageTitle, metaTitle, logoImageUrl, faviconImageUrl, backgroundImageUrl, colors, opacity, customCss, itemRadius, and disableStatus",
      },
    })
    .input(boardSavePartialSettingsSchema.extend({ id: z.string() }))
    .output(z.void())
    .mutation(async ({ ctx, input }) => {
      await throwIfActionForbiddenAsync(ctx, eq(boards.id, input.id), "modify");

      await ctx.db
        .update(boards)
        .set({
          // general settings
          pageTitle: input.pageTitle,
          metaTitle: input.metaTitle,
          logoImageUrl: input.logoImageUrl,
          faviconImageUrl: input.faviconImageUrl,

          // background settings
          backgroundImageUrl: input.backgroundImageUrl,
          backgroundImageAttachment: input.backgroundImageAttachment,
          backgroundImageRepeat: input.backgroundImageRepeat,
          backgroundImageSize: input.backgroundImageSize,

          // appearance settings
          primaryColor: input.primaryColor,
          secondaryColor: input.secondaryColor,
          opacity: input.opacity,
          iconColor: input.iconColor,
          itemRadius: input.itemRadius,

          // custom css
          customCss: input.customCss,

          // Behavior settings
          disableStatus: input.disableStatus,
        })
        .where(eq(boards.id, input.id));
    }),
  saveBoard: protectedProcedure.input(boardSaveSchema).mutation(async ({ input, ctx }) => {
    await throwIfActionForbiddenAsync(ctx, eq(boards.id, input.id), "modify");

    const dbBoard = await getFullBoardWithWhereAsync(ctx.db, eq(boards.id, input.id), ctx.session.user.id);
    throwIfCustomWidgetPlacementChangeForbidden({
      isAdmin: ctx.session.user.permissions.includes("admin"),
      submittedItems: input.items,
      storedItems: dbBoard.items,
    });

    for (const item of input.items) {
      if (item.kind !== "timetable") continue;
      const previousItem = dbBoard.items.find((dbItem) => dbItem.id === item.id);
      await validateTimetableOptionsChangeAsync(
        item.options,
        previousItem?.kind === "timetable" ? previousItem.options : undefined,
      );
    }

    await handleTransactionsAsync(ctx.db, {
      async handleAsync(db, schema) {
        await db.transaction(async (transaction) => {
          const addedSections = filterAddedItems(input.sections, dbBoard.sections);

          if (addedSections.length > 0) {
            await transaction.insert(schema.sections).values(
              addedSections.map((section) => ({
                id: section.id,
                kind: section.kind,
                yOffset: section.kind === "empty" ? section.yOffset : null,
                xOffset: section.kind === "empty" ? section.xOffset : null,
                options: section.kind === "empty" ? emptySuperJSON : superjson.stringify(section.options),
                name: null,
                boardId: dbBoard.id,
              })),
            );

            const sectionLayoutsToInsert = addedSections
              .filter((section) => section.kind === "container")
              .flatMap((section) =>
                section.layouts.map((sectionLayout): InferInsertModel<typeof schema.sectionLayouts> => ({
                  layoutId: sectionLayout.layoutId,
                  sectionId: section.id,
                  parentSectionId: sectionLayout.parentSectionId,
                  height: sectionLayout.height,
                  width: sectionLayout.width,
                  xOffset: sectionLayout.xOffset,
                  yOffset: sectionLayout.yOffset,
                })),
              );

            if (sectionLayoutsToInsert.length > 0) {
              await transaction.insert(schema.sectionLayouts).values(sectionLayoutsToInsert);
            }
          }

          const addedItems = filterAddedItems(input.items, dbBoard.items);

          if (addedItems.length > 0) {
            await transaction.insert(schema.items).values(
              addedItems.map((item) => ({
                id: item.id,
                kind: item.kind,
                options: superjson.stringify(item.options),
                advancedOptions: superjson.stringify(item.advancedOptions),
                boardId: dbBoard.id,
              })),
            );
            await transaction.insert(schema.itemLayouts).values(
              addedItems.flatMap((item) =>
                item.layouts.map((layoutSection): InferInsertModel<typeof schema.itemLayouts> => ({
                  layoutId: layoutSection.layoutId,
                  sectionId: layoutSection.sectionId,
                  itemId: item.id,
                  height: layoutSection.height,
                  width: layoutSection.width,
                  xOffset: layoutSection.xOffset,
                  yOffset: layoutSection.yOffset,
                })),
              ),
            );
          }

          const inputIntegrationRelations = input.items.flatMap(({ integrationIds, id: itemId }) =>
            integrationIds.map((integrationId) => ({
              integrationId,
              itemId,
            })),
          );
          const dbIntegrationRelations = dbBoard.items.flatMap(({ integrationIds, id: itemId }) =>
            integrationIds.map((integrationId) => ({
              integrationId,
              itemId,
            })),
          );
          const addedIntegrationRelations = inputIntegrationRelations.filter(
            (inputRelation) =>
              !dbIntegrationRelations.some(
                (dbRelation) =>
                  dbRelation.itemId === inputRelation.itemId &&
                  dbRelation.integrationId === inputRelation.integrationId,
              ),
          );

          if (addedIntegrationRelations.length > 0) {
            await transaction.insert(schema.integrationItems).values(
              addedIntegrationRelations.map((relation) => ({
                itemId: relation.itemId,
                integrationId: relation.integrationId,
              })),
            );
          }

          const updatedItems = filterUpdatedItems(input.items, dbBoard.items);

          for (const item of updatedItems) {
            await transaction
              .update(schema.items)
              .set({
                kind: item.kind,
                options: superjson.stringify(item.options),
                advancedOptions: superjson.stringify(item.advancedOptions),
              })
              .where(eq(schema.items.id, item.id));

            for (const itemSectionLayout of item.layouts) {
              await transaction
                .update(schema.itemLayouts)
                .set({
                  height: itemSectionLayout.height,
                  width: itemSectionLayout.width,
                  xOffset: itemSectionLayout.xOffset,
                  yOffset: itemSectionLayout.yOffset,
                  sectionId: itemSectionLayout.sectionId,
                })
                .where(
                  and(
                    eq(schema.itemLayouts.itemId, item.id),
                    eq(schema.itemLayouts.layoutId, itemSectionLayout.layoutId),
                  ),
                );
            }
          }

          const updatedSections = filterUpdatedItems(input.sections, dbBoard.sections);

          for (const section of updatedSections) {
            await transaction
              .update(schema.sections)
              .set({
                yOffset: section.kind === "empty" ? section.yOffset : null,
                xOffset: section.kind === "empty" ? section.xOffset : null,
                options: section.kind === "empty" ? emptySuperJSON : superjson.stringify(section.options),
                name: null,
              })
              .where(eq(schema.sections.id, section.id));

            if (section.kind !== "container") continue;

            for (const sectionLayout of section.layouts) {
              await transaction
                .update(schema.sectionLayouts)
                .set({
                  height: sectionLayout.height,
                  width: sectionLayout.width,
                  xOffset: sectionLayout.xOffset,
                  yOffset: sectionLayout.yOffset,
                  parentSectionId: sectionLayout.parentSectionId,
                })
                .where(
                  and(
                    eq(schema.sectionLayouts.sectionId, section.id),
                    eq(schema.sectionLayouts.layoutId, sectionLayout.layoutId),
                  ),
                );
            }
          }

          const removedIntegrationRelations = dbIntegrationRelations.filter(
            (dbRelation) =>
              !inputIntegrationRelations.some(
                (inputRelation) =>
                  dbRelation.itemId === inputRelation.itemId &&
                  dbRelation.integrationId === inputRelation.integrationId,
              ),
          );

          for (const relation of removedIntegrationRelations) {
            await transaction
              .delete(schema.integrationItems)
              .where(
                and(
                  eq(integrationItems.itemId, relation.itemId),
                  eq(integrationItems.integrationId, relation.integrationId),
                ),
              );
          }

          const removedItems = filterRemovedItems(input.items, dbBoard.items);

          const itemIds = removedItems.map((item) => item.id);
          if (itemIds.length > 0) {
            await transaction.delete(schema.items).where(inArray(schema.items.id, itemIds));
          }

          const removedSections = filterRemovedItems(input.sections, dbBoard.sections);
          const sectionIds = removedSections.map((section) => section.id);

          if (sectionIds.length > 0) {
            await transaction.delete(schema.sections).where(inArray(schema.sections.id, sectionIds));
          }
        });
      },
      handleSync(db) {
        db.transaction((transaction) => {
          const addedSections = filterAddedItems(input.sections, dbBoard.sections);

          if (addedSections.length > 0) {
            transaction
              .insert(sections)
              .values(
                addedSections.map((section) => ({
                  id: section.id,
                  kind: section.kind,
                  yOffset: section.kind === "empty" ? section.yOffset : null,
                  xOffset: section.kind === "empty" ? section.xOffset : null,
                  options: section.kind === "empty" ? emptySuperJSON : superjson.stringify(section.options),
                  name: null,
                  boardId: dbBoard.id,
                })),
              )
              .run();

            const sectionLayoutsToInsert = addedSections
              .filter((section) => section.kind === "container")
              .flatMap((section) =>
                section.layouts.map((sectionLayout): InferInsertModel<typeof sectionLayouts> => ({
                  layoutId: sectionLayout.layoutId,
                  sectionId: section.id,
                  parentSectionId: sectionLayout.parentSectionId,
                  height: sectionLayout.height,
                  width: sectionLayout.width,
                  xOffset: sectionLayout.xOffset,
                  yOffset: sectionLayout.yOffset,
                })),
              );

            if (sectionLayoutsToInsert.length > 0) {
              transaction.insert(sectionLayouts).values(sectionLayoutsToInsert).run();
            }
          }

          const addedItems = filterAddedItems(input.items, dbBoard.items);

          if (addedItems.length > 0) {
            transaction
              .insert(items)
              .values(
                addedItems.map((item) => ({
                  id: item.id,
                  kind: item.kind,
                  options: superjson.stringify(item.options),
                  advancedOptions: superjson.stringify(item.advancedOptions),
                  boardId: dbBoard.id,
                })),
              )
              .run();
            transaction
              .insert(itemLayouts)
              .values(
                addedItems.flatMap((item) =>
                  item.layouts.map((layoutSection): InferInsertModel<typeof itemLayouts> => ({
                    layoutId: layoutSection.layoutId,
                    sectionId: layoutSection.sectionId,
                    itemId: item.id,
                    height: layoutSection.height,
                    width: layoutSection.width,
                    xOffset: layoutSection.xOffset,
                    yOffset: layoutSection.yOffset,
                  })),
                ),
              )
              .run();
          }

          const inputIntegrationRelations = input.items.flatMap(({ integrationIds, id: itemId }) =>
            integrationIds.map((integrationId) => ({
              integrationId,
              itemId,
            })),
          );
          const dbIntegrationRelations = dbBoard.items.flatMap(({ integrationIds, id: itemId }) =>
            integrationIds.map((integrationId) => ({
              integrationId,
              itemId,
            })),
          );
          const addedIntegrationRelations = inputIntegrationRelations.filter(
            (inputRelation) =>
              !dbIntegrationRelations.some(
                (dbRelation) =>
                  dbRelation.itemId === inputRelation.itemId &&
                  dbRelation.integrationId === inputRelation.integrationId,
              ),
          );

          if (addedIntegrationRelations.length > 0) {
            transaction
              .insert(integrationItems)
              .values(
                addedIntegrationRelations.map((relation) => ({
                  itemId: relation.itemId,
                  integrationId: relation.integrationId,
                })),
              )
              .run();
          }

          const updatedItems = filterUpdatedItems(input.items, dbBoard.items);

          for (const item of updatedItems) {
            transaction
              .update(items)
              .set({
                kind: item.kind,
                options: superjson.stringify(item.options),
                advancedOptions: superjson.stringify(item.advancedOptions),
              })
              .where(eq(items.id, item.id))
              .run();

            for (const itemSectionLayout of item.layouts) {
              transaction
                .update(itemLayouts)
                .set({
                  height: itemSectionLayout.height,
                  width: itemSectionLayout.width,
                  xOffset: itemSectionLayout.xOffset,
                  yOffset: itemSectionLayout.yOffset,
                  sectionId: itemSectionLayout.sectionId,
                })
                .where(and(eq(itemLayouts.itemId, item.id), eq(itemLayouts.layoutId, itemSectionLayout.layoutId)))
                .run();
            }
          }

          const updatedSections = filterUpdatedItems(input.sections, dbBoard.sections);

          for (const section of updatedSections) {
            transaction
              .update(sections)
              .set({
                yOffset: section.kind === "empty" ? section.yOffset : null,
                xOffset: section.kind === "empty" ? section.xOffset : null,
                options: section.kind === "empty" ? emptySuperJSON : superjson.stringify(section.options),
                name: null,
              })
              .where(eq(sections.id, section.id))
              .run();

            if (section.kind !== "container") continue;

            for (const sectionLayout of section.layouts) {
              transaction
                .update(sectionLayouts)
                .set({
                  height: sectionLayout.height,
                  width: sectionLayout.width,
                  xOffset: sectionLayout.xOffset,
                  yOffset: sectionLayout.yOffset,
                  parentSectionId: sectionLayout.parentSectionId,
                })
                .where(
                  and(eq(sectionLayouts.sectionId, section.id), eq(sectionLayouts.layoutId, sectionLayout.layoutId)),
                )
                .run();
            }
          }

          const removedIntegrationRelations = dbIntegrationRelations.filter(
            (dbRelation) =>
              !inputIntegrationRelations.some(
                (inputRelation) =>
                  dbRelation.itemId === inputRelation.itemId &&
                  dbRelation.integrationId === inputRelation.integrationId,
              ),
          );

          for (const relation of removedIntegrationRelations) {
            transaction
              .delete(integrationItems)
              .where(
                and(
                  eq(integrationItems.itemId, relation.itemId),
                  eq(integrationItems.integrationId, relation.integrationId),
                ),
              )
              .run();
          }

          const removedItems = filterRemovedItems(input.items, dbBoard.items);

          const itemIds = removedItems.map((item) => item.id);
          if (itemIds.length > 0) {
            transaction.delete(items).where(inArray(items.id, itemIds)).run();
          }

          const removedSections = filterRemovedItems(input.sections, dbBoard.sections);
          const sectionIds = removedSections.map((section) => section.id);

          if (sectionIds.length > 0) {
            transaction.delete(sections).where(inArray(sections.id, sectionIds)).run();
          }
        });
      },
    });
  }),
  getBoardPermissions: protectedProcedure.input(byIdSchema).query(async ({ input, ctx }) => {
    await throwIfActionForbiddenAsync(ctx, eq(boards.id, input.id), "full");

    const dbGroupPermissions = await ctx.db.query.groupPermissions.findMany({
      where: inArray(
        groupPermissions.permission,
        getPermissionsWithParents(["board-view-all", "board-modify-all", "board-full-all"]),
      ),
      columns: {
        groupId: false,
      },
      with: {
        group: {
          columns: {
            id: true,
            name: true,
          },
        },
      },
    });

    const userPermissions = await ctx.db.query.boardUserPermissions.findMany({
      where: eq(boardUserPermissions.boardId, input.id),
      with: {
        user: {
          columns: {
            id: true,
            name: true,
            image: true,
            email: true,
          },
        },
      },
    });

    const dbGroupBoardPermission = await ctx.db.query.boardGroupPermissions.findMany({
      where: eq(boardGroupPermissions.boardId, input.id),
      with: {
        group: {
          columns: {
            id: true,
            name: true,
          },
        },
      },
    });

    return {
      inherited: dbGroupPermissions.toSorted((permissionA, permissionB) => {
        return permissionA.group.name.localeCompare(permissionB.group.name);
      }),
      users: userPermissions
        .map(({ user, permission }) => ({
          user,
          permission,
        }))
        .toSorted((permissionA, permissionB) => {
          return (permissionA.user.name ?? "").localeCompare(permissionB.user.name ?? "");
        }),
      groups: dbGroupBoardPermission
        .map(({ group, permission }) => ({
          group: {
            id: group.id,
            name: group.name,
          },
          permission,
        }))
        .toSorted((permissionA, permissionB) => {
          return permissionA.group.name.localeCompare(permissionB.group.name);
        }),
    };
  }),
  saveUserBoardPermissions: protectedProcedure.input(boardSavePermissionsSchema).mutation(async ({ input, ctx }) => {
    await throwIfActionForbiddenAsync(ctx, eq(boards.id, input.entityId), "full");

    await handleTransactionsAsync(ctx.db, {
      async handleAsync(db, schema) {
        await db.transaction(async (transaction) => {
          await transaction.delete(schema.boardUserPermissions).where(eq(boardUserPermissions.boardId, input.entityId));
          if (input.permissions.length === 0) {
            return;
          }
          await transaction.insert(schema.boardUserPermissions).values(
            input.permissions.map((permission) => ({
              userId: permission.principalId,
              permission: permission.permission,
              boardId: input.entityId,
            })),
          );
        });
      },
      handleSync(db) {
        db.transaction((transaction) => {
          transaction.delete(boardUserPermissions).where(eq(boardUserPermissions.boardId, input.entityId)).run();
          if (input.permissions.length === 0) {
            return;
          }
          transaction
            .insert(boardUserPermissions)
            .values(
              input.permissions.map((permission) => ({
                userId: permission.principalId,
                permission: permission.permission,
                boardId: input.entityId,
              })),
            )
            .run();
        });
      },
    });
  }),
  saveGroupBoardPermissions: protectedProcedure.input(boardSavePermissionsSchema).mutation(async ({ input, ctx }) => {
    await throwIfActionForbiddenAsync(ctx, eq(boards.id, input.entityId), "full");

    await handleTransactionsAsync(ctx.db, {
      async handleAsync(db, schema) {
        await db.transaction(async (transaction) => {
          await transaction
            .delete(schema.boardGroupPermissions)
            .where(eq(boardGroupPermissions.boardId, input.entityId));
          if (input.permissions.length === 0) {
            return;
          }
          await transaction.insert(schema.boardGroupPermissions).values(
            input.permissions.map((permission) => ({
              groupId: permission.principalId,
              permission: permission.permission,
              boardId: input.entityId,
            })),
          );
        });
      },
      handleSync(db) {
        db.transaction((transaction) => {
          transaction.delete(boardGroupPermissions).where(eq(boardGroupPermissions.boardId, input.entityId)).run();
          if (input.permissions.length === 0) {
            return;
          }
          transaction
            .insert(boardGroupPermissions)
            .values(
              input.permissions.map((permission) => ({
                groupId: permission.principalId,
                permission: permission.permission,
                boardId: input.entityId,
              })),
            )
            .run();
        });
      },
    });
  }),
  addItem: protectedProcedure
    .meta({
      openapi: { method: "POST", path: "/api/boards/items", tags: ["boards"], protect: true },
      mcp: {
        enabled: true,
        description:
          "Add a widget/app item to a board after configure_widget has reviewed it. Automatically places it in the main canvas at the first free grid position without overlapping items or containers. Use the configure_widget result's boardId, kind, options, and integrationIds exactly. Integration IDs must be accessible to the current user. To create a formatted dashboard note, configure kind 'notebook' with options { content: Tiptap-compatible HTML, showToolbar: boolean, allowReadOnlyCheck: boolean }. Returns { itemId }",
      },
    })
    .input(addItemToBoardSchema)
    .output(z.object({ itemId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await throwIfActionForbiddenAsync(ctx, eq(boards.id, input.boardId), "modify");
      throwIfCustomWidgetPlacementChangeForbidden({
        isAdmin: ctx.session.user.permissions.includes("admin"),
        submittedItems: [{ id: "", kind: input.kind, options: input.options }],
        storedItems: [],
      });

      if (input.kind === "timetable") {
        await validateTimetableOptionsChangeAsync(input.options);
      }

      let selectedIntegrationKinds: IntegrationKind[] = [];
      if (input.integrationIds.length > 0) {
        const existing = await ctx.db.query.integrations.findMany({
          columns: { id: true, kind: true },
          where: inArray(integrations.id, input.integrationIds),
        });
        const validIds = new Set(existing.map((row) => row.id));
        const invalid = input.integrationIds.filter((id) => !validIds.has(id));
        if (invalid.length > 0) {
          throw new TRPCError({ code: "BAD_REQUEST", message: `Invalid integration IDs: ${invalid.join(", ")}` });
        }

        selectedIntegrationKinds = existing.map((integration) => integration.kind);

        await Promise.all(
          input.integrationIds.map((integrationId) =>
            throwIfIntegrationActionForbiddenAsync(ctx, eq(integrations.id, integrationId), "use"),
          ),
        );
      }

      const integrationIssue = getWidgetIntegrationIssue(input.kind, selectedIntegrationKinds);
      if (integrationIssue) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: getWidgetIntegrationIssueMessage(input.kind, integrationIssue),
        });
      }

      return await serializeBoardItemPlacementAsync(input.boardId, async () => {
        const board = await ctx.db.query.boards.findFirst({
          where: eq(boards.id, input.boardId),
          with: {
            sections: { with: { layouts: true } },
            layouts: true,
            items: { with: { layouts: true } },
          },
        });

        if (!board) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Board not found" });
        }

        const emptySection = board.sections
          .filter((section) => section.kind === "empty" && getRootSectionLane(section.xOffset) === "main")
          .toSorted(
            (sectionA, sectionB) =>
              (sectionA.yOffset ?? 0) - (sectionB.yOffset ?? 0) || sectionA.id.localeCompare(sectionB.id),
          )[0];

        if (!emptySection) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Board has no main section to place items in" });
        }

        const itemId = createId();
        const defaultSize = widgetDefaultSizes[input.kind as WidgetKind] ?? { width: 1, height: 1 };
        const layoutRows: (typeof itemLayouts.$inferInsert)[] = board.layouts.map((layout) => {
          const columnCount = getBoardLaneColumnCount(layout, getRootSectionLane(emptySection.xOffset));
          const size = { ...defaultSize, width: Math.min(columnCount, defaultSize.width) };
          const itemPlacements = board.items
            .flatMap((item) => item.layouts)
            .filter((itemLayout) => itemLayout.sectionId === emptySection.id && itemLayout.layoutId === layout.id);
          const containerPlacements = board.sections
            .filter((section) => section.kind === "container")
            .flatMap((section) => section.layouts)
            .filter(
              (sectionLayout) =>
                sectionLayout.parentSectionId === emptySection.id && sectionLayout.layoutId === layout.id,
            );
          const position = findFirstAvailableBoardItemPosition(
            [...itemPlacements, ...containerPlacements],
            columnCount,
            size,
          );

          if (!position) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Board section is full, no free grid position available",
            });
          }

          return {
            itemId,
            sectionId: emptySection.id,
            layoutId: layout.id,
            ...position,
            width: size.width,
            height: size.height,
          };
        });

        await ctx.db.insert(items).values({
          id: itemId,
          boardId: input.boardId,
          kind: input.kind,
          options: superjson.stringify(input.options),
          advancedOptions: emptySuperJSON,
        });
        if (layoutRows.length > 0) await ctx.db.insert(itemLayouts).values(layoutRows);
        if (input.integrationIds.length > 0) {
          await ctx.db
            .insert(integrationItems)
            .values(input.integrationIds.map((integrationId) => ({ itemId, integrationId })));
        }

        return { itemId };
      });
    }),
});

/**
 * Get the home board id of the user with the given device type
 * For an example of a user with deviceType = 'mobile' it would go through the following order:
 * 1. user.mobileHomeBoardId
 * 2. user.homeBoardId
 * 3. group.mobileHomeBoardId of the lowest positions group
 * 4. group.homeBoardId of the lowest positions group
 * 5. everyoneGroup.mobileHomeBoardId
 * 6. everyoneGroup.homeBoardId
 * 7. serverSettings.mobileHomeBoardId
 * 8. serverSettings.homeBoardId
 * 9. show NOT_FOUND error
 */
export const getHomeIdBoardAsync = async (
  db: Database,
  user: InferSelectModel<typeof users> | null,
  deviceType: DeviceType,
) => {
  const settingKey = deviceType === "mobile" ? "mobileHomeBoardId" : "homeBoardId";

  if (!user) {
    const boardSettings = await getServerSettingByKeyAsync(db, "board");
    return boardSettings[settingKey] ?? boardSettings.homeBoardId;
  }

  if (user[settingKey]) return user[settingKey];
  if (user.homeBoardId) return user.homeBoardId;

  const lowestGroupExceptEveryone = await db
    .select({
      homeBoardId: groups.homeBoardId,
      mobileHomeBoardId: groups.mobileHomeBoardId,
    })
    .from(groups)
    .leftJoin(groupMembers, eq(groups.id, groupMembers.groupId))
    .where(
      and(
        eq(groupMembers.userId, user.id),
        not(eq(groups.name, everyoneGroup)),
        not(isNull(groups[settingKey])),
        not(isNull(groups.homeBoardId)),
      ),
    )
    .orderBy(asc(groups.position))
    .limit(1)
    .then((result) => result[0]);

  if (lowestGroupExceptEveryone?.[settingKey]) return lowestGroupExceptEveryone[settingKey];
  if (lowestGroupExceptEveryone?.homeBoardId) return lowestGroupExceptEveryone.homeBoardId;

  const dbEveryoneGroup = await db.query.groups.findFirst({
    where: eq(groups.name, everyoneGroup),
  });

  if (dbEveryoneGroup?.[settingKey]) return dbEveryoneGroup[settingKey];
  if (dbEveryoneGroup?.homeBoardId) return dbEveryoneGroup.homeBoardId;

  const boardSettings = await getServerSettingByKeyAsync(db, "board");
  return boardSettings[settingKey] ?? boardSettings.homeBoardId;
};

const noBoardWithSimilarNameAsync = async (db: Database, name: string, ignoredIds: string[] = []) => {
  const boards = await db.query.boards.findMany({
    columns: {
      id: true,
      name: true,
    },
  });

  const board = boards.find(
    (board) => board.name.toLowerCase() === name.toLowerCase() && !ignoredIds.includes(board.id),
  );

  if (board) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "Board with similar name already exists",
    });
  }
};

interface BoardForLayoutProjection {
  id: string;
  items: Array<{
    id: string;
    layouts: Array<{
      layoutId: string;
      sectionId: string;
      width: number;
      height: number;
      xOffset: number;
      yOffset: number;
    }>;
  }>;
  sections: Array<{
    id: string;
    kind: string;
    xOffset?: number | null;
    yOffset?: number | null;
    layouts?: Array<{
      layoutId: string;
      parentSectionId: string | null;
      width: number;
      height: number;
      xOffset: number;
      yOffset: number;
    }>;
  }>;
}

const getUpdatedBoardLayout = (
  board: BoardForLayoutProjection,
  options: {
    previous: BoardLayoutGeometry & { elements?: GridAlgorithmItem[] };
    current: BoardLayoutGeometry;
  },
) => {
  const elements = options.previous.elements ?? getElementsForLayout(board, options.previous.layoutId);
  const emptyRoots = board.sections
    .filter((section) => section.kind === "empty")
    .toSorted((first, second) => (first.yOffset ?? 0) - (second.yOffset ?? 0) || first.id.localeCompare(second.id));
  const rootByLane = new Map<BoardLane, (typeof emptyRoots)[number]>();
  for (const root of emptyRoots) {
    const lane = getRootSectionLane(root.xOffset);
    if (!rootByLane.has(lane)) rootByLane.set(lane, root);
  }
  const mainRoot = rootByLane.get("main");
  if (!mainRoot) throw new Error(`Board "${board.id}" has no main canvas root`);

  const sourceRootById = new Map(
    emptyRoots.map((section) => [section.id, getRootSectionLane(section.xOffset)] as const),
  );
  const targetLaneBySourceLane = new Map<BoardLane, BoardLane>(
    boardLanes.map((lane) => [
      lane,
      lane !== "main" && getBoardLaneColumnCount(options.current, lane) === 0 ? "main" : lane,
    ]),
  );
  const remappedElements = elements.map((element) => {
    const sourceLane = sourceRootById.get(element.sectionId);
    if (!sourceLane) return element;
    const targetLane = targetLaneBySourceLane.get(sourceLane) ?? "main";
    const targetRoot = rootByLane.get(targetLane) ?? mainRoot;
    return {
      ...element,
      sectionId: targetRoot.id,
    };
  });

  const results = boardLanes.flatMap((lane) => {
    const root = rootByLane.get(lane);
    const width = getBoardLaneColumnCount(options.current, lane);
    if (!root || width === 0) return [];
    const sourceLanes = boardLanes.filter(
      (sourceLane) =>
        rootByLane.has(sourceLane) &&
        getBoardLaneColumnCount(options.previous, sourceLane) > 0 &&
        targetLaneBySourceLane.get(sourceLane) === lane,
    );
    const previousWidth =
      sourceLanes.length === 1
        ? getBoardLaneColumnCount(options.previous, sourceLanes[0] ?? "main")
        : Number.MAX_SAFE_INTEGER;

    return [
      generateResponsiveGridFor({
        items: remappedElements,
        previousWidth,
        width,
        sectionId: root.id,
      }),
    ];
  });
  const updatedElements = results.flatMap((result) => result.items);
  const updatedElementById = new Map(updatedElements.map((element) => [element.id, element]));

  const itemSectionLayoutsCollection = board.items.flatMap((item): InferInsertModel<typeof itemLayouts>[] => {
    const currentElement = updatedElementById.get(item.id);
    if (!currentElement || currentElement.type !== "item") return [];

    return [
      {
        itemId: item.id,
        layoutId: options.current.layoutId,
        sectionId: currentElement.sectionId,
        height: currentElement.height,
        width: currentElement.width,
        xOffset: currentElement.xOffset,
        yOffset: currentElement.yOffset,
      },
    ];
  });

  const sectionLayoutsCollection = board.sections.flatMap((section): InferInsertModel<typeof sectionLayouts>[] => {
    if (section.kind !== "container") return [];
    const currentElement = updatedElementById.get(section.id);
    if (!currentElement || currentElement.type !== "section") return [];

    return [
      {
        layoutId: options.current.layoutId,
        sectionId: section.id,
        parentSectionId: currentElement.sectionId,
        height: currentElement.height,
        width: currentElement.width,
        xOffset: currentElement.xOffset,
        yOffset: currentElement.yOffset,
      },
    ];
  });

  return {
    itemSectionLayouts: itemSectionLayoutsCollection,
    sectionLayouts: sectionLayoutsCollection,
  };
};

const getElementsForProjectedLayout = (
  projectedLayout: ReturnType<typeof getUpdatedBoardLayout>,
): GridAlgorithmItem[] => [
  ...projectedLayout.itemSectionLayouts.map((layout) => ({
    id: layout.itemId,
    type: "item" as const,
    height: layout.height,
    width: layout.width,
    xOffset: layout.xOffset,
    yOffset: layout.yOffset,
    sectionId: layout.sectionId,
  })),
  ...projectedLayout.sectionLayouts.flatMap((layout) =>
    layout.parentSectionId
      ? [
          {
            id: layout.sectionId,
            type: "section" as const,
            height: layout.height,
            width: layout.width,
            xOffset: layout.xOffset,
            yOffset: layout.yOffset,
            sectionId: layout.parentSectionId,
          },
        ]
      : [],
  ),
];

interface BoardLayoutGeometry {
  layoutId: string;
  columnCount: number;
  leftGutterColumnCount: number;
  rightGutterColumnCount: number;
}

type GutterLane = Exclude<BoardLane, "main">;

const ensureGutterRootSectionsAsync = async (db: Database, boardId: string, lanes: readonly GutterLane[]) => {
  if (lanes.length === 0) return;

  const getMissingLanes = (existingOffsets: readonly (number | null)[]) =>
    lanes.filter((lane) => {
      const rootCount = existingOffsets.filter((offset) => offset === rootSectionOffsets[lane]).length;
      if (rootCount > 1) throw new Error(`Board "${boardId}" has multiple ${lane} canvas roots`);
      return rootCount === 0;
    });
  const getRows = (missingLanes: readonly GutterLane[]) =>
    missingLanes.map((lane) => ({
      id: createId(),
      boardId,
      kind: "empty" as const,
      xOffset: rootSectionOffsets[lane],
      yOffset: 0,
      options: emptySuperJSON,
    }));

  await handleTransactionsAsync(db, {
    async handleAsync(database, schema) {
      await database.transaction(async (transaction) => {
        await transaction
          .select({ id: schema.boards.id })
          .from(schema.boards)
          .where(eq(schema.boards.id, boardId))
          .for("update");

        const existingRoots = await transaction
          .select({ xOffset: schema.sections.xOffset })
          .from(schema.sections)
          .where(
            and(
              eq(schema.sections.boardId, boardId),
              eq(schema.sections.kind, "empty"),
              inArray(
                schema.sections.xOffset,
                lanes.map((lane) => rootSectionOffsets[lane]),
              ),
            ),
          );
        const rows = getRows(getMissingLanes(existingRoots.map(({ xOffset }) => xOffset)));
        if (rows.length > 0) await transaction.insert(schema.sections).values(rows);
      });
    },
    handleSync(database) {
      database.transaction(
        (transaction) => {
          const existingRoots = transaction
            .select({ xOffset: sections.xOffset })
            .from(sections)
            .where(
              and(
                eq(sections.boardId, boardId),
                eq(sections.kind, "empty"),
                inArray(
                  sections.xOffset,
                  lanes.map((lane) => rootSectionOffsets[lane]),
                ),
              ),
            )
            .all();
          const rows = getRows(getMissingLanes(existingRoots.map(({ xOffset }) => xOffset)));
          if (rows.length > 0) transaction.insert(sections).values(rows).run();
        },
        { behavior: "immediate" },
      );
    },
  });
};

const getElementsForLayout = (board: BoardForLayoutProjection, layoutId: string) => {
  const sectionElements = board.sections
    .filter((section) => section.kind === "container")
    .flatMap((section) => {
      const clonedLayout = section.layouts?.find((sectionLayout) => sectionLayout.layoutId === layoutId);
      if (!clonedLayout?.parentSectionId) return [];

      return [
        {
          id: section.id,
          type: "section" as const,
          height: clonedLayout.height,
          width: clonedLayout.width,
          xOffset: clonedLayout.xOffset,
          yOffset: clonedLayout.yOffset,
          sectionId: clonedLayout.parentSectionId,
        },
      ];
    });

  const itemElements = board.items.flatMap((item) => {
    const clonedLayout = item.layouts.find((itemLayout) => itemLayout.layoutId === layoutId);
    if (!clonedLayout) return [];

    return [
      {
        id: item.id,
        type: "item" as const,
        height: clonedLayout.height,
        width: clonedLayout.width,
        xOffset: clonedLayout.xOffset,
        yOffset: clonedLayout.yOffset,
        sectionId: clonedLayout.sectionId,
      },
    ];
  });

  return [...itemElements, ...sectionElements];
};

const protectedLayoutRepairPromises = new Map<string, Promise<void>>();

const getBoardAccessContextAsync = async (db: Database, userId: string | undefined) => {
  const [userPermissions, groupMemberships, currentUser] = await Promise.all([
    db.query.boardUserPermissions.findMany({
      where: eq(boardUserPermissions.userId, userId ?? ""),
    }),
    db.query.groupMembers.findMany({
      where: eq(groupMembers.userId, userId ?? ""),
      with: {
        group: {
          with: {
            boardPermissions: {},
          },
        },
      },
    }),
    db.query.users.findFirst({
      where: eq(users.id, userId ?? ""),
      columns: {
        homeBoardId: true,
        mobileHomeBoardId: true,
      },
    }),
  ]);
  const boardIds = userPermissions
    .map((permission) => permission.boardId)
    .concat(
      groupMemberships.flatMap((membership) =>
        membership.group.boardPermissions.map((permission) => permission.boardId),
      ),
    );

  return { boardIds, currentUser, groupMemberships };
};

const getBoardGroupPermissionWhere = (
  groupMemberships: Awaited<ReturnType<typeof getBoardAccessContextAsync>>["groupMemberships"],
) =>
  groupMemberships.length > 0
    ? inArray(
        boardGroupPermissions.groupId,
        groupMemberships.map((membership) => membership.groupId),
      )
    : eq(boardGroupPermissions.groupId, "");

const getAccessibleBoardsWhere = (canViewAll: boolean | undefined, userId: string | undefined, boardIds: string[]) =>
  canViewAll
    ? undefined
    : or(
        eq(boards.isPublic, true),
        eq(boards.creatorId, userId ?? ""),
        boardIds.length > 0 ? inArray(boards.id, boardIds) : undefined,
      );

const getFullBoardWithWhereAsync = async (
  db: Database,
  where: SQL<unknown>,
  userId: string | null,
  repairProtectedLayouts = true,
) => {
  const groupPermissionWhere = userId
    ? inArray(
        boardGroupPermissions.groupId,
        db.select({ groupId: groupMembers.groupId }).from(groupMembers).where(eq(groupMembers.userId, userId)),
      )
    : eq(boardGroupPermissions.groupId, "");
  const board = await db.query.boards.findFirst({
    where,
    with: {
      creator: {
        columns: {
          id: true,
          name: true,
          image: true,
          email: true,
        },
      },
      sections: {
        with: {
          collapseStates: {
            where: eq(sectionCollapseStates.userId, userId ?? ""),
          },
          layouts: true,
        },
      },
      items: {
        with: {
          integrations: {
            columns: {
              integrationId: true,
            },
          },
          layouts: true,
        },
      },
      layouts: true,
      userPermissions: {
        where: eq(boardUserPermissions.userId, userId ?? ""),
        columns: {
          permission: true,
        },
      },
      groupPermissions: {
        where: groupPermissionWhere,
      },
    },
  });

  if (!board) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Board not found",
    });
  }

  if (repairProtectedLayouts && boardLayoutsNeedRepair(board.layouts)) {
    let repairPromise = protectedLayoutRepairPromises.get(board.id);
    if (!repairPromise) {
      repairPromise = seedProtectedBoardLayoutsAsync(db, board.id).finally(() => {
        protectedLayoutRepairPromises.delete(board.id);
      });
      protectedLayoutRepairPromises.set(board.id, repairPromise);
    }
    await repairPromise;
    return getFullBoardWithWhereAsync(db, where, userId, false);
  }

  const { sections, items, layouts, ...otherBoardProperties } = board;

  return {
    ...otherBoardProperties,
    layouts: layouts
      .map(({ boardId: _, ...layout }) => layout)
      .toSorted((layoutA, layoutB) => layoutA.breakpoint - layoutB.breakpoint),
    sections: sections.map(({ collapseStates, ...section }) =>
      parseSection({
        ...section,
        xOffset: section.xOffset,
        yOffset: section.yOffset,
        options: superjson.parse(section.options ?? emptySuperJSON),
        layouts: section.layouts.map((layout) => ({
          xOffset: layout.xOffset,
          yOffset: layout.yOffset,
          width: layout.width,
          height: layout.height,
          parentSectionId: layout.parentSectionId,
          layoutId: layout.layoutId,
        })),
        collapsed: collapseStates.at(0)?.collapsed ?? false,
      }),
    ),
    items: items
      .map(({ integrations: itemIntegrations, ...item }) =>
        parseItem({
          ...item,
          layouts: item.layouts.map((layout) => ({
            xOffset: layout.xOffset,
            yOffset: layout.yOffset,
            width: layout.width,
            height: layout.height,
            layoutId: layout.layoutId,
            sectionId: layout.sectionId,
          })),
          integrationIds: itemIntegrations.map((item) => item.integrationId),
          advancedOptions: superjson.parse<BoardItemAdvancedOptions>(item.advancedOptions),
          options: superjson.parse<Record<string, unknown>>(item.options),
        }),
      )
      .filter((item): item is NonNullable<typeof item> => item !== null),
  };
};

export const boardLayoutsNeedRepair = (
  boardLayouts: Array<{ id: string; breakpoint: number; role: "mobile" | "base" | "custom" }>,
) => {
  const mobileLayouts = boardLayouts.filter((layout) => layout.role === "mobile");
  const baseLayouts = boardLayouts.filter((layout) => layout.role === "base");
  const baseLayout = baseLayouts.at(0);

  return (
    mobileLayouts.length !== 1 ||
    baseLayouts.length !== 1 ||
    mobileLayouts.at(0)?.breakpoint !== 0 ||
    !baseLayout ||
    boardLayouts.some((layout) => layout.id !== baseLayout.id && layout.breakpoint >= baseLayout.breakpoint) ||
    new Set(boardLayouts.map((layout) => layout.breakpoint)).size !== boardLayouts.length
  );
};

const forKind = <T extends WidgetKind>(kind: T) =>
  z.object({
    kind: z.literal(kind),
    options: z.record(z.string(), z.unknown()),
  });

const outputItemSchema = zodUnionFromArray(widgetKinds.map((kind) => forKind(kind))).and(sharedItemSchema);

const boardLogger = createLogger({ module: "board" });

const parseItem = (item: unknown) => {
  const result = outputItemSchema.safeParse(item);

  if (!result.success) {
    boardLogger.warn("Failed to parse board item, skipping", { error: result.error.message });
    return null;
  }
  return result.data;
};

const parseSection = (section: unknown) => {
  const result = sectionSchema.safeParse(section);

  if (!result.success) {
    throw new Error(result.error.message);
  }
  return result.data;
};

const filterAddedItems = <TInput extends { id: string }>(inputArray: TInput[], dbArray: TInput[]) =>
  inputArray.filter((inputItem) => !dbArray.some((dbItem) => dbItem.id === inputItem.id));

const filterRemovedItems = <TInput extends { id: string }>(inputArray: TInput[], dbArray: TInput[]) =>
  dbArray.filter((dbItem) => !inputArray.some((inputItem) => dbItem.id === inputItem.id));

const filterUpdatedItems = <TInput extends { id: string }>(inputArray: TInput[], dbArray: TInput[]) =>
  inputArray.filter((inputItem) => dbArray.some((dbItem) => dbItem.id === inputItem.id));
