import { ORPCError } from "@orpc/server";

import { createBoardAccessHelpers } from "./access";
import type { BoardProcedureResources } from "./resources";
import type { BoardReadScope } from "./scope";
import { requireBoardPrincipal } from "./scope";

export function createBoardReaders(resources: BoardProcedureResources) {
  const { boards, boardUserPermissions, groups, groupPermissions, boardGroupPermissions } = resources.tables;
  const { eq, or, inArray } = resources.operators;
  const { everyoneGroup, getPermissionsWithChildren, getPermissionsWithParents } = resources.definitions;
  const {
    getBoardAccessContextAsync,
    getBoardGroupPermissionWhere,
    getAccessibleBoardsWhere,
    throwIfActionForbiddenAsync,
  } = createBoardAccessHelpers(resources);

  async function getPublicBoardsAsync(scope: BoardReadScope) {
    return scope.readAsync(() =>
      scope.db.query.boards.findMany({
        columns: { id: true, name: true, logoImageUrl: true },
        where: eq(boards.isPublic, true),
      }),
    );
  }

  async function getBoardsForGroupAsync(scope: BoardReadScope, groupId: string) {
    requireBoardPrincipal(scope, "admin");
    const dbEveryoneAndCurrentGroup = await scope.readAsync(() =>
      scope.db.query.groups.findMany({
        where: or(eq(groups.name, everyoneGroup), eq(groups.id, groupId)),
        with: { boardPermissions: true, permissions: true },
      }),
    );
    const distinctPermissions = new Set(
      dbEveryoneAndCurrentGroup.flatMap((group) => group.permissions.map(({ permission }) => permission)),
    );
    const canViewAllBoards = getPermissionsWithChildren([...distinctPermissions]).includes("board-view-all");
    const boardIds = dbEveryoneAndCurrentGroup.flatMap((group) => group.boardPermissions.map(({ boardId }) => boardId));
    const boardWhere = canViewAllBoards ? undefined : or(eq(boards.isPublic, true), inArray(boards.id, boardIds));
    return scope.readAsync(() =>
      scope.db.query.boards.findMany({ columns: { id: true, name: true, logoImageUrl: true }, where: boardWhere }),
    );
  }

  async function getAllBoardsAsync(scope: BoardReadScope) {
    const { identity } = scope;
    const userId = identity.type === "authenticated" ? identity.userId : undefined;
    const { boardIds, currentUser, groupMemberships } = await getBoardAccessContextAsync(scope, userId);
    const groupPermissionWhere = getBoardGroupPermissionWhere(groupMemberships);
    const dbBoards = await scope.readAsync(() =>
      scope.db.query.boards.findMany({
        columns: { id: true, name: true, logoImageUrl: true, isPublic: true },
        with: {
          creator: { columns: { id: true, name: true, image: true, email: true } },
          userPermissions: { where: eq(boardUserPermissions.userId, userId ?? "") },
          groupPermissions: { where: groupPermissionWhere },
        },
        where: getAccessibleBoardsWhere(
          identity.type === "authenticated" ? identity.permissions.includes("board-view-all") : undefined,
          userId,
          boardIds,
        ),
      }),
    );
    return dbBoards.map((board) => ({
      ...board,
      isHome: currentUser?.homeBoardId === board.id,
      isMobileHome: currentUser?.mobileHomeBoardId === board.id,
    }));
  }

  async function getBoardSettingsAsync(scope: BoardReadScope, id: string) {
    requireBoardPrincipal(scope);
    const boardWhere = eq(boards.id, id);
    await throwIfActionForbiddenAsync(scope, boardWhere, "modify");
    const board = await scope.readAsync(() =>
      scope.db.query.boards.findFirst({
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
      }),
    );
    if (!board) throw new ORPCError("NOT_FOUND", { message: "Board not found" });
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
  }

  async function getBoardPermissionsAsync(scope: BoardReadScope, id: string) {
    requireBoardPrincipal(scope);
    await throwIfActionForbiddenAsync(scope, eq(boards.id, id), "full");
    const dbGroupPermissions = await scope.readAsync(() =>
      scope.db.query.groupPermissions.findMany({
        where: inArray(
          groupPermissions.permission,
          getPermissionsWithParents(["board-view-all", "board-modify-all", "board-full-all"]),
        ),
        columns: { groupId: false },
        with: { group: { columns: { id: true, name: true } } },
      }),
    );
    const userPermissions = await scope.readAsync(() =>
      scope.db.query.boardUserPermissions.findMany({
        where: eq(boardUserPermissions.boardId, id),
        with: { user: { columns: { id: true, name: true, image: true, email: true } } },
      }),
    );
    const dbGroupBoardPermission = await scope.readAsync(() =>
      scope.db.query.boardGroupPermissions.findMany({
        where: eq(boardGroupPermissions.boardId, id),
        with: { group: { columns: { id: true, name: true } } },
      }),
    );
    return {
      inherited: dbGroupPermissions.toSorted((a, b) => a.group.name.localeCompare(b.group.name)),
      users: userPermissions
        .map(({ user, permission }) => ({ user, permission }))
        .toSorted((a, b) => (a.user.name ?? "").localeCompare(b.user.name ?? "")),
      groups: dbGroupBoardPermission
        .map(({ group, permission }) => ({ group: { id: group.id, name: group.name }, permission }))
        .toSorted((a, b) => a.group.name.localeCompare(b.group.name)),
    };
  }

  return {
    getPublicBoardsAsync,
    getBoardsForGroupAsync,
    getAllBoardsAsync,
    getBoardSettingsAsync,
    getBoardPermissionsAsync,
  };
}
