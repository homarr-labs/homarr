import { sql } from "@homarr/db";
import type { NativeCredentialEvidence } from "@homarr/db/runtime-auth-credential";
import { getPermissionsWithChildren, groupPermissionKeys } from "@homarr/definitions";
import type { GroupPermissionKey, SupportedAuthProvider } from "@homarr/definitions";

import type { AuthenticatedPolicyIdentity, OwnedIssuerSessionRecord, SqlAuthorityConfiguration } from "./contracts";
import { SqlAuthorityError } from "./contracts";

export type CredentialSelector =
  | { readonly type: "opaque-session"; readonly token: string }
  | { readonly type: "api-key"; readonly id: string };

export type CredentialWitness = NativeCredentialEvidence;

export interface CredentialSnapshot {
  readonly identity: AuthenticatedPolicyIdentity;
  readonly witness: CredentialWitness;
  readonly storedExpiry: string | null;
}

export type IssuerSessionSelector =
  | Extract<CredentialSelector, { type: "opaque-session" }>
  | { readonly type: "no-session-cookie" };

interface DecodedCredentialRecord {
  readonly witness: CredentialWitness;
  readonly storedExpiry: string | null;
  readonly groupIds: readonly string[];
  readonly permissions: readonly GroupPermissionKey[];
}

type DecodedSnapshot =
  | { readonly type: "absent"; readonly namespace: string; readonly headSequence: string }
  | {
      readonly type: "active" | "expired" | "expiry-margin";
      readonly namespace: string;
      readonly headSequence: string;
      readonly record: DecodedCredentialRecord;
    };

export type IssuerSessionSnapshot =
  | { readonly type: "absent"; readonly namespace: string; readonly headSequence: string }
  | {
      readonly type: "active" | "expired" | "expiry-margin";
      readonly namespace: string;
      readonly headSequence: string;
      readonly storedExpiry: string;
      readonly record: OwnedIssuerSessionRecord;
    };

function unavailable(): never {
  throw new SqlAuthorityError("AUTHORITY_UNAVAILABLE");
}

function requiredString(value: unknown): string {
  if (typeof value !== "string" || value.length === 0 || !value.isWellFormed() || value.includes("\u0000"))
    return unavailable();
  return value;
}

function requiredNumber(value: unknown): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || Math.abs(value) > 8_640_000_000_000_000) {
    return unavailable();
  }
  return value;
}

function rowRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return unavailable();
  const row: Record<string, unknown> = {};
  for (const [key, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(value))) {
    if (!("value" in descriptor)) return unavailable();
    row[key] = descriptor.value;
  }
  return row;
}

function sequence(value: unknown, minimum: 0n | 1n): bigint {
  if (typeof value !== "string" || value.length > 19 || !/^(0|[1-9][0-9]*)$/.test(value)) return unavailable();
  const parsed = BigInt(value);
  if (parsed < minimum || parsed > 9_223_372_036_854_775_807n || parsed.toString() !== value) return unavailable();
  return parsed;
}

function provider(value: unknown): SupportedAuthProvider {
  if (value !== "credentials" && value !== "ldap" && value !== "oidc") return unavailable();
  return value;
}

function checkClock(observed: number, configuration: SqlAuthorityConfiguration): void {
  const configured = requiredNumber(configuration.now());
  const wall = requiredNumber(Date.now());
  const skew = configuration.maximumAbsoluteClockSkewMs;
  if (
    observed < 0 ||
    configured < 0 ||
    Math.abs(observed - configured) > skew ||
    Math.abs(observed - wall) > skew ||
    Math.abs(configured - wall) > skew
  )
    return unavailable();
}

export function credentialSnapshotStatement(
  engine: "sqlite" | "postgresql",
  selector: CredentialSelector | IssuerSessionSelector,
  maximumRows: number,
) {
  const clock =
    engine === "sqlite"
      ? sql`CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER)`
      : sql`CAST(FLOOR(EXTRACT(EPOCH FROM clock_timestamp()) * 1000) AS DOUBLE PRECISION)`;
  const expiry =
    selector.type === "api-key"
      ? sql`NULL`
      : engine === "sqlite"
        ? sql`c."expires"`
        : sql`CAST(EXTRACT(EPOCH FROM c."expires") * 1000 AS DOUBLE PRECISION)`;
  const source = selector.type === "api-key" ? sql`"apiKey"` : sql`"session"`;
  let locator = sql`FALSE`;
  if (selector.type === "opaque-session") locator = sql`c."session_token" = ${selector.token}`;
  if (selector.type === "api-key") locator = sql`c."id" = ${selector.id}`;
  const hash = selector.type === "api-key" ? sql`c."api_key"` : sql`NULL`;
  let credentialLocator = sql`c."id"`;
  if (selector.type !== "api-key") credentialLocator = sql`c."session_token"`;
  const storage = (column: ReturnType<typeof sql>) => {
    if (engine === "sqlite") return sql`typeof(${column})`;
    return sql`CAST(pg_typeof(${column}) AS TEXT)`;
  };
  let expiryStorage = sql`NULL`;
  let storedExpiry = sql`NULL`;
  let expiryMillisecondsText = sql`NULL`;
  let expiryMatches = sql`NULL`;
  if (selector.type !== "api-key") {
    expiryStorage = storage(sql`c."expires"`);
    storedExpiry = sql`CAST(c."expires" AS TEXT)`;
    expiryMillisecondsText = sql`CAST(c."expires" AS TEXT)`;
    expiryMatches = sql`c."expires" IS NOT NULL`;
    if (engine === "postgresql") {
      expiryMatches = sql`c."expires" IS NOT NULL AND c."expires" IS NOT DISTINCT FROM date_trunc('milliseconds', c."expires")`;
      expiryMillisecondsText = sql`CAST(TRUNC(EXTRACT(EPOCH FROM c."expires") * 1000) AS TEXT)`;
    }
  }
  let emailVerified = sql`u."email_verified"`;
  if (engine === "postgresql")
    emailVerified = sql`CAST(EXTRACT(EPOCH FROM u."email_verified") * 1000 AS DOUBLE PRECISION)`;
  return sql`
    WITH observed_clock AS MATERIALIZED (SELECT ${clock} AS observed_now),
         domain_count AS (SELECT CAST(COUNT(*) AS TEXT) AS domain_count FROM "homarr_auth_credential_domain")
    SELECT CAST(d."id" AS TEXT) AS domain_id, d."namespace", d."phase",
           CAST(d."head_sequence" AS TEXT) AS head_sequence, ${storage(sql`d."head_sequence"`)} AS head_storage,
           domain_count.domain_count,
           CAST(c."auth_lifetime_sequence" AS TEXT) AS lifetime_sequence,
           CAST(c."auth_write_sequence" AS TEXT) AS write_sequence,
           ${storage(sql`c."auth_lifetime_sequence"`)} AS lifetime_storage,
           ${storage(sql`c."auth_write_sequence"`)} AS write_storage,
           ${credentialLocator} AS locator, c."user_id" AS stored_user_id,
            u."id" AS user_id, u."provider" AS provider,
            u."name" AS issuer_user_name, u."email" AS issuer_user_email,
            ${emailVerified} AS issuer_user_email_verified, u."image" AS issuer_user_image,
            u."password" AS issuer_user_password, u."color_scheme" AS issuer_user_color_scheme,
           ${expiry} AS expires_at, ${hash} AS credential_hash,
           ${storedExpiry} AS stored_expiry, ${expiryStorage} AS expiry_storage, ${expiryMatches} AS expiry_matches,
           ${expiryMillisecondsText} AS expiry_milliseconds_text,
           gm."group_id" AS group_id, g."id" AS group_parent_id,
           gp."group_id" AS permission_group_id, gp."permission" AS permission,
           observed_clock.observed_now AS observed_now
    FROM domain_count
    CROSS JOIN observed_clock
    LEFT JOIN "homarr_auth_credential_domain" d ON d."id" = 1
    LEFT JOIN ${source} c ON ${locator}
    LEFT JOIN "user" u ON u."id" = c."user_id"
    LEFT JOIN "groupMember" gm ON gm."user_id" = u."id"
    LEFT JOIN "group" g ON g."id" = gm."group_id"
    LEFT JOIN "groupPermission" gp ON gp."group_id" = gm."group_id"
    ORDER BY gm."group_id", gp."permission"
    LIMIT ${maximumRows + 1}
  `;
}

function decodeSnapshot(
  values: readonly unknown[],
  selector: CredentialSelector | IssuerSessionSelector,
  configuration: SqlAuthorityConfiguration,
): DecodedSnapshot {
  if (values.length > configuration.maximumSnapshotRows) return unavailable();
  const firstValue = values[0];
  if (firstValue === undefined) return unavailable();
  const first = rowRecord(firstValue);
  if (first.domain_count !== "1" || first.domain_id !== "1" || first.phase !== "ready") return unavailable();
  const namespace = requiredString(first.namespace);
  if (
    namespace.length !== 36 ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(namespace)
  )
    return unavailable();
  let expectedStorage = "integer";
  if (configuration.runtime.engine === "postgresql") expectedStorage = "bigint";
  if (first.head_storage !== expectedStorage) return unavailable();
  const head = sequence(first.head_sequence, 0n);
  const observedNow = requiredNumber(first.observed_now);
  checkClock(observedNow, configuration);
  if (first.locator === null) {
    if (values.length !== 1 || first.stored_user_id !== null || first.user_id !== null) return unavailable();
    return Object.freeze({ type: "absent", namespace, headSequence: head.toString() });
  }
  if (selector.type === "no-session-cookie") return unavailable();
  if (first.lifetime_storage !== expectedStorage || first.write_storage !== expectedStorage) return unavailable();
  const lifetime = sequence(first.lifetime_sequence, 1n);
  const write = sequence(first.write_sequence, 1n);
  if (lifetime > write || write > head) return unavailable();
  const userId = requiredString(first.user_id);
  const userProvider = provider(first.provider);
  if (userId !== first.stored_user_id || userId.length > 64) return unavailable();
  const binding = {
    namespace,
    lifetimeSequence: lifetime.toString(),
    writeSequence: write.toString(),
    userId,
    provider: userProvider,
  };
  let witness: CredentialWitness;
  let storedExpiry: string | null = null;
  let expired = false;
  if (selector.type === "opaque-session") {
    if (configuration.opaqueSessions.type === "disabled") throw new SqlAuthorityError("READER_DISABLED");
    if (
      first.locator !== selector.token ||
      selector.token.length > 512 ||
      first.credential_hash !== null ||
      (first.expiry_matches !== true && first.expiry_matches !== 1)
    )
      return unavailable();
    if (configuration.runtime.engine === "sqlite" && first.expiry_storage !== "integer") return unavailable();
    if (configuration.runtime.engine === "postgresql" && first.expiry_storage !== "timestamp without time zone")
      return unavailable();
    const expiresAt = requiredNumber(first.expires_at);
    const skew = configuration.maximumAbsoluteClockSkewMs;
    const hostDeadlineAt = expiresAt - skew;
    requiredNumber(hostDeadlineAt);
    storedExpiry = requiredString(first.stored_expiry);
    if (first.expiry_milliseconds_text !== String(expiresAt)) return unavailable();
    expired = expiresAt <= observedNow || hostDeadlineAt <= Date.now() || hostDeadlineAt <= configuration.now();
    witness = Object.freeze({
      ...binding,
      type: "opaque-session",
      token: requiredString(first.locator),
      expiresAt,
      hostDeadlineAt,
    });
  } else {
    if (
      first.locator !== selector.id ||
      selector.id.length > 64 ||
      first.expires_at !== null ||
      first.stored_expiry !== null ||
      first.expiry_storage !== null ||
      first.expiry_matches !== null ||
      first.expiry_milliseconds_text !== null
    )
      return unavailable();
    const hash = requiredString(first.credential_hash);
    if (hash.length > 512) return unavailable();
    witness = Object.freeze({ ...binding, type: "api-key", id: requiredString(first.locator), hash });
  }
  const groupIds = new Set<string>();
  const permissions = new Set<GroupPermissionKey>();
  for (const value of values) {
    const row = rowRecord(value);
    for (const key of [
      "domain_count",
      "domain_id",
      "namespace",
      "phase",
      "head_sequence",
      "head_storage",
      "lifetime_sequence",
      "write_sequence",
      "lifetime_storage",
      "write_storage",
      "locator",
      "stored_user_id",
      "user_id",
      "provider",
      "observed_now",
      "expires_at",
      "credential_hash",
      "stored_expiry",
      "expiry_storage",
      "expiry_matches",
      "expiry_milliseconds_text",
    ])
      if (row[key] !== first[key]) return unavailable();
    if (row.group_id !== null) {
      if (row.group_parent_id !== row.group_id) return unavailable();
      const groupId = requiredString(row.group_id);
      if (groupId.length > 64) return unavailable();
      groupIds.add(groupId);
    } else if (
      values.length !== 1 ||
      row.group_parent_id !== null ||
      row.permission_group_id !== null ||
      row.permission !== null
    )
      return unavailable();
    if (row.permission !== null) {
      if (row.group_id === null || row.permission_group_id !== row.group_id) return unavailable();
      const permission = groupPermissionKeys.find((key) => key === row.permission);
      if (permission === undefined) return unavailable();
      permissions.add(permission);
    } else if (row.permission_group_id !== null) return unavailable();
  }
  const record: DecodedCredentialRecord = Object.freeze({
    witness,
    storedExpiry,
    groupIds: Object.freeze([...groupIds].sort()),
    permissions: Object.freeze(getPermissionsWithChildren([...permissions]).sort()),
  });
  checkClock(observedNow, configuration);
  if (
    witness.type === "opaque-session" &&
    (Date.now() >= witness.hostDeadlineAt || configuration.now() >= witness.hostDeadlineAt)
  )
    expired = true;
  let type: "active" | "expired" | "expiry-margin" = "active";
  if (expired) type = "expiry-margin";
  if (
    witness.type === "opaque-session" &&
    witness.expiresAt < observedNow &&
    witness.expiresAt < Date.now() &&
    witness.expiresAt < configuration.now()
  )
    type = "expired";
  return Object.freeze({ type, namespace, headSequence: head.toString(), record });
}

export function decodeCredentialSnapshot(
  values: readonly unknown[],
  selector: CredentialSelector,
  configuration: SqlAuthorityConfiguration,
): CredentialSnapshot | null {
  const decoded = decodeSnapshot(values, selector, configuration);
  if (decoded.type !== "active") return null;
  const { witness, storedExpiry, groupIds, permissions } = decoded.record;
  const identity: AuthenticatedPolicyIdentity = Object.freeze({
    type: "authenticated",
    userId: witness.userId,
    groupIds,
    permissions,
  });
  return Object.freeze({ identity, witness, storedExpiry });
}

export function decodeIssuerSessionSnapshot(
  values: readonly unknown[],
  selector: IssuerSessionSelector,
  configuration: SqlAuthorityConfiguration,
): IssuerSessionSnapshot {
  const decoded = decodeSnapshot(values, selector, configuration);
  if (decoded.type === "absent") {
    const row = rowRecord(values[0]);
    for (const key of [
      "lifetime_sequence",
      "write_sequence",
      "expires_at",
      "stored_expiry",
      "credential_hash",
      "issuer_user_name",
      "issuer_user_email",
      "issuer_user_email_verified",
      "issuer_user_image",
      "issuer_user_password",
      "issuer_user_color_scheme",
      "group_id",
      "group_parent_id",
      "permission_group_id",
      "permission",
    ])
      if (row[key] !== null) return unavailable();
    return decoded;
  }
  const { witness, storedExpiry } = decoded.record;
  if (witness.type !== "opaque-session" || storedExpiry === null) return unavailable();
  const first = rowRecord(values[0]);
  const profile = {
    name: first.issuer_user_name,
    email: first.issuer_user_email,
    image: first.issuer_user_image,
    password: first.issuer_user_password,
  };
  const { name, email, image, password } = profile;
  if (
    (name !== null && typeof name !== "string") ||
    (email !== null && typeof email !== "string") ||
    (image !== null && typeof image !== "string") ||
    (password !== null && typeof password !== "string")
  )
    return unavailable();
  const verified = first.issuer_user_email_verified;
  let emailVerified: Date | null = null;
  if (verified !== null) emailVerified = new Date(requiredNumber(verified));
  const colorScheme = first.issuer_user_color_scheme;
  if (colorScheme !== "dark" && colorScheme !== "light" && colorScheme !== "auto") return unavailable();
  for (const value of values) {
    const row = rowRecord(value);
    for (const key of [
      "issuer_user_name",
      "issuer_user_email",
      "issuer_user_email_verified",
      "issuer_user_image",
      "issuer_user_password",
      "issuer_user_color_scheme",
    ])
      if (row[key] !== first[key]) return unavailable();
  }
  const record: OwnedIssuerSessionRecord = Object.freeze({
    user: Object.freeze({
      id: witness.userId,
      provider: witness.provider,
      name,
      email,
      emailVerified,
      image,
      password,
      colorScheme,
    }),
    session: Object.freeze({
      sessionToken: witness.token,
      userId: witness.userId,
      expires: new Date(witness.expiresAt),
    }),
    locator: witness,
    groupIds: decoded.record.groupIds,
    permissions: decoded.record.permissions,
  });
  return Object.freeze({
    type: decoded.type,
    namespace: decoded.namespace,
    headSequence: decoded.headSequence,
    storedExpiry,
    record,
  });
}

export function sameCredentialWitness(left: CredentialWitness, right: CredentialWitness): boolean {
  if (
    left.userId !== right.userId ||
    left.provider !== right.provider ||
    left.namespace !== right.namespace ||
    left.lifetimeSequence !== right.lifetimeSequence ||
    left.writeSequence !== right.writeSequence
  )
    return false;
  if (left.type === "opaque-session" && right.type === "opaque-session") {
    return (
      left.token === right.token && left.expiresAt === right.expiresAt && left.hostDeadlineAt === right.hostDeadlineAt
    );
  }
  return left.type === "api-key" && right.type === "api-key" && left.id === right.id && left.hash === right.hash;
}

export function sameIdentity(left: AuthenticatedPolicyIdentity, right: AuthenticatedPolicyIdentity): boolean {
  return (
    left.userId === right.userId &&
    left.groupIds.length === right.groupIds.length &&
    left.groupIds.every((id, index) => id === right.groupIds[index]) &&
    left.permissions.length === right.permissions.length &&
    left.permissions.every((permission, index) => permission === right.permissions[index])
  );
}
