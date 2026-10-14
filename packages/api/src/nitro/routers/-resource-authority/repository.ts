import { isDeepStrictEqual } from "node:util";
import { and, eq, inArray, sql } from "drizzle-orm";
import type { AnyColumn } from "drizzle-orm";

import { snapshotPolicyIdentity } from "@homarr/auth/nitro/policy";
import type { BoardAccessEvidence, PolicyIdentity, ResourceAuthorizationRepository } from "@homarr/auth/nitro/policy";
import type { HomarrDatabase, HomarrDatabasePostgresql } from "@homarr/db/driver";
import type { BoundedTransactionOperation, PersistenceRuntime } from "@homarr/db/runtime";
import type { IntegrationKind } from "@homarr/definitions";

export interface ResourceAuthorizationSelection {
  readonly integrationIds: readonly string[];
  readonly allowedKinds: readonly IntegrationKind[];
  readonly boardIds?: readonly string[];
}

const userWhere = (identity: PolicyIdentity) => (table: { userId: AnyColumn }) => {
  if (identity.type === "anonymous") return sql`false`;
  return eq(table.userId, identity.userId);
};

const groupWhere = (identity: PolicyIdentity) => (table: { groupId: AnyColumn }) => {
  if (identity.type === "anonymous") return sql`false`;
  return inArray(table.groupId, [...identity.groupIds]);
};

const integrationProjection = (identity: PolicyIdentity) =>
  ({
    app: true,
    secrets: true,
    items: { with: { item: true } },
    userPermissions: { where: userWhere(identity) },
    groupPermissions: { where: groupWhere(identity) },
  }) as const;

const boardProjection = (identity: PolicyIdentity) => ({
  userPermissions: { where: userWhere(identity) },
  groupPermissions: { where: groupWhere(identity) },
});

const membershipIdentity = (identity: PolicyIdentity, members: readonly { groupId: string }[]) => {
  if (identity.type === "anonymous") return snapshotPolicyIdentity(identity);
  return snapshotPolicyIdentity({ ...identity, groupIds: members.map(({ groupId }) => groupId) });
};

function readSqlite(database: HomarrDatabase, principal: PolicyIdentity, selection: ResourceAuthorizationSelection) {
  const members = database.query.groupMembers.findMany({ where: userWhere(principal) }).sync();
  const identity = membershipIdentity(principal, members);
  const integrations = database.query.integrations
    .findMany({
      where: (table) =>
        and(inArray(table.id, [...selection.integrationIds]), inArray(table.kind, [...selection.allowedKinds])),
      with: integrationProjection(identity),
    })
    .sync();
  const boardIds = [
    ...new Set([
      ...(selection.boardIds ?? []),
      ...integrations.flatMap(({ items }) => items.map(({ item }) => item.boardId)),
    ]),
  ];
  const boards = database.query.boards
    .findMany({
      where: (table) => inArray(table.id, boardIds),
      columns: { id: true, creatorId: true, isPublic: true },
      with: boardProjection(identity),
    })
    .sync();
  return { identity, integrations, boards };
}

async function readPostgres(
  database: HomarrDatabasePostgresql,
  principal: PolicyIdentity,
  selection: ResourceAuthorizationSelection,
) {
  const members = await database.query.groupMembers.findMany({ where: userWhere(principal) });
  const identity = membershipIdentity(principal, members);
  const integrations = await database.query.integrations.findMany({
    where: (table) =>
      and(inArray(table.id, [...selection.integrationIds]), inArray(table.kind, [...selection.allowedKinds])),
    with: integrationProjection(identity),
  });
  const boardIds = [
    ...new Set([
      ...(selection.boardIds ?? []),
      ...integrations.flatMap(({ items }) => items.map(({ item }) => item.boardId)),
    ]),
  ];
  const boards = await database.query.boards.findMany({
    where: (table) => inArray(table.id, boardIds),
    columns: { id: true, creatorId: true, isPublic: true },
    with: boardProjection(identity),
  });
  return { identity, integrations, boards };
}

export type ResourceIntegrationRecord = ReturnType<typeof readSqlite>["integrations"][number];

export interface ResourceAuthorizationSnapshot {
  readonly identity: PolicyIdentity;
  readonly integrations: readonly ResourceIntegrationRecord[];
  readonly repository: ResourceAuthorizationRepository<ResourceIntegrationRecord>;
}

export async function readResourceAuthorizationSnapshotAsync(
  runtime: Pick<PersistenceRuntime, "engine" | "boundedTransactionSync" | "boundedSnapshotAsync">,
  operation: BoundedTransactionOperation,
  admittedIdentity: PolicyIdentity,
  selection: ResourceAuthorizationSelection,
): Promise<ResourceAuthorizationSnapshot> {
  const boundedOperation = Object.freeze({
    signal: operation.signal,
    lifetime: operation.lifetime,
    deadlineAt: operation.deadlineAt,
  });
  const principal = snapshotPolicyIdentity(admittedIdentity);
  const requested = {
    integrationIds: [...selection.integrationIds],
    allowedKinds: [...selection.allowedKinds],
    boardIds: [...(selection.boardIds ?? [])],
  };
  const snapshot =
    runtime.engine === "sqlite"
      ? runtime.boundedTransactionSync(boundedOperation, (database) => readSqlite(database, principal, requested))
      : await runtime.boundedSnapshotAsync(boundedOperation, (database) =>
          readPostgres(database, principal, requested),
        );
  const assertIdentity = (identity: PolicyIdentity) => {
    boundedOperation.signal.throwIfAborted();
    boundedOperation.lifetime.throwIfAborted();
    if (Date.now() >= boundedOperation.deadlineAt || !isDeepStrictEqual(snapshot.identity, identity)) {
      throw new Error("Resource authorization snapshot is unavailable for this identity");
    }
  };
  const repository: ResourceAuthorizationRepository<ResourceIntegrationRecord> = {
    async findBoard(identity, id): Promise<BoardAccessEvidence | null> {
      assertIdentity(identity);
      return structuredClone(snapshot.boards.find((board) => board.id === id) ?? null);
    },
    async findBoards(identity, ids) {
      assertIdentity(identity);
      return structuredClone(snapshot.boards.filter(({ id }) => ids.includes(id)));
    },
    async findIntegrations(identity, ids, allowedKinds) {
      assertIdentity(identity);
      return structuredClone(
        snapshot.integrations.filter(({ id, kind }) => ids.includes(id) && allowedKinds.includes(kind)),
      );
    },
  };
  assertIdentity(snapshot.identity);
  return Object.freeze({
    identity: snapshot.identity,
    integrations: Object.freeze(structuredClone(snapshot.integrations)),
    repository: Object.freeze(repository),
  });
}
