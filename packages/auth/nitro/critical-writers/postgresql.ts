import { and, eq, inArray, sql } from "@homarr/db";
import type { HomarrDatabasePostgresql } from "@homarr/db/driver";
import type { BoundedTransactionOperation, PersistenceRuntime } from "@homarr/db/runtime";
import { postgresqlSchema } from "@homarr/db/schema";
import { everyoneGroup, getPermissionsWithChildren } from "@homarr/definitions";

import {
  CriticalWriterCurrentnessError,
  CriticalWriterSourceError,
  requireCriticalWriterExecutionJoin,
} from "./contracts";
import type { CriticalWriterCandidate, CurrentGroupFacts, CurrentGroupParent } from "./contracts";
import {
  assertCandidateAdmin,
  assertCandidateGroupDeletion,
  assertSameMemberships,
  assertSameParents,
  prepareExternalMembershipChanges,
  requireCandidateGroup,
} from "./source-policy";

const { users, groups, groupMembers, groupPermissions } = postgresqlSchema;

async function readMembershipsAsync(database: HomarrDatabasePostgresql, userId: string): Promise<string[]> {
  const memberships = await database
    .select({ groupId: groupMembers.groupId })
    .from(groupMembers)
    .where(eq(groupMembers.userId, userId));
  return memberships.map((row) => row.groupId);
}

async function lockGroupParentsAsync(
  database: HomarrDatabasePostgresql,
  groupIds: readonly string[],
  exclusiveGroupId: string | undefined,
): Promise<ReadonlyMap<string, CurrentGroupParent>> {
  const locked = new Map<string, CurrentGroupParent>();
  for (const id of [...new Set(groupIds)].sort()) {
    const rows = await database
      .select({ id: groups.id, name: groups.name })
      .from(groups)
      .where(eq(groups.id, id))
      .for(id === exclusiveGroupId ? "update" : "share");
    const group = rows[0];
    if (group) locked.set(id, group);
  }
  return locked;
}

async function readCurrentGroupFactsAsync(
  database: HomarrDatabasePostgresql,
  userId: string,
  expectedMemberships: readonly string[],
  locked: ReadonlyMap<string, CurrentGroupParent>,
): Promise<CurrentGroupFacts> {
  const groupIds = await readMembershipsAsync(database, userId);
  assertSameMemberships(expectedMemberships, groupIds);
  for (const groupId of groupIds) {
    if (!locked.has(groupId)) throw new CriticalWriterCurrentnessError();
  }
  const permissions = await database
    .selectDistinct({ permission: groupPermissions.permission })
    .from(groupPermissions)
    .innerJoin(groupMembers, eq(groupPermissions.groupId, groupMembers.groupId))
    .where(eq(groupMembers.userId, userId));
  return {
    userId,
    groupIds,
    permissions: getPermissionsWithChildren(permissions.map((row) => row.permission)),
  };
}

async function applyCandidateAsync(
  database: HomarrDatabasePostgresql,
  candidate: CriticalWriterCandidate,
): Promise<void> {
  const isolation = await database.execute<{ isolation: unknown }>(
    sql`SELECT current_setting('transaction_isolation') AS isolation`,
  );
  if (isolation.rows.length !== 1 || isolation.rows[0]?.isolation !== "read committed")
    throw new Error("Critical writers require verified READ COMMITTED statement freshness");
  const userId = "actorId" in candidate ? candidate.actorId : candidate.userId;
  const actor = await database.select({ id: users.id }).from(users).where(eq(users.id, userId)).for("update");
  if (!actor[0]) {
    if ("actorId" in candidate) throw new CriticalWriterSourceError("unauthenticated", "Authentication required");
    throw new CriticalWriterSourceError("not-found", "User not found");
  }
  const membershipIds = await readMembershipsAsync(database, userId);
  const discoveredMemberships =
    candidate.kind === "sign-in-external-memberships"
      ? await database
          .select({ id: groups.id, name: groups.name })
          .from(groupMembers)
          .innerJoin(groups, eq(groupMembers.groupId, groups.id))
          .where(eq(groupMembers.userId, userId))
      : [];
  if (candidate.kind === "sign-in-external-memberships")
    assertSameMemberships(
      membershipIds,
      discoveredMemberships.map((group) => group.id),
    );
  const matchingNames =
    candidate.kind === "sign-in-everyone-membership"
      ? [everyoneGroup]
      : candidate.kind === "sign-in-external-memberships"
        ? candidate.externalGroups.filter((name) => !discoveredMemberships.some((group) => group.name === name))
        : [];
  const matchingGroups =
    matchingNames.length === 0
      ? []
      : await database
          .select({ id: groups.id, name: groups.name })
          .from(groups)
          .where(inArray(groups.name, matchingNames));
  const exclusiveGroupId = "groupId" in candidate ? candidate.groupId : undefined;
  const requestedGroupIds = [
    ...membershipIds,
    ...matchingGroups.map((group) => group.id),
    ...(exclusiveGroupId === undefined ? [] : [exclusiveGroupId]),
  ];
  const locked = await lockGroupParentsAsync(database, requestedGroupIds, exclusiveGroupId);
  assertSameParents([...discoveredMemberships, ...matchingGroups], locked);
  const facts = await readCurrentGroupFactsAsync(database, userId, membershipIds, locked);
  switch (candidate.kind) {
    case "save-group-permissions": {
      assertCandidateAdmin(facts);
      requireCandidateGroup(locked.get(candidate.groupId));
      const permissions = [...new Set(candidate.permissions)];
      await database.delete(groupPermissions).where(eq(groupPermissions.groupId, candidate.groupId));
      if (permissions.length > 0)
        await database
          .insert(groupPermissions)
          .values(permissions.map((permission) => ({ groupId: candidate.groupId, permission })));
      return;
    }
    case "delete-group": {
      assertCandidateAdmin(facts);
      const group = requireCandidateGroup(locked.get(candidate.groupId));
      assertCandidateGroupDeletion(group);
      await database.delete(groups).where(eq(groups.id, candidate.groupId));
      return;
    }
    case "sign-in-everyone-membership": {
      const group = matchingGroups[0];
      if (group && !facts.groupIds.includes(group.id))
        await database.insert(groupMembers).values({ userId, groupId: group.id });
      return;
    }
    case "sign-in-external-memberships": {
      const memberships: CurrentGroupParent[] = facts.groupIds.map((id) => {
        const group = locked.get(id);
        if (!group) throw new CriticalWriterCurrentnessError();
        return group;
      });
      const changes = prepareExternalMembershipChanges(memberships, matchingGroups, candidate.externalGroups);
      if (changes.insert.length > 0)
        await database.insert(groupMembers).values(changes.insert.map((groupId) => ({ userId, groupId })));
      if (changes.remove.length > 0)
        await database
          .delete(groupMembers)
          .where(and(eq(groupMembers.userId, userId), inArray(groupMembers.groupId, [...changes.remove])));
      return;
    }
  }
}

export async function runCriticalWriterCandidateAsync(
  runtime: PersistenceRuntime,
  operation: BoundedTransactionOperation,
  candidate: CriticalWriterCandidate,
): Promise<void> {
  requireCriticalWriterExecutionJoin();
  if (runtime.engine !== "postgresql") throw new TypeError("Critical writer requires the PostgreSQL bounded runtime");
  await runtime.boundedTransactionAsync(operation, (database) => applyCandidateAsync(database, candidate));
}
