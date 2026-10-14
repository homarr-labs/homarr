import type { SQL } from "drizzle-orm";

import type { GroupPermissionKey, SupportedAuthProvider } from "@homarr/definitions";

import type { HomarrDatabase, HomarrDatabasePostgresql } from "../driver";

export interface AuthCredentialDomain {
  readonly namespace: string;
  readonly headSequence: string;
  readonly phase: "initializing" | "ready";
}

interface NativeCredentialBinding {
  readonly namespace: string;
  readonly lifetimeSequence: string;
  readonly writeSequence: string;
  readonly userId: string;
  readonly provider: SupportedAuthProvider;
}

export type NativeCredentialEvidence = NativeCredentialBinding &
  (
    | {
        readonly type: "opaque-session";
        readonly token: string;
        readonly expiresAt: number;
        readonly hostDeadlineAt: number;
      }
    | {
        readonly type: "api-key";
        readonly id: string;
        readonly hash: string;
      }
  );

export interface NativeCredentialPolicyConfiguration {
  readonly maximumSnapshotRows: number;
  readonly maximumAbsoluteClockSkewMs: number;
  readonly now: () => number;
}

export interface NativeCredentialPolicy {
  readonly userId: string;
  readonly groupIds: readonly string[];
  readonly permissions: readonly GroupPermissionKey[];
}

export type NativeCredentialPolicyStatements = (
  engine: "sqlite" | "postgresql",
  credential: NativeCredentialEvidence,
  configuration: NativeCredentialPolicyConfiguration,
) => Generator<SQL, NativeCredentialPolicy, readonly unknown[]>;

export type ReadNativeCredentialPolicySync = (
  database: HomarrDatabase,
  credential: NativeCredentialEvidence,
  configuration: NativeCredentialPolicyConfiguration,
) => NativeCredentialPolicy;

export type ReadNativeCredentialPolicyAsync = (
  database: HomarrDatabasePostgresql,
  credential: NativeCredentialEvidence,
  configuration: NativeCredentialPolicyConfiguration,
) => Promise<NativeCredentialPolicy>;

export interface AuthCredentialAdoptionResult extends AuthCredentialDomain {
  readonly enrolledRows: number;
}

export class AuthCredentialPreconditionError extends Error {
  readonly code = "AUTH_CREDENTIAL_PRECONDITION";

  constructor() {
    super("Auth credential precondition failed");
    this.name = "AuthCredentialPreconditionError";
  }
}
