import { ORPCError } from "@orpc/server";
import { constructBoardPermissions, decideBoardAccess, snapshotPolicyIdentity } from "@homarr/auth/nitro/policy";
import type { SQL } from "@homarr/db";
import type { BoardPermission } from "@homarr/definitions";

import type { BoardProcedureResources } from "./resources";
import type { BoardReadScope } from "./scope";

export class BoardNameConflictError extends ORPCError<"CONFLICT", unknown> {
  constructor() {
    super("CONFLICT", { message: "Board with similar name already exists" });
  }
}

export async function noBoardWithSimilarNameAsync(scope: BoardReadScope, name: string, ignoredIds: string[] = []) {
  const foundBoards = await scope.readAsync(() =>
    scope.db.query.boards.findMany({ columns: { id: true, name: true } }),
  );
  if (foundBoards.find((board) => board.name.toLowerCase() === name.toLowerCase() && !ignoredIds.includes(board.id)))
    throw new BoardNameConflictError();
}

export function createBoardAccessHelpers(resources: BoardProcedureResources) {
  const { boards, boardUserPermissions, boardGroupPermissions, groupMembers, users } = resources.tables;
  const { eq, inArray, or, and, like, asc } = resources.operators;
  const { getPermissionsWithChildren } = resources.definitions;

  async function getBoardAccessContextAsync(scope: BoardReadScope, userId: string | undefined) {
    const { db, readAsync } = scope;
    const [userPermissions, groupMemberships, currentUser] = await Promise.all([
      readAsync(() => db.query.boardUserPermissions.findMany({ where: eq(boardUserPermissions.userId, userId ?? "") })),
      readAsync(() =>
        db.query.groupMembers.findMany({
          where: eq(groupMembers.userId, userId ?? ""),
          with: { group: { with: { boardPermissions: {}, permissions: {} } } },
        }),
      ),
      readAsync(() =>
        db.query.users.findFirst({
          where: eq(users.id, userId ?? ""),
          columns: { homeBoardId: true, mobileHomeBoardId: true },
        }),
      ),
    ]);
    const boardIds = userPermissions
      .map((permission) => permission.boardId)
      .concat(
        groupMemberships.flatMap((membership) => membership.group.boardPermissions.map(({ boardId }) => boardId)),
      );
    return { boardIds, currentUser, groupMemberships };
  }

  type Memberships = Awaited<ReturnType<typeof getBoardAccessContextAsync>>["groupMemberships"];

  function getCanViewAllBoards(groupMemberships: Memberships) {
    const permissions = new Set(
      groupMemberships.flatMap((membership) => membership.group.permissions.map(({ permission }) => permission)),
    );
    return getPermissionsWithChildren([...permissions]).includes("board-view-all");
  }

  function getBoardGroupPermissionWhere(groupMemberships: Memberships) {
    return groupMemberships.length > 0
      ? inArray(
          boardGroupPermissions.groupId,
          groupMemberships.map(({ groupId }) => groupId),
        )
      : eq(boardGroupPermissions.groupId, "");
  }

  function getAccessibleBoardsWhere(canViewAll: boolean | undefined, userId: string | undefined, boardIds: string[]) {
    return canViewAll
      ? undefined
      : or(
          eq(boards.isPublic, true),
          eq(boards.creatorId, userId ?? ""),
          boardIds.length > 0 ? inArray(boards.id, boardIds) : undefined,
        );
  }

  async function throwIfActionForbiddenAsync(
    scope: BoardReadScope,
    boardWhere: SQL<unknown>,
    permission: BoardPermission,
  ) {
    const { db, identity } = scope;
    const groupPermissionWhere =
      identity.type === "authenticated"
        ? inArray(
            boardGroupPermissions.groupId,
            db
              .select({ groupId: groupMembers.groupId })
              .from(groupMembers)
              .where(eq(groupMembers.userId, identity.userId)),
          )
        : eq(boardGroupPermissions.groupId, "");
    const board = await scope.readAsync(() =>
      db.query.boards.findFirst({
        where: boardWhere,
        columns: { id: true, creatorId: true, isPublic: true },
        with: {
          userPermissions: {
            where: eq(boardUserPermissions.userId, identity.type === "authenticated" ? identity.userId : ""),
          },
          groupPermissions: { where: groupPermissionWhere },
        },
      }),
    );
    const principal = snapshotPolicyIdentity(
      identity.type === "anonymous"
        ? identity
        : { ...identity, groupIds: board?.groupPermissions.map(({ groupId }) => groupId) ?? [] },
    );
    if (decideBoardAccess(principal, board ?? null, permission).type === "deny")
      throw new ORPCError("NOT_FOUND", { message: "Board not found" });
  }

  async function searchAccessibleBoardsAsync(scope: BoardReadScope, query: string, limit?: number) {
    const { db, identity, readAsync } = scope;
    const userId = identity.type === "authenticated" ? identity.userId : undefined;
    const userPermissions = await readAsync(() =>
      db.query.boardUserPermissions.findMany({ where: eq(boardUserPermissions.userId, userId ?? "") }),
    );
    const groupMemberships = await readAsync(() =>
      db.query.groupMembers.findMany({
        where: eq(groupMembers.userId, userId ?? ""),
        with: { group: { with: { boardPermissions: {}, permissions: {} } } },
      }),
    );
    const boardIds = userPermissions
      .map(({ boardId }) => boardId)
      .concat(groupMemberships.map(({ group }) => group.boardPermissions.map(({ boardId }) => boardId)).flat());
    const currentUser = await readAsync(() => db.query.users.findFirst({ where: eq(users.id, userId ?? "") }));
    const foundBoards = await readAsync(() =>
      db.query.boards.findMany({
        where: and(
          like(boards.name, `%${query}%`),
          identity.type === "authenticated" && identity.permissions.includes("board-view-all")
            ? undefined
            : or(eq(boards.isPublic, true), eq(boards.creatorId, userId ?? ""), inArray(boards.id, boardIds)),
        ),
        limit,
        orderBy: asc(boards.name),
        columns: { id: true, name: true, creatorId: true, isPublic: true, logoImageUrl: true },
        with: {
          userPermissions: { where: eq(boardUserPermissions.userId, userId ?? "") },
          groupPermissions: { where: getBoardGroupPermissionWhere(groupMemberships) },
        },
      }),
    );
    const principal = snapshotPolicyIdentity(
      identity.type === "anonymous"
        ? identity
        : { ...identity, groupIds: groupMemberships.map(({ groupId }) => groupId) },
    );
    return foundBoards.map((board) => ({
      id: board.id,
      name: board.name,
      logoImageUrl: board.logoImageUrl,
      permissions: constructBoardPermissions(board, principal),
      isHome: currentUser?.homeBoardId === board.id,
      isMobileHome: currentUser?.mobileHomeBoardId === board.id,
    }));
  }

  return {
    getBoardAccessContextAsync,
    getCanViewAllBoards,
    getBoardGroupPermissionWhere,
    getAccessibleBoardsWhere,
    noBoardWithSimilarNameAsync,
    throwIfActionForbiddenAsync,
    searchAccessibleBoardsAsync,
  };
}
