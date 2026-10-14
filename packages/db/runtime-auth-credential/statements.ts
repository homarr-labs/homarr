import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import type { SQL } from "drizzle-orm";

import type {
  AuthCredentialAdoptionResult,
  AuthCredentialDomain,
  NativeCredentialPolicyStatements,
  ReadNativeCredentialPolicyAsync,
  ReadNativeCredentialPolicySync,
} from "./contracts";
import {
  authCredentialMaximumRows,
  authCredentialNamespace,
  authCredentialProvider,
  authCredentialRecord,
  authCredentialSequence,
  authCredentialText,
  authCredentialTimestamp,
  captureNativeCredentialEvidence,
  captureNativeCredentialPolicyConfiguration,
  decodeAuthCredentialDomain,
  decodeAuthCredentialPair,
  decodeNativeCredentialPolicy,
  nextAuthCredentialSequence,
  rejectAuthCredential,
  requireAuthCredentialClock,
  singleAuthCredentialRow,
} from "./validation";

type Engine = "sqlite" | "postgresql";
type Statements<T> = Generator<SQL, T, readonly unknown[]>;
type CredentialFamily = "session" | "api-key";

const storage = (engine: Engine, column: SQL): SQL => {
  if (engine === "sqlite") return sql`typeof(${column})`;
  if (engine === "postgresql") return sql`CAST(pg_typeof(${column}) AS TEXT)`;
  return rejectAuthCredential();
};

const sequenceBind = (engine: Engine, value: string): SQL => {
  const canonical = authCredentialSequence(value, 0n).toString();
  if (engine === "sqlite") return sql`CAST(${canonical} AS INTEGER)`;
  if (engine === "postgresql") return sql`CAST(${canonical} AS BIGINT)`;
  return rejectAuthCredential();
};

const domainFields = (engine: Engine): SQL => sql`CAST("id" AS TEXT) AS domain_id, "namespace", "phase",
  CAST("head_sequence" AS TEXT) AS head_sequence, ${storage(engine, sql`"head_sequence"`)} AS head_storage`;

const domainSelection = (engine: Engine): SQL => {
  let lock = sql.empty();
  if (engine === "postgresql") lock = sql` FOR UPDATE`;
  return sql`SELECT ${domainFields(engine)} FROM "homarr_auth_credential_domain"
    WHERE "id" = 1 AND NOT EXISTS (
      SELECT 1 FROM "homarr_auth_credential_domain" WHERE "id" IS NULL OR "id" <> 1
    )${lock}`;
};

function* requireDomain(
  engine: Engine,
  namespace: string,
  phase: AuthCredentialDomain["phase"],
): Statements<AuthCredentialDomain> {
  const expectedNamespace = authCredentialNamespace(namespace);
  const domain = decodeAuthCredentialDomain(engine, singleAuthCredentialRow(yield domainSelection(engine)));
  if (domain.namespace !== expectedNamespace || domain.phase !== phase) return rejectAuthCredential();
  return domain;
}

function* advanceHead(engine: Engine, domain: AuthCredentialDomain): Statements<AuthCredentialDomain> {
  const nextHead = nextAuthCredentialSequence(domain.headSequence);
  const updated = decodeAuthCredentialDomain(
    engine,
    singleAuthCredentialRow(
      yield sql`
    UPDATE "homarr_auth_credential_domain" SET "head_sequence" = ${sequenceBind(engine, nextHead)}
    WHERE "id" = 1 AND "namespace" = ${domain.namespace} AND "phase" = ${domain.phase}
      AND "head_sequence" = ${sequenceBind(engine, domain.headSequence)}
    RETURNING ${domainFields(engine)}
  `,
    ),
  );
  if (updated.namespace !== domain.namespace || updated.phase !== domain.phase || updated.headSequence !== nextHead)
    return rejectAuthCredential();
  return updated;
}

export const nativeCredentialPolicyStatements: NativeCredentialPolicyStatements = function* (engine, input, options) {
  const credential = captureNativeCredentialEvidence(input);
  const configuration = captureNativeCredentialPolicyConfiguration(options);
  requireAuthCredentialClock(configuration.now(), configuration);
  let source = sql`"session"`;
  let locator = sql`c."session_token"`;
  let hash = sql`NULL`;
  let expiry = sql`c."expires"`;
  let expiryMatches = sql`NULL`;
  let expiryStorage = storage(engine, sql`c."expires"`);
  if (credential.type === "api-key") {
    source = sql`"apiKey"`;
    locator = sql`c."id"`;
    hash = sql`c."api_key"`;
    expiry = sql`NULL`;
    expiryMatches = sql`NULL`;
    expiryStorage = sql`NULL`;
  } else {
    expiryMatches = sql`c."expires" IS ${credential.expiresAt}`;
    if (engine === "postgresql") {
      expiry = sql`CAST(EXTRACT(EPOCH FROM c."expires") * 1000 AS DOUBLE PRECISION)`;
      expiryMatches = sql`c."expires" IS NOT DISTINCT FROM CAST(${new Date(credential.expiresAt).toISOString()} AS TIMESTAMP)`;
    }
  }
  let expectedLocator = credential.userId;
  if (credential.type === "opaque-session") expectedLocator = credential.token;
  else expectedLocator = credential.id;
  let clock = sql`CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER)`;
  if (engine === "postgresql")
    clock = sql`CAST(FLOOR(EXTRACT(EPOCH FROM clock_timestamp()) * 1000) AS DOUBLE PRECISION)`;
  const rows = yield sql`
    WITH observed_clock AS MATERIALIZED (SELECT ${clock} AS observed_now)
    SELECT CAST(d."id" AS TEXT) AS domain_id, d."namespace", d."phase",
      CAST(d."head_sequence" AS TEXT) AS head_sequence, ${storage(engine, sql`d."head_sequence"`)} AS head_storage,
      (SELECT CAST(COUNT(*) AS TEXT) FROM "homarr_auth_credential_domain") AS domain_count,
      CAST(c."auth_lifetime_sequence" AS TEXT) AS lifetime_sequence,
      CAST(c."auth_write_sequence" AS TEXT) AS write_sequence,
      ${storage(engine, sql`c."auth_lifetime_sequence"`)} AS lifetime_storage,
      ${storage(engine, sql`c."auth_write_sequence"`)} AS write_storage,
      c."user_id" AS stored_user_id, u."id" AS user_id, u."provider", ${locator} AS locator,
      ${hash} AS credential_hash, ${expiry} AS expires_at, ${expiryMatches} AS expiry_matches,
      ${expiryStorage} AS expiry_storage, observed_clock.observed_now,
      gm."group_id", g."id" AS group_parent_id, gp."group_id" AS permission_group_id, gp."permission"
    FROM ${source} c LEFT JOIN "homarr_auth_credential_domain" d ON d."id" = 1
    LEFT JOIN "user" u ON u."id" = c."user_id" CROSS JOIN observed_clock
    LEFT JOIN "groupMember" gm ON gm."user_id" = u."id"
    LEFT JOIN "group" g ON g."id" = gm."group_id"
    LEFT JOIN "groupPermission" gp ON gp."group_id" = gm."group_id"
    WHERE ${locator} = ${expectedLocator}
    ORDER BY gm."group_id", gp."permission" LIMIT ${configuration.maximumSnapshotRows + 1}
  `;
  return decodeNativeCredentialPolicy(engine, rows, credential, configuration);
};

export const readNativeCredentialPolicySync: ReadNativeCredentialPolicySync = (database, credential, configuration) => {
  const statements = nativeCredentialPolicyStatements("sqlite", credential, configuration);
  let step = statements.next();
  while (!step.done) step = statements.next(database.all<unknown>(step.value));
  return step.value;
};

export const readNativeCredentialPolicyAsync: ReadNativeCredentialPolicyAsync = async (
  database,
  credential,
  configuration,
) => {
  const statements = nativeCredentialPolicyStatements("postgresql", credential, configuration);
  let step = statements.next();
  while (!step.done) {
    const result = await database.execute(step.value);
    step = statements.next(result.rows);
  }
  return step.value;
};

export function* allocateAuthCredentialSequenceStatements(
  engine: Engine,
  namespace: string,
): Statements<AuthCredentialDomain> {
  const domain = yield* requireDomain(engine, namespace, "ready");
  return yield* advanceHead(engine, domain);
}

export function* initializeAuthCredentialDomainStatements(engine: Engine): Statements<AuthCredentialAdoptionResult> {
  const namespace = authCredentialNamespace(randomUUID());
  const inserted = decodeAuthCredentialDomain(
    engine,
    singleAuthCredentialRow(
      yield sql`
    INSERT INTO "homarr_auth_credential_domain" ("id", "namespace", "head_sequence", "phase")
    VALUES (1, ${namespace}, ${sequenceBind(engine, "0")}, 'initializing') RETURNING ${domainFields(engine)}
  `,
    ),
  );
  if (inserted.namespace !== namespace || inserted.phase !== "initializing" || inserted.headSequence !== "0")
    return rejectAuthCredential();
  const domain = yield* requireDomain(engine, namespace, "initializing");
  if (domain.headSequence !== "0") return rejectAuthCredential();
  return Object.freeze({ ...domain, enrolledRows: 0 });
}

interface UnenrolledCredential {
  readonly family: CredentialFamily;
  readonly locator: string;
  readonly userId: string;
  readonly provider: ReturnType<typeof authCredentialProvider>;
  readonly hash: string | null;
  readonly expiresWitness: string | null;
}

const credentialSource = (family: CredentialFamily): SQL => {
  if (family === "session") return sql`"session"`;
  return sql`"apiKey"`;
};

const credentialLocator = (family: CredentialFamily): SQL => {
  if (family === "session") return sql`c."session_token"`;
  return sql`c."id"`;
};

const credentialPage = (engine: Engine, family: CredentialFamily, after: string | null, maximumRows: number): SQL => {
  const locator = credentialLocator(family);
  let collated = sql`${locator} COLLATE "BINARY"`;
  if (engine === "postgresql") collated = sql`${locator} COLLATE "C"`;
  let cursor = sql`TRUE`;
  if (after !== null) cursor = sql`${collated} > ${after}`;
  let hash = sql`c."api_key"`;
  let expiry = sql`NULL`;
  let expiresWitness = sql`NULL`;
  let expiryStorage = sql`NULL`;
  if (family === "session") {
    hash = sql`NULL`;
    expiry = sql`c."expires"`;
    if (engine === "postgresql") expiry = sql`CAST(EXTRACT(EPOCH FROM c."expires") * 1000 AS DOUBLE PRECISION)`;
    expiresWitness = sql`CAST(c."expires" AS TEXT)`;
    expiryStorage = storage(engine, sql`c."expires"`);
  }
  return sql`SELECT ${locator} AS locator, c."user_id" AS stored_user_id, u."id" AS user_id, u."provider",
    ${hash} AS credential_hash, ${expiry} AS expires_at, ${expiresWitness} AS expires_witness, ${expiryStorage} AS expiry_storage,
    CAST(c."auth_lifetime_sequence" AS TEXT) AS lifetime_sequence,
    CAST(c."auth_write_sequence" AS TEXT) AS write_sequence,
    ${storage(engine, sql`c."auth_lifetime_sequence"`)} AS lifetime_storage,
    ${storage(engine, sql`c."auth_write_sequence"`)} AS write_storage
    FROM ${credentialSource(family)} c LEFT JOIN "user" u ON u."id" = c."user_id"
    WHERE ${cursor} ORDER BY ${collated} LIMIT ${maximumRows + 1}`;
};

const adoptionCredential = (
  engine: Engine,
  family: CredentialFamily,
  row: Record<string, unknown>,
): UnenrolledCredential => {
  const userId = authCredentialText(row.user_id, 64);
  if (row.stored_user_id !== userId) return rejectAuthCredential();
  const provider = authCredentialProvider(row.provider);
  let locator = authCredentialText(row.locator);
  let hash: string | null = null;
  let expiresWitness: string | null = null;
  if (family === "session") {
    authCredentialTimestamp(row.expires_at);
    expiresWitness = authCredentialText(row.expires_witness);
    if (row.credential_hash !== null || (engine === "sqlite" && row.expiry_storage !== "integer"))
      return rejectAuthCredential();
  } else {
    locator = authCredentialText(row.locator, 64);
    hash = authCredentialText(row.credential_hash);
    if (row.expires_at !== null || row.expires_witness !== null || row.expiry_storage !== null)
      return rejectAuthCredential();
  }
  return Object.freeze({ family, locator, userId, provider, hash, expiresWitness });
};

const duplicateAllocations = sql`
  SELECT CAST(sequence AS TEXT) AS sequence FROM (
    SELECT "auth_lifetime_sequence" AS sequence FROM "session" WHERE "auth_lifetime_sequence" IS NOT NULL
    UNION ALL SELECT "auth_write_sequence" FROM "session" WHERE "auth_write_sequence" <> "auth_lifetime_sequence"
    UNION ALL SELECT "auth_lifetime_sequence" FROM "apiKey" WHERE "auth_lifetime_sequence" IS NOT NULL
    UNION ALL SELECT "auth_write_sequence" FROM "apiKey" WHERE "auth_write_sequence" <> "auth_lifetime_sequence"
  ) allocations GROUP BY sequence HAVING COUNT(*) > 1 LIMIT 1
`;

function* validateAdoption(
  engine: Engine,
  domain: AuthCredentialDomain,
  maximumRows: number,
): Statements<readonly UnenrolledCredential[]> {
  const pending: UnenrolledCredential[] = [];
  const families: readonly CredentialFamily[] = ["session", "api-key"];
  for (const family of families) {
    let after: string | null = null;
    let complete = false;
    while (!complete) {
      const rows = yield credentialPage(engine, family, after, maximumRows);
      if (rows.length > maximumRows + 1) return rejectAuthCredential();
      const page = rows.slice(0, maximumRows);
      for (const value of page) {
        const row = authCredentialRecord(value);
        const credential = adoptionCredential(engine, family, row);
        if (credential.locator === after) return rejectAuthCredential();
        after = credential.locator;
        const pair = decodeAuthCredentialPair(engine, row, domain.headSequence);
        if (pair === null && pending.length < maximumRows) pending.push(credential);
      }
      complete = rows.length <= maximumRows;
    }
  }
  if ((yield duplicateAllocations).length !== 0) return rejectAuthCredential();
  return Object.freeze(pending);
}

function* enrollCredential(
  engine: Engine,
  domain: AuthCredentialDomain,
  credential: UnenrolledCredential,
): Statements<AuthCredentialDomain> {
  const advanced = yield* advanceHead(engine, domain);
  const sequence = sequenceBind(engine, advanced.headSequence);
  let original = sql`c."api_key" = ${credential.hash}`;
  if (credential.family === "session") original = sql`CAST(c."expires" AS TEXT) = ${credential.expiresWitness}`;
  const row = singleAuthCredentialRow(
    yield sql`
    UPDATE ${credentialSource(credential.family)} AS c
    SET "auth_lifetime_sequence" = ${sequence}, "auth_write_sequence" = ${sequence}
    WHERE ${credentialLocator(credential.family)} = ${credential.locator} AND c."user_id" = ${credential.userId}
      AND ${original} AND c."auth_lifetime_sequence" IS NULL AND c."auth_write_sequence" IS NULL
      AND EXISTS (SELECT 1 FROM "user" u WHERE u."id" = c."user_id" AND u."provider" = ${credential.provider})
      AND EXISTS (SELECT 1 FROM "homarr_auth_credential_domain" d WHERE d."id" = 1
        AND d."namespace" = ${domain.namespace} AND d."phase" = 'initializing'
        AND d."head_sequence" = ${sequence})
    RETURNING CAST("auth_lifetime_sequence" AS TEXT) AS lifetime_sequence,
      CAST("auth_write_sequence" AS TEXT) AS write_sequence,
      ${storage(engine, sql`"auth_lifetime_sequence"`)} AS lifetime_storage,
      ${storage(engine, sql`"auth_write_sequence"`)} AS write_storage
  `,
  );
  const pair = decodeAuthCredentialPair(engine, row, advanced.headSequence);
  if (pair === null || pair.lifetimeSequence !== advanced.headSequence || pair.writeSequence !== advanced.headSequence)
    return rejectAuthCredential();
  return advanced;
}

export function* authCredentialAdoptionStatements(
  engine: Engine,
  namespace: string,
  maximumBatchRows: number,
): Statements<AuthCredentialAdoptionResult> {
  const maximumRows = authCredentialMaximumRows(maximumBatchRows);
  let domain = yield* requireDomain(engine, namespace, "initializing");
  const pending = yield* validateAdoption(engine, domain, maximumRows);
  if (pending.length !== 0) {
    for (const credential of pending) domain = yield* enrollCredential(engine, domain, credential);
    return Object.freeze({ ...domain, enrolledRows: pending.length });
  }
  const ready = decodeAuthCredentialDomain(
    engine,
    singleAuthCredentialRow(
      yield sql`
    UPDATE "homarr_auth_credential_domain" SET "phase" = 'ready'
    WHERE "id" = 1 AND "namespace" = ${domain.namespace} AND "phase" = 'initializing'
      AND "head_sequence" = ${sequenceBind(engine, domain.headSequence)} RETURNING ${domainFields(engine)}
  `,
    ),
  );
  if (ready.namespace !== domain.namespace || ready.headSequence !== domain.headSequence || ready.phase !== "ready")
    return rejectAuthCredential();
  return Object.freeze({ ...ready, enrolledRows: 0 });
}
