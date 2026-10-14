import { and, eq, inArray } from "drizzle-orm";

import type { HomarrDatabase } from "../driver";
import type {
  NativeCredentialEvidence,
  NativeCredentialPolicyConfiguration,
} from "../runtime-auth-credential/contracts";
import { readNativeCredentialPolicySync } from "../runtime-auth-credential/statements";
import { boards, boardGroupPermissions, boardUserPermissions } from "../schema/sqlite";
import { BoardPermissionsMutationError, captureBoardPermissionsMutation } from "./contracts";
import type { BoardPermissionsMutation } from "./contracts";

const precondition = (): never => {
  throw new BoardPermissionsMutationError("PRECONDITION_FAILED");
};

const hasFullGrant = (rows: readonly { permission: unknown }[], maximumRows: number): boolean => {
  if (rows.length > maximumRows) return precondition();
  let full = false;
  for (const { permission } of rows) {
    if (permission !== "view" && permission !== "modify" && permission !== "full") return precondition();
    if (permission === "full") full = true;
  }
  return full;
};

export function executeBoardPermissionsMutationSync(
  database: HomarrDatabase,
  input: BoardPermissionsMutation,
  credential: NativeCredentialEvidence,
  configuration: NativeCredentialPolicyConfiguration,
): void {
  const maximumRows = configuration.maximumSnapshotRows;
  const mutation = captureBoardPermissionsMutation(input, maximumRows);
  const policy = readNativeCredentialPolicySync(database, credential, configuration);
  const board = database
    .select({ id: boards.id, creatorId: boards.creatorId })
    .from(boards)
    .where(eq(boards.id, mutation.boardId))
    .get();
  if (board === undefined) throw new BoardPermissionsMutationError("NOT_FOUND");
  if (board.id !== mutation.boardId || (board.creatorId !== null && typeof board.creatorId !== "string"))
    return precondition();
  const userGrants = database
    .select({ permission: boardUserPermissions.permission })
    .from(boardUserPermissions)
    .where(and(eq(boardUserPermissions.boardId, mutation.boardId), eq(boardUserPermissions.userId, policy.userId)))
    .limit(maximumRows + 1)
    .all();
  const groupGrants = database
    .select({ permission: boardGroupPermissions.permission })
    .from(boardGroupPermissions)
    .where(
      and(
        eq(boardGroupPermissions.boardId, mutation.boardId),
        inArray(boardGroupPermissions.groupId, [...policy.groupIds]),
      ),
    )
    .limit(maximumRows + 1)
    .all();
  const userFull = hasFullGrant(userGrants, maximumRows);
  const groupFull = hasFullGrant(groupGrants, maximumRows);
  if (board.creatorId !== policy.userId && !userFull && !groupFull && !policy.permissions.includes("board-full-all"))
    throw new BoardPermissionsMutationError("NOT_FOUND");
  if (mutation.kind === "replace-user") {
    const existing = database
      .select({ boardId: boardUserPermissions.boardId })
      .from(boardUserPermissions)
      .where(eq(boardUserPermissions.boardId, mutation.boardId))
      .limit(maximumRows + 1)
      .all();
    if (existing.length > maximumRows) return precondition();
    database.delete(boardUserPermissions).where(eq(boardUserPermissions.boardId, mutation.boardId)).run();
    if (mutation.permissions.length === 0) return;
    database
      .insert(boardUserPermissions)
      .values(
        mutation.permissions.map(({ principalId, permission }) => ({
          boardId: mutation.boardId,
          userId: principalId,
          permission,
        })),
      )
      .run();
    return;
  }
  const existing = database
    .select({ boardId: boardGroupPermissions.boardId })
    .from(boardGroupPermissions)
    .where(eq(boardGroupPermissions.boardId, mutation.boardId))
    .limit(maximumRows + 1)
    .all();
  if (existing.length > maximumRows) return precondition();
  database.delete(boardGroupPermissions).where(eq(boardGroupPermissions.boardId, mutation.boardId)).run();
  if (mutation.permissions.length === 0) return;
  database
    .insert(boardGroupPermissions)
    .values(
      mutation.permissions.map(({ principalId, permission }) => ({
        boardId: mutation.boardId,
        groupId: principalId,
        permission,
      })),
    )
    .run();
}
