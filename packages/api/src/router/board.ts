import { TRPCError } from "@trpc/server";
import superjson from "superjson";
import { z } from "zod/v4";

import type { Session } from "@homarr/auth";
import { constructBoardPermissions } from "@homarr/auth/shared";
import {
  createId,
  generateResponsiveGridFor,
  getLayoutResizeSource,
  serializeLayoutResizeSource,
} from "@homarr/common";
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
  integrationItems,
  apps,
  itemLayouts,
  items,
  layouts,
  sectionCollapseStates,
  sectionLayouts,
  sections,
  users,
} from "@homarr/db/schema";
import type { BoardLane, WidgetKind } from "@homarr/definitions";
import {
  boardLanes,
  emptySuperJSON,
  everyoneGroup,
  getBoardLaneColumnCount,
  getRootSectionLane,
  getPermissionsWithChildren,
  getPermissionsWithParents,
  normalizeBoardLayoutRoles,
  rootSectionOffsets,
  widgetKinds,
} from "@homarr/definitions";
import {
  addBoardSectionSchema,
  addItemToBoardSchema,
  boardApiDetailSchema,
  boardApiItemSchema,
  boardApiLayoutSchema,
  boardApiSectionSchema,
  boardByNameSchema,
  boardChangeVisibilitySchema,
  boardCreateSchema,
  boardDuplicateSchema,
  boardExportSchema,
  boardImportSchema,
  boardPermissionsOutputSchema,
  boardRenameSchema,
  boardResetLayoutSchema,
  boardSaveLayoutsSchema,
  boardSavePartialSettingsSchema,
  boardSavePermissionsSchema,
  boardSaveSchema,
  boardSettingsSchema,
  boardSummarySchema,
  removeBoardItemSchema,
  removeBoardSectionSchema,
  updateBoardItemLayoutSchema,
  updateBoardItemSchema,
  updateBoardSectionSchema,
} from "@homarr/validation/board";
import { byIdSchema } from "@homarr/validation/common";
import { zodUnionFromArray } from "@homarr/validation/enums";
import type { BoardItemAdvancedOptions } from "@homarr/validation/shared";
import {
  containerSectionOptionsSchema,
  itemAdvancedOptionsSchema,
  sectionSchema,
  sharedItemSchema,
} from "@homarr/validation/shared";

import { createTRPCRouter, permissionRequiredProcedure, protectedProcedure, publicProcedure } from "../trpc";
import { throwIfActionForbiddenAsync } from "./board/board-access";
import { validateWidgetConfigurationsAsync } from "./board/widget-configuration";
import { createBoardExportDocument, insertBoardDocumentAsync, replaceBoardDocumentAsync } from "./board/board-io";
import {
  collectOccupiedAreas,
  getColumnCountOfSection,
  getDefaultSizeForKind,
  resolvePlacementForAllLayouts,
} from "./board/item-placement";
import type { DbOperation } from "./db-operations";
import { runDbOperationsAsync } from "./db-operations";
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
const defaultManageOverviewPreviewRows = 12;
const maxManageOverviewPreviewRows = 48;
const manageOverviewInputSchema = z
  .object({
    fullPreview: z.boolean().default(false),
    previewRowLimit: z.number().int().min(1).max(maxManageOverviewPreviewRows).optional(),
    userId: z.string().optional(),
  })
  .optional();

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

const doBoardItemPlacementsOverlap = (left: BoardItemPlacementRectangle, right: BoardItemPlacementRectangle) =>
  left.yOffset < right.yOffset + right.height &&
  left.yOffset + left.height > right.yOffset &&
  left.xOffset < right.xOffset + right.width &&
  left.xOffset + left.width > right.xOffset;

const searchAccessibleBoardsAsync = async (
  ctx: { db: Database; session: Session | null },
  query: string,
  limit?: number,
) => {
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
          permissions: {},
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
      like(boards.name, `%${query}%`),
      ctx.session?.user.permissions.includes("board-view-all")
        ? undefined
        : or(eq(boards.isPublic, true), eq(boards.creatorId, ctx.session?.user.id ?? ""), inArray(boards.id, boardIds)),
    ),
    limit,
    orderBy: asc(boards.name),
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
        where: getBoardGroupPermissionWhere(permissionsOfCurrentUserGroupsWhenPresent),
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
      openapi: {
        method: "GET",
        path: "/api/boards",
        tags: ["boards"],
        protect: true,
        summary: "List accessible boards",
        description:
          "Return accessible boards with creator details, visibility, and the current user's desktop and mobile home flags. Anonymous callers can see public boards.",
      },
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
  getManageOverview: publicProcedure.input(manageOverviewInputSchema).query(async ({ ctx, input }) => {
    const sessionUserId = ctx.session?.user.id;
    const userId = input?.userId ?? sessionUserId;
    if (userId !== sessionUserId && !ctx.session?.user.permissions.includes("admin")) {
      throw new TRPCError({ code: "FORBIDDEN", message: "You are not allowed to view boards for this user" });
    }
    const { boardIds, currentUser, groupMemberships } = await getBoardAccessContextAsync(ctx.db, userId);
    const groupPermissionWhere = getBoardGroupPermissionWhere(groupMemberships);
    const canViewAllBoards = getCanViewAllBoards(groupMemberships);
    let previewRowLimit = input?.previewRowLimit ?? defaultManageOverviewPreviewRows;
    if (input?.fullPreview) previewRowLimit = maxManageOverviewPreviewRows;

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
      where: getAccessibleBoardsWhere(canViewAllBoards, userId, boardIds),
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
                lt(itemLayouts.yOffset, previewRowLimit),
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
                lt(sectionLayouts.yOffset, previewRowLimit),
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
              lt(itemLayouts.yOffset, previewRowLimit),
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
  catalog: publicProcedure
    .meta({ mcp: { enabled: true, description: "List every board the current user can access." } })
    .query(async ({ ctx }) => searchAccessibleBoardsAsync(ctx, "")),
  search: publicProcedure
    .meta({
      mcp: {
        enabled: true,
        description: "Search accessible boards by name. REQUIRED: query (string). OPTIONAL: limit (number).",
      },
    })
    .input(z.object({ query: z.string(), limit: z.number().min(1).max(100).default(10) }))
    .query(async ({ ctx, input }) => searchAccessibleBoardsAsync(ctx, input.query, input.limit)),
  createBoard: permissionRequiredProcedure
    .requiresPermission("board-create")
    .meta({
      openapi: {
        method: "POST",
        path: "/api/boards",
        tags: ["boards"],
        protect: true,
        summary: "Create a board",
        description:
          "Create a board with base and mobile layouts. Requires board-create permission. Returns the board ID, name, and base layout ID; sets the creator's home board if none is selected.",
      },
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
      openapi: {
        method: "POST",
        path: "/api/boards/{id}/duplicate",
        tags: ["boards"],
        protect: true,
        summary: "Duplicate a board",
        description:
          "Copy a board under a unique name and return its new ID. Requires board-create permission, view access to the source, and use access to its linked integrations. Widget configurations must be valid; boards containing Custom Widgets require admin permission.",
      },
      mcp: {
        enabled: true,
        description:
          "Duplicate an existing board into a new board. Requires board-create permission, view permission on the source board, and use permission for every linked integration. Every widget-integration configuration must be valid. REQUIRED: id (source board ID), name (unique name for the new board). Returns { boardId }",
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
      await validateWidgetConfigurationsAsync(
        ctx,
        boardItems.map((item) => ({
          id: item.id,
          kind: item.kind,
          integrationIds: item.integrations.map(({ integrationId }) => integrationId),
        })),
      );

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
        resizeSource: null,
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
          section.layouts.map(
            (layoutSection): InferInsertModel<typeof sectionLayouts> => ({
              ...layoutSection,
              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
              layoutId: layoutsMap.get(layoutSection.layoutId)!,
              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
              sectionId: sectionMap.get(layoutSection.sectionId)!,
              parentSectionId: layoutSection.parentSectionId
                ? // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                  sectionMap.get(layoutSection.parentSectionId)!
                : layoutSection.parentSectionId,
            }),
          ),
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
          section.collapseStates.map(
            (collapseState): InferInsertModel<typeof sectionCollapseStates> => ({
              ...collapseState,
              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
              sectionId: sectionMap.get(collapseState.sectionId)!,
            }),
          ),
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
          item.layouts.map(
            (layoutSection): InferInsertModel<typeof itemLayouts> => ({
              ...layoutSection,
              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
              sectionId: sectionMap.get(layoutSection.sectionId)!,
              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
              itemId: itemMap.get(layoutSection.itemId)!,
              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
              layoutId: layoutsMap.get(layoutSection.layoutId)!,
            }),
          ),
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

      const itemIntegrationsToInsert = boardItems.flatMap((item) =>
        item.integrations.map((integration) => ({
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
      openapi: {
        method: "PATCH",
        path: "/api/boards/{id}/name",
        tags: ["boards"],
        protect: true,
        summary: "Rename a board",
        description: "Change a board's name to a unique name. Requires full access to the board.",
      },
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
      openapi: {
        method: "PATCH",
        path: "/api/boards/{id}/visibility",
        tags: ["boards"],
        protect: true,
        summary: "Change board visibility",
        description:
          "Make a board public or private. Requires full access to the board. A board selected as an instance desktop or mobile home board cannot be made private.",
      },
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
      openapi: {
        method: "DELETE",
        path: "/api/boards/{id}",
        tags: ["boards"],
        protect: true,
        summary: "Delete a board",
        description: "Delete a board by ID. Requires full access to the board.",
      },
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
      openapi: {
        method: "PATCH",
        path: "/api/boards/{id}/home",
        tags: ["boards"],
        protect: true,
        summary: "Set your desktop home board",
        description: "Select the current user's desktop home board. Requires view access to the board.",
      },
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
      openapi: {
        method: "PATCH",
        path: "/api/boards/{id}/mobile-home",
        tags: ["boards"],
        protect: true,
        summary: "Set your mobile home board",
        description: "Select the current user's mobile home board. Requires view access to the board.",
      },
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
    .meta({
      openapi: {
        method: "PUT",
        path: "/api/boards/{id}/layouts",
        tags: ["boards"],
        protect: true,
        summary: "Replace the layouts of a board",
        description:
          "Set the responsive breakpoints of a board. The array replaces the current layouts, so one missing from it is deleted and existing elements are re-flowed. A board needs exactly one Mobile and one Base layout; every other layout uses the custom role. Requires modify access.",
      },
      mcp: {
        enabled: true,
        description:
          "Replace the layouts (responsive breakpoints) of a board. REQUIRED: id (board ID), layouts (array of { id, name, columnCount 1-24, breakpoint, role }). A board needs exactly one 'mobile' layout at breakpoint 0 and one 'base' layout, added layouts must use the 'custom' role. Optional leftGutterColumnCount/rightGutterColumnCount reserve columns for a sidebar. Layouts missing from the array are deleted and existing items are re-flowed automatically",
      },
    })
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
      const resizeSourcesToUpdate = new Map<string, string | null>();

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
        resizeSourcesToUpdate.set(updatedLayout.id, projectedLayout.resizeSource);
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
                  ...getResizeSourceUpdate(resizeSourcesToUpdate, layout.id),
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
                  ...getResizeSourceUpdate(resizeSourcesToUpdate, layout.id),
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
            await transaction
              .update(schema.layouts)
              .set({ resizeSource: null })
              .where(eq(schema.layouts.id, targetLayout.id));
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
            transaction.update(layouts).set({ resizeSource: null }).where(eq(layouts.id, targetLayout.id)).run();
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
      openapi: {
        method: "PATCH",
        path: "/api/boards/{id}/settings",
        tags: ["boards"],
        protect: true,
        summary: "Update board settings",
        description:
          "Update the supplied appearance, metadata, background, custom CSS, or status settings. Omitted settings remain unchanged. Requires modify access to the board.",
      },
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
    await validateWidgetConfigurationsAsync(ctx, input.items, dbBoard.items);
    throwIfCustomWidgetPlacementChangeForbidden({
      isAdmin: ctx.session.user.permissions.includes("admin"),
      submittedItems: input.items,
      storedItems: dbBoard.items,
    });

    for (const item of input.items) {
      if (item.kind !== "timetable") continue;
      const previousItem = dbBoard.items.find((dbItem) => dbItem.id === item.id);
      let previousOptions: Record<string, unknown> | undefined;
      if (previousItem?.kind === "timetable") previousOptions = previousItem.options;
      await validateTimetableOptionsChangeAsync(item.options, previousOptions);
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
                section.layouts.map(
                  (sectionLayout): InferInsertModel<typeof schema.sectionLayouts> => ({
                    layoutId: sectionLayout.layoutId,
                    sectionId: section.id,
                    parentSectionId: sectionLayout.parentSectionId,
                    height: sectionLayout.height,
                    width: sectionLayout.width,
                    xOffset: sectionLayout.xOffset,
                    yOffset: sectionLayout.yOffset,
                  }),
                ),
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
                item.layouts.map(
                  (layoutSection): InferInsertModel<typeof schema.itemLayouts> => ({
                    layoutId: layoutSection.layoutId,
                    sectionId: layoutSection.sectionId,
                    itemId: item.id,
                    height: layoutSection.height,
                    width: layoutSection.width,
                    xOffset: layoutSection.xOffset,
                    yOffset: layoutSection.yOffset,
                  }),
                ),
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
                section.layouts.map(
                  (sectionLayout): InferInsertModel<typeof sectionLayouts> => ({
                    layoutId: sectionLayout.layoutId,
                    sectionId: section.id,
                    parentSectionId: sectionLayout.parentSectionId,
                    height: sectionLayout.height,
                    width: sectionLayout.width,
                    xOffset: sectionLayout.xOffset,
                    yOffset: sectionLayout.yOffset,
                  }),
                ),
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
                  item.layouts.map(
                    (layoutSection): InferInsertModel<typeof itemLayouts> => ({
                      layoutId: layoutSection.layoutId,
                      sectionId: layoutSection.sectionId,
                      itemId: item.id,
                      height: layoutSection.height,
                      width: layoutSection.width,
                      xOffset: layoutSection.xOffset,
                      yOffset: layoutSection.yOffset,
                    }),
                  ),
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
  getBoardPermissions: protectedProcedure
    .meta({
      openapi: {
        method: "GET",
        path: "/api/boards/{id}/permissions",
        tags: ["boards"],
        protect: true,
        summary: "List who can access a board",
        description:
          "Return the groups that reach the board through a global permission, together with the users and groups it was shared with directly. Requires full access.",
      },
      mcp: {
        enabled: true,
        description:
          "List who can access a board. Returns 'inherited' (groups with a global board permission), 'users' and 'groups' with the permission granted on this board. REQUIRED: id (board ID). Requires full permission on the board",
      },
    })
    .input(byIdSchema)
    .output(boardPermissionsOutputSchema)
    .query(async ({ input, ctx }) => {
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
  saveUserBoardPermissions: protectedProcedure
    .meta({
      openapi: {
        method: "PUT",
        path: "/api/boards/{entityId}/permissions/users",
        tags: ["boards"],
        protect: true,
        summary: "Replace the user permissions of a board",
        description:
          "Set which users may access the board. The array replaces the current grants, so a user missing from it loses access. Requires full access.",
      },
      mcp: {
        enabled: true,
        description:
          "Replace the per user permissions of a board. REQUIRED: entityId (board ID), permissions (array of { principalId: user ID, permission: 'view' | 'modify' | 'full' }). Users missing from the array lose their access",
      },
    })
    .input(boardSavePermissionsSchema)
    .output(z.void())
    .mutation(async ({ input, ctx }) => {
      await throwIfActionForbiddenAsync(ctx, eq(boards.id, input.entityId), "full");

      await handleTransactionsAsync(ctx.db, {
        async handleAsync(db, schema) {
          await db.transaction(async (transaction) => {
            await transaction
              .delete(schema.boardUserPermissions)
              .where(eq(boardUserPermissions.boardId, input.entityId));
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
  saveGroupBoardPermissions: protectedProcedure
    .meta({
      openapi: {
        method: "PUT",
        path: "/api/boards/{entityId}/permissions/groups",
        tags: ["boards"],
        protect: true,
        summary: "Replace the group permissions of a board",
        description:
          "Set which groups may access the board. The array replaces the current grants, so a group missing from it loses access. Requires full access.",
      },
      mcp: {
        enabled: true,
        description:
          "Replace the per group permissions of a board. REQUIRED: entityId (board ID), permissions (array of { principalId: group ID, permission: 'view' | 'modify' | 'full' }). Groups missing from the array lose their access",
      },
    })
    .input(boardSavePermissionsSchema)
    .output(z.void())
    .mutation(async ({ input, ctx }) => {
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
      openapi: {
        method: "POST",
        path: "/api/boards/items",
        tags: ["boards"],
        protect: true,
        summary: "Add an item to a board",
        description:
          "Add a widget or app to a board and return its item ID. Without a placement the item goes to the first free position in the main canvas of every layout with its default size. Provide width/height for a size, xOffset/yOffset for an exact position, sectionId for a specific section, or a layouts array for per breakpoint control. Requires modify access to the board and use access to linked integrations. Widget configurations must be valid; placing Custom Widgets requires admin permission.",
      },
      mcp: {
        enabled: true,
        description:
          "Add a widget/app item to a board after configure_widget has reviewed it. Use the configure_widget result's boardId, kind, options, and integrationIds exactly. Placement is optional: without it the item is placed in the main canvas at the first free grid position without overlapping items or containers. Optional size {width,height} or width/height set grid dimensions, xOffset/yOffset an exact position, sectionId a specific section and layouts a per breakpoint placement. Width is capped by each layout's available columns. Integration IDs must be accessible to the current user. To create a formatted dashboard note, configure kind 'notebook' with options { content: Tiptap-compatible HTML, showToolbar: boolean, allowReadOnlyCheck: boolean }. Returns { itemId }",
      },
    })
    .input(addItemToBoardSchema)
    .output(z.object({ itemId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await throwIfActionForbiddenAsync(ctx, eq(boards.id, input.boardId), "modify");

      await validateWidgetConfigurationsAsync(ctx, [
        { id: "", kind: input.kind, integrationIds: input.integrationIds },
      ]);
      throwIfCustomWidgetPlacementChangeForbidden({
        isAdmin: ctx.session.user.permissions.includes("admin"),
        submittedItems: [{ id: "", kind: input.kind, options: input.options }],
        storedItems: [],
      });

      if (input.kind === "timetable") {
        await validateTimetableOptionsChangeAsync(input.options);
      }

      return await serializeBoardItemPlacementAsync(input.boardId, async () => {
        const board = await getBoardForPlacementAsync(ctx.db, input.boardId);

        throwIfLayoutsUnknown(board, input.layouts);

        const placements = resolvePlacementForAllLayouts({
          board,
          placement: input,
          occupiedAreas: collectOccupiedAreas(board),
          // `size` is the shorthand of the web interface, the placement overrides it
          defaultSize: input.size ?? getDefaultSizeForKind(input.kind),
        });

        const itemId = createId();
        const operations: DbOperation[] = [
          {
            type: "insert",
            table: "items",
            values: [
              {
                id: itemId,
                boardId: input.boardId,
                kind: input.kind,
                options: superjson.stringify(input.options),
                advancedOptions: input.advancedOptions ? superjson.stringify(input.advancedOptions) : emptySuperJSON,
              },
            ],
          },
        ];

        if (placements.length > 0) {
          operations.push({
            type: "insert",
            table: "itemLayouts",
            values: placements.map((placement) => ({ itemId, ...placement })),
          });
        }

        if (input.integrationIds.length > 0) {
          operations.push({
            type: "insert",
            table: "integrationItems",
            values: input.integrationIds.map((integrationId) => ({ itemId, integrationId })),
          });
        }

        await runDbOperationsAsync(ctx.db, operations);

        return { itemId };
      });
    }),
  updateItemLayout: protectedProcedure
    .meta({
      openapi: {
        method: "PATCH",
        path: "/api/boards/{boardId}/items/{itemId}/layouts/{layoutId}",
        tags: ["boards"],
        protect: true,
        summary: "Move or resize one board item",
        description:
          "Update one item's position and size in one existing layout without replacing the board. Requires modify access. The item stays in its current section; out-of-bounds and overlapping placements are rejected.",
      },
      mcp: {
        enabled: true,
        description:
          "Move or resize one existing board item in one layout. Requires modify access to boardId. Obtain itemId and layoutId from the board, then provide xOffset, yOffset, width, and height in grid cells. The item stays in its current section; the mutation rejects overlap with other items or containers. It never replaces or deletes other board content.",
      },
    })
    .input(updateBoardItemLayoutSchema)
    .output(updateBoardItemLayoutSchema)
    .mutation(async ({ ctx, input }) => {
      await throwIfActionForbiddenAsync(ctx, eq(boards.id, input.boardId), "modify");

      return await serializeBoardItemPlacementAsync(input.boardId, async () => {
        const board = await ctx.db.query.boards.findFirst({
          where: eq(boards.id, input.boardId),
          with: {
            layouts: true,
            sections: { with: { layouts: true } },
            items: { with: { layouts: true } },
          },
        });
        if (!board) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Board not found" });
        }

        const layout = board.layouts.find((candidate) => candidate.id === input.layoutId);
        const item = board.items.find((candidate) => candidate.id === input.itemId);
        const itemLayout = item?.layouts.find((candidate) => candidate.layoutId === input.layoutId);
        if (!layout || !item || !itemLayout) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Item layout not found on this board" });
        }

        const section = board.sections.find((candidate) => candidate.id === itemLayout.sectionId);
        if (!section) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Item section not found on this board" });
        }

        let columnCount: number;
        if (section.kind === "empty") {
          columnCount = getBoardLaneColumnCount(layout, getRootSectionLane(section.xOffset));
        } else {
          const sectionLayout = section.layouts.find((candidate) => candidate.layoutId === layout.id);
          if (!sectionLayout) {
            throw new TRPCError({ code: "BAD_REQUEST", message: "Item section has no layout at this breakpoint" });
          }
          columnCount = sectionLayout.width;
        }

        if (input.xOffset + input.width > columnCount || input.yOffset + input.height > 32767) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Item layout exceeds its section bounds" });
        }

        const otherItemPlacements = board.items
          .filter((candidate) => candidate.id !== item.id)
          .flatMap((candidate) => candidate.layouts)
          .filter((candidate) => candidate.layoutId === layout.id && candidate.sectionId === section.id);
        const childSectionPlacements = board.sections
          .flatMap((candidate) => candidate.layouts)
          .filter((candidate) => candidate.layoutId === layout.id && candidate.parentSectionId === section.id);
        if (
          [...otherItemPlacements, ...childSectionPlacements].some((placement) =>
            doBoardItemPlacementsOverlap(input, placement),
          )
        ) {
          throw new TRPCError({ code: "CONFLICT", message: "Item layout overlaps another item or section" });
        }

        await ctx.db
          .update(itemLayouts)
          .set({
            xOffset: input.xOffset,
            yOffset: input.yOffset,
            width: input.width,
            height: input.height,
          })
          .where(
            and(
              eq(itemLayouts.itemId, item.id),
              eq(itemLayouts.layoutId, layout.id),
              eq(itemLayouts.sectionId, section.id),
            ),
          );

        return input;
      });
    }),
  updateItem: protectedProcedure
    .meta({
      openapi: {
        method: "PATCH",
        path: "/api/boards/{boardId}/items/{itemId}",
        tags: ["boards"],
        protect: true,
        summary: "Update a board item",
        description:
          "Change the options, integrations or placement of one item. Only the supplied properties are changed, everything else keeps its current value, so an item can be resized and moved in a single call. Requires modify access.",
      },
      mcp: {
        enabled: true,
        description:
          "Update an existing board item. REQUIRED: boardId, itemId. All other fields are optional and only the provided ones are changed: options, advancedOptions, integrationIds, and the placement (sectionId, xOffset, yOffset, width, height or a layouts array). Values that are not provided keep their current placement, so an item can be resized and moved in a single call",
      },
    })
    .input(updateBoardItemSchema)
    .output(z.void())
    .mutation(async ({ ctx, input }) => {
      await throwIfActionForbiddenAsync(ctx, eq(boards.id, input.boardId), "modify");

      await serializeBoardItemPlacementAsync(input.boardId, async () => {
        const board = await getBoardForPlacementAsync(ctx.db, input.boardId);
        const item = board.items.find((boardItem) => boardItem.id === input.itemId);

        if (!item) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Item not found" });
        }

        const integrationIds = input.integrationIds ?? item.integrations.map(({ integrationId }) => integrationId);
        await validateWidgetConfigurationsAsync(
          ctx,
          [{ id: item.id, kind: item.kind, integrationIds }],
          [
            {
              id: item.id,
              kind: item.kind,
              integrationIds: item.integrations.map(({ integrationId }) => integrationId),
            },
          ],
        );

        if (input.options !== undefined) {
          throwIfCustomWidgetPlacementChangeForbidden({
            isAdmin: ctx.session.user.permissions.includes("admin"),
            submittedItems: [{ id: item.id, kind: item.kind, options: input.options }],
            storedItems: [
              { id: item.id, kind: item.kind, options: superjson.parse<Record<string, unknown>>(item.options) },
            ],
          });

          if (item.kind === "timetable") {
            await validateTimetableOptionsChangeAsync(input.options);
          }
        }

        const operations: DbOperation[] = [];

        if (input.options !== undefined || input.advancedOptions !== undefined) {
          operations.push({
            type: "update",
            table: "items",
            set: {
              ...(input.options !== undefined ? { options: superjson.stringify(input.options) } : {}),
              ...(input.advancedOptions !== undefined
                ? { advancedOptions: superjson.stringify(input.advancedOptions) }
                : {}),
            },
            where: eq(items.id, input.itemId),
          });
        }

        if (hasPlacementChanges(input)) {
          throwIfLayoutsUnknown(board, input.layouts);

          // Merge the requested changes with the current placement so unspecified
          // properties keep their value instead of triggering an automatic placement.
          const mergedLayouts = board.layouts.map((layout) => {
            const current = item.layouts.find((itemLayout) => itemLayout.layoutId === layout.id);
            const explicit = input.layouts?.find((entry) => entry.layoutId === layout.id);

            if (explicit) {
              // Without this the item would fall back to the first empty section of the board
              return { ...explicit, sectionId: explicit.sectionId ?? input.sectionId ?? current?.sectionId };
            }

            const sectionId = input.sectionId ?? current?.sectionId;
            const columnCount = getColumnCountOfBoardSection(board, sectionId, layout);
            const width = Math.min(input.width ?? current?.width ?? 1, columnCount);

            return {
              layoutId: layout.id,
              sectionId,
              xOffset: Math.min(input.xOffset ?? current?.xOffset ?? 0, Math.max(0, columnCount - width)),
              yOffset: input.yOffset ?? current?.yOffset ?? 0,
              width,
              height: input.height ?? current?.height ?? 1,
            };
          });

          const placements = resolvePlacementForAllLayouts({
            board,
            placement: { sectionId: input.sectionId, layouts: mergedLayouts },
            occupiedAreas: collectOccupiedAreas(board, [input.itemId]),
            defaultSize: getDefaultSizeForKind(item.kind),
          });

          // Updated in place instead of delete + insert so relations keep their identity.
          for (const placement of placements) {
            const exists = item.layouts.some((itemLayout) => itemLayout.layoutId === placement.layoutId);

            if (!exists) {
              operations.push({
                type: "insert",
                table: "itemLayouts",
                values: [{ itemId: input.itemId, ...placement }],
              });
              continue;
            }

            operations.push({
              type: "update",
              table: "itemLayouts",
              set: {
                sectionId: placement.sectionId,
                xOffset: placement.xOffset,
                yOffset: placement.yOffset,
                width: placement.width,
                height: placement.height,
              },
              where: and(eq(itemLayouts.itemId, input.itemId), eq(itemLayouts.layoutId, placement.layoutId)) as SQL,
            });
          }
        }

        const requestedIntegrationIds = input.integrationIds;
        if (requestedIntegrationIds) {
          // Only the difference is applied so the item never temporarily loses all of its integrations
          const currentIntegrationIds = item.integrations.map(({ integrationId }) => integrationId);
          const removed = currentIntegrationIds.filter((id) => !requestedIntegrationIds.includes(id));
          const added = requestedIntegrationIds.filter((id) => !currentIntegrationIds.includes(id));

          if (removed.length > 0) {
            operations.push({
              type: "delete",
              table: "integrationItems",
              where: and(
                eq(integrationItems.itemId, input.itemId),
                inArray(integrationItems.integrationId, removed),
              ) as SQL,
            });
          }

          if (added.length > 0) {
            operations.push({
              type: "insert",
              table: "integrationItems",
              values: added.map((integrationId) => ({ itemId: input.itemId, integrationId })),
            });
          }
        }

        await runDbOperationsAsync(ctx.db, operations);
      });
    }),
  removeItem: protectedProcedure
    .meta({
      openapi: {
        method: "DELETE",
        path: "/api/boards/{boardId}/items/{itemId}",
        tags: ["boards"],
        protect: true,
        summary: "Remove a board item",
        description: "Delete one item together with its placements in every layout. Requires modify access.",
      },
      mcp: {
        enabled: true,
        description: "Remove an item from a board. REQUIRED: boardId, itemId. Requires modify permission",
      },
    })
    .input(removeBoardItemSchema)
    .output(z.void())
    .mutation(async ({ ctx, input }) => {
      await throwIfActionForbiddenAsync(ctx, eq(boards.id, input.boardId), "modify");

      const item = await ctx.db.query.items.findFirst({
        columns: { id: true },
        where: and(eq(items.id, input.itemId), eq(items.boardId, input.boardId)),
      });

      if (!item) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Item not found" });
      }

      await ctx.db.delete(items).where(eq(items.id, input.itemId));
    }),
  getItems: publicProcedure
    .meta({
      openapi: {
        method: "GET",
        path: "/api/boards/{id}/items",
        tags: ["boards"],
        protect: true,
        summary: "List the items of a board",
        description: "Return every item of a board with its position and size in each layout. Requires view access.",
      },
      mcp: {
        enabled: true,
        description:
          "List all items of a board including their per-layout position and size. REQUIRED: id (board ID). Requires view permission",
      },
    })
    .input(byIdSchema)
    .output(z.array(boardApiItemSchema))
    .query(async ({ ctx, input }) => {
      await throwIfActionForbiddenAsync(ctx, eq(boards.id, input.id), "view");

      const board = await getBoardForPlacementAsync(ctx.db, input.id);
      return board.items.map(mapItemToApi);
    }),
  getSections: publicProcedure
    .meta({
      openapi: {
        method: "GET",
        path: "/api/boards/{id}/sections",
        tags: ["boards"],
        protect: true,
        summary: "List the sections of a board",
        description:
          "Return the canvases and containers of a board. An empty section with xOffset -1 or 1 is a sidebar canvas. Requires view access.",
      },
      mcp: {
        enabled: true,
        description:
          "List all sections of a board. An empty section is a canvas (xOffset -1 left sidebar, 0 main, 1 right sidebar), a container section is nested inside another one. REQUIRED: id (board ID). Requires view permission",
      },
    })
    .input(byIdSchema)
    .output(z.array(boardApiSectionSchema))
    .query(async ({ ctx, input }) => {
      await throwIfActionForbiddenAsync(ctx, eq(boards.id, input.id), "view");

      const board = await getBoardForPlacementAsync(ctx.db, input.id);
      return board.sections.map(mapSectionToApi);
    }),
  addSection: protectedProcedure
    .meta({
      openapi: {
        method: "POST",
        path: "/api/boards/{boardId}/sections",
        tags: ["boards"],
        protect: true,
        summary: "Add a section to a board",
        description:
          "Create an empty canvas or a container. A container is placed inside another section and accepts a placement, a canvas is stacked by its yOffset in the lane given by `lane`. A sidebar lane only accepts a canvas once its layouts reserve columns for it. Requires modify access.",
      },
      mcp: {
        enabled: true,
        description:
          "Add a section to a board. REQUIRED: boardId, kind ('empty' or 'container'). An empty section is a canvas, optionally in the 'left' or 'right' sidebar lane, ordered by yOffset. A container is placed inside another section and accepts width/height/xOffset/yOffset/parentSectionId or a layouts array; its title lives in options. Returns { sectionId }",
      },
    })
    .input(addBoardSectionSchema)
    .output(z.object({ sectionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await throwIfActionForbiddenAsync(ctx, eq(boards.id, input.boardId), "modify");

      return await serializeBoardItemPlacementAsync(input.boardId, async () => {
        const board = await getBoardForPlacementAsync(ctx.db, input.boardId);
        const sectionId = createId();

        if (input.kind !== "container") {
          const lane = input.lane ?? "main";
          throwIfRootSectionLaneUnavailable(board, lane);

          await ctx.db.insert(sections).values({
            id: sectionId,
            boardId: input.boardId,
            kind: input.kind,
            xOffset: rootSectionOffsets[lane],
            yOffset: input.yOffset ?? nextRootSectionYOffset(board, lane),
            options: emptySuperJSON,
          });

          return { sectionId };
        }

        throwIfLayoutsUnknown(board, input.layouts);

        const sectionLayoutRows: InferInsertModel<typeof sectionLayouts>[] = resolvePlacementForAllLayouts({
          board,
          placement: toSectionPlacement(input),
          occupiedAreas: collectOccupiedAreas(board),
          defaultSize: { width: 1, height: 1 },
          context: "the section",
        }).map((placement) => ({
          sectionId,
          layoutId: placement.layoutId,
          parentSectionId: placement.sectionId,
          xOffset: placement.xOffset,
          yOffset: placement.yOffset,
          width: placement.width,
          height: placement.height,
        }));

        const operations: DbOperation[] = [
          {
            type: "insert",
            table: "sections",
            values: [
              {
                id: sectionId,
                boardId: input.boardId,
                kind: input.kind,
                xOffset: null,
                yOffset: null,
                options: superjson.stringify(containerSectionOptionsSchema.parse(input.options ?? undefined)),
              },
            ],
          },
        ];

        if (sectionLayoutRows.length > 0) {
          operations.push({ type: "insert", table: "sectionLayouts", values: sectionLayoutRows });
        }

        await runDbOperationsAsync(ctx.db, operations);

        return { sectionId };
      });
    }),
  updateSection: protectedProcedure
    .meta({
      openapi: {
        method: "PATCH",
        path: "/api/boards/{boardId}/sections/{sectionId}",
        tags: ["boards"],
        protect: true,
        summary: "Update a board section",
        description:
          "Change the options or placement of one section. Only the supplied properties are changed. A canvas accepts lane and yOffset, a container accepts options and a placement. Requires modify access.",
      },
      mcp: {
        enabled: true,
        description:
          "Update a section of a board. REQUIRED: boardId, sectionId. Optional: lane and yOffset for an empty canvas, options and placement (parentSectionId, xOffset, yOffset, width, height or layouts) for a container",
      },
    })
    .input(updateBoardSectionSchema)
    .output(z.void())
    .mutation(async ({ ctx, input }) => {
      await throwIfActionForbiddenAsync(ctx, eq(boards.id, input.boardId), "modify");

      await serializeBoardItemPlacementAsync(input.boardId, async () => {
        const board = await getBoardForPlacementAsync(ctx.db, input.boardId);
        const section = board.sections.find((boardSection) => boardSection.id === input.sectionId);

        if (!section) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Section not found" });
        }

        if (section.kind !== "container") {
          if (input.lane !== undefined && input.lane !== getRootSectionLane(section.xOffset)) {
            throwIfRootSectionLaneUnavailable(board, input.lane);
            const mainCanvases = board.sections.filter(
              (entry) => entry.kind !== "container" && getRootSectionLane(entry.xOffset) === "main",
            );
            if (getRootSectionLane(section.xOffset) === "main" && mainCanvases.length === 1) {
              throw new TRPCError({ code: "BAD_REQUEST", message: "The last main canvas cannot change lanes" });
            }
            for (const layout of board.layouts) {
              const columns = getBoardLaneColumnCount(layout, input.lane);
              throwIfSectionChildrenOverflow(board, input.sectionId, layout.id, columns);
            }
          }

          // An update without any value is rejected by the query builder
          const values = {
            ...(input.lane !== undefined ? { xOffset: rootSectionOffsets[input.lane] } : {}),
            ...(input.yOffset !== undefined ? { yOffset: input.yOffset } : {}),
          };

          if (Object.keys(values).length > 0) {
            await ctx.db.update(sections).set(values).where(eq(sections.id, input.sectionId));
          }

          return;
        }

        const operations: DbOperation[] = [];

        if (input.options !== undefined) {
          operations.push({
            type: "update",
            table: "sections",
            set: { options: superjson.stringify(containerSectionOptionsSchema.parse(input.options)) },
            where: eq(sections.id, input.sectionId),
          });
        }

        if (!hasPlacementChanges({ ...input, sectionId: input.parentSectionId })) {
          await runDbOperationsAsync(ctx.db, operations);
          return;
        }

        throwIfLayoutsUnknown(board, input.layouts);

        const mergedLayouts = board.layouts.map((layout) => {
          const explicit = input.layouts?.find((entry) => entry.layoutId === layout.id);
          const current = section.layouts.find((sectionLayout) => sectionLayout.layoutId === layout.id);

          if (explicit) {
            return {
              layoutId: explicit.layoutId,
              sectionId: explicit.parentSectionId ?? current?.parentSectionId ?? undefined,
              xOffset: explicit.xOffset,
              yOffset: explicit.yOffset,
              width: explicit.width,
              height: explicit.height,
            };
          }

          const parentSectionId = input.parentSectionId ?? current?.parentSectionId ?? undefined;
          const columnCount = getColumnCountOfBoardSection(board, parentSectionId, layout);
          const width = Math.min(input.width ?? current?.width ?? 1, columnCount);

          return {
            layoutId: layout.id,
            sectionId: parentSectionId,
            xOffset: Math.min(input.xOffset ?? current?.xOffset ?? 0, Math.max(0, columnCount - width)),
            yOffset: input.yOffset ?? current?.yOffset ?? 0,
            width,
            height: input.height ?? current?.height ?? 1,
          };
        });

        throwIfSectionNestingCycle(board, input.sectionId, mergedLayouts);

        const placements = resolvePlacementForAllLayouts({
          board,
          placement: { sectionId: input.parentSectionId, layouts: mergedLayouts },
          occupiedAreas: collectOccupiedAreas(board, [input.sectionId]),
          defaultSize: { width: 1, height: 1 },
          context: "the section",
        });

        for (const placement of placements) {
          throwIfSectionChildrenOverflow(board, input.sectionId, placement.layoutId, placement.width);
        }

        // Updated in place instead of delete + insert so relations keep their identity.
        for (const placement of placements) {
          const exists = section.layouts.some((sectionLayout) => sectionLayout.layoutId === placement.layoutId);

          if (!exists) {
            operations.push({
              type: "insert",
              table: "sectionLayouts",
              values: [
                {
                  sectionId: input.sectionId,
                  layoutId: placement.layoutId,
                  parentSectionId: placement.sectionId,
                  xOffset: placement.xOffset,
                  yOffset: placement.yOffset,
                  width: placement.width,
                  height: placement.height,
                },
              ],
            });
            continue;
          }

          operations.push({
            type: "update",
            table: "sectionLayouts",
            set: {
              parentSectionId: placement.sectionId,
              xOffset: placement.xOffset,
              yOffset: placement.yOffset,
              width: placement.width,
              height: placement.height,
            },
            where: and(
              eq(sectionLayouts.sectionId, input.sectionId),
              eq(sectionLayouts.layoutId, placement.layoutId),
            ) as SQL,
          });
        }

        await runDbOperationsAsync(ctx.db, operations);
      });
    }),
  removeSection: protectedProcedure
    .meta({
      openapi: {
        method: "DELETE",
        path: "/api/boards/{boardId}/sections/{sectionId}",
        tags: ["boards"],
        protect: true,
        summary: "Remove a board section",
        description:
          "Delete one section together with the containers nested inside it and every item they hold. The last canvas of the main lane and a sidebar canvas whose layouts still reserve columns cannot be removed. Requires modify access.",
      },
      mcp: {
        enabled: true,
        description:
          "Remove a section and all of its items from a board. REQUIRED: boardId, sectionId. The last canvas of the main lane cannot be removed, and a sidebar canvas can only be removed once no layout reserves columns for it",
      },
    })
    .input(removeBoardSectionSchema)
    .output(z.void())
    .mutation(async ({ ctx, input }) => {
      await throwIfActionForbiddenAsync(ctx, eq(boards.id, input.boardId), "modify");

      await serializeBoardItemPlacementAsync(input.boardId, async () => {
        const board = await getBoardForPlacementAsync(ctx.db, input.boardId);
        const section = board.sections.find((boardSection) => boardSection.id === input.sectionId);

        if (!section) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Section not found" });
        }

        if (section.kind !== "container") {
          const lane = getRootSectionLane(section.xOffset);

          if (lane === "main") {
            const mainRoots = board.sections.filter(
              (boardSection) =>
                boardSection.kind !== "container" && getRootSectionLane(boardSection.xOffset) === "main",
            );
            if (mainRoots.length <= 1) {
              throw new TRPCError({
                code: "BAD_REQUEST",
                message: "The last canvas of a board cannot be removed",
              });
            }
          } else if (board.layouts.some((layout) => getBoardLaneColumnCount(layout, lane) > 0)) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `The ${lane} sidebar is still reserved by a layout, set its gutter columns to zero first`,
            });
          }
        }

        // Items reference the board and not the section, so deleting a section would only cascade
        // its layout rows and leave the items behind without any position on the board.
        const removedSectionIds = collectNestedSectionIds(board, input.sectionId);
        const orphanedItemIds = board.items
          .filter((item) => item.layouts.some((layout) => removedSectionIds.has(layout.sectionId)))
          .map((item) => item.id);

        const sectionIdsToRemove = [...removedSectionIds];

        // Both deletes have to happen together, otherwise the board is left either with
        // items that have no position or with sections that lost their content.
        await handleTransactionsAsync(ctx.db, {
          async handleAsync(db, schema) {
            await db.transaction(async (transaction) => {
              if (orphanedItemIds.length > 0) {
                await transaction.delete(schema.items).where(inArray(schema.items.id, orphanedItemIds));
              }
              await transaction.delete(schema.sections).where(inArray(schema.sections.id, sectionIdsToRemove));
            });
          },
          handleSync(db) {
            db.transaction((transaction) => {
              if (orphanedItemIds.length > 0) {
                transaction.delete(items).where(inArray(items.id, orphanedItemIds)).run();
              }
              transaction.delete(sections).where(inArray(sections.id, sectionIdsToRemove)).run();
            });
          },
        });
      });
    }),
  getLayouts: publicProcedure
    .meta({
      openapi: {
        method: "GET",
        path: "/api/boards/{id}/layouts",
        tags: ["boards"],
        protect: true,
        summary: "List the layouts of a board",
        description:
          "Return the responsive breakpoints of a board with their column counts, reserved sidebar columns and role. Requires view access.",
      },
      mcp: {
        enabled: true,
        description:
          "List the layouts (responsive breakpoints) of a board with their column counts, reserved sidebar columns and role ('mobile', 'base' or 'custom'). REQUIRED: id (board ID)",
      },
    })
    .input(byIdSchema)
    .output(z.array(boardApiLayoutSchema))
    .query(async ({ ctx, input }) => {
      await throwIfActionForbiddenAsync(ctx, eq(boards.id, input.id), "view");

      return await getBoardLayoutsAsync(ctx.db, input.id);
    }),
  getBoardById: publicProcedure
    .meta({
      openapi: {
        method: "GET",
        path: "/api/boards/{id}",
        tags: ["boards"],
        protect: true,
        summary: "Get the full content of a board",
        description:
          "Return a board with its layouts, sections and items including the position and size of every element. Requires view access.",
      },
      mcp: {
        enabled: true,
        description:
          "Get the full content of a board including layouts, sections and items with their position and size. REQUIRED: id (board ID). Requires view permission",
      },
    })
    .input(byIdSchema)
    .output(boardApiDetailSchema)
    .query(async ({ ctx, input }) => {
      await throwIfActionForbiddenAsync(ctx, eq(boards.id, input.id), "view");

      const board = await getBoardForPlacementAsync(ctx.db, input.id);

      return {
        id: board.id,
        name: board.name,
        isPublic: board.isPublic,
        creatorId: board.creatorId,
        layouts: board.layouts
          .map(mapLayoutToApi)
          .toSorted((layoutA, layoutB) => layoutA.breakpoint - layoutB.breakpoint),
        sections: board.sections.map(mapSectionToApi),
        items: board.items.map(mapItemToApi),
      };
    }),
  exportBoard: publicProcedure
    .meta({
      openapi: {
        method: "GET",
        path: "/api/boards/{id}/export",
        tags: ["boards"],
        protect: true,
        summary: "Export a board as a document",
        description:
          "Return a portable document with the settings, layouts, sections and items of a board, which board import can turn back into a board. Requires view access.",
      },
      mcp: {
        enabled: true,
        description:
          "Export a board as a portable document containing its settings, layouts, sections and items. The result can be fed back into board_importBoard to recreate the board. REQUIRED: id (board ID)",
      },
    })
    .input(byIdSchema)
    .output(boardExportSchema)
    .query(async ({ ctx, input }) => {
      await throwIfActionForbiddenAsync(ctx, eq(boards.id, input.id), "view");

      const board = await getBoardForPlacementAsync(ctx.db, input.id);
      return createBoardExportDocument(board);
    }),
  importBoard: permissionRequiredProcedure
    .requiresPermission("board-create")
    .meta({
      openapi: {
        method: "POST",
        path: "/api/boards/import",
        tags: ["boards"],
        protect: true,
        summary: "Create a board from a document",
        description:
          "Create a complete board with its layouts, sections and items from one document. Ids inside the document are local references which are remapped on import, so the same document can be applied repeatedly. Requires the board-create permission.",
      },
      mcp: {
        enabled: true,
        description:
          "Create a complete board from a document with layouts, sections and items including their exact position and size. Ids inside the document are local references only and are remapped to freshly generated ids, so the same document can be imported repeatedly. REQUIRED: name, layouts, sections. OPTIONAL: onConflict ('fail' rejects when a board with that name exists, 'skip' keeps the existing board, 'replace' deletes and recreates it). Returns { boardId, created }",
      },
    })
    .input(boardImportSchema)
    .output(z.object({ boardId: z.string(), created: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await findBoardByNameAsync(ctx.db, input.name);

      if (!existing) {
        await validateBoardImportAsync(ctx, input);
        const { boardId } = await insertBoardDocumentAsync(ctx.db, input, ctx.session.user.id);
        return { boardId, created: true };
      }

      if (input.onConflict === "fail") {
        throw new TRPCError({ code: "CONFLICT", message: "Board with similar name already exists" });
      }

      if (input.onConflict === "skip") {
        await throwIfActionForbiddenAsync(ctx, eq(boards.id, existing.id), "view");
        return { boardId: existing.id, created: false };
      }

      await throwIfActionForbiddenAsync(ctx, eq(boards.id, existing.id), "full");

      await validateBoardImportAsync(ctx, input);

      // The board keeps its id so that home board settings and per user permissions survive,
      // and the whole exchange happens in one transaction after the document was validated.
      await replaceBoardDocumentAsync(ctx.db, input, { boardId: existing.id, creatorId: ctx.session.user.id });

      return { boardId: existing.id, created: false };
    }),
});

/**
 * Loads a board with everything that is needed to compute the placement of items and sections.
 */
const getBoardForPlacementAsync = async (db: Database, boardId: string) => {
  const board = await db.query.boards.findFirst({
    where: eq(boards.id, boardId),
    with: {
      sections: { with: { layouts: true } },
      layouts: true,
      items: { with: { layouts: true, integrations: { columns: { integrationId: true } } } },
    },
  });

  if (!board) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Board not found" });
  }

  return board;
};

export type BoardForPlacement = Awaited<ReturnType<typeof getBoardForPlacementAsync>>;

const mapLayoutToApi = (layout: BoardForPlacement["layouts"][number]) => ({
  id: layout.id,
  name: layout.name,
  columnCount: layout.columnCount,
  leftGutterColumnCount: layout.leftGutterColumnCount,
  rightGutterColumnCount: layout.rightGutterColumnCount,
  breakpoint: layout.breakpoint,
  role: layout.role,
});

const getBoardLayoutsAsync = async (db: Database, boardId: string) =>
  await db.query.layouts
    .findMany({ where: eq(layouts.boardId, boardId) })
    .then((boardLayouts) =>
      boardLayouts.map(mapLayoutToApi).toSorted((layoutA, layoutB) => layoutA.breakpoint - layoutB.breakpoint),
    );

/** Columns available inside the given section, which is the lane of a canvas and the width of a container */
const getColumnCountOfBoardSection = (
  board: BoardForPlacement,
  sectionId: string | undefined,
  layout: BoardForPlacement["layouts"][number],
) => (sectionId ? getColumnCountOfSection(board, sectionId, layout) : getBoardLaneColumnCount(layout, "main"));

/**
 * Explicit layout entries are matched against the layouts of the board, an entry that matches
 * nothing would otherwise be silently dropped and the request would look successful.
 */
const throwIfLayoutsUnknown = (board: BoardForPlacement, requestedLayouts?: { layoutId: string }[]) => {
  const unknown = (requestedLayouts ?? [])
    .map(({ layoutId }) => layoutId)
    .filter((layoutId) => !board.layouts.some((layout) => layout.id === layoutId));

  if (unknown.length > 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Layouts do not belong to this board: ${unknown.join(", ")}`,
    });
  }
};

const hasPlacementChanges = (input: {
  sectionId?: string;
  xOffset?: number;
  yOffset?: number;
  width?: number;
  height?: number;
  layouts?: unknown[];
}) =>
  input.layouts !== undefined ||
  input.sectionId !== undefined ||
  input.xOffset !== undefined ||
  input.yOffset !== undefined ||
  input.width !== undefined ||
  input.height !== undefined;

/** Maps the container section input onto the shared placement shape, where the section is the parent */
const toSectionPlacement = (input: {
  parentSectionId?: string;
  xOffset?: number;
  yOffset?: number;
  width?: number;
  height?: number;
  layouts?: {
    layoutId: string;
    parentSectionId?: string;
    xOffset: number;
    yOffset: number;
    width: number;
    height: number;
  }[];
}) => ({
  sectionId: input.parentSectionId,
  xOffset: input.xOffset,
  yOffset: input.yOffset,
  width: input.width,
  height: input.height,
  layouts: input.layouts?.map(({ parentSectionId, ...layout }) => ({ ...layout, sectionId: parentSectionId })),
});

/** Returns the given section together with every container that is nested inside of it */
const collectNestedSectionIds = (board: BoardForPlacement, sectionId: string) => {
  const sectionIds = new Set([sectionId]);

  let foundMore = true;
  while (foundMore) {
    foundMore = false;
    for (const section of board.sections) {
      if (sectionIds.has(section.id)) continue;
      if (!section.layouts.some((layout) => layout.parentSectionId && sectionIds.has(layout.parentSectionId))) continue;

      sectionIds.add(section.id);
      foundMore = true;
    }
  }

  return sectionIds;
};

const throwIfSectionNestingCycle = (
  board: BoardForPlacement,
  sectionId: string,
  placements: { layoutId: string; sectionId?: string | null }[],
) => {
  for (const placement of placements) {
    const visited = new Set([sectionId]);
    let parentSectionId = placement.sectionId;

    while (parentSectionId) {
      if (visited.has(parentSectionId)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Section nesting cannot form a cycle in layout '${placement.layoutId}'`,
        });
      }

      visited.add(parentSectionId);
      parentSectionId = board.sections
        .find((section) => section.id === parentSectionId)
        ?.layouts.find((layout) => layout.layoutId === placement.layoutId)?.parentSectionId;
    }
  }
};

/**
 * A sidebar only exists while a layout reserves columns for it, and it holds exactly one canvas.
 * The main lane has neither restriction, its canvases are simply stacked.
 */
const throwIfRootSectionLaneUnavailable = (board: BoardForPlacement, lane: BoardLane) => {
  if (lane === "main") return;

  if (!board.layouts.some((layout) => getBoardLaneColumnCount(layout, lane) > 0)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `No layout reserves columns for the ${lane} sidebar, set its gutter columns first`,
    });
  }

  const existing = board.sections.some(
    (section) => section.kind !== "container" && getRootSectionLane(section.xOffset) === lane,
  );

  if (existing) {
    throw new TRPCError({ code: "BAD_REQUEST", message: `The ${lane} sidebar already has a canvas` });
  }
};

const nextRootSectionYOffset = (board: BoardForPlacement, lane: BoardLane) =>
  board.sections
    .filter((section) => section.kind !== "container" && getRootSectionLane(section.xOffset) === lane)
    .reduce((maximum, section) => Math.max(maximum, (section.yOffset ?? 0) + 1), 0);

export const mapItemToApi = (item: BoardForPlacement["items"][number]) => ({
  id: item.id,
  kind: item.kind,
  options: superjson.parse<Record<string, unknown>>(item.options),
  advancedOptions: itemAdvancedOptionsSchema.parse(superjson.parse(item.advancedOptions)),
  integrationIds: item.integrations.map(({ integrationId }) => integrationId),
  layouts: item.layouts.map(({ layoutId, sectionId, xOffset, yOffset, width, height }) => ({
    layoutId,
    sectionId,
    xOffset,
    yOffset,
    width,
    height,
  })),
});

export const mapSectionToApi = (section: BoardForPlacement["sections"][number]) => ({
  id: section.id,
  kind: section.kind,
  name: section.name,
  xOffset: section.xOffset,
  yOffset: section.yOffset,
  options: superjson.parse<Record<string, unknown>>(section.options ?? emptySuperJSON),
  layouts: section.layouts.map(({ layoutId, parentSectionId, xOffset, yOffset, width, height }) => ({
    layoutId,
    parentSectionId,
    xOffset,
    yOffset,
    width,
    height,
  })),
});

const findBoardByNameAsync = async (db: Database, name: string, ignoredIds: string[] = []) => {
  const existingBoards = await db.query.boards.findMany({ columns: { id: true, name: true } });

  return existingBoards.find(
    (board) => board.name.toLowerCase() === name.toLowerCase() && !ignoredIds.includes(board.id),
  );
};

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

const getResizeSourceUpdate = (sources: ReadonlyMap<string, string | null>, layoutId: string) => {
  if (!sources.has(layoutId)) return {};
  return { resizeSource: sources.get(layoutId) ?? null };
};

interface BoardForLayoutProjection {
  id: string;
  layouts: Array<{ id: string; resizeSource?: string | null }>;
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
  const currentElements = options.previous.elements ?? getElementsForLayout(board, options.previous.layoutId);
  const savedLayout = board.layouts.find((layout) => layout.id === options.previous.layoutId);
  let serializedSource: string | null | undefined;
  if (options.previous.layoutId === options.current.layoutId) serializedSource = savedLayout?.resizeSource;
  const source = getLayoutResizeSource(options.previous, currentElements, serializedSource);
  const elements = source.elements;
  const previousGeometry = { ...source.geometry, layoutId: options.previous.layoutId };
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
        getBoardLaneColumnCount(previousGeometry, sourceLane) > 0 &&
        targetLaneBySourceLane.get(sourceLane) === lane,
    );
    const previousWidth =
      sourceLanes.length === 1
        ? getBoardLaneColumnCount(previousGeometry, sourceLanes[0] ?? "main")
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
    resizeSource: serializeLayoutResizeSource(source, options.current, updatedElements),
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
            permissions: {},
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

const getCanViewAllBoards = (
  groupMemberships: Awaited<ReturnType<typeof getBoardAccessContextAsync>>["groupMemberships"],
) => {
  const permissions = new Set(
    groupMemberships.flatMap((membership) => membership.group.permissions.map(({ permission }) => permission)),
  );
  return getPermissionsWithChildren([...permissions]).includes("board-view-all");
};

export const getAccessibleBoardIdsForUserAsync = async (db: Database, userId: string) => {
  const { boardIds, groupMemberships } = await getBoardAccessContextAsync(db, userId);
  const accessibleBoards = await db.query.boards.findMany({
    columns: { id: true },
    where: getAccessibleBoardsWhere(getCanViewAllBoards(groupMemberships), userId, boardIds),
  });
  return new Set(accessibleBoards.map(({ id }) => id));
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
      .map(({ boardId: _, resizeSource, ...layout }) => {
        const result: typeof layout & { resizeSource?: string | null } = layout;
        if (resizeSource) result.resizeSource = resizeSource;
        return result;
      })
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

  return (
    mobileLayouts.length !== 1 ||
    baseLayouts.length !== 1 ||
    mobileLayouts.at(0)?.breakpoint !== 0 ||
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

const validateBoardImportAsync = async (
  ctx: Parameters<typeof validateWidgetConfigurationsAsync>[0] & { session: Session },
  document: z.infer<typeof boardImportSchema>,
) => {
  const submittedItems = document.items.map((item) => ({ ...item, id: item.id ?? createId() }));
  throwIfCustomWidgetPlacementChangeForbidden({
    isAdmin: ctx.session.user.permissions.includes("admin"),
    submittedItems,
    storedItems: [],
  });
  await validateWidgetConfigurationsAsync(ctx, submittedItems);
  for (const item of submittedItems) {
    if (item.kind === "timetable") await validateTimetableOptionsChangeAsync(item.options);
  }
};

const throwIfSectionChildrenOverflow = (
  board: BoardForPlacement,
  sectionId: string,
  layoutId: string,
  columns: number,
) => {
  const childAreas = collectOccupiedAreas(board).filter(
    (area) => area.layoutId === layoutId && area.sectionId === sectionId,
  );
  if (childAreas.some((area) => area.xOffset + area.width > columns)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Section contains elements outside the requested width; move or resize them first",
    });
  }
};
