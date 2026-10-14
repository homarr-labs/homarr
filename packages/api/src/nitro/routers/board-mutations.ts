import { ORPCError } from "@orpc/server";
import superjson from "superjson";
import { z } from "zod/v4";

import type { InferInsertModel } from "@homarr/db";
import type { itemLayouts, items, layouts, sectionCollapseStates, sectionLayouts, sections } from "@homarr/db/schema";

import type { SourceLeafPath } from "../port-map";
import { authenticatedProcedure, sourceProcedure, sourceProjectionMeta } from "../procedure";
import {
  createBoardMutationHelpers,
  doBoardItemPlacementsOverlap,
  filterAddedItems,
  filterRemovedItems,
  filterUpdatedItems,
  findFirstAvailableBoardItemPosition,
  getResizeSourceUpdate,
  holdBoardMutationCandidate,
} from "./-board-mutations/helpers";
import type { BoardMutationResources } from "./-board-mutations/resources";

export type { BoardMutationResources } from "./-board-mutations/resources";

export const boardMutationCandidatePaths = [
  "board.createBoard",
  "board.duplicateBoard",
  "board.renameBoard",
  "board.changeBoardVisibility",
  "board.deleteBoard",
  "board.setHomeBoard",
  "board.setMobileHomeBoard",
  "board.getHomeBoard",
  "board.getBoardByName",
  "board.saveLayouts",
  "board.resetLayout",
  "board.savePartialBoardSettings",
  "board.saveBoard",
  "board.saveUserBoardPermissions",
  "board.saveGroupBoardPermissions",
  "board.addItem",
  "board.updateItemLayout",
] as const satisfies readonly SourceLeafPath[];

type MutationPath = Exclude<
  (typeof boardMutationCandidatePaths)[number],
  "board.getHomeBoard" | "board.getBoardByName"
>;

export function createBoardMutationProcedures(resources: BoardMutationResources) {
  const {
    boards,
    users,
    sections,
    layouts,
    items,
    itemLayouts,
    sectionLayouts,
    sectionCollapseStates,
    integrationItems,
    boardUserPermissions,
    boardGroupPermissions,
  } = resources.tables;
  const { eq, and, inArray, sql } = resources.operators;
  const { createId } = resources.common;
  const { emptySuperJSON, normalizeBoardLayoutRoles, getBoardLaneColumnCount, getRootSectionLane, widgetDefaultSizes } =
    resources.definitions;
  const {
    boardCreateSchema,
    boardDuplicateSchema,
    boardRenameSchema,
    boardChangeVisibilitySchema,
    boardByNameSchema,
    boardSaveLayoutsSchema,
    boardResetLayoutSchema,
    boardSavePartialSettingsSchema,
    boardSaveSchema,
    boardSavePermissionsSchema,
    addItemToBoardSchema,
    updateBoardItemLayoutSchema,
  } = resources.schemas;
  const { handleTransactionsAsync } = resources;
  const {
    throwIfActionForbiddenAsync,
    noBoardWithSimilarNameAsync,
    validateWidgetConfigurationsAsync,
    throwIfCustomWidgetBoardDuplicationForbidden,
    throwIfCustomWidgetPlacementChangeForbidden,
    getHomeIdBoardAsync,
    getFullBoardWithWhereAsync,
    ensureGutterRootSectionsAsync,
    getUpdatedBoardLayout,
    getElementsForProjectedLayout,
    validateTimetableOptionsChangeAsync,
    serializeBoardItemPlacementAsync,
  } = createBoardMutationHelpers(resources);
  const mutation = (path: MutationPath) =>
    authenticatedProcedure({ path, kind: "mutation", access: { kind: "protected" }, demo: "guarded" }).use<object>(
      ({ context, signal }) => {
        context.signal.throwIfAborted();
        signal?.throwIfAborted();
        return holdBoardMutationCandidate(resources);
      },
    );
  const creation = (path: "board.createBoard" | "board.duplicateBoard") =>
    authenticatedProcedure({
      path,
      kind: "mutation",
      access: { kind: "permission", permission: "board-create" },
      demo: "guarded",
    }).use<object>(({ context, signal }) => {
      context.signal.throwIfAborted();
      signal?.throwIfAborted();
      return holdBoardMutationCandidate(resources);
    });
  const repairQuery = (path: "board.getHomeBoard" | "board.getBoardByName") =>
    sourceProcedure({ path, kind: "query", access: { kind: "public" }, demo: "guarded" }).use<object>(
      ({ context, signal }) => {
        context.signal.throwIfAborted();
        signal?.throwIfAborted();
        return holdBoardMutationCandidate(resources);
      },
    );

  return {
    createBoard: creation("board.createBoard")
      .meta(
        sourceProjectionMeta({
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
        }),
      )
      .input(boardCreateSchema)
      .output(z.object({ boardId: z.string(), name: z.string(), layoutId: z.string() }))
      .handler(async ({ context, input }) => {
        const boardId = createId();
        const mobileLayoutId = createId();
        const baseLayoutId = createId();
        const user = await context.db.query.users.findFirst({
          where: eq(users.id, context.principal.user.id),
          columns: { homeBoardId: true },
        });
        const boardRow = {
          id: boardId,
          name: input.name,
          isPublic: input.isPublic,
          creatorId: context.principal.user.id,
        };
        const sectionRow: InferInsertModel<typeof sections> = {
          id: createId(),
          kind: "empty",
          xOffset: 0,
          yOffset: 0,
          boardId,
        };
        const layoutRows: InferInsertModel<typeof layouts>[] = [
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
        ];
        await handleTransactionsAsync(context.db, {
          async handleAsync(db, schema) {
            await db.transaction(async (transaction) => {
              await transaction.insert(schema.boards).values(boardRow);
              await transaction.insert(schema.sections).values(sectionRow);
              await transaction.insert(schema.layouts).values(layoutRows);
            });
          },
          handleSync(db) {
            db.transaction((transaction) => {
              transaction.insert(boards).values(boardRow).run();
              transaction.insert(sections).values(sectionRow).run();
              transaction.insert(layouts).values(layoutRows).run();
            });
          },
        });
        if (!user?.homeBoardId)
          await context.db.update(users).set({ homeBoardId: boardId }).where(eq(users.id, context.principal.user.id));
        return { boardId, name: input.name, layoutId: baseLayoutId };
      }),
    duplicateBoard: creation("board.duplicateBoard")
      .meta(
        sourceProjectionMeta({
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
        }),
      )
      .input(boardDuplicateSchema)
      .output(z.object({ boardId: z.string() }))
      .handler(async ({ context, input }) => {
        await throwIfActionForbiddenAsync(context, eq(boards.id, input.id), "view");
        await noBoardWithSimilarNameAsync(context.db, input.name);
        const board = await context.db.query.boards.findFirst({
          where: eq(boards.id, input.id),
          with: {
            layouts: true,
            sections: { with: { collapseStates: true, layouts: true } },
            items: { with: { layouts: true, integrations: true } },
          },
        });
        if (!board) throw new ORPCError("NOT_FOUND", { message: "Board not found" });
        const { sections: boardSections, items: boardItems, layouts: boardLayouts, ...boardProps } = board;
        throwIfCustomWidgetBoardDuplicationForbidden(context.principal.user.permissions.includes("admin"), boardItems);
        await validateWidgetConfigurationsAsync(
          context,
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
        const normalized =
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
        const layoutsMap = new Map(normalized.map((layout) => [layout.id, createId()]));
        const layoutsToInsert = normalized.map((layout) => ({
          ...layout,
          id: layoutsMap.get(layout.id)!,
          boardId: newBoardId,
          resizeSource: null,
        }));
        const sectionMap = new Map(boardSections.map((section) => [section.id, createId()]));
        const sectionsToInsert: InferInsertModel<typeof sections>[] = boardSections.map(
          ({ collapseStates: _, layouts: _layouts, ...section }) => ({
            ...section,
            id: sectionMap.get(section.id)!,
            boardId: newBoardId,
          }),
        );
        const sectionLayoutsToInsert: InferInsertModel<typeof sectionLayouts>[] = boardSections
          .flatMap((section) =>
            section.layouts.map((layout) => ({
              ...layout,
              layoutId: layoutsMap.get(layout.layoutId)!,
              sectionId: sectionMap.get(layout.sectionId)!,
              parentSectionId: layout.parentSectionId
                ? sectionMap.get(layout.parentSectionId)!
                : layout.parentSectionId,
            })),
          )
          .concat(
            (generatedMobilePositions?.sectionLayouts ?? []).map((layout) => ({
              ...layout,
              layoutId: layoutsMap.get(layout.layoutId)!,
              sectionId: sectionMap.get(layout.sectionId)!,
              parentSectionId: layout.parentSectionId ? sectionMap.get(layout.parentSectionId)! : null,
            })),
          );
        const collapseRows: InferInsertModel<typeof sectionCollapseStates>[] = boardSections.flatMap((section) =>
          section.collapseStates.map((state) => ({ ...state, sectionId: sectionMap.get(state.sectionId)! })),
        );
        const itemMap = new Map(boardItems.map((item) => [item.id, createId()]));
        const itemsToInsert: InferInsertModel<typeof items>[] = boardItems.map(
          ({ integrations: _, layouts: _layouts, ...item }) => ({
            ...item,
            id: itemMap.get(item.id)!,
            boardId: newBoardId,
          }),
        );
        const itemLayoutsToInsert: InferInsertModel<typeof itemLayouts>[] = boardItems
          .flatMap((item) =>
            item.layouts.map((layout) => ({
              ...layout,
              sectionId: sectionMap.get(layout.sectionId)!,
              itemId: itemMap.get(layout.itemId)!,
              layoutId: layoutsMap.get(layout.layoutId)!,
            })),
          )
          .concat(
            (generatedMobilePositions?.itemSectionLayouts ?? []).map((layout) => ({
              ...layout,
              sectionId: sectionMap.get(layout.sectionId)!,
              itemId: itemMap.get(layout.itemId)!,
              layoutId: layoutsMap.get(layout.layoutId)!,
            })),
          );
        const relations = boardItems.flatMap((item) =>
          item.integrations.map((integration) => ({
            itemId: itemMap.get(item.id)!,
            integrationId: integration.integrationId,
          })),
        );
        await handleTransactionsAsync(context.db, {
          async handleAsync(db, schema) {
            await db.transaction(async (transaction) => {
              await transaction
                .insert(schema.boards)
                .values({ ...boardProps, id: newBoardId, name: input.name, creatorId: context.principal.user.id });
              if (layoutsToInsert.length > 0) await transaction.insert(schema.layouts).values(layoutsToInsert);
              if (sectionsToInsert.length > 0) await transaction.insert(schema.sections).values(sectionsToInsert);
              if (sectionLayoutsToInsert.length > 0)
                await transaction.insert(schema.sectionLayouts).values(sectionLayoutsToInsert);
              if (collapseRows.length > 0) await transaction.insert(schema.sectionCollapseStates).values(collapseRows);
              if (itemsToInsert.length > 0) await transaction.insert(schema.items).values(itemsToInsert);
              if (itemLayoutsToInsert.length > 0)
                await transaction.insert(schema.itemLayouts).values(itemLayoutsToInsert);
              if (relations.length > 0) await transaction.insert(schema.integrationItems).values(relations);
            });
          },
          handleSync(db) {
            db.transaction((transaction) => {
              transaction
                .insert(boards)
                .values({ ...boardProps, id: newBoardId, name: input.name, creatorId: context.principal.user.id })
                .run();
              if (layoutsToInsert.length > 0) transaction.insert(layouts).values(layoutsToInsert).run();
              if (sectionsToInsert.length > 0) transaction.insert(sections).values(sectionsToInsert).run();
              if (sectionLayoutsToInsert.length > 0)
                transaction.insert(sectionLayouts).values(sectionLayoutsToInsert).run();
              if (collapseRows.length > 0) transaction.insert(sectionCollapseStates).values(collapseRows).run();
              if (itemsToInsert.length > 0) transaction.insert(items).values(itemsToInsert).run();
              if (itemLayoutsToInsert.length > 0) transaction.insert(itemLayouts).values(itemLayoutsToInsert).run();
              if (relations.length > 0) transaction.insert(integrationItems).values(relations).run();
            });
          },
        });
        return { boardId: newBoardId };
      }),
    renameBoard: mutation("board.renameBoard")
      .meta(
        sourceProjectionMeta({
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
        }),
      )
      .input(boardRenameSchema)
      .output(z.void())
      .handler(async ({ context, input }) => {
        await throwIfActionForbiddenAsync(context, eq(boards.id, input.id), "full");
        await noBoardWithSimilarNameAsync(context.db, input.name, [input.id]);
        await context.db.update(boards).set({ name: input.name }).where(eq(boards.id, input.id));
      }),
    changeBoardVisibility: mutation("board.changeBoardVisibility")
      .meta(
        sourceProjectionMeta({
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
        }),
      )
      .input(boardChangeVisibilitySchema)
      .output(z.void())
      .handler(async ({ context, input }) => {
        await throwIfActionForbiddenAsync(context, eq(boards.id, input.id), "full");
        const settings = await resources.getBoardServerSettingsAsync(context.db);
        if (
          input.visibility !== "public" &&
          (settings.homeBoardId === input.id || settings.mobileHomeBoardId === input.id)
        )
          throw new ORPCError("BAD_REQUEST", { message: "Cannot make home board private" });
        await context.db
          .update(boards)
          .set({ isPublic: input.visibility === "public" })
          .where(eq(boards.id, input.id));
      }),
    deleteBoard: mutation("board.deleteBoard")
      .meta(
        sourceProjectionMeta({
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
        }),
      )
      .input(z.object({ id: z.string() }))
      .output(z.void())
      .handler(async ({ context, input }) => {
        await throwIfActionForbiddenAsync(context, eq(boards.id, input.id), "full");
        await context.db.delete(boards).where(eq(boards.id, input.id));
      }),
    setHomeBoard: mutation("board.setHomeBoard")
      .meta(
        sourceProjectionMeta({
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
        }),
      )
      .input(z.object({ id: z.string() }))
      .output(z.void())
      .handler(async ({ context, input }) => {
        await throwIfActionForbiddenAsync(context, eq(boards.id, input.id), "view");
        await context.db.update(users).set({ homeBoardId: input.id }).where(eq(users.id, context.principal.user.id));
      }),
    setMobileHomeBoard: mutation("board.setMobileHomeBoard")
      .meta(
        sourceProjectionMeta({
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
        }),
      )
      .input(z.object({ id: z.string() }))
      .output(z.void())
      .handler(async ({ context, input }) => {
        await throwIfActionForbiddenAsync(context, eq(boards.id, input.id), "view");
        await context.db
          .update(users)
          .set({ mobileHomeBoardId: input.id })
          .where(eq(users.id, context.principal.user.id));
      }),
    getHomeBoard: repairQuery("board.getHomeBoard").handler(async ({ context }) => {
      const id = context.principal.kind === "authenticated" ? context.principal.user.id : undefined;
      const user = id ? ((await context.db.query.users.findFirst({ where: eq(users.id, id) })) ?? null) : null;
      const homeBoardId = await getHomeIdBoardAsync(context.db, user, context.deviceType);
      if (!homeBoardId) throw new ORPCError("NOT_FOUND", { message: "No home board found" });
      const where = eq(boards.id, homeBoardId);
      await throwIfActionForbiddenAsync(context, where, "view");
      return await getFullBoardWithWhereAsync(context.db, where, id ?? null);
    }),
    getBoardByName: repairQuery("board.getBoardByName")
      .meta(
        sourceProjectionMeta({
          mcp: {
            enabled: true,
            description:
              "Read a dashboard by name, including current sections, items, widget options and layout IDs used by board_saveBoard and board_saveLayouts. Only accessible boards are returned; obtain names from board_getAllBoards.",
          },
        }),
      )
      .input(boardByNameSchema)
      .handler(async ({ context, input }) => {
        const where = eq(sql`UPPER(${boards.name})`, input.name.toUpperCase());
        await throwIfActionForbiddenAsync(context, where, "view");
        return await getFullBoardWithWhereAsync(
          context.db,
          where,
          context.principal.kind === "authenticated" ? context.principal.user.id : null,
        );
      }),
    saveLayouts: mutation("board.saveLayouts")
      .meta(
        sourceProjectionMeta({
          openapi: {
            method: "PUT",
            path: "/api/boards/{id}/layouts",
            tags: ["boards"],
            protect: true,
            summary: "Save dashboard layouts",
            description:
              "Save the same responsive layout settings used by the dashboard editor. Requires modify access.",
          },
          mcp: {
            enabled: true,
            description:
              "Save dashboard layouts, preserving one Mobile and one Base layout. Requires modify access. Supply the board id and its complete layouts array from board_getBoardByName.",
          },
        }),
      )
      .input(boardSaveLayoutsSchema)
      .output(boardSaveLayoutsSchema.shape.layouts)
      .handler(async ({ context, input }) => {
        await throwIfActionForbiddenAsync(context, eq(boards.id, input.id), "modify");
        const requiredRoots = (["left", "right"] as const).filter((lane) =>
          input.layouts.some((layout) => getBoardLaneColumnCount(layout, lane) > 0),
        );
        await ensureGutterRootSectionsAsync(context.db, input.id, requiredRoots);
        const board = await getFullBoardWithWhereAsync(context.db, eq(boards.id, input.id), context.principal.user.id);
        const existing = new Map(board.layouts.map((layout) => [layout.id, layout]));
        const added = filterAddedItems(input.layouts, board.layouts);
        const removed = filterRemovedItems(input.layouts, board.layouts);
        if (added.some((layout) => layout.role !== "custom"))
          throw new ORPCError("BAD_REQUEST", { message: "New layouts must use the custom role" });
        if (removed.some((layout) => layout.role !== "custom"))
          throw new ORPCError("BAD_REQUEST", { message: "Mobile and Base layouts cannot be removed" });
        if (
          input.layouts.some((layout) => {
            const previous = existing.get(layout.id);
            return previous && previous.role !== layout.role;
          })
        )
          throw new ORPCError("BAD_REQUEST", { message: "Layout roles cannot be changed" });
        const base = board.layouts.find((layout) => layout.role === "base");
        if (!base) throw new ORPCError("INTERNAL_SERVER_ERROR", { message: "Board must have a Base layout" });
        const layoutsToInsert: InferInsertModel<typeof layouts>[] = [];
        const itemLayoutsToInsert: InferInsertModel<typeof itemLayouts>[] = [];
        const sectionLayoutsToInsert: InferInsertModel<typeof sectionLayouts>[] = [];
        const savedIds = new Map<string, string>();
        const requestedBase = input.layouts.find((layout) => layout.id === base.id);
        const resizedBase =
          requestedBase &&
          (requestedBase.columnCount !== base.columnCount ||
            requestedBase.leftGutterColumnCount !== base.leftGutterColumnCount ||
            requestedBase.rightGutterColumnCount !== base.rightGutterColumnCount)
            ? getUpdatedBoardLayout(board, {
                previous: {
                  layoutId: base.id,
                  columnCount: base.columnCount,
                  leftGutterColumnCount: base.leftGutterColumnCount,
                  rightGutterColumnCount: base.rightGutterColumnCount,
                },
                current: {
                  layoutId: base.id,
                  columnCount: requestedBase.columnCount,
                  leftGutterColumnCount: requestedBase.leftGutterColumnCount,
                  rightGutterColumnCount: requestedBase.rightGutterColumnCount,
                },
              })
            : null;
        const sourceElements = resizedBase ? getElementsForProjectedLayout(resizedBase) : undefined;
        const sourceGeometry = {
          layoutId: base.id,
          columnCount: requestedBase?.columnCount ?? base.columnCount,
          leftGutterColumnCount: requestedBase?.leftGutterColumnCount ?? base.leftGutterColumnCount,
          rightGutterColumnCount: requestedBase?.rightGutterColumnCount ?? base.rightGutterColumnCount,
        };
        for (const layout of added) {
          const id = createId();
          savedIds.set(layout.id, id);
          layoutsToInsert.push({
            id,
            name: layout.name,
            columnCount: layout.columnCount,
            leftGutterColumnCount: layout.leftGutterColumnCount,
            rightGutterColumnCount: layout.rightGutterColumnCount,
            breakpoint: layout.breakpoint,
            role: "custom",
            boardId: board.id,
          });
          const projected = getUpdatedBoardLayout(board, {
            previous: { ...sourceGeometry, elements: sourceElements },
            current: {
              layoutId: id,
              columnCount: layout.columnCount,
              leftGutterColumnCount: layout.leftGutterColumnCount,
              rightGutterColumnCount: layout.rightGutterColumnCount,
            },
          });
          itemLayoutsToInsert.push(...projected.itemSectionLayouts);
          sectionLayoutsToInsert.push(...projected.sectionLayouts);
        }
        const itemLayoutsToUpdate: InferInsertModel<typeof itemLayouts>[] = [];
        const sectionLayoutsToUpdate: InferInsertModel<typeof sectionLayouts>[] = [];
        const updated = filterUpdatedItems(input.layouts, board.layouts);
        const resizeSources = new Map<string, string | null>();
        for (const layout of updated) {
          const previous = existing.get(layout.id);
          if (
            !previous ||
            (previous.columnCount === layout.columnCount &&
              previous.leftGutterColumnCount === layout.leftGutterColumnCount &&
              previous.rightGutterColumnCount === layout.rightGutterColumnCount)
          )
            continue;
          const projected =
            layout.role === "base" && resizedBase
              ? resizedBase
              : getUpdatedBoardLayout(board, {
                  previous: {
                    layoutId: previous.id,
                    columnCount: previous.columnCount,
                    leftGutterColumnCount: previous.leftGutterColumnCount,
                    rightGutterColumnCount: previous.rightGutterColumnCount,
                  },
                  current: {
                    layoutId: previous.id,
                    columnCount: layout.columnCount,
                    leftGutterColumnCount: layout.leftGutterColumnCount,
                    rightGutterColumnCount: layout.rightGutterColumnCount,
                  },
                });
          resizeSources.set(layout.id, projected.resizeSource);
          itemLayoutsToUpdate.push(...projected.itemSectionLayouts);
          sectionLayoutsToUpdate.push(...projected.sectionLayouts);
        }
        const removedIds = removed.map((layout) => layout.id);
        await handleTransactionsAsync(context.db, {
          async handleAsync(db, schema) {
            await db.transaction(async (transaction) => {
              if (layoutsToInsert.length > 0) await transaction.insert(schema.layouts).values(layoutsToInsert);
              if (itemLayoutsToInsert.length > 0)
                await transaction.insert(schema.itemLayouts).values(itemLayoutsToInsert);
              if (sectionLayoutsToInsert.length > 0)
                await transaction.insert(schema.sectionLayouts).values(sectionLayoutsToInsert);
              for (const row of itemLayoutsToUpdate)
                await transaction
                  .update(schema.itemLayouts)
                  .set({
                    height: row.height,
                    width: row.width,
                    xOffset: row.xOffset,
                    yOffset: row.yOffset,
                    sectionId: row.sectionId,
                  })
                  .where(and(eq(schema.itemLayouts.itemId, row.itemId), eq(schema.itemLayouts.layoutId, row.layoutId)));
              for (const row of sectionLayoutsToUpdate)
                await transaction
                  .update(schema.sectionLayouts)
                  .set({
                    height: row.height,
                    width: row.width,
                    xOffset: row.xOffset,
                    yOffset: row.yOffset,
                    parentSectionId: row.parentSectionId,
                  })
                  .where(
                    and(
                      eq(schema.sectionLayouts.sectionId, row.sectionId),
                      eq(schema.sectionLayouts.layoutId, row.layoutId),
                    ),
                  );
              for (const layout of updated)
                await transaction
                  .update(schema.layouts)
                  .set({
                    ...getResizeSourceUpdate(resizeSources, layout.id),
                    name: layout.name,
                    columnCount: layout.columnCount,
                    leftGutterColumnCount: layout.leftGutterColumnCount,
                    rightGutterColumnCount: layout.rightGutterColumnCount,
                    breakpoint: layout.breakpoint,
                  })
                  .where(eq(schema.layouts.id, layout.id));
              if (removedIds.length > 0)
                await transaction.delete(schema.layouts).where(inArray(schema.layouts.id, removedIds));
            });
          },
          handleSync(db) {
            db.transaction((transaction) => {
              if (layoutsToInsert.length > 0) transaction.insert(layouts).values(layoutsToInsert).run();
              if (itemLayoutsToInsert.length > 0) transaction.insert(itemLayouts).values(itemLayoutsToInsert).run();
              if (sectionLayoutsToInsert.length > 0)
                transaction.insert(sectionLayouts).values(sectionLayoutsToInsert).run();
              for (const row of itemLayoutsToUpdate)
                transaction
                  .update(itemLayouts)
                  .set({
                    height: row.height,
                    width: row.width,
                    xOffset: row.xOffset,
                    yOffset: row.yOffset,
                    sectionId: row.sectionId,
                  })
                  .where(and(eq(itemLayouts.itemId, row.itemId), eq(itemLayouts.layoutId, row.layoutId)))
                  .run();
              for (const row of sectionLayoutsToUpdate)
                transaction
                  .update(sectionLayouts)
                  .set({
                    height: row.height,
                    width: row.width,
                    xOffset: row.xOffset,
                    yOffset: row.yOffset,
                    parentSectionId: row.parentSectionId,
                  })
                  .where(and(eq(sectionLayouts.sectionId, row.sectionId), eq(sectionLayouts.layoutId, row.layoutId)))
                  .run();
              for (const layout of updated)
                transaction
                  .update(layouts)
                  .set({
                    ...getResizeSourceUpdate(resizeSources, layout.id),
                    name: layout.name,
                    columnCount: layout.columnCount,
                    leftGutterColumnCount: layout.leftGutterColumnCount,
                    rightGutterColumnCount: layout.rightGutterColumnCount,
                    breakpoint: layout.breakpoint,
                  })
                  .where(eq(layouts.id, layout.id))
                  .run();
              if (removedIds.length > 0) transaction.delete(layouts).where(inArray(layouts.id, removedIds)).run();
            });
          },
        });
        return input.layouts
          .map((layout) => ({
            ...layout,
            id: savedIds.get(layout.id) ?? layout.id,
            role: existing.get(layout.id)?.role ?? "custom",
          }))
          .toSorted((a, b) => a.breakpoint - b.breakpoint);
      }),
    resetLayout: mutation("board.resetLayout")
      .meta(
        sourceProjectionMeta({
          openapi: {
            method: "POST",
            path: "/api/boards/{boardId}/layouts/{layoutId}/reset",
            tags: ["boards"],
            protect: true,
            summary: "Reset a dashboard layout",
            description: "Reset a Mobile or custom layout from the Base layout. Requires modify access.",
          },
          mcp: {
            enabled: true,
            description:
              "Reset a board's Mobile or custom layout from its Base layout while preserving the target layout settings. Requires modify permission. REQUIRED: boardId (board ID), layoutId (non-Base layout ID)",
          },
        }),
      )
      .input(boardResetLayoutSchema)
      .output(z.void())
      .handler(async ({ context, input }) => {
        await throwIfActionForbiddenAsync(context, eq(boards.id, input.boardId), "modify");
        const board = await getFullBoardWithWhereAsync(
          context.db,
          eq(boards.id, input.boardId),
          context.principal.user.id,
        );
        const target = board.layouts.find((layout) => layout.id === input.layoutId);
        const base = board.layouts.find((layout) => layout.role === "base");
        if (!target) throw new ORPCError("NOT_FOUND", { message: "Layout not found" });
        if (!base) throw new ORPCError("INTERNAL_SERVER_ERROR", { message: "Board must have a Base layout" });
        if (target.role === "base") throw new ORPCError("BAD_REQUEST", { message: "The Base layout cannot be reset" });
        const projected = getUpdatedBoardLayout(board, {
          previous: {
            layoutId: base.id,
            columnCount: base.columnCount,
            leftGutterColumnCount: base.leftGutterColumnCount,
            rightGutterColumnCount: base.rightGutterColumnCount,
          },
          current: {
            layoutId: target.id,
            columnCount: target.columnCount,
            leftGutterColumnCount: target.leftGutterColumnCount,
            rightGutterColumnCount: target.rightGutterColumnCount,
          },
        });
        await handleTransactionsAsync(context.db, {
          async handleAsync(db, schema) {
            await db.transaction(async (transaction) => {
              await transaction
                .update(schema.layouts)
                .set({ resizeSource: null })
                .where(eq(schema.layouts.id, target.id));
              await transaction.delete(schema.itemLayouts).where(eq(schema.itemLayouts.layoutId, target.id));
              await transaction.delete(schema.sectionLayouts).where(eq(schema.sectionLayouts.layoutId, target.id));
              if (projected.itemSectionLayouts.length > 0)
                await transaction.insert(schema.itemLayouts).values(projected.itemSectionLayouts);
              if (projected.sectionLayouts.length > 0)
                await transaction.insert(schema.sectionLayouts).values(projected.sectionLayouts);
            });
          },
          handleSync(db) {
            db.transaction((transaction) => {
              transaction.update(layouts).set({ resizeSource: null }).where(eq(layouts.id, target.id)).run();
              transaction.delete(itemLayouts).where(eq(itemLayouts.layoutId, target.id)).run();
              transaction.delete(sectionLayouts).where(eq(sectionLayouts.layoutId, target.id)).run();
              if (projected.itemSectionLayouts.length > 0)
                transaction.insert(itemLayouts).values(projected.itemSectionLayouts).run();
              if (projected.sectionLayouts.length > 0)
                transaction.insert(sectionLayouts).values(projected.sectionLayouts).run();
            });
          },
        });
      }),
    saveBoard: mutation("board.saveBoard")
      .meta(
        sourceProjectionMeta({
          openapi: {
            method: "PUT",
            path: "/api/boards/{id}/content",
            tags: ["boards"],
            protect: true,
            summary: "Save dashboard content",
            description:
              "Save the editor's complete sections and items arrays, including widget options and placements. Omitted items and sections are removed. Requires modify access; Custom Widget placement changes require admin access.",
          },
          mcp: {
            enabled: true,
            description:
              "Save complete dashboard sections and items, including widget options and placements. Omitted entries are removed. Read current content with board_getBoardByName first. Requires modify access; Custom Widget placement changes require admin access.",
          },
        }),
      )
      .input(boardSaveSchema)
      .output(z.void())
      .handler(async ({ context, input }) => {
        await throwIfActionForbiddenAsync(context, eq(boards.id, input.id), "modify");
        const stored = await getFullBoardWithWhereAsync(context.db, eq(boards.id, input.id), context.principal.user.id);
        await validateWidgetConfigurationsAsync(context, input.items, stored.items);
        throwIfCustomWidgetPlacementChangeForbidden({
          isAdmin: context.principal.user.permissions.includes("admin"),
          submittedItems: input.items,
          storedItems: stored.items,
        });
        for (const item of input.items) {
          if (item.kind !== "timetable") continue;
          const previous = stored.items.find((candidate) => candidate.id === item.id);
          let previousOptions: Record<string, unknown> | undefined;
          if (previous?.kind === "timetable") previousOptions = previous.options;
          await validateTimetableOptionsChangeAsync(item.options, previousOptions);
        }
        await handleTransactionsAsync(context.db, {
          async handleAsync(db, schema) {
            await db.transaction(async (transaction) => {
              const addedSections = filterAddedItems(input.sections, stored.sections);
              if (addedSections.length > 0) {
                await transaction.insert(schema.sections).values(
                  addedSections.map((section) => ({
                    id: section.id,
                    kind: section.kind,
                    yOffset: section.kind === "empty" ? section.yOffset : null,
                    xOffset: section.kind === "empty" ? section.xOffset : null,
                    options: section.kind === "empty" ? emptySuperJSON : superjson.stringify(section.options),
                    name: null,
                    boardId: stored.id,
                  })),
                );
                const sectionRows = addedSections
                  .filter((section) => section.kind === "container")
                  .flatMap((section) =>
                    section.layouts.map((layout): InferInsertModel<typeof schema.sectionLayouts> => ({
                      layoutId: layout.layoutId,
                      sectionId: section.id,
                      parentSectionId: layout.parentSectionId,
                      height: layout.height,
                      width: layout.width,
                      xOffset: layout.xOffset,
                      yOffset: layout.yOffset,
                    })),
                  );
                if (sectionRows.length > 0) await transaction.insert(schema.sectionLayouts).values(sectionRows);
              }
              const addedItems = filterAddedItems(input.items, stored.items);
              if (addedItems.length > 0) {
                await transaction.insert(schema.items).values(
                  addedItems.map((item) => ({
                    id: item.id,
                    kind: item.kind,
                    options: superjson.stringify(item.options),
                    advancedOptions: superjson.stringify(item.advancedOptions),
                    boardId: stored.id,
                  })),
                );
                await transaction.insert(schema.itemLayouts).values(
                  addedItems.flatMap((item) =>
                    item.layouts.map((layout): InferInsertModel<typeof schema.itemLayouts> => ({
                      layoutId: layout.layoutId,
                      sectionId: layout.sectionId,
                      itemId: item.id,
                      height: layout.height,
                      width: layout.width,
                      xOffset: layout.xOffset,
                      yOffset: layout.yOffset,
                    })),
                  ),
                );
              }
              const inputRelations = input.items.flatMap(({ integrationIds, id: itemId }) =>
                integrationIds.map((integrationId) => ({ integrationId, itemId })),
              );
              const storedRelations = stored.items.flatMap(({ integrationIds, id: itemId }) =>
                integrationIds.map((integrationId) => ({ integrationId, itemId })),
              );
              const addedRelations = inputRelations.filter(
                (relation) =>
                  !storedRelations.some(
                    (previous) =>
                      previous.itemId === relation.itemId && previous.integrationId === relation.integrationId,
                  ),
              );
              if (addedRelations.length > 0)
                await transaction.insert(schema.integrationItems).values(
                  addedRelations.map((relation) => ({
                    itemId: relation.itemId,
                    integrationId: relation.integrationId,
                  })),
                );
              const updatedItems = filterUpdatedItems(input.items, stored.items);
              for (const item of updatedItems) {
                await transaction
                  .update(schema.items)
                  .set({
                    kind: item.kind,
                    options: superjson.stringify(item.options),
                    advancedOptions: superjson.stringify(item.advancedOptions),
                  })
                  .where(eq(schema.items.id, item.id));
                for (const layout of item.layouts)
                  await transaction
                    .update(schema.itemLayouts)
                    .set({
                      height: layout.height,
                      width: layout.width,
                      xOffset: layout.xOffset,
                      yOffset: layout.yOffset,
                      sectionId: layout.sectionId,
                    })
                    .where(
                      and(eq(schema.itemLayouts.itemId, item.id), eq(schema.itemLayouts.layoutId, layout.layoutId)),
                    );
              }
              const updatedSections = filterUpdatedItems(input.sections, stored.sections);
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
                for (const layout of section.layouts)
                  await transaction
                    .update(schema.sectionLayouts)
                    .set({
                      height: layout.height,
                      width: layout.width,
                      xOffset: layout.xOffset,
                      yOffset: layout.yOffset,
                      parentSectionId: layout.parentSectionId,
                    })
                    .where(
                      and(
                        eq(schema.sectionLayouts.sectionId, section.id),
                        eq(schema.sectionLayouts.layoutId, layout.layoutId),
                      ),
                    );
              }
              const removedRelations = storedRelations.filter(
                (relation) =>
                  !inputRelations.some(
                    (current) => current.itemId === relation.itemId && current.integrationId === relation.integrationId,
                  ),
              );
              for (const relation of removedRelations)
                await transaction
                  .delete(schema.integrationItems)
                  .where(
                    and(
                      eq(integrationItems.itemId, relation.itemId),
                      eq(integrationItems.integrationId, relation.integrationId),
                    ),
                  );
              const itemIds = filterRemovedItems(input.items, stored.items).map((item) => item.id);
              if (itemIds.length > 0) await transaction.delete(schema.items).where(inArray(schema.items.id, itemIds));
              const sectionIds = filterRemovedItems(input.sections, stored.sections).map((section) => section.id);
              if (sectionIds.length > 0)
                await transaction.delete(schema.sections).where(inArray(schema.sections.id, sectionIds));
            });
          },
          handleSync(db) {
            db.transaction((transaction) => {
              const addedSections = filterAddedItems(input.sections, stored.sections);
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
                      boardId: stored.id,
                    })),
                  )
                  .run();
                const sectionRows = addedSections
                  .filter((section) => section.kind === "container")
                  .flatMap((section) =>
                    section.layouts.map((layout): InferInsertModel<typeof sectionLayouts> => ({
                      layoutId: layout.layoutId,
                      sectionId: section.id,
                      parentSectionId: layout.parentSectionId,
                      height: layout.height,
                      width: layout.width,
                      xOffset: layout.xOffset,
                      yOffset: layout.yOffset,
                    })),
                  );
                if (sectionRows.length > 0) transaction.insert(sectionLayouts).values(sectionRows).run();
              }
              const addedItems = filterAddedItems(input.items, stored.items);
              if (addedItems.length > 0) {
                transaction
                  .insert(items)
                  .values(
                    addedItems.map((item) => ({
                      id: item.id,
                      kind: item.kind,
                      options: superjson.stringify(item.options),
                      advancedOptions: superjson.stringify(item.advancedOptions),
                      boardId: stored.id,
                    })),
                  )
                  .run();
                transaction
                  .insert(itemLayouts)
                  .values(
                    addedItems.flatMap((item) =>
                      item.layouts.map((layout): InferInsertModel<typeof itemLayouts> => ({
                        layoutId: layout.layoutId,
                        sectionId: layout.sectionId,
                        itemId: item.id,
                        height: layout.height,
                        width: layout.width,
                        xOffset: layout.xOffset,
                        yOffset: layout.yOffset,
                      })),
                    ),
                  )
                  .run();
              }
              const inputRelations = input.items.flatMap(({ integrationIds, id: itemId }) =>
                integrationIds.map((integrationId) => ({ integrationId, itemId })),
              );
              const storedRelations = stored.items.flatMap(({ integrationIds, id: itemId }) =>
                integrationIds.map((integrationId) => ({ integrationId, itemId })),
              );
              const addedRelations = inputRelations.filter(
                (relation) =>
                  !storedRelations.some(
                    (previous) =>
                      previous.itemId === relation.itemId && previous.integrationId === relation.integrationId,
                  ),
              );
              if (addedRelations.length > 0)
                transaction
                  .insert(integrationItems)
                  .values(
                    addedRelations.map((relation) => ({
                      itemId: relation.itemId,
                      integrationId: relation.integrationId,
                    })),
                  )
                  .run();
              const updatedItems = filterUpdatedItems(input.items, stored.items);
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
                for (const layout of item.layouts)
                  transaction
                    .update(itemLayouts)
                    .set({
                      height: layout.height,
                      width: layout.width,
                      xOffset: layout.xOffset,
                      yOffset: layout.yOffset,
                      sectionId: layout.sectionId,
                    })
                    .where(and(eq(itemLayouts.itemId, item.id), eq(itemLayouts.layoutId, layout.layoutId)))
                    .run();
              }
              const updatedSections = filterUpdatedItems(input.sections, stored.sections);
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
                for (const layout of section.layouts)
                  transaction
                    .update(sectionLayouts)
                    .set({
                      height: layout.height,
                      width: layout.width,
                      xOffset: layout.xOffset,
                      yOffset: layout.yOffset,
                      parentSectionId: layout.parentSectionId,
                    })
                    .where(and(eq(sectionLayouts.sectionId, section.id), eq(sectionLayouts.layoutId, layout.layoutId)))
                    .run();
              }
              const removedRelations = storedRelations.filter(
                (relation) =>
                  !inputRelations.some(
                    (current) => current.itemId === relation.itemId && current.integrationId === relation.integrationId,
                  ),
              );
              for (const relation of removedRelations)
                transaction
                  .delete(integrationItems)
                  .where(
                    and(
                      eq(integrationItems.itemId, relation.itemId),
                      eq(integrationItems.integrationId, relation.integrationId),
                    ),
                  )
                  .run();
              const itemIds = filterRemovedItems(input.items, stored.items).map((item) => item.id);
              if (itemIds.length > 0) transaction.delete(items).where(inArray(items.id, itemIds)).run();
              const sectionIds = filterRemovedItems(input.sections, stored.sections).map((section) => section.id);
              if (sectionIds.length > 0) transaction.delete(sections).where(inArray(sections.id, sectionIds)).run();
            });
          },
        });
      }),
    saveUserBoardPermissions: mutation("board.saveUserBoardPermissions")
      .input(boardSavePermissionsSchema)
      .handler(async ({ context, input }) => {
        await throwIfActionForbiddenAsync(context, eq(boards.id, input.entityId), "full");
        await handleTransactionsAsync(context.db, {
          async handleAsync(db, schema) {
            await db.transaction(async (transaction) => {
              await transaction
                .delete(schema.boardUserPermissions)
                .where(eq(boardUserPermissions.boardId, input.entityId));
              if (input.permissions.length === 0) return;
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
              if (input.permissions.length === 0) return;
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
    saveGroupBoardPermissions: mutation("board.saveGroupBoardPermissions")
      .input(boardSavePermissionsSchema)
      .handler(async ({ context, input }) => {
        await throwIfActionForbiddenAsync(context, eq(boards.id, input.entityId), "full");
        await handleTransactionsAsync(context.db, {
          async handleAsync(db, schema) {
            await db.transaction(async (transaction) => {
              await transaction
                .delete(schema.boardGroupPermissions)
                .where(eq(boardGroupPermissions.boardId, input.entityId));
              if (input.permissions.length === 0) return;
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
              if (input.permissions.length === 0) return;
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
    addItem: mutation("board.addItem")
      .meta(
        sourceProjectionMeta({
          openapi: {
            method: "POST",
            path: "/api/boards/items",
            tags: ["boards"],
            protect: true,
            summary: "Add an item to a board",
            description:
              "Add a widget or app to the first available position in the main canvas of each layout and return its item ID. Requires modify access to the board and use access to linked integrations. Widget configurations must be valid; placing Custom Widgets requires admin permission.",
          },
          mcp: {
            enabled: true,
            description:
              "Add a widget/app item to a board after configure_widget has reviewed it. Automatically places it in the main canvas at the first free grid position without overlapping items or containers. Use the configure_widget result's boardId, kind, options, and integrationIds exactly. Optional size {width,height} sets grid dimensions; width is capped by each layout's available columns. Integration IDs must be accessible to the current user. To create a formatted dashboard note, configure kind 'notebook' with options { content: Tiptap-compatible HTML, showToolbar: boolean, allowReadOnlyCheck: boolean }. Returns { itemId }",
          },
        }),
      )
      .input(addItemToBoardSchema)
      .output(z.object({ itemId: z.string() }))
      .handler(async ({ context, input }) => {
        await throwIfActionForbiddenAsync(context, eq(boards.id, input.boardId), "modify");
        await validateWidgetConfigurationsAsync(context, [
          { id: "", kind: input.kind, integrationIds: input.integrationIds },
        ]);
        throwIfCustomWidgetPlacementChangeForbidden({
          isAdmin: context.principal.user.permissions.includes("admin"),
          submittedItems: [{ id: "", kind: input.kind, options: input.options }],
          storedItems: [],
        });
        if (input.kind === "timetable") await validateTimetableOptionsChangeAsync(input.options);
        return await serializeBoardItemPlacementAsync(input.boardId, async () => {
          const board = await context.db.query.boards.findFirst({
            where: eq(boards.id, input.boardId),
            with: { sections: { with: { layouts: true } }, layouts: true, items: { with: { layouts: true } } },
          });
          if (!board) throw new ORPCError("NOT_FOUND", { message: "Board not found" });
          const root = board.sections
            .filter((section) => section.kind === "empty" && getRootSectionLane(section.xOffset) === "main")
            .toSorted((a, b) => (a.yOffset ?? 0) - (b.yOffset ?? 0) || a.id.localeCompare(b.id))[0];
          if (!root) throw new ORPCError("BAD_REQUEST", { message: "Board has no main section to place items in" });
          const itemId = createId();
          const defaultSize = input.size ?? widgetDefaultSizes[input.kind] ?? { width: 1, height: 1 };
          const rows: InferInsertModel<typeof itemLayouts>[] = board.layouts.map((layout) => {
            const columnCount = getBoardLaneColumnCount(layout, getRootSectionLane(root.xOffset));
            const size = { ...defaultSize, width: Math.min(columnCount, defaultSize.width) };
            const placements = board.items
              .flatMap((item) => item.layouts)
              .filter((position) => position.sectionId === root.id && position.layoutId === layout.id);
            const containers = board.sections
              .filter((section) => section.kind === "container")
              .flatMap((section) => section.layouts)
              .filter((position) => position.parentSectionId === root.id && position.layoutId === layout.id);
            const position = findFirstAvailableBoardItemPosition([...placements, ...containers], columnCount, size);
            if (!position)
              throw new ORPCError("BAD_REQUEST", { message: "Board section is full, no free grid position available" });
            return {
              itemId,
              sectionId: root.id,
              layoutId: layout.id,
              ...position,
              width: size.width,
              height: size.height,
            };
          });
          await context.db.insert(items).values({
            id: itemId,
            boardId: input.boardId,
            kind: input.kind,
            options: superjson.stringify(input.options),
            advancedOptions: emptySuperJSON,
          });
          if (rows.length > 0) await context.db.insert(itemLayouts).values(rows);
          if (input.integrationIds.length > 0)
            await context.db
              .insert(integrationItems)
              .values(input.integrationIds.map((integrationId) => ({ itemId, integrationId })));
          return { itemId };
        });
      }),
    updateItemLayout: mutation("board.updateItemLayout")
      .meta(
        sourceProjectionMeta({
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
        }),
      )
      .input(updateBoardItemLayoutSchema)
      .output(updateBoardItemLayoutSchema)
      .handler(async ({ context, input }) => {
        await throwIfActionForbiddenAsync(context, eq(boards.id, input.boardId), "modify");
        return await serializeBoardItemPlacementAsync(input.boardId, async () => {
          const board = await context.db.query.boards.findFirst({
            where: eq(boards.id, input.boardId),
            with: { layouts: true, sections: { with: { layouts: true } }, items: { with: { layouts: true } } },
          });
          if (!board) throw new ORPCError("NOT_FOUND", { message: "Board not found" });
          const layout = board.layouts.find((candidate) => candidate.id === input.layoutId);
          const item = board.items.find((candidate) => candidate.id === input.itemId);
          const position = item?.layouts.find((candidate) => candidate.layoutId === input.layoutId);
          if (!layout || !item || !position)
            throw new ORPCError("NOT_FOUND", { message: "Item layout not found on this board" });
          const section = board.sections.find((candidate) => candidate.id === position.sectionId);
          if (!section) throw new ORPCError("NOT_FOUND", { message: "Item section not found on this board" });
          let columnCount: number;
          if (section.kind === "empty")
            columnCount = getBoardLaneColumnCount(layout, getRootSectionLane(section.xOffset));
          else {
            const sectionLayout = section.layouts.find((candidate) => candidate.layoutId === layout.id);
            if (!sectionLayout)
              throw new ORPCError("BAD_REQUEST", { message: "Item section has no layout at this breakpoint" });
            columnCount = sectionLayout.width;
          }
          if (input.xOffset + input.width > columnCount || input.yOffset + input.height > 32767)
            throw new ORPCError("BAD_REQUEST", { message: "Item layout exceeds its section bounds" });
          const otherItems = board.items
            .filter((candidate) => candidate.id !== item.id)
            .flatMap((candidate) => candidate.layouts)
            .filter((candidate) => candidate.layoutId === layout.id && candidate.sectionId === section.id);
          const children = board.sections
            .flatMap((candidate) => candidate.layouts)
            .filter((candidate) => candidate.layoutId === layout.id && candidate.parentSectionId === section.id);
          if ([...otherItems, ...children].some((candidate) => doBoardItemPlacementsOverlap(input, candidate)))
            throw new ORPCError("CONFLICT", { message: "Item layout overlaps another item or section" });
          await context.db
            .update(itemLayouts)
            .set({ xOffset: input.xOffset, yOffset: input.yOffset, width: input.width, height: input.height })
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
    savePartialBoardSettings: mutation("board.savePartialBoardSettings")
      .meta(
        sourceProjectionMeta({
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
        }),
      )
      .input(boardSavePartialSettingsSchema.extend({ id: z.string() }))
      .output(z.void())
      .handler(async ({ context, input }) => {
        await throwIfActionForbiddenAsync(context, eq(boards.id, input.id), "modify");
        await context.db
          .update(boards)
          .set({
            pageTitle: input.pageTitle,
            metaTitle: input.metaTitle,
            logoImageUrl: input.logoImageUrl,
            faviconImageUrl: input.faviconImageUrl,
            backgroundImageUrl: input.backgroundImageUrl,
            backgroundImageAttachment: input.backgroundImageAttachment,
            backgroundImageRepeat: input.backgroundImageRepeat,
            backgroundImageSize: input.backgroundImageSize,
            primaryColor: input.primaryColor,
            secondaryColor: input.secondaryColor,
            opacity: input.opacity,
            iconColor: input.iconColor,
            itemRadius: input.itemRadius,
            customCss: input.customCss,
            disableStatus: input.disableStatus,
          })
          .where(eq(boards.id, input.id));
      }),
  };
}
