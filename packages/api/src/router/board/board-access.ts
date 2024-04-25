import { TRPCError } from "@trpc/server";

import type { Session } from "@homarr/auth";
import { constructBoardPermissions } from "@homarr/auth/shared";
import type { Database, SQL } from "@homarr/db";
import { eq } from "@homarr/db";
import { boardPermissions } from "@homarr/db/schema/sqlite";
import type { BoardPermission } from "@homarr/definitions";

/**
 * Throws NOT_FOUND if user is not allowed to perform action on board
 * @param ctx trpc router context
 * @param boardWhere where clause for the board
 * @param permission permission required to perform action on board
 */
export const throwIfActionForbiddenAsync = async (
  ctx: { db: Database; session: Session | null },
  boardWhere: SQL<unknown>,
  permission: "full-access" | BoardPermission,
) => {
  const { db, session } = ctx;
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
    notAllowed();
  }

  const { hasViewAccess, hasChangeAccess, hasFullAccess } =
    constructBoardPermissions(board, session);

  if (permission === "full-access" && hasFullAccess) {
    return; // As full access is required and user has full access, allow
  }

  if (permission === "board-change" && hasChangeAccess) {
    return; // As change access is required and user has change access, allow
  }

  if (permission === "board-view" && hasViewAccess) {
    return; // As view access is required and user has view access, allow
  }

  notAllowed();
};

/**
 * This method returns NOT_FOUND to prevent snooping on board existence
 * A function is used to use the method without return statement
 */
function notAllowed(): never {
  throw new TRPCError({
    code: "NOT_FOUND",
    message: "Board not found",
  });
}
