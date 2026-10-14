import { ORPCError } from "@orpc/server";

import type { boards, groupMembers, groups, users } from "@homarr/db/schema";
import { everyoneGroup } from "@homarr/definitions";
import type { decideBoardAccess, snapshotPolicyIdentity } from "@homarr/auth/nitro/policy";
import type { BackendContext } from "../../context";
import { createSettingsStore } from "./settings";
import type { SettingsResources } from "./settings";

export interface HomeTargetResources extends SettingsResources {
  readonly policy: {
    readonly snapshotIdentity: typeof snapshotPolicyIdentity;
    readonly decideBoardAccess: typeof decideBoardAccess;
  };
  readonly boards: typeof boards;
  readonly users: typeof users;
  readonly groups: typeof groups;
  readonly groupMembers: typeof groupMembers;
}

export function createHomeTargetResolver(resources: HomeTargetResources) {
  const {
    users,
    groups,
    groupMembers,
    boards,
    operators: { eq },
  } = resources;
  const settings = createSettingsStore(resources);
  return async function resolveHomeTarget(context: BackendContext) {
    const { db } = context;
    const userId = context.principal.kind === "authenticated" ? context.principal.user.id : undefined;
    const user = userId ? await db.query.users.findFirst({ where: eq(users.id, userId) }) : undefined;
    const memberships = userId
      ? await db.query.groupMembers.findMany({ where: eq(groupMembers.userId, userId), with: { group: true } })
      : [];
    const identity = resources.policy.snapshotIdentity(
      context.principal.kind === "anonymous"
        ? { type: "anonymous" }
        : {
            type: "authenticated",
            userId: context.principal.user.id,
            permissions: context.principal.user.permissions,
            groupIds: memberships.map(({ groupId }) => groupId),
          },
    );
    const key = context.deviceType === "mobile" ? "mobileHomeBoardId" : "homeBoardId";
    async function selectHomeId() {
      if (!user) {
        const defaults = await settings.read(db, "board");
        return defaults[key] ?? defaults.homeBoardId;
      }
      if (user[key]) return user[key];
      if (user.homeBoardId) return user.homeBoardId;
      const lowestGroup = memberships
        .map(({ group }) => group)
        .filter((group) => group.name !== everyoneGroup && group[key] !== null && group.homeBoardId !== null)
        .toSorted((left, right) => left.position - right.position)[0];
      if (lowestGroup?.[key]) return lowestGroup[key];
      if (lowestGroup?.homeBoardId) return lowestGroup.homeBoardId;
      const everyone = await db.query.groups.findFirst({ where: eq(groups.name, everyoneGroup) });
      if (everyone?.[key]) return everyone[key];
      if (everyone?.homeBoardId) return everyone.homeBoardId;
      const defaults = await settings.read(db, "board");
      return defaults[key] ?? defaults.homeBoardId;
    }
    const id = await selectHomeId();
    if (!id) throw new ORPCError("NOT_FOUND", { message: "No home board found" });
    const board = await db.query.boards.findFirst({
      where: eq(boards.id, id),
      with: { userPermissions: true, groupPermissions: true },
    });
    if (!board || board.id !== id || resources.policy.decideBoardAccess(identity, board, "view").type === "deny")
      throw new ORPCError("NOT_FOUND", { message: "No home board found" });
    return { id: board.id, name: board.name };
  };
}
