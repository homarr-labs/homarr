import type { Session } from "@homarr/auth";
import { getCurrentUserPermissionsAsync } from "@homarr/auth/server";
import { db, eq, inArray } from "@homarr/db";
import {
  boardUserPermissions,
  groupMembers,
  integrationGroupPermissions,
  integrationUserPermissions,
  users,
} from "@homarr/db/schema";
import { WorkerAccessError } from "@homarr/worker-access";
import type { AccessPrincipal } from "@homarr/worker-access";

import type { WorkerState } from "./state";

const sortedJson = (values: unknown[]) => values.map((value) => JSON.stringify(value)).toSorted();

export async function requireNativeUser(userId: unknown) {
  if (typeof userId !== "string" || !userId.length || userId.length > 256 || /^worker[:-]/.test(userId))
    throw new WorkerAccessError("INVALID_INPUT", "Select an existing Homarr user");
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { id: true, name: true, email: true, image: true, colorScheme: true },
  });
  if (!user) throw new WorkerAccessError("UNAUTHORIZED", "The Homarr user no longer exists");
  return user;
}

/** Device enrollment authenticates this local identity; native database ACLs remain authoritative. */
export async function getNativeUserSession(state: WorkerState, principal: AccessPrincipal): Promise<Session> {
  const grant = state.access.assertActive(principal);
  if (grant.role !== "user") throw new WorkerAccessError("FORBIDDEN", "Native user grant required");
  const user = await requireNativeUser(grant.userId);
  const permissions = await getCurrentUserPermissionsAsync(db, user.id);
  state.access.assertActive(principal);
  return {
    user: { ...user, permissions },
    expires: new Date(grant.expiresAt ?? Date.now() + 86_400_000).toISOString(),
  };
}

/** A changed permission graph ends live streams so an old native context cannot retain access. */
export async function nativeUserAuthorizationRevision(state: WorkerState, principal: AccessPrincipal) {
  const session = await getNativeUserSession(state, principal);
  const userId = session.user.id;
  const [memberships, boardPermissions, integrationPermissions, integrationGroups] = await Promise.all([
    db.query.groupMembers.findMany({
      where: eq(groupMembers.userId, userId),
      with: { group: { with: { permissions: true, boardPermissions: true } } },
    }),
    db.query.boardUserPermissions.findMany({ where: eq(boardUserPermissions.userId, userId) }),
    db.query.integrationUserPermissions.findMany({ where: eq(integrationUserPermissions.userId, userId) }),
    db.query.integrationGroupPermissions.findMany({
      where: inArray(
        integrationGroupPermissions.groupId,
        db.select({ groupId: groupMembers.groupId }).from(groupMembers).where(eq(groupMembers.userId, userId)),
      ),
    }),
  ]);
  return JSON.stringify([
    sortedJson(session.user.permissions),
    sortedJson(
      memberships.map(({ groupId, group }) => ({
        groupId,
        permissions: sortedJson(group.permissions),
        boardPermissions: sortedJson(group.boardPermissions),
      })),
    ),
    sortedJson(boardPermissions),
    sortedJson(integrationPermissions),
    sortedJson(integrationGroups),
  ]);
}
