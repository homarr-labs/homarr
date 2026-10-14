import { ORPCError } from "@orpc/server";
import { TRPCError } from "@trpc/server";
import type { z } from "zod/v4";

import type { Database, InferInsertModel } from "@homarr/db";
import type { users } from "@homarr/db/schema";
import { getPermissionsWithChildren } from "@homarr/definitions";
import {
  getHeaderItems,
  parseHeaderPreferences,
  serializeHeaderPreferences,
} from "@homarr/validation/header-preferences";
import { userPreferencesPatchSchema, userPreferencesSchema } from "@homarr/validation/user";

import type { AuthenticatedBackendContext } from "../../context";
import type { PreferenceProcedureResources } from "./resources";

const definedFields = <TValue extends object>(value: TValue): TValue =>
  Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined)) as TValue;

export function createPreferenceHelpers(resources: PreferenceProcedureResources) {
  const { eq, inArray, or } = resources.operators;

  async function getUserPreferencesAsync(context: AuthenticatedBackendContext, userId: string) {
    if (context.principal.user.id !== userId && !context.principal.user.permissions.includes("admin")) {
      throw new ORPCError("NOT_FOUND", { message: "User not found" });
    }
    const row = await context.db.query.users.findFirst({
      where: eq(resources.tables.users.id, userId),
      columns: {
        colorScheme: true,
        byteUnitSystem: true,
        firstDayOfWeek: true,
        pingIconsEnabled: true,
        enableRightClickOnWidgets: true,
        homeBoardId: true,
        mobileHomeBoardId: true,
        defaultSearchEngineId: true,
        openSearchInNewTab: true,
        ddgBangs: true,
        headerPreferences: true,
      },
    });
    if (!row) throw new ORPCError("NOT_FOUND", { message: "User not found" });
    return { userId, ...row, headerPreferences: parseHeaderPreferences(row.headerPreferences) };
  }

  async function throwIfBoardViewForbiddenAsync(context: AuthenticatedBackendContext, boardId: string) {
    const { boards, boardGroupPermissions, boardUserPermissions, groupMembers } = resources.tables;
    const user = context.principal.user;
    const board = await context.db.query.boards.findFirst({
      where: eq(boards.id, boardId),
      columns: { id: true, creatorId: true, isPublic: true },
      with: {
        userPermissions: { where: eq(boardUserPermissions.userId, user.id) },
        groupPermissions: {
          where: inArray(
            boardGroupPermissions.groupId,
            context.db
              .select({ groupId: groupMembers.groupId })
              .from(groupMembers)
              .where(eq(groupMembers.userId, user.id)),
          ),
        },
      },
    });
    const hasFullAccess =
      board &&
      (board.creatorId === user.id ||
        board.userPermissions.some(({ permission }) => permission === "full") ||
        board.groupPermissions.some(({ permission }) => permission === "full") ||
        user.permissions.includes("board-full-all"));
    const hasChangeAccess =
      board &&
      (board.creatorId === user.id ||
        board.userPermissions.some(({ permission }) => permission === "modify" || permission === "full") ||
        board.groupPermissions.some(({ permission }) => permission === "modify" || permission === "full") ||
        user.permissions.includes("board-modify-all") ||
        user.permissions.includes("board-full-all"));
    const hasViewAccess =
      board &&
      (board.creatorId === user.id ||
        board.userPermissions.length >= 1 ||
        board.groupPermissions.length >= 1 ||
        board.isPublic ||
        user.permissions.includes("board-view-all"));
    if (!(hasFullAccess || hasChangeAccess || hasViewAccess))
      throw new ORPCError("NOT_FOUND", { message: "Board not found" });
  }

  async function getAccessibleBoardIdsForUserAsync(db: Database, userId: string) {
    const { boards, boardUserPermissions, groupMembers, users: userTable } = resources.tables;
    const [userPermissions, groupMemberships] = await Promise.all([
      db.query.boardUserPermissions.findMany({ where: eq(boardUserPermissions.userId, userId) }),
      db.query.groupMembers.findMany({
        where: eq(groupMembers.userId, userId),
        with: { group: { with: { boardPermissions: {}, permissions: {} } } },
      }),
      db.query.users.findFirst({
        where: eq(userTable.id, userId),
        columns: { homeBoardId: true, mobileHomeBoardId: true },
      }),
    ]);
    const boardIds = userPermissions
      .map((permission) => permission.boardId)
      .concat(
        groupMemberships.flatMap((membership) =>
          membership.group.boardPermissions.map((permission) => permission.boardId),
        ),
      );
    const permissions = new Set(
      groupMemberships.flatMap((membership) => membership.group.permissions.map(({ permission }) => permission)),
    );
    const canViewAll = getPermissionsWithChildren([...permissions]).includes("board-view-all");
    const accessibleBoards = await db.query.boards.findMany({
      columns: { id: true },
      where: canViewAll
        ? undefined
        : or(
            eq(boards.isPublic, true),
            eq(boards.creatorId, userId),
            boardIds.length > 0 ? inArray(boards.id, boardIds) : undefined,
          ),
    });
    return new Set(accessibleBoards.map(({ id }) => id));
  }

  async function updateUserPreferencesAsync(
    context: AuthenticatedBackendContext,
    userId: string,
    input: z.infer<typeof userPreferencesPatchSchema>,
  ) {
    const current = await getUserPreferencesAsync(context, userId);
    const parsed = userPreferencesPatchSchema.safeParse(definedFields(input));
    if (!parsed.success)
      throw new TRPCError({ code: "BAD_REQUEST", message: parsed.error.message, cause: parsed.error });
    const { headerPreferences, ...fields } = parsed.data;
    const mergedHeader = {
      ...current.headerPreferences,
      ...definedFields(headerPreferences ?? {}),
      zones: { ...current.headerPreferences.zones, ...definedFields(headerPreferences?.zones ?? {}) },
    };
    const { userId: _userId, ...preferences } = current;
    const mergedResult = userPreferencesSchema.safeParse({
      ...preferences,
      ...fields,
      headerPreferences: mergedHeader,
    });
    if (!mergedResult.success)
      throw new TRPCError({ code: "BAD_REQUEST", message: mergedResult.error.message, cause: mergedResult.error });
    const merged = mergedResult.data;
    for (const boardId of [fields.homeBoardId, fields.mobileHomeBoardId]) {
      if (boardId) await throwIfBoardViewForbiddenAsync(context, boardId);
    }
    if (fields.defaultSearchEngineId) {
      const engine = await context.db.query.searchEngines.findFirst({
        columns: { id: true },
        where: eq(resources.tables.searchEngines.id, fields.defaultSearchEngineId),
      });
      if (!engine) throw new ORPCError("BAD_REQUEST", { message: "Search engine not found" });
    }
    if (headerPreferences) {
      const existingBoardIds = new Set(
        getHeaderItems(current.headerPreferences.zones).flatMap((item) =>
          item.type === "board" ? [item.boardId] : [],
        ),
      );
      const newBoardIds = getHeaderItems(merged.headerPreferences.zones).flatMap((item) =>
        item.type !== "board" || existingBoardIds.has(item.boardId) ? [] : [item.boardId],
      );
      if (newBoardIds.length > 0) {
        const accessible = await getAccessibleBoardIdsForUserAsync(context.db, userId);
        if (newBoardIds.some((boardId) => !accessible.has(boardId))) {
          throw new ORPCError("BAD_REQUEST", { message: "One or more board shortcuts are unavailable to this user" });
        }
      }
    }
    const values: Partial<InferInsertModel<typeof users>> = { ...fields };
    if (headerPreferences) values.headerPreferences = serializeHeaderPreferences(merged.headerPreferences);
    await context.db.update(resources.tables.users).set(values).where(eq(resources.tables.users.id, userId));
    return { userId, ...merged };
  }

  return { getUserPreferencesAsync, updateUserPreferencesAsync };
}
