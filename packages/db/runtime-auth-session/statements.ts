import { sql } from "drizzle-orm";
import type { SQL } from "drizzle-orm";

import { everyoneGroup } from "@homarr/definitions";

import type { HomarrDatabase, HomarrDatabasePostgresql } from "../driver";
import { authGroupParentLocks, authUserParentLock } from "../runtime-authority/locks";
import type { AuthCredentialDomain } from "../runtime-auth-credential/contracts";
import { allocateAuthCredentialSequenceStatements } from "../runtime-auth-credential/statements";
import {
  authCredentialSequence,
  decodeAuthCredentialDomain,
  decodeAuthCredentialPair,
  singleAuthCredentialRow,
} from "../runtime-auth-credential/validation";
import { users as postgresqlUsers } from "../schema/postgresql";
import { AuthSessionSqlPreconditionError } from "./contracts";
import type {
  AuthAccountWitness,
  AuthLoginIdentity,
  AuthSessionSqlResult,
  AuthSessionCredential,
  AuthSessionWitness,
  AuthUserWitness,
  PreparedAuthSessionMutation,
} from "./contracts";

type Engine = "sqlite" | "postgresql";
type Statements = Generator<SQL, AuthSessionSqlResult, readonly unknown[]>;

const reject = (): never => {
  throw new AuthSessionSqlPreconditionError();
};

const record = (value: unknown): Record<string, unknown> => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return reject();
  const result: Record<string, unknown> = {};
  for (const [key, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(value))) {
    if (!("value" in descriptor)) return reject();
    result[key] = descriptor.value;
  }
  return result;
};

const single = (rows: readonly unknown[]) => {
  if (rows.length !== 1) return reject();
  return record(rows[0]);
};

const string = (value: unknown): string => {
  if (typeof value !== "string") return reject();
  return value;
};

const nullableString = (value: unknown): string | null => {
  if (value === null) return null;
  return string(value);
};

const timestamp = (engine: Engine, value: unknown): number | null => {
  if (value === null) return null;
  let decoded: unknown = value;
  if (engine === "postgresql" && typeof value === "string")
    decoded = postgresqlUsers.emailVerified.mapFromDriverValue(value);
  const time = decoded instanceof Date ? decoded.getTime() : decoded;
  if (typeof time !== "number" || !Number.isSafeInteger(time)) return reject();
  return time;
};

const date = (engine: Engine, value: Date | null) => {
  if (value === null) return null;
  if (engine === "sqlite") return value.getTime();
  return value.toISOString();
};

const same = (engine: Engine, column: SQL, value: unknown) => {
  if (engine === "postgresql") return sql`${column} IS NOT DISTINCT FROM ${value}`;
  return sql`${column} IS ${value}`;
};

const userFields = sql`"id", "name", "email", "email_verified" AS "emailVerified", "image", "password",
  "provider", "color_scheme" AS "colorScheme"`;

const userMatches = (engine: Engine, user: AuthUserWitness) => sql`"id" = ${user.id}
  AND ${same(engine, sql`"name"`, user.name)} AND ${same(engine, sql`"email"`, user.email)}
  AND ${same(engine, sql`"email_verified"`, date(engine, user.emailVerified))}
  AND ${same(engine, sql`"image"`, user.image)} AND ${same(engine, sql`"password"`, user.password)}
  AND "provider" = ${user.provider}`;

const sessionMatches = (engine: Engine, session: AuthSessionWitness) =>
  sql`"session_token" = ${session.sessionToken} AND "user_id" = ${session.userId}
    AND "expires" = ${date(engine, session.expires)}`;

const accountColumns = [
  "type",
  "refresh_token",
  "access_token",
  "expires_at",
  "token_type",
  "scope",
  "id_token",
  "session_state",
] as const;

const accountMatches = (engine: Engine, account: AuthAccountWitness) => sql`"user_id" = ${account.userId}
  AND "provider" = ${account.provider} AND "provider_account_id" = ${account.providerAccountId}
  AND ${sql.join(
    accountColumns.map((column) => same(engine, sql`${sql.identifier(column)}`, account[column])),
    sql` AND `,
  )}`;

const requireUserMatch = (engine: Engine, row: Record<string, unknown>, witness: AuthUserWitness) => {
  for (const key of ["id", "name", "email", "image", "password", "provider"] as const)
    if (row[key] !== witness[key]) reject();
  if (
    timestamp(engine, row.emailVerified) !== witness.emailVerified?.getTime() &&
    !(row.emailVerified === null && witness.emailVerified === null)
  )
    reject();
};

const readUser = (engine: Engine, row: Record<string, unknown>): AuthSessionSqlResult["user"] => {
  const provider = row.provider;
  const colorScheme = row.colorScheme;
  if (provider !== "credentials" && provider !== "ldap" && provider !== "oidc") return reject();
  if (colorScheme !== "dark" && colorScheme !== "light" && colorScheme !== "auto") return reject();
  const verifiedAt = timestamp(engine, row.emailVerified);
  return {
    id: string(row.id),
    name: nullableString(row.name),
    email: nullableString(row.email),
    emailVerified: verifiedAt === null ? null : new Date(verifiedAt),
    image: nullableString(row.image),
    provider,
    colorScheme,
  };
};

const boundedRows = (rows: readonly unknown[], maximumRows: number) => {
  if (rows.length > maximumRows) return reject();
  return rows.map(record);
};

const lockSuffix = (engine: Engine) => {
  if (engine === "postgresql") return sql` FOR UPDATE`;
  return sql.empty();
};

const sequenceBind = (engine: Engine, value: string): SQL => {
  const canonical = authCredentialSequence(value, 1n).toString();
  if (engine === "sqlite") return sql`CAST(${canonical} AS INTEGER)`;
  return sql`CAST(${canonical} AS BIGINT)`;
};

const sequenceStorage = (engine: Engine, column: SQL): SQL => {
  if (engine === "sqlite") return sql`typeof(${column})`;
  return sql`CAST(pg_typeof(${column}) AS TEXT)`;
};

export function* authCredentialDomainLockStatements(
  engine: Engine,
): Generator<SQL, AuthCredentialDomain, readonly unknown[]> {
  const domain = decodeAuthCredentialDomain(
    engine,
    singleAuthCredentialRow(
      yield sql`SELECT CAST("id" AS TEXT) AS domain_id, "namespace", "phase",
      CAST("head_sequence" AS TEXT) AS head_sequence,
      ${sequenceStorage(engine, sql`"head_sequence"`)} AS head_storage
      FROM "homarr_auth_credential_domain" WHERE "id" = 1
      AND NOT EXISTS (SELECT 1 FROM "homarr_auth_credential_domain" WHERE "id" IS NULL OR "id" <> 1)
      ${lockSuffix(engine)}`,
    ),
  );
  if (domain.phase !== "ready") return reject();
  return domain;
}

export const lockAuthCredentialDomainAsync = async (database: HomarrDatabasePostgresql): Promise<void> => {
  const statements = authCredentialDomainLockStatements("postgresql");
  let step = statements.next();
  while (!step.done) step = statements.next((await database.execute(step.value)).rows);
};

function* requireSessionEvidence(
  engine: Engine,
  domain: AuthCredentialDomain,
  session: AuthSessionWitness,
  credential: AuthSessionCredential,
  expiring = false,
): Generator<SQL, void, readonly unknown[]> {
  const row = singleAuthCredentialRow(
    yield sql`SELECT
    CAST("auth_lifetime_sequence" AS TEXT) AS lifetime_sequence,
    CAST("auth_write_sequence" AS TEXT) AS write_sequence,
    ${sequenceStorage(engine, sql`"auth_lifetime_sequence"`)} AS lifetime_storage,
    ${sequenceStorage(engine, sql`"auth_write_sequence"`)} AS write_storage,
    ${sequenceStorage(engine, sql`"expires"`)} AS expiry_storage
    FROM "session" WHERE ${sessionMatches(engine, session)}${lockSuffix(engine)}`,
  );
  const pair = decodeAuthCredentialPair(engine, row, domain.headSequence);
  if (expiring) {
    let storage = "integer";
    if (engine === "postgresql") storage = "timestamp without time zone";
    if (row.expiry_storage !== storage) return reject();
  }
  if (
    domain.namespace !== credential.namespace ||
    pair === null ||
    pair.lifetimeSequence !== credential.lifetimeSequence ||
    pair.writeSequence !== credential.writeSequence
  )
    return reject();
}

function* requireCurrentClock(
  engine: Engine,
  prepared: PreparedAuthSessionMutation,
): Generator<SQL, void, readonly unknown[]> {
  let statement = sql`SELECT CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER) AS "observedNow"`;
  if (engine === "postgresql") {
    statement = sql`SELECT CAST(EXTRACT(EPOCH FROM clock_timestamp()) * 1000 AS DOUBLE PRECISION) AS "observedNow"`;
    if (prepared.mutation.kind === "expire")
      statement = sql`SELECT CAST(FLOOR(EXTRACT(EPOCH FROM clock_timestamp()) * 1000) AS DOUBLE PRECISION) AS "observedNow"`;
  }
  const observed = single(yield statement).observedNow;
  if (typeof observed !== "number" || !Number.isFinite(observed)) return reject();
  const expected = Date.now();
  const configured = prepared.now();
  if (
    !Number.isSafeInteger(configured) ||
    Math.abs(expected - observed) > prepared.maximumAbsoluteClockSkewMs ||
    Math.abs(configured - observed) > prepared.maximumAbsoluteClockSkewMs ||
    Math.abs(configured - expected) > prepared.maximumAbsoluteClockSkewMs
  )
    return reject();
  const mutation = prepared.mutation;
  if (mutation.kind === "expire") {
    const expiresAt = mutation.session.expires.getTime();
    if (
      !Number.isSafeInteger(observed) ||
      observed < 0 ||
      observed > 8_640_000_000_000_000 ||
      !Number.isSafeInteger(expected) ||
      expected < 0 ||
      expected > 8_640_000_000_000_000 ||
      configured < 0 ||
      configured > 8_640_000_000_000_000 ||
      expiresAt >= observed ||
      expiresAt >= expected ||
      expiresAt >= configured
    )
      return reject();
    return;
  }
  if (mutation.kind === "revoke") return;
  let session: AuthSessionWitness;
  if (mutation.kind === "establish") {
    if (mutation.session.kind === "create") session = mutation.session.session;
    else session = mutation.session.witness;
  } else session = mutation.session;
  if (session.expires.getTime() <= observed) return reject();
}

function* authSessionStatements(engine: Engine, prepared: PreparedAuthSessionMutation): Statements {
  const { mutation, maximumSnapshotRows } = prepared;
  const domain = yield* authCredentialDomainLockStatements(engine);
  yield* requireCurrentClock(engine, prepared);
  let originalCredential: AuthSessionCredential | undefined;
  if (mutation.kind === "establish") {
    if (mutation.session.kind === "existing") {
      originalCredential = mutation.session.credential;
      yield* requireSessionEvidence(engine, domain, mutation.session.witness, originalCredential);
    }
  } else {
    originalCredential = mutation.credential;
    yield* requireSessionEvidence(engine, domain, mutation.session, originalCredential, mutation.kind === "expire");
  }
  let identity: AuthLoginIdentity | undefined;
  let witness: AuthUserWitness | undefined;
  let created: Extract<AuthLoginIdentity, { kind: "create" }>["user"] | undefined;
  if (mutation.kind === "establish") {
    identity = mutation.identity;
    if (identity.kind === "existing") witness = identity.witness;
    else created = identity.user;
  } else witness = mutation.user;
  const userId = witness?.id ?? created?.id;
  if (userId === undefined) return reject();
  if (engine === "postgresql" && witness !== undefined) single(yield authUserParentLock(userId));
  if (identity !== undefined) {
    for (const selection of identity.selections) {
      let column = sql`"name"`;
      if (selection.field === "email") column = sql`"email"`;
      const selected = yield sql`SELECT "id" FROM "user" WHERE ${column} = ${selection.value}
        AND "provider" = ${selection.provider} LIMIT 2`;
      if (selection.selectedUserId === null) {
        if (selected.length !== 0) return reject();
      } else if (single(selected).id !== selection.selectedUserId) return reject();
    }
  }
  if (witness !== undefined) {
    const row = single(yield sql`SELECT ${userFields} FROM "user" WHERE "id" = ${userId}`);
    requireUserMatch(engine, row, witness);
  } else if (created !== undefined) {
    if ((yield sql`SELECT "id" FROM "user" WHERE "id" = ${userId}`).length !== 0) return reject();
    single(
      yield sql`INSERT INTO "user" ("id", "name", "email", "email_verified", "image", "provider")
      VALUES (${created.id}, ${created.name}, ${created.email}, ${date(engine, created.emailVerified)},
        ${created.image}, ${created.provider}) RETURNING "id"`,
    );
  }
  let account: AuthAccountWitness | undefined;
  if (mutation.kind === "establish") {
    if (mutation.account.kind === "existing") account = mutation.account.witness;
    if (mutation.account.kind === "link") account = mutation.account.account;
  } else account = mutation.account;
  if (account !== undefined) {
    const selected =
      yield sql`SELECT "user_id" FROM "account" WHERE ${accountMatches(engine, account)}${lockSuffix(engine)}`;
    if (mutation.kind === "establish" && mutation.account.kind === "link") {
      if (
        selected.length !== 0 ||
        (yield sql`SELECT "user_id" FROM "account"
        WHERE "provider" = ${account.provider} AND "provider_account_id" = ${account.providerAccountId}`).length !== 0
      )
        return reject();
      single(
        yield sql`INSERT INTO "account" ("user_id", "type", "provider", "provider_account_id",
        "refresh_token", "access_token", "expires_at", "token_type", "scope", "id_token", "session_state")
        VALUES (${account.userId}, ${account.type}, ${account.provider}, ${account.providerAccountId},
          ${account.refresh_token}, ${account.access_token}, ${account.expires_at}, ${account.token_type},
          ${account.scope}, ${account.id_token}, ${account.session_state}) RETURNING "user_id"`,
      );
    } else single(selected);
  }
  let groupStatement = sql`SELECT "id", "name" FROM "group" ORDER BY "id" LIMIT ${maximumSnapshotRows + 1}`;
  if (engine === "postgresql") groupStatement = authGroupParentLocks(maximumSnapshotRows);
  const groups = boundedRows(yield groupStatement, maximumSnapshotRows);
  const membershipRows = boundedRows(
    yield sql`SELECT "group_id" AS "groupId" FROM "groupMember"
    WHERE "user_id" = ${userId} ORDER BY "group_id" LIMIT ${maximumSnapshotRows + 1}`,
    maximumSnapshotRows,
  );
  const currentMemberships = new Set(membershipRows.map((row) => string(row.groupId)));
  const groupIds = new Set(groups.map((group) => string(group.id)));
  for (const id of currentMemberships) if (!groupIds.has(id)) return reject();
  if (mutation.kind === "establish") {
    const external = mutation.effects.externalGroupNames;
    for (const group of groups) {
      const id = string(group.id);
      const name = string(group.name);
      const existing = currentMemberships.has(id);
      const required = name === everyoneGroup || external?.includes(name) === true;
      if (!existing && required) {
        single(
          yield sql`INSERT INTO "groupMember" ("user_id", "group_id") VALUES (${userId}, ${id})
          RETURNING "group_id"`,
        );
        currentMemberships.add(id);
      } else if (existing && !required && external !== undefined) {
        single(
          yield sql`DELETE FROM "groupMember" WHERE "user_id" = ${userId} AND "group_id" = ${id}
          RETURNING "group_id"`,
        );
        currentMemberships.delete(id);
      }
    }
    const effects = mutation.effects;
    const assignments = [sql`"name" = ${effects.name}`];
    if (effects.email !== undefined) assignments.push(sql`"email" = ${effects.email}`);
    if (effects.emailVerified !== undefined)
      assignments.push(sql`"email_verified" = ${date(engine, effects.emailVerified)}`);
    if (
      effects.image !== undefined &&
      (witness?.provider ?? created?.provider) === "oidc" &&
      !(witness?.image ?? created?.image)?.startsWith("data:")
    )
      assignments.push(sql`"image" = ${effects.image}`);
    let match = sql`"id" = ${userId}`;
    if (witness !== undefined) match = userMatches(engine, witness);
    single(yield sql`UPDATE "user" SET ${sql.join(assignments, sql`, `)} WHERE ${match} RETURNING "id"`);
  }
  const memberships = [...currentMemberships].toSorted();
  let permissionRows: Record<string, unknown>[] = [];
  if (memberships.length > 0) {
    permissionRows = boundedRows(
      yield sql`SELECT "group_id" AS "groupId", "permission" FROM "groupPermission"
      WHERE "group_id" IN (${sql.join(
        memberships.map((id) => sql`${id}`),
        sql`, `,
      )})
      ORDER BY "group_id", "permission" LIMIT ${maximumSnapshotRows + 1}`,
      maximumSnapshotRows,
    );
  }
  const permissions = permissionRows.map((row) => ({
    groupId: string(row.groupId),
    permission: string(row.permission),
  }));
  let session: AuthSessionWitness;
  if (mutation.kind === "establish") {
    if (mutation.session.kind === "create") session = mutation.session.session;
    else session = mutation.session.witness;
  } else session = mutation.session;
  let resultSession = session;
  let lifetimeSequence: string;
  let writeSequence: string;
  if (mutation.kind === "establish" && mutation.session.kind === "create") {
    const advanced = yield* allocateAuthCredentialSequenceStatements(engine, domain.namespace);
    const allocated = sequenceBind(engine, advanced.headSequence);
    lifetimeSequence = advanced.headSequence;
    writeSequence = advanced.headSequence;
    single(
      yield sql`INSERT INTO "session" ("session_token", "user_id", "expires", "auth_lifetime_sequence", "auth_write_sequence")
      VALUES (${session.sessionToken}, ${userId}, ${date(engine, session.expires)}, ${allocated}, ${allocated}) RETURNING "session_token"`,
    );
  } else {
    if (originalCredential === undefined) return reject();
    lifetimeSequence = originalCredential.lifetimeSequence;
    writeSequence = originalCredential.writeSequence;
    const evidenceMatch = sql`${sessionMatches(engine, session)}
      AND "auth_lifetime_sequence" = ${sequenceBind(engine, originalCredential.lifetimeSequence)}
      AND "auth_write_sequence" = ${sequenceBind(engine, originalCredential.writeSequence)}`;
    single(yield sql`SELECT "session_token" FROM "session" WHERE ${evidenceMatch}${lockSuffix(engine)}`);
    if (mutation.kind === "renew") {
      const advanced = yield* allocateAuthCredentialSequenceStatements(engine, domain.namespace);
      const allocated = sequenceBind(engine, advanced.headSequence);
      writeSequence = advanced.headSequence;
      single(
        yield sql`UPDATE "session" SET "expires" = ${date(engine, mutation.expires)}, "auth_write_sequence" = ${allocated}
        WHERE ${evidenceMatch} RETURNING "session_token"`,
      );
      resultSession = { ...session, expires: mutation.expires };
    } else if (mutation.kind === "revoke" || mutation.kind === "expire") {
      single(yield sql`DELETE FROM "session" WHERE ${evidenceMatch} RETURNING "session_token"`);
    }
  }
  const user = readUser(engine, single(yield sql`SELECT ${userFields} FROM "user" WHERE "id" = ${userId}`));
  yield* requireCurrentClock(engine, prepared);
  if (mutation.kind === "revoke" || mutation.kind === "expire")
    return { kind: "revoked", user, session: resultSession, credential: null, groupIds: memberships, permissions };
  let kind: "established" | "renewed" = "established";
  if (mutation.kind === "renew") kind = "renewed";
  let hostDeadlineAt = resultSession.expires.getTime() - prepared.maximumAbsoluteClockSkewMs;
  if (mutation.kind !== "renew" && originalCredential !== undefined)
    hostDeadlineAt = Math.min(hostDeadlineAt, originalCredential.hostDeadlineAt);
  const credential: AuthSessionCredential = Object.freeze({
    type: "opaque-session",
    namespace: domain.namespace,
    lifetimeSequence,
    writeSequence,
    token: resultSession.sessionToken,
    userId: user.id,
    provider: user.provider,
    expiresAt: resultSession.expires.getTime(),
    hostDeadlineAt,
  });
  return { kind, user, session: resultSession, credential, groupIds: memberships, permissions };
}

export const executeAuthSessionMutationSync = (
  database: HomarrDatabase,
  prepared: PreparedAuthSessionMutation,
): AuthSessionSqlResult => {
  const statements = authSessionStatements("sqlite", prepared);
  let step = statements.next();
  while (!step.done) step = statements.next(database.all<unknown>(step.value));
  return step.value;
};

export const executeAuthSessionMutationAsync = async (
  database: HomarrDatabasePostgresql,
  prepared: PreparedAuthSessionMutation,
): Promise<AuthSessionSqlResult> => {
  const statements = authSessionStatements("postgresql", prepared);
  let step = statements.next();
  while (!step.done) {
    const result = await database.execute(step.value);
    step = statements.next(result.rows);
  }
  return step.value;
};
