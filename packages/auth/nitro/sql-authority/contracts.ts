import type { PersistenceRuntime } from "@homarr/db/runtime";
import type { NativeCredentialEvidence } from "@homarr/db/runtime-auth-credential";
import type { AuthSessionWitness, AuthUserWitness } from "@homarr/db/runtime-auth-session";
import type { GroupPermissionKey } from "@homarr/definitions";

import type { PolicyIdentity } from "../policy/identity";

export type SqlAuthorityRuntime = Pick<
  PersistenceRuntime,
  "engine" | "boundedTransactionSync" | "boundedTransactionAsync"
>;

export interface SqlAuthorityOperation {
  readonly signal: AbortSignal;
  readonly deadlineAt: number;
}

export interface SqlAuthorityConfiguration {
  readonly runtime: SqlAuthorityRuntime;
  readonly lifetime: AbortSignal;
  readonly credentialSqlLogging: "disabled-by-resource-owner";
  readonly maximumSnapshotRows: number;
  readonly maximumAbsoluteClockSkewMs: number;
  readonly now: () => number;
  readonly opaqueSessions:
    | { readonly type: "disabled" }
    | {
        readonly type: "approved-stored-expiry-reader";
        readonly maximumAbsoluteClockSkewMs: number;
      };
  readonly apiKeys: { readonly type: "disabled" } | { readonly type: "approved-stored-bcrypt-reader" };
}

export type AuthenticatedPolicyIdentity = Extract<PolicyIdentity, { readonly type: "authenticated" }>;

export interface SqlAuthorityReadLease {
  readonly identity: AuthenticatedPolicyIdentity;
  readonly credentialType: "opaque-session" | "api-key";
  readonly validity:
    | { readonly type: "stored-session-expiry"; readonly expiresAt: number; readonly hostDeadlineAt: number }
    | { readonly type: "no-stored-api-key-expiry" };
  readonly lifetime: AbortSignal;
  assertCurrentAsync(operation: SqlAuthorityOperation): Promise<void>;
  releaseAsync(): Promise<void>;
}

export type SqlAuthorityAdmission =
  | { readonly type: "anonymous" }
  | { readonly type: "authenticated-read-snapshot"; readonly lease: SqlAuthorityReadLease };

export interface OwnedIssuerSessionRecord {
  readonly user: AuthUserWitness & { readonly colorScheme: "dark" | "light" | "auto" };
  readonly session: AuthSessionWitness;
  readonly locator: Extract<NativeCredentialEvidence, { type: "opaque-session" }>;
  readonly groupIds: readonly string[];
  readonly permissions: readonly GroupPermissionKey[];
}

export type OwnedSessionObservation =
  | { readonly type: "absent" }
  | { readonly type: "active"; readonly lease: SqlAuthorityReadLease; readonly record: OwnedIssuerSessionRecord }
  | { readonly type: "expired"; readonly record: OwnedIssuerSessionRecord }
  | { readonly type: "expiry-margin" };

export interface OwnedSessionDisposition {
  readonly kind: "expire";
  readonly publication: "held";
  readonly state:
    | "confirmed-commit"
    | "confirmed-commit-settlement-failed"
    | "commit-ambiguous"
    | "failed-without-confirmed-commit"
    | "held-without-dispatch";
}

export type SqlAuthorityFailureCode =
  | "INVALID_CONFIGURATION"
  | "INVALID_OPERATION"
  | "READER_DISABLED"
  | "AUTHORITY_UNAVAILABLE"
  | "AUTHORITY_NOT_CURRENT"
  | "AUTHORITY_RELEASED"
  | "AUTHORITY_CLOSED"
  | "REVOCATION_COMMIT_AMBIGUOUS"
  | "COMMIT_AUTHORITY_JOIN_REQUIRED";

export class SqlAuthorityError extends Error {
  constructor(readonly code: SqlAuthorityFailureCode) {
    super("SQL authority operation rejected");
    this.name = "SqlAuthorityError";
  }
}

export interface SqlAuthorityCommitHold {
  readonly type: "unsupported";
  readonly reason: "all-enabled-authority-writer-protocol-not-joined";
  readonly requiredJoin: "same-native-transaction-credential-principal-grant-locks-and-validity-through-G3-dispatch";
}

export interface SqlAuthorityReader {
  admitOpaqueSessionAsync(
    token: string | null | undefined,
    operation: SqlAuthorityOperation,
  ): Promise<SqlAuthorityAdmission>;
  admitApiKeyAsync(header: string | null | undefined, operation: SqlAuthorityOperation): Promise<SqlAuthorityAdmission>;
  revokeCredentialAsync(
    lease: SqlAuthorityReadLease,
    operation: SqlAuthorityOperation,
  ): Promise<{ readonly type: "revoked" | "not-current" }>;
  requireCommitAuthority(): never;
  readonly commitAuthority: SqlAuthorityCommitHold;
  closeAsync(): Promise<void>;
}
