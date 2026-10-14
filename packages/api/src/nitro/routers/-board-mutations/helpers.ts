import { BlockList, isIP } from "node:net";
import { isDeepStrictEqual } from "node:util";

import { ORPCError } from "@orpc/server";
import superjson from "superjson";
import { z } from "zod/v4";

import type { GridAlgorithmItem } from "@homarr/common";
import type { Database, InferInsertModel, InferSelectModel, SQL } from "@homarr/db";
import type { itemLayouts, sectionLayouts, users } from "@homarr/db/schema";
import type { BoardLane, BoardPermission, IntegrationKind, WidgetKind } from "@homarr/definitions";
import type { BoardItemAdvancedOptions } from "@homarr/validation/shared";

import type { BackendContext } from "../../context";
import type { BoardMutationResources } from "./resources";

export function holdBoardMutationCandidate(resources: BoardMutationResources): never {
  throw new ORPCError("PRECONDITION_FAILED", {
    message: "Board current-authority and whole-draft atomic commit are not ready",
    data: resources.execution,
  });
}

export interface BoardItemPlacementRectangle {
  xOffset: number;
  yOffset: number;
  width: number;
  height: number;
}

export function findFirstAvailableBoardItemPosition(
  placements: readonly BoardItemPlacementRectangle[],
  columnCount: number,
  size: { width: number; height: number },
) {
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
}

export const doBoardItemPlacementsOverlap = (left: BoardItemPlacementRectangle, right: BoardItemPlacementRectangle) =>
  left.yOffset < right.yOffset + right.height &&
  left.yOffset + left.height > right.yOffset &&
  left.xOffset < right.xOffset + right.width &&
  left.xOffset + left.width > right.xOffset;

export const filterAddedItems = <T extends { id: string }>(input: T[], stored: { id: string }[]) =>
  input.filter((item) => !stored.some((candidate) => candidate.id === item.id));

export const filterRemovedItems = <T extends { id: string }>(input: { id: string }[], stored: T[]) =>
  stored.filter((item) => !input.some((candidate) => candidate.id === item.id));

export const filterUpdatedItems = <T extends { id: string }>(input: T[], stored: { id: string }[]) =>
  input.filter((item) => stored.some((candidate) => candidate.id === item.id));

export const getResizeSourceUpdate = (sources: ReadonlyMap<string, string | null>, layoutId: string) =>
  sources.has(layoutId) ? { resizeSource: sources.get(layoutId) ?? null } : {};

interface WidgetConfiguration {
  id: string;
  kind: WidgetKind;
  integrationIds: readonly string[];
}

interface BoardPlacement {
  id: string;
  kind: string;
  options: Record<string, unknown>;
}

interface BoardForLayoutProjection {
  id: string;
  layouts: Array<{ id: string; resizeSource?: string | null }>;
  items: Array<{ id: string; layouts: Array<GridRectangle & { layoutId: string; sectionId: string }> }>;
  sections: Array<{
    id: string;
    kind: string;
    xOffset?: number | null;
    yOffset?: number | null;
    layouts?: Array<GridRectangle & { layoutId: string; parentSectionId: string | null }>;
  }>;
}

interface GridRectangle {
  width: number;
  height: number;
  xOffset: number;
  yOffset: number;
}

interface BoardLayoutGeometry {
  layoutId: string;
  columnCount: number;
  leftGutterColumnCount: number;
  rightGutterColumnCount: number;
}

export function getElementsForLayout(board: BoardForLayoutProjection, layoutId: string): GridAlgorithmItem[] {
  const sectionElements = board.sections
    .filter((section) => section.kind === "container")
    .flatMap((section) => {
      const layout = section.layouts?.find((candidate) => candidate.layoutId === layoutId);
      if (!layout?.parentSectionId) return [];
      return [
        {
          id: section.id,
          type: "section" as const,
          height: layout.height,
          width: layout.width,
          xOffset: layout.xOffset,
          yOffset: layout.yOffset,
          sectionId: layout.parentSectionId,
        },
      ];
    });
  const itemElements = board.items.flatMap((item) => {
    const layout = item.layouts.find((candidate) => candidate.layoutId === layoutId);
    if (!layout) return [];
    return [
      {
        id: item.id,
        type: "item" as const,
        height: layout.height,
        width: layout.width,
        xOffset: layout.xOffset,
        yOffset: layout.yOffset,
        sectionId: layout.sectionId,
      },
    ];
  });
  return [...itemElements, ...sectionElements];
}

export function createBoardMutationHelpers(resources: BoardMutationResources) {
  const {
    boards,
    users,
    groups,
    groupMembers,
    boardUserPermissions,
    boardGroupPermissions,
    sections,
    layouts,
    itemLayouts,
    sectionLayouts,
    sectionCollapseStates,
    integrations,
    integrationUserPermissions,
    integrationGroupPermissions,
  } = resources.tables;
  const { eq, and, inArray, asc, not, isNull } = resources.operators;
  const { createId, generateResponsiveGridFor, getLayoutResizeSource, serializeLayoutResizeSource, isRecord } =
    resources.common;
  const {
    emptySuperJSON,
    boardLanes,
    getRootSectionLane,
    getBoardLaneColumnCount,
    rootSectionOffsets,
    normalizeBoardLayoutRoles,
    everyoneGroup,
    getWidgetIntegrationIssue,
    getWidgetIntegrationIssueMessage,
    widgetKinds,
  } = resources.definitions;
  const { handleTransactionsAsync } = resources;
  const placementTails = new Map<string, Promise<void>>();
  const repairPromises = new Map<string, Promise<void>>();
  const forKind = <T extends WidgetKind>(kind: T) =>
    z.object({ kind: z.literal(kind), options: z.record(z.string(), z.unknown()) });
  const outputItemSchema = resources.schemas
    .zodUnionFromArray(widgetKinds.map((kind) => forKind(kind)))
    .and(resources.schemas.sharedItemSchema);

  const userId = (context: BackendContext) =>
    context.principal.kind === "authenticated" ? context.principal.user.id : undefined;

  async function throwIfActionForbiddenAsync(
    context: BackendContext,
    where: SQL<unknown>,
    permission: BoardPermission,
  ) {
    const { db, principal } = context;
    const id = userId(context);
    const groupPermissionWhere =
      principal.kind === "authenticated"
        ? inArray(
            boardGroupPermissions.groupId,
            db
              .select({ groupId: groupMembers.groupId })
              .from(groupMembers)
              .where(eq(groupMembers.userId, principal.user.id)),
          )
        : eq(boardGroupPermissions.groupId, "");
    const board = await db.query.boards.findFirst({
      where,
      columns: { id: true, creatorId: true, isPublic: true },
      with: {
        userPermissions: { where: eq(boardUserPermissions.userId, id ?? "") },
        groupPermissions: { where: groupPermissionWhere },
      },
    });
    if (!board) throw new ORPCError("NOT_FOUND", { message: "Board not found" });
    const permissions = principal.kind === "authenticated" ? principal.user.permissions : [];
    const isCreator = principal.kind === "authenticated" && principal.user.id === board.creatorId;
    const hasFullAccess =
      isCreator ||
      board.userPermissions.some(({ permission }) => permission === "full") ||
      board.groupPermissions.some(({ permission }) => permission === "full") ||
      permissions.includes("board-full-all");
    const hasChangeAccess =
      isCreator ||
      board.userPermissions.some(({ permission }) => permission === "modify" || permission === "full") ||
      board.groupPermissions.some(({ permission }) => permission === "modify" || permission === "full") ||
      permissions.includes("board-modify-all") ||
      permissions.includes("board-full-all");
    const hasViewAccess =
      isCreator ||
      board.userPermissions.length >= 1 ||
      board.groupPermissions.length >= 1 ||
      board.isPublic ||
      permissions.includes("board-view-all");
    if (
      hasFullAccess ||
      (["modify", "view"].includes(permission) && hasChangeAccess) ||
      (permission === "view" && hasViewAccess)
    )
      return;
    throw new ORPCError("NOT_FOUND", { message: "Board not found" });
  }

  async function throwIfIntegrationUseForbiddenAsync(context: BackendContext, ids: readonly string[]) {
    const uniqueIds = [...new Set(ids)];
    if (uniqueIds.length === 0) return;
    const id = userId(context);
    const memberships = await context.db.query.groupMembers.findMany({ where: eq(groupMembers.userId, id ?? "") });
    const records = await context.db.query.integrations.findMany({
      where: inArray(integrations.id, uniqueIds),
      columns: { id: true },
      with: {
        userPermissions: { where: eq(integrationUserPermissions.userId, id ?? "") },
        groupPermissions: {
          where: inArray(integrationGroupPermissions.groupId, memberships.map(({ groupId }) => groupId).concat("")),
        },
      },
    });
    const global = context.principal.kind === "authenticated" ? context.principal.user.permissions : [];
    const hasUseAccess = (record: (typeof records)[number]) => {
      const permissions = [...record.userPermissions, ...record.groupPermissions].map(({ permission }) => permission);
      const globalFull = global.includes("integration-full-all");
      const globalInteract = globalFull || global.includes("integration-interact-all");
      const globalUse = globalInteract || global.includes("integration-use-all");
      return (
        globalFull ||
        permissions.includes("full") ||
        globalInteract ||
        permissions.includes("interact") ||
        globalUse ||
        permissions.length >= 1
      );
    };
    if (records.length !== uniqueIds.length || !records.every(hasUseAccess))
      throw new ORPCError("NOT_FOUND", { message: "Integration not found" });
  }

  async function validateWidgetConfigurationsAsync(
    context: BackendContext,
    submitted: readonly WidgetConfiguration[],
    stored: readonly WidgetConfiguration[] = [],
  ) {
    const byId = new Map(stored.map((item) => [item.id, item]));
    const sameIds = (left: readonly string[], right: readonly string[]) => {
      if (left.length !== right.length) return false;
      const sortedRight = right.toSorted();
      return left.toSorted().every((id, index) => id === sortedRight[index]);
    };
    const changed = submitted.filter((item) => {
      const previous = byId.get(item.id);
      return !previous || previous.kind !== item.kind || !sameIds(item.integrationIds, previous.integrationIds);
    });
    if (changed.length === 0) return;
    const selectedIds = [...new Set(changed.flatMap(({ integrationIds }) => integrationIds))];
    let records: { id: string; kind: IntegrationKind }[] = [];
    if (selectedIds.length > 0)
      records = await context.db.query.integrations.findMany({
        columns: { id: true, kind: true },
        where: inArray(integrations.id, selectedIds),
      });
    const recordsById = new Map(records.map((integration) => [integration.id, integration]));
    if (selectedIds.some((id) => !recordsById.has(id)))
      throw new ORPCError("NOT_FOUND", { message: "Integration not found" });
    const addedIds = [
      ...new Set(
        changed.flatMap((item) => {
          const previous = byId.get(item.id);
          return !previous || previous.kind !== item.kind
            ? item.integrationIds
            : item.integrationIds.filter((id) => !previous.integrationIds.includes(id));
        }),
      ),
    ];
    await throwIfIntegrationUseForbiddenAsync(context, addedIds);
    for (const item of changed) {
      const kinds = item.integrationIds.flatMap((id) => recordsById.get(id)?.kind ?? []);
      const issue = getWidgetIntegrationIssue(item.kind, kinds);
      if (issue) throw new ORPCError("BAD_REQUEST", { message: getWidgetIntegrationIssueMessage(item.kind, issue) });
    }
  }

  function requireCustomWidgetAdmin(isAdmin: boolean) {
    if (!isAdmin)
      throw new ORPCError("FORBIDDEN", { message: "Only administrators can add or configure Custom Widgets" });
  }

  function normalizeCustomWidgetOptions(options: Record<string, unknown>) {
    return {
      ...options,
      configuration: isRecord(options.configuration) ? options.configuration : {},
      configurationVersion:
        typeof options.configurationVersion === "number" && Number.isInteger(options.configurationVersion)
          ? options.configurationVersion
          : 1,
      refreshInterval: typeof options.refreshInterval === "number" ? options.refreshInterval : 30,
    };
  }

  function throwIfCustomWidgetPlacementChangeForbidden(input: {
    isAdmin: boolean;
    submittedItems: readonly BoardPlacement[];
    storedItems: readonly BoardPlacement[];
  }) {
    const stored = new Map(input.storedItems.map((item) => [item.id, item]));
    for (const item of input.submittedItems) {
      const previous = stored.get(item.id);
      if (!previous) {
        if (item.kind === "customApi") requireCustomWidgetAdmin(input.isAdmin);
        continue;
      }
      const wasCustom = previous.kind === "customApi";
      const isCustom = item.kind === "customApi";
      if (wasCustom !== isCustom) {
        requireCustomWidgetAdmin(input.isAdmin);
        continue;
      }
      if (
        wasCustom &&
        !isDeepStrictEqual(normalizeCustomWidgetOptions(item.options), normalizeCustomWidgetOptions(previous.options))
      )
        requireCustomWidgetAdmin(input.isAdmin);
    }
  }

  function throwIfCustomWidgetBoardDuplicationForbidden(isAdmin: boolean, boardItems: readonly { kind: string }[]) {
    if (boardItems.some((item) => item.kind === "customApi")) requireCustomWidgetAdmin(isAdmin);
  }

  async function noBoardWithSimilarNameAsync(db: Database, name: string, ignoredIds: string[] = []) {
    const found = await db.query.boards.findMany({ columns: { id: true, name: true } });
    if (found.find((board) => board.name.toLowerCase() === name.toLowerCase() && !ignoredIds.includes(board.id)))
      throw new ORPCError("CONFLICT", { message: "Board with similar name already exists" });
  }

  async function getHomeIdBoardAsync(
    db: Database,
    user: InferSelectModel<typeof users> | null,
    deviceType: BackendContext["deviceType"],
  ) {
    const key = deviceType === "mobile" ? "mobileHomeBoardId" : "homeBoardId";
    if (!user) {
      const settings = await resources.getBoardServerSettingsAsync(db);
      return settings[key] ?? settings.homeBoardId;
    }
    if (user[key]) return user[key];
    if (user.homeBoardId) return user.homeBoardId;
    const lowest = await db
      .select({ homeBoardId: groups.homeBoardId, mobileHomeBoardId: groups.mobileHomeBoardId })
      .from(groups)
      .leftJoin(groupMembers, eq(groups.id, groupMembers.groupId))
      .where(
        and(
          eq(groupMembers.userId, user.id),
          not(eq(groups.name, everyoneGroup)),
          not(isNull(groups[key])),
          not(isNull(groups.homeBoardId)),
        ),
      )
      .orderBy(asc(groups.position))
      .limit(1)
      .then((result) => result[0]);
    if (lowest?.[key]) return lowest[key];
    if (lowest?.homeBoardId) return lowest.homeBoardId;
    const everyone = await db.query.groups.findFirst({ where: eq(groups.name, everyoneGroup) });
    if (everyone?.[key]) return everyone[key];
    if (everyone?.homeBoardId) return everyone.homeBoardId;
    const settings = await resources.getBoardServerSettingsAsync(db);
    return settings[key] ?? settings.homeBoardId;
  }

  async function serializeBoardItemPlacementAsync<T>(boardId: string, operation: () => Promise<T>) {
    const previous = placementTails.get(boardId) ?? Promise.resolve();
    const { promise: current, resolve: release } = Promise.withResolvers<void>();
    const tail = previous.then(() => current);
    placementTails.set(boardId, tail);
    await previous;
    try {
      return await operation();
    } finally {
      release();
      if (placementTails.get(boardId) === tail) placementTails.delete(boardId);
    }
  }

  function getUpdatedBoardLayout(
    board: BoardForLayoutProjection,
    options: { previous: BoardLayoutGeometry & { elements?: GridAlgorithmItem[] }; current: BoardLayoutGeometry },
  ) {
    const currentElements = options.previous.elements ?? getElementsForLayout(board, options.previous.layoutId);
    const saved = board.layouts.find((layout) => layout.id === options.previous.layoutId);
    const serialized = options.previous.layoutId === options.current.layoutId ? saved?.resizeSource : undefined;
    const source = getLayoutResizeSource(options.previous, currentElements, serialized);
    const previousGeometry = { ...source.geometry, layoutId: options.previous.layoutId };
    const roots = board.sections
      .filter((section) => section.kind === "empty")
      .toSorted((a, b) => (a.yOffset ?? 0) - (b.yOffset ?? 0) || a.id.localeCompare(b.id));
    const byLane = new Map<BoardLane, (typeof roots)[number]>();
    for (const root of roots) {
      const lane = getRootSectionLane(root.xOffset);
      if (!byLane.has(lane)) byLane.set(lane, root);
    }
    const main = byLane.get("main");
    if (!main) throw new Error(`Board "${board.id}" has no main canvas root`);
    const sourceById = new Map(roots.map((section) => [section.id, getRootSectionLane(section.xOffset)] as const));
    const targetBySource = new Map<BoardLane, BoardLane>(
      boardLanes.map((lane) => [
        lane,
        lane !== "main" && getBoardLaneColumnCount(options.current, lane) === 0 ? "main" : lane,
      ]),
    );
    const remapped = source.elements.map((element) => {
      const sourceLane = sourceById.get(element.sectionId);
      if (!sourceLane) return element;
      const target = targetBySource.get(sourceLane) ?? "main";
      return { ...element, sectionId: (byLane.get(target) ?? main).id };
    });
    const results = boardLanes.flatMap((lane) => {
      const root = byLane.get(lane);
      const width = getBoardLaneColumnCount(options.current, lane);
      if (!root || width === 0) return [];
      const sourceLanes = boardLanes.filter(
        (sourceLane) =>
          byLane.has(sourceLane) &&
          getBoardLaneColumnCount(previousGeometry, sourceLane) > 0 &&
          targetBySource.get(sourceLane) === lane,
      );
      const previousWidth =
        sourceLanes.length === 1
          ? getBoardLaneColumnCount(previousGeometry, sourceLanes[0] ?? "main")
          : Number.MAX_SAFE_INTEGER;
      return [generateResponsiveGridFor({ items: remapped, previousWidth, width, sectionId: root.id })];
    });
    const updated = results.flatMap((result) => result.items);
    const byId = new Map(updated.map((element) => [element.id, element]));
    const itemSectionLayouts = board.items.flatMap((item): InferInsertModel<typeof itemLayouts>[] => {
      const element = byId.get(item.id);
      if (!element || element.type !== "item") return [];
      return [
        {
          itemId: item.id,
          layoutId: options.current.layoutId,
          sectionId: element.sectionId,
          height: element.height,
          width: element.width,
          xOffset: element.xOffset,
          yOffset: element.yOffset,
        },
      ];
    });
    const projectedSections = board.sections.flatMap((section): InferInsertModel<typeof sectionLayouts>[] => {
      if (section.kind !== "container") return [];
      const element = byId.get(section.id);
      if (!element || element.type !== "section") return [];
      return [
        {
          layoutId: options.current.layoutId,
          sectionId: section.id,
          parentSectionId: element.sectionId,
          height: element.height,
          width: element.width,
          xOffset: element.xOffset,
          yOffset: element.yOffset,
        },
      ];
    });
    return {
      itemSectionLayouts,
      sectionLayouts: projectedSections,
      resizeSource: serializeLayoutResizeSource(source, options.current, updated),
    };
  }

  function getElementsForProjectedLayout(projected: ReturnType<typeof getUpdatedBoardLayout>): GridAlgorithmItem[] {
    return [
      ...projected.itemSectionLayouts.map((layout) => ({
        id: layout.itemId,
        type: "item" as const,
        height: layout.height,
        width: layout.width,
        xOffset: layout.xOffset,
        yOffset: layout.yOffset,
        sectionId: layout.sectionId,
      })),
      ...projected.sectionLayouts.flatMap((layout) =>
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
  }

  async function ensureGutterRootSectionsAsync(
    db: Database,
    boardId: string,
    lanes: readonly Exclude<BoardLane, "main">[],
  ) {
    if (lanes.length === 0) return;
    const missing = (offsets: readonly (number | null)[]) =>
      lanes.filter((lane) => {
        const count = offsets.filter((offset) => offset === rootSectionOffsets[lane]).length;
        if (count > 1) throw new Error(`Board "${boardId}" has multiple ${lane} canvas roots`);
        return count === 0;
      });
    const rowsFor = (missingLanes: readonly Exclude<BoardLane, "main">[]) =>
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
          const roots = await transaction
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
          const rows = rowsFor(missing(roots.map(({ xOffset }) => xOffset)));
          if (rows.length > 0) await transaction.insert(schema.sections).values(rows);
        });
      },
      handleSync(database) {
        database.transaction(
          (transaction) => {
            const roots = transaction
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
            const rows = rowsFor(missing(roots.map(({ xOffset }) => xOffset)));
            if (rows.length > 0) transaction.insert(sections).values(rows).run();
          },
          { behavior: "immediate" },
        );
      },
    });
  }

  async function insertMissingProjectedPositionsAsync(
    db: Database,
    board: {
      items: Array<{ id: string; layouts: Array<GridRectangle & { layoutId: string; sectionId: string }> }>;
      sections: Array<{
        id: string;
        kind: string;
        layouts: Array<GridRectangle & { layoutId: string; parentSectionId: string | null }>;
      }>;
    },
    source: { id: string; columnCount: number },
    target: { id: string; columnCount: number },
  ) {
    const elements: GridAlgorithmItem[] = [
      ...board.items.flatMap((item) => {
        const layout = item.layouts.find((candidate) => candidate.layoutId === source.id);
        return layout
          ? [
              {
                id: item.id,
                type: "item" as const,
                width: layout.width,
                height: layout.height,
                xOffset: layout.xOffset,
                yOffset: layout.yOffset,
                sectionId: layout.sectionId,
              },
            ]
          : [];
      }),
      ...board.sections.flatMap((section) => {
        if (section.kind !== "dynamic") return [];
        const layout = section.layouts.find((candidate) => candidate.layoutId === source.id);
        return layout?.parentSectionId
          ? [
              {
                id: section.id,
                type: "section" as const,
                width: layout.width,
                height: layout.height,
                xOffset: layout.xOffset,
                yOffset: layout.yOffset,
                sectionId: layout.parentSectionId,
              },
            ]
          : [];
      }),
    ];
    const projected = board.sections
      .filter((section) => section.kind !== "dynamic")
      .flatMap(
        (section) =>
          generateResponsiveGridFor({
            items: elements,
            previousWidth: source.columnCount,
            width: target.columnCount,
            sectionId: section.id,
          }).items,
      );
    const existingItems = new Set(
      board.items.filter((item) => item.layouts.some((layout) => layout.layoutId === target.id)).map((item) => item.id),
    );
    const itemPositions = projected
      .filter((element) => element.type === "item" && !existingItems.has(element.id))
      .map((element): InferInsertModel<typeof itemLayouts> => ({
        itemId: element.id,
        layoutId: target.id,
        sectionId: element.sectionId,
        width: element.width,
        height: element.height,
        xOffset: element.xOffset,
        yOffset: element.yOffset,
      }));
    const existingSections = new Set(
      board.sections
        .filter((section) => section.layouts.some((layout) => layout.layoutId === target.id))
        .map((section) => section.id),
    );
    const sectionPositions = projected
      .filter((element) => element.type === "section" && !existingSections.has(element.id))
      .map((element): InferInsertModel<typeof sectionLayouts> => ({
        sectionId: element.id,
        layoutId: target.id,
        parentSectionId: element.sectionId,
        width: element.width,
        height: element.height,
        xOffset: element.xOffset,
        yOffset: element.yOffset,
      }));
    if (itemPositions.length > 0) await db.insert(itemLayouts).values(itemPositions);
    if (sectionPositions.length > 0) await db.insert(sectionLayouts).values(sectionPositions);
  }

  async function seedProtectedBoardLayoutsAsync(db: Database, boardId: string) {
    const found = await db.query.boards.findMany({
      where: boardId ? eq(boards.id, boardId) : undefined,
      with: { layouts: true, items: { with: { layouts: true } }, sections: { with: { layouts: true } } },
    });
    for (const board of found) {
      if (board.layouts.length === 0) {
        await db.insert(layouts).values([
          { id: createId(), name: "Mobile", columnCount: 3, breakpoint: 0, role: "mobile", boardId: board.id },
          { id: createId(), name: "Base", columnCount: 10, breakpoint: 768, role: "base", boardId: board.id },
        ]);
        continue;
      }
      if (board.layouts.length === 1) {
        const [base] = board.layouts;
        if (!base) continue;
        const mobile = {
          id: createId(),
          name: "Mobile",
          columnCount: 3,
          breakpoint: 0,
          role: "mobile" as const,
          boardId: board.id,
        };
        await db.update(layouts).set({ role: "base", breakpoint: 768 }).where(eq(layouts.id, base.id));
        await db.insert(layouts).values(mobile);
        await insertMissingProjectedPositionsAsync(db, board, base, mobile);
        continue;
      }
      const normalized = normalizeBoardLayoutRoles(board.layouts);
      const alreadyNormalized = normalized.every((layout) => {
        const previous = board.layouts.find((candidate) => candidate.id === layout.id);
        return layout.breakpoint === previous?.breakpoint && previous.role === layout.role;
      });
      if (!alreadyNormalized)
        for (const layout of normalized)
          await db
            .update(layouts)
            .set({ breakpoint: layout.breakpoint, role: layout.role })
            .where(eq(layouts.id, layout.id));
      const mobile = normalized.find((layout) => layout.role === "mobile");
      const base = normalized.find((layout) => layout.role === "base");
      if (mobile && base) await insertMissingProjectedPositionsAsync(db, board, base, mobile);
    }
  }

  const boardLayoutsNeedRepair = (
    values: Array<{ id: string; breakpoint: number; role: "mobile" | "base" | "custom" }>,
  ) => {
    const mobile = values.filter((layout) => layout.role === "mobile");
    const base = values.filter((layout) => layout.role === "base");
    return (
      mobile.length !== 1 ||
      base.length !== 1 ||
      mobile.at(0)?.breakpoint !== 0 ||
      new Set(values.map((layout) => layout.breakpoint)).size !== values.length
    );
  };

  const parseSection = (section: unknown) => {
    const result = resources.schemas.sectionSchema.safeParse(section);
    if (!result.success) throw new Error(result.error.message);
    return result.data;
  };

  const parseItem = (item: unknown) => {
    const result = outputItemSchema.safeParse(item);
    if (!result.success) {
      resources.logger.warn("Failed to parse board item, skipping", { error: result.error.message });
      return null;
    }
    return result.data;
  };

  async function readFullBoardRowsAsync(db: Database, where: SQL<unknown>, id: string | null) {
    const groupWhere = id
      ? inArray(
          boardGroupPermissions.groupId,
          db.select({ groupId: groupMembers.groupId }).from(groupMembers).where(eq(groupMembers.userId, id)),
        )
      : eq(boardGroupPermissions.groupId, "");
    const board = await db.query.boards.findFirst({
      where,
      with: {
        creator: { columns: { id: true, name: true, image: true, email: true } },
        sections: { with: { collapseStates: { where: eq(sectionCollapseStates.userId, id ?? "") }, layouts: true } },
        items: { with: { integrations: { columns: { integrationId: true } }, layouts: true } },
        layouts: true,
        userPermissions: { where: eq(boardUserPermissions.userId, id ?? ""), columns: { permission: true } },
        groupPermissions: { where: groupWhere },
      },
    });
    if (!board) throw new ORPCError("NOT_FOUND", { message: "Board not found" });
    return board;
  }

  async function getFullBoardWithWhereAsync(
    db: Database,
    where: SQL<unknown>,
    id: string | null,
    repairProtectedLayouts = true,
  ): Promise<ReturnType<typeof projectFullBoard>> {
    const board = await readFullBoardRowsAsync(db, where, id);
    if (repairProtectedLayouts && boardLayoutsNeedRepair(board.layouts)) {
      let repair = repairPromises.get(board.id);
      if (!repair) {
        repair = seedProtectedBoardLayoutsAsync(db, board.id).finally(() => repairPromises.delete(board.id));
        repairPromises.set(board.id, repair);
      }
      await repair;
      return getFullBoardWithWhereAsync(db, where, id, false);
    }
    return projectFullBoard(board);
  }

  function projectFullBoard(board: Awaited<ReturnType<typeof readFullBoardRowsAsync>>) {
    const { sections: boardSections, items: boardItems, layouts: boardLayouts, ...properties } = board;
    return {
      ...properties,
      layouts: boardLayouts
        .map(({ boardId: _, resizeSource, ...layout }) => {
          const result: typeof layout & { resizeSource?: string | null } = layout;
          if (resizeSource) result.resizeSource = resizeSource;
          return result;
        })
        .toSorted((a, b) => a.breakpoint - b.breakpoint),
      sections: boardSections.map(({ collapseStates, ...section }) =>
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
      items: boardItems
        .map(({ integrations: relations, ...item }) =>
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
            integrationIds: relations.map((relation) => relation.integrationId),
            advancedOptions: superjson.parse<BoardItemAdvancedOptions>(item.advancedOptions),
            options: superjson.parse<Record<string, unknown>>(item.options),
          }),
        )
        .filter((item): item is NonNullable<typeof item> => item !== null),
    };
  }

  const blockedIpv4 = new BlockList();
  const blockedIpv6 = new BlockList();
  const blockedSubnets = [
    ["0.0.0.0", 8, "ipv4"],
    ["10.0.0.0", 8, "ipv4"],
    ["100.64.0.0", 10, "ipv4"],
    ["127.0.0.0", 8, "ipv4"],
    ["169.254.0.0", 16, "ipv4"],
    ["172.16.0.0", 12, "ipv4"],
    ["192.0.0.0", 24, "ipv4"],
    ["192.0.2.0", 24, "ipv4"],
    ["192.88.99.0", 24, "ipv4"],
    ["192.168.0.0", 16, "ipv4"],
    ["198.18.0.0", 15, "ipv4"],
    ["198.51.100.0", 24, "ipv4"],
    ["203.0.113.0", 24, "ipv4"],
    ["224.0.0.0", 4, "ipv4"],
    ["240.0.0.0", 4, "ipv4"],
    ["::", 96, "ipv6"],
    ["::ffff:0:0", 96, "ipv6"],
    ["::ffff:0:0:0", 96, "ipv6"],
    ["64:ff9b::", 96, "ipv6"],
    ["64:ff9b:1::", 48, "ipv6"],
    ["100::", 64, "ipv6"],
    ["2001::", 32, "ipv6"],
    ["2001:2::", 48, "ipv6"],
    ["2001:10::", 28, "ipv6"],
    ["2001:db8::", 32, "ipv6"],
    ["2002::", 16, "ipv6"],
    ["fc00::", 7, "ipv6"],
    ["fe80::", 10, "ipv6"],
    ["fec0::", 10, "ipv6"],
    ["ff00::", 8, "ipv6"],
  ] as const;
  for (const [network, prefix, family] of blockedSubnets)
    (family === "ipv4" ? blockedIpv4 : blockedIpv6).addSubnet(network, prefix, family);
  const timetableOptions = z.object({ baseUrl: z.string().optional() }).passthrough();
  const normalizeOptions = (options: Record<string, unknown>) => {
    const parsed = timetableOptions.safeParse(options);
    if (!parsed.success) throw new ORPCError("BAD_REQUEST", { message: "Invalid timetable widget options" });
    try {
      return resources.timetable.normalizeBaseUrl(parsed.data.baseUrl ?? resources.timetable.defaultBaseUrl);
    } catch (cause) {
      throw new ORPCError("BAD_REQUEST", {
        message: cause instanceof Error ? cause.message : "Invalid timetable base URL",
        cause,
      });
    }
  };
  async function validateTimetableOptionsChangeAsync(
    next: Record<string, unknown>,
    previous?: Record<string, unknown>,
  ) {
    const baseUrl = normalizeOptions(next);
    if (baseUrl === resources.timetable.defaultBaseUrl) return;
    let previousUrl: string | undefined;
    if (previous) {
      try {
        previousUrl = normalizeOptions(previous);
      } catch {
        previousUrl = undefined;
      }
    }
    if (baseUrl === previousUrl) return;
    const rawHostname = new URL(baseUrl).hostname;
    const hostname = (rawHostname.startsWith("[") && rawHostname.endsWith("]") ? rawHostname.slice(1, -1) : rawHostname)
      .toLowerCase()
      .replace(/\.$/, "");
    const family = isIP(hostname);
    const internal =
      family === 0 &&
      (!hostname.includes(".") ||
        hostname === "localhost" ||
        hostname.endsWith(".localhost") ||
        hostname.endsWith(".local") ||
        hostname.endsWith(".internal") ||
        hostname.endsWith(".lan") ||
        hostname.endsWith(".home.arpa"));
    if (internal) throw new ORPCError("BAD_REQUEST", { message: "Timetable base URL must use a public host" });
    let addresses: { address: string; family: number }[];
    try {
      const resolved =
        family === 0
          ? await resources.timetable.lookup(hostname, { all: true, verbatim: true })
          : [{ address: hostname, family }];
      addresses = resolved.filter((entry) => entry.family === 4 || entry.family === 6);
    } catch (cause) {
      throw new ORPCError("BAD_REQUEST", { message: "Timetable base URL host could not be resolved", cause });
    }
    if (
      addresses.length === 0 ||
      addresses.some(({ address, family }) =>
        family === 6 ? blockedIpv6.check(address, "ipv6") : blockedIpv4.check(address, "ipv4"),
      )
    )
      throw new ORPCError("BAD_REQUEST", {
        message: "Timetable base URL must not target a private or internal address",
      });
    addresses.toSorted((left, right) => left.family - right.family || left.address.localeCompare(right.address));
  }

  return {
    throwIfActionForbiddenAsync,
    validateWidgetConfigurationsAsync,
    throwIfCustomWidgetPlacementChangeForbidden,
    throwIfCustomWidgetBoardDuplicationForbidden,
    noBoardWithSimilarNameAsync,
    getHomeIdBoardAsync,
    serializeBoardItemPlacementAsync,
    getUpdatedBoardLayout,
    getElementsForProjectedLayout,
    ensureGutterRootSectionsAsync,
    getFullBoardWithWhereAsync,
    validateTimetableOptionsChangeAsync,
  };
}
