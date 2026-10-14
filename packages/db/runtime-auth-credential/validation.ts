import { getPermissionsWithChildren, groupPermissionKeys } from "@homarr/definitions";
import type { GroupPermissionKey, SupportedAuthProvider } from "@homarr/definitions";

import { AuthCredentialPreconditionError } from "./contracts";
import type {
  AuthCredentialDomain,
  NativeCredentialEvidence,
  NativeCredentialPolicy,
  NativeCredentialPolicyConfiguration,
} from "./contracts";

const maximumSequence = 9223372036854775807n;
const maximumTimestamp = 8640000000000000;

export const rejectAuthCredential = (): never => {
  throw new AuthCredentialPreconditionError();
};

export const authCredentialRecord = (value: unknown): Record<string, unknown> => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return rejectAuthCredential();
  const result: Record<string, unknown> = {};
  for (const [key, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(value))) {
    if (!("value" in descriptor)) return rejectAuthCredential();
    result[key] = descriptor.value;
  }
  return result;
};

export const singleAuthCredentialRow = (rows: readonly unknown[]): Record<string, unknown> => {
  if (rows.length !== 1) return rejectAuthCredential();
  return authCredentialRecord(rows[0]);
};

export const authCredentialText = (value: unknown, maximumLength = 512): string => {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > maximumLength ||
    !value.isWellFormed() ||
    value.includes("\u0000")
  )
    return rejectAuthCredential();
  return value;
};

export const authCredentialSequence = (value: unknown, minimum: 0n | 1n): bigint => {
  if (typeof value !== "string" || value.length > 19 || !/^(0|[1-9][0-9]*)$/.test(value)) return rejectAuthCredential();
  const sequence = BigInt(value);
  if (sequence < minimum || sequence > maximumSequence || sequence.toString() !== value) return rejectAuthCredential();
  return sequence;
};

export const nextAuthCredentialSequence = (head: string): string => {
  const sequence = authCredentialSequence(head, 0n);
  if (sequence === maximumSequence) return rejectAuthCredential();
  return (sequence + 1n).toString();
};

export const authCredentialNamespace = (value: unknown): string => {
  const namespace = authCredentialText(value, 36);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(namespace))
    return rejectAuthCredential();
  return namespace;
};

export const authCredentialProvider = (value: unknown): SupportedAuthProvider => {
  if (value !== "credentials" && value !== "ldap" && value !== "oidc") return rejectAuthCredential();
  return value;
};

export const authCredentialTimestamp = (value: unknown): number => {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || Math.abs(value) > maximumTimestamp)
    return rejectAuthCredential();
  return value;
};

export const authCredentialMaximumRows = (value: unknown): number => {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 1 || value >= Number.MAX_SAFE_INTEGER)
    return rejectAuthCredential();
  return value;
};

export const requireAuthCredentialStorage = (engine: "sqlite" | "postgresql", value: unknown): void => {
  if (engine === "sqlite" && value === "integer") return;
  if (engine === "postgresql" && value === "bigint") return;
  return rejectAuthCredential();
};

export const decodeAuthCredentialDomain = (
  engine: "sqlite" | "postgresql",
  row: Record<string, unknown>,
): AuthCredentialDomain => {
  if (row.domain_id !== "1" || (row.phase !== "initializing" && row.phase !== "ready")) return rejectAuthCredential();
  const namespace = authCredentialNamespace(row.namespace);
  requireAuthCredentialStorage(engine, row.head_storage);
  const headSequence = authCredentialSequence(row.head_sequence, 0n).toString();
  return Object.freeze({ namespace, headSequence, phase: row.phase });
};

export const decodeAuthCredentialPair = (
  engine: "sqlite" | "postgresql",
  row: Record<string, unknown>,
  head: string,
): { readonly lifetimeSequence: string; readonly writeSequence: string } | null => {
  if (row.lifetime_sequence === null && row.write_sequence === null) {
    if (engine === "sqlite" && (row.lifetime_storage !== "null" || row.write_storage !== "null"))
      return rejectAuthCredential();
    if (engine === "postgresql") {
      requireAuthCredentialStorage(engine, row.lifetime_storage);
      requireAuthCredentialStorage(engine, row.write_storage);
    }
    return null;
  }
  requireAuthCredentialStorage(engine, row.lifetime_storage);
  requireAuthCredentialStorage(engine, row.write_storage);
  const lifetime = authCredentialSequence(row.lifetime_sequence, 1n);
  const write = authCredentialSequence(row.write_sequence, 1n);
  if (lifetime > write || write > authCredentialSequence(head, 0n)) return rejectAuthCredential();
  return Object.freeze({ lifetimeSequence: lifetime.toString(), writeSequence: write.toString() });
};

export const captureNativeCredentialEvidence = (input: NativeCredentialEvidence): NativeCredentialEvidence => {
  const value = authCredentialRecord(input);
  const binding = {
    namespace: authCredentialNamespace(value.namespace),
    lifetimeSequence: authCredentialSequence(value.lifetimeSequence, 1n).toString(),
    writeSequence: authCredentialSequence(value.writeSequence, 1n).toString(),
    userId: authCredentialText(value.userId, 64),
    provider: authCredentialProvider(value.provider),
  };
  if (authCredentialSequence(binding.lifetimeSequence, 1n) > authCredentialSequence(binding.writeSequence, 1n))
    return rejectAuthCredential();
  if (value.type === "opaque-session") {
    const expiresAt = authCredentialTimestamp(value.expiresAt);
    const hostDeadlineAt = authCredentialTimestamp(value.hostDeadlineAt);
    if (hostDeadlineAt > expiresAt) return rejectAuthCredential();
    return Object.freeze({
      ...binding,
      type: "opaque-session",
      token: authCredentialText(value.token),
      expiresAt,
      hostDeadlineAt,
    });
  }
  if (value.type !== "api-key") return rejectAuthCredential();
  return Object.freeze({
    ...binding,
    type: "api-key",
    id: authCredentialText(value.id, 64),
    hash: authCredentialText(value.hash),
  });
};

export const captureNativeCredentialPolicyConfiguration = (
  input: NativeCredentialPolicyConfiguration,
): NativeCredentialPolicyConfiguration => {
  const value = authCredentialRecord(input);
  const maximumSnapshotRows = authCredentialMaximumRows(value.maximumSnapshotRows);
  const skew = value.maximumAbsoluteClockSkewMs;
  const clock = value.now;
  if (typeof skew !== "number" || !Number.isSafeInteger(skew) || skew < 0 || typeof clock !== "function")
    return rejectAuthCredential();
  return Object.freeze({
    maximumSnapshotRows,
    maximumAbsoluteClockSkewMs: skew,
    now: () => {
      const observed: unknown = clock();
      const time = authCredentialTimestamp(observed);
      if (time < 0) return rejectAuthCredential();
      return time;
    },
  });
};

export const requireAuthCredentialClock = (
  observed: unknown,
  configuration: NativeCredentialPolicyConfiguration,
): number => {
  const time = authCredentialTimestamp(observed);
  const configured = configuration.now();
  const wall = authCredentialTimestamp(Date.now());
  if (
    time < 0 ||
    Math.abs(time - wall) > configuration.maximumAbsoluteClockSkewMs ||
    Math.abs(time - configured) > configuration.maximumAbsoluteClockSkewMs ||
    Math.abs(configured - wall) > configuration.maximumAbsoluteClockSkewMs
  )
    return rejectAuthCredential();
  return time;
};

export const decodeNativeCredentialPolicy = (
  engine: "sqlite" | "postgresql",
  rows: readonly unknown[],
  credential: NativeCredentialEvidence,
  configuration: NativeCredentialPolicyConfiguration,
): NativeCredentialPolicy => {
  if (rows.length === 0 || rows.length > configuration.maximumSnapshotRows) return rejectAuthCredential();
  const first = authCredentialRecord(rows[0]);
  const domain = decodeAuthCredentialDomain(engine, first);
  if (domain.phase !== "ready" || domain.namespace !== credential.namespace || first.domain_count !== "1")
    return rejectAuthCredential();
  const pair = decodeAuthCredentialPair(engine, first, domain.headSequence);
  if (
    pair === null ||
    pair.lifetimeSequence !== credential.lifetimeSequence ||
    pair.writeSequence !== credential.writeSequence
  )
    return rejectAuthCredential();
  if (
    first.user_id !== credential.userId ||
    first.stored_user_id !== credential.userId ||
    first.provider !== credential.provider
  )
    return rejectAuthCredential();
  if (credential.type === "api-key") {
    if (
      first.locator !== credential.id ||
      first.credential_hash !== credential.hash ||
      first.expires_at !== null ||
      first.expiry_matches !== null ||
      first.expiry_storage !== null
    )
      return rejectAuthCredential();
  } else {
    if (
      first.locator !== credential.token ||
      first.credential_hash !== null ||
      first.expires_at !== credential.expiresAt ||
      (first.expiry_matches !== true && first.expiry_matches !== 1) ||
      credential.hostDeadlineAt > credential.expiresAt - configuration.maximumAbsoluteClockSkewMs
    )
      return rejectAuthCredential();
    if (engine === "sqlite" && first.expiry_storage !== "integer") return rejectAuthCredential();
  }
  const observed = requireAuthCredentialClock(first.observed_now, configuration);
  const groupIds = new Set<string>();
  const permissions = new Set<GroupPermissionKey>();
  const invariantFields = [
    "domain_id",
    "namespace",
    "phase",
    "head_sequence",
    "head_storage",
    "domain_count",
    "lifetime_sequence",
    "write_sequence",
    "lifetime_storage",
    "write_storage",
    "user_id",
    "stored_user_id",
    "provider",
    "locator",
    "credential_hash",
    "expires_at",
    "expiry_matches",
    "expiry_storage",
    "observed_now",
  ];
  for (const value of rows) {
    const row = authCredentialRecord(value);
    if (invariantFields.some((field) => row[field] !== first[field])) return rejectAuthCredential();
    if (row.group_id === null) {
      if (
        rows.length !== 1 ||
        row.group_parent_id !== null ||
        row.permission_group_id !== null ||
        row.permission !== null
      )
        return rejectAuthCredential();
      continue;
    }
    const groupId = authCredentialText(row.group_id, 64);
    if (row.group_parent_id !== groupId) return rejectAuthCredential();
    groupIds.add(groupId);
    if (row.permission === null) {
      if (row.permission_group_id !== null) return rejectAuthCredential();
      continue;
    }
    if (row.permission_group_id !== groupId) return rejectAuthCredential();
    const permission = groupPermissionKeys.find((key) => key === row.permission);
    if (permission === undefined) return rejectAuthCredential();
    permissions.add(permission);
  }
  requireAuthCredentialClock(observed, configuration);
  if (credential.type === "opaque-session") {
    if (
      credential.expiresAt <= observed ||
      credential.hostDeadlineAt <= Date.now() ||
      credential.hostDeadlineAt <= configuration.now()
    )
      return rejectAuthCredential();
  }
  return Object.freeze({
    userId: credential.userId,
    groupIds: Object.freeze([...groupIds].sort()),
    permissions: Object.freeze(getPermissionsWithChildren([...permissions]).sort()),
  });
};
