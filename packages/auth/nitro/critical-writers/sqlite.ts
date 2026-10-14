import { and, eq, inArray } from "@homarr/db";
import type { HomarrDatabase } from "@homarr/db/driver";
import type { BoundedTransactionOperation, PersistenceRuntime } from "@homarr/db/runtime";
import { sqliteSchema } from "@homarr/db/schema";
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
  prepareExternalMembershipChanges,
  requireCandidateGroup,
} from "./source-policy";

const { users, groups, groupMembers, groupPermissions } = sqliteSchema;

function readMemberships(database: HomarrDatabase, userId: string): string[] {
  return database
    .select({ groupId: groupMembers.groupId })
    .from(groupMembers)
    .where(eq(groupMembers.userId, userId))
    .all()
    .map((row) => row.groupId);
}

function readCurrentGroupFacts(database: HomarrDatabase, userId: string): CurrentGroupFacts {
  const groupIds = readMemberships(database, userId);
  for (const groupId of [...groupIds].sort()) {
    if (!database.select({ id: groups.id }).from(groups).where(eq(groups.id, groupId)).get())
      throw new CriticalWriterCurrentnessError();
  }
  const permissions = database
    .selectDistinct({ permission: groupPermissions.permission })
    .from(groupPermissions)
    .innerJoin(groupMembers, eq(groupPermissions.groupId, groupMembers.groupId))
    .where(eq(groupMembers.userId, userId))
    .all();
  return {
    userId,
    groupIds,
    permissions: getPermissionsWithChildren(permissions.map((row) => row.permission)),
  };
}

function readParent(database: HomarrDatabase, id: string): CurrentGroupParent | undefined {
  return database.select({ id: groups.id, name: groups.name }).from(groups).where(eq(groups.id, id)).get();
}

function applyCandidate(database: HomarrDatabase, candidate: CriticalWriterCandidate): void {
  const userId = "actorId" in candidate ? candidate.actorId : candidate.userId;
  const user = database.select({ id: users.id }).from(users).where(eq(users.id, userId)).get();
  if (!user) {
    if ("actorId" in candidate) throw new CriticalWriterSourceError("unauthenticated", "Authentication required");
    throw new CriticalWriterSourceError("not-found", "User not found");
  }
  const facts = readCurrentGroupFacts(database, userId);
  switch (candidate.kind) {
    case "save-group-permissions": {
      assertCandidateAdmin(facts);
      requireCandidateGroup(readParent(database, candidate.groupId));
      const permissions = [...new Set(candidate.permissions)];
      database.delete(groupPermissions).where(eq(groupPermissions.groupId, candidate.groupId)).run();
      if (permissions.length > 0)
        database
          .insert(groupPermissions)
          .values(permissions.map((permission) => ({ groupId: candidate.groupId, permission })))
          .run();
      return;
    }
    case "delete-group": {
      assertCandidateAdmin(facts);
      const group = requireCandidateGroup(readParent(database, candidate.groupId));
      assertCandidateGroupDeletion(group);
      database.delete(groups).where(eq(groups.id, candidate.groupId)).run();
      return;
    }
    case "sign-in-everyone-membership": {
      const group = database
        .select({ id: groups.id, name: groups.name })
        .from(groups)
        .where(eq(groups.name, everyoneGroup))
        .get();
      if (group && !facts.groupIds.includes(group.id))
        database.insert(groupMembers).values({ userId, groupId: group.id }).run();
      return;
    }
    case "sign-in-external-memberships": {
      const memberships = database
        .select({ id: groups.id, name: groups.name })
        .from(groupMembers)
        .innerJoin(groups, eq(groupMembers.groupId, groups.id))
        .where(eq(groupMembers.userId, userId))
        .all();
      assertSameMemberships(
        facts.groupIds,
        memberships.map((group) => group.id),
      );
      const missingNames = candidate.externalGroups.filter((name) => !memberships.some((group) => group.name === name));
      const matchingGroups =
        missingNames.length === 0
          ? []
          : database
              .select({ id: groups.id, name: groups.name })
              .from(groups)
              .where(inArray(groups.name, missingNames))
              .all();
      const changes = prepareExternalMembershipChanges(memberships, matchingGroups, candidate.externalGroups);
      if (changes.insert.length > 0)
        database
          .insert(groupMembers)
          .values(changes.insert.map((groupId) => ({ userId, groupId })))
          .run();
      if (changes.remove.length > 0)
        database
          .delete(groupMembers)
          .where(and(eq(groupMembers.userId, userId), inArray(groupMembers.groupId, [...changes.remove])))
          .run();
      return;
    }
  }
}

export function runCriticalWriterCandidateSync(
  runtime: PersistenceRuntime,
  operation: BoundedTransactionOperation,
  candidate: CriticalWriterCandidate,
): void {
  requireCriticalWriterExecutionJoin();
  if (runtime.engine !== "sqlite") throw new TypeError("Critical writer requires the SQLite bounded runtime");
  runtime.boundedTransactionSync(operation, (database) => applyCandidate(database, candidate));
}
