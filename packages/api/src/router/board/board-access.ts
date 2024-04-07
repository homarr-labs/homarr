import { TRPCError } from "@trpc/server";

import type { Session } from "@homarr/auth";
import type { Database, SQL } from "@homarr/db";
import { eq } from "@homarr/db";
import { boardPermissions } from "@homarr/db/schema/sqlite";
import type { BoardPermission } from "@homarr/definitions";

export const canAccessBoardAsync = async (
  db: Database,
  boardWhere: SQL<unknown>,
  session: Session | null,
  permission: "full-access" | BoardPermission,
) => {
  const board = await db.query.boards.findFirst({
    where: boardWhere,
    columns: {
      id: true,
      creatorId: true,
      isPublic: true,
    },
    with: {
      permissions: {
        where: eq(boardPermissions.userId, session?.user.id ?? ""),
      },
    },
  });

  if (!board) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Board not found",
    });
  }

  if (board.isPublic) {
    return true; // Public boards can be accessed by anyone
  }

  if (!session) {
    return false; // Not logged in users can't access private boards
  }

  if (board.creatorId === session?.user.id) {
    return true; // Creators can access their own private boards
  }

  if (permission === "full-access") {
    return false; // Only creators can have full access
  }

  if (permission === "board-view") {
    return ["board-view", "board-change"].some((key) =>
      board.permissions.some(({ permission }) => key === permission),
    ); // For view access, allow if user has any board permission
  }

  return board.permissions.some(
    ({ permission }) => permission === "board-change",
  ); // When change is required, only allow if user has change permission
};
