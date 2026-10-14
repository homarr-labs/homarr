import type { SupportedAuthProvider } from "@homarr/definitions";

import type { BoundedTransactionOperation } from "../transaction-gate";
import type { NativeCredentialEvidence } from "../runtime-auth-credential/contracts";
import { captureNativeCredentialEvidence } from "../runtime-auth-credential/validation";

export type AuthSessionCredential = Extract<NativeCredentialEvidence, { type: "opaque-session" }>;

export interface AuthUserWitness {
  readonly id: string;
  readonly name: string | null;
  readonly email: string | null;
  readonly emailVerified: Date | null;
  readonly image: string | null;
  readonly password: string | null;
  readonly provider: SupportedAuthProvider;
}

export interface AuthAccountWitness {
  readonly userId: string;
  readonly type: "oidc" | "oauth" | "email" | "webauthn";
  readonly provider: string;
  readonly providerAccountId: string;
  readonly refresh_token: string | null;
  readonly access_token: string | null;
  readonly expires_at: number | null;
  readonly token_type: string | null;
  readonly scope: string | null;
  readonly id_token: string | null;
  readonly session_state: string | null;
}

export interface AuthSessionWitness {
  readonly sessionToken: string;
  readonly userId: string;
  readonly expires: Date;
}

export interface AuthIdentitySelection {
  readonly field: "name" | "email";
  readonly value: string;
  readonly provider: SupportedAuthProvider;
  readonly selectedUserId: string | null;
}

export type AuthLoginIdentity =
  | {
      readonly kind: "existing";
      readonly witness: AuthUserWitness;
      readonly selections: readonly AuthIdentitySelection[];
    }
  | {
      readonly kind: "create";
      readonly user: Omit<AuthUserWitness, "password" | "provider"> & { readonly provider: "ldap" | "oidc" };
      readonly selections: readonly AuthIdentitySelection[];
    };

export interface AuthLoginEffects {
  readonly name: string | null;
  readonly email?: string | null;
  readonly emailVerified?: Date | null;
  readonly image?: string;
  readonly externalGroupNames?: readonly string[];
}

export type AuthSessionMutation =
  | {
      readonly kind: "establish";
      readonly identity: AuthLoginIdentity;
      readonly account:
        | { readonly kind: "none" }
        | { readonly kind: "existing"; readonly witness: AuthAccountWitness }
        | { readonly kind: "link"; readonly account: AuthAccountWitness };
      readonly session:
        | { readonly kind: "create"; readonly session: AuthSessionWitness }
        | {
            readonly kind: "existing";
            readonly witness: AuthSessionWitness;
            readonly credential: AuthSessionCredential;
          };
      readonly effects: AuthLoginEffects;
    }
  | {
      readonly kind: "renew";
      readonly user: AuthUserWitness;
      readonly account?: AuthAccountWitness;
      readonly session: AuthSessionWitness;
      readonly credential: AuthSessionCredential;
      readonly expires: Date;
    }
  | {
      readonly kind: "revoke";
      readonly user: AuthUserWitness;
      readonly account?: AuthAccountWitness;
      readonly session: AuthSessionWitness;
      readonly credential: AuthSessionCredential;
    }
  | {
      readonly kind: "expire";
      readonly user: AuthUserWitness;
      readonly account?: AuthAccountWitness;
      readonly session: AuthSessionWitness;
      readonly credential: AuthSessionCredential;
    };

export interface AuthSessionSqlConfiguration {
  readonly lifetime: AbortSignal;
  readonly maximumSnapshotRows: number;
  readonly sessionMaxAgeMs: number;
  readonly maximumAbsoluteClockSkewMs: number;
  readonly now: () => number;
}

export interface PreparedAuthSessionMutation {
  readonly mutation: AuthSessionMutation;
  readonly maximumSnapshotRows: number;
  readonly admittedAt: number;
  readonly maximumExpiresAt: number;
  readonly maximumAbsoluteClockSkewMs: number;
  readonly wallTimeAtAdmission: number;
  readonly now: () => number;
}

interface AuthSessionSqlRecord {
  readonly user: {
    readonly id: string;
    readonly name: string | null;
    readonly email: string | null;
    readonly emailVerified: Date | null;
    readonly image: string | null;
    readonly provider: SupportedAuthProvider;
    readonly colorScheme: "dark" | "light" | "auto";
  };
  readonly session: AuthSessionWitness;
  readonly groupIds: readonly string[];
  readonly permissions: readonly { readonly groupId: string; readonly permission: string }[];
}

export type AuthSessionSqlResult = AuthSessionSqlRecord &
  (
    | { readonly kind: "established" | "renewed"; readonly credential: AuthSessionCredential }
    | { readonly kind: "revoked"; readonly credential: null }
  );

export class AuthSessionSqlPreconditionError extends Error {
  readonly code = "AUTH_SESSION_SQL_PRECONDITION";

  constructor() {
    super("Auth session SQL precondition failed");
    this.name = "AuthSessionSqlPreconditionError";
  }
}

const requireFiniteDate = (value: Date | null) => {
  if (value !== null && (!(value instanceof Date) || !Number.isSafeInteger(value.getTime())))
    throw new AuthSessionSqlPreconditionError();
};

const requireString = (value: string, maximum = 64) => {
  if (typeof value !== "string" || value.length === 0 || value.length > maximum)
    throw new AuthSessionSqlPreconditionError();
};

const requireNullableString = (value: string | null) => {
  if (value !== null && typeof value !== "string") throw new AuthSessionSqlPreconditionError();
};

const requireUser = (user: AuthUserWitness) => {
  requireString(user.id);
  if (!["credentials", "ldap", "oidc"].includes(user.provider)) throw new AuthSessionSqlPreconditionError();
  for (const value of [user.name, user.email, user.image, user.password]) requireNullableString(value);
  requireFiniteDate(user.emailVerified);
};

const requireAccount = (account: AuthAccountWitness, userId: string) => {
  requireString(account.userId);
  requireString(account.provider);
  requireString(account.providerAccountId);
  if (account.userId !== userId || !["oidc", "oauth", "email", "webauthn"].includes(account.type))
    throw new AuthSessionSqlPreconditionError();
  for (const value of [
    account.refresh_token,
    account.access_token,
    account.token_type,
    account.scope,
    account.id_token,
    account.session_state,
  ])
    requireNullableString(value);
  if (account.expires_at !== null && !Number.isSafeInteger(account.expires_at))
    throw new AuthSessionSqlPreconditionError();
};

const requireSession = (session: AuthSessionWitness, userId: string) => {
  requireString(session.sessionToken, 512);
  requireFiniteDate(session.expires);
  if (session.expires === null || session.userId !== userId) throw new AuthSessionSqlPreconditionError();
};

const requireSessionCredential = (
  input: AuthSessionCredential,
  session: AuthSessionWitness,
  provider: SupportedAuthProvider,
): AuthSessionCredential => {
  const credential = captureNativeCredentialEvidence(input);
  if (
    credential.type !== "opaque-session" ||
    credential.token !== session.sessionToken ||
    credential.userId !== session.userId ||
    credential.provider !== provider ||
    credential.expiresAt !== session.expires.getTime()
  )
    throw new AuthSessionSqlPreconditionError();
  return credential;
};

export const prepareAuthSessionMutation = (
  input: AuthSessionMutation,
  options: AuthSessionSqlConfiguration,
  operation: BoundedTransactionOperation,
): { readonly prepared: PreparedAuthSessionMutation; readonly operation: BoundedTransactionOperation } => {
  const bounded = { signal: operation.signal, lifetime: operation.lifetime, deadlineAt: operation.deadlineAt };
  const configuration: AuthSessionSqlConfiguration = Object.freeze({
    lifetime: options.lifetime,
    maximumSnapshotRows: options.maximumSnapshotRows,
    sessionMaxAgeMs: options.sessionMaxAgeMs,
    maximumAbsoluteClockSkewMs: options.maximumAbsoluteClockSkewMs,
    now: options.now,
  });
  if (!Number.isFinite(bounded.deadlineAt) || typeof configuration.now !== "function")
    throw new AuthSessionSqlPreconditionError();
  if (
    !Number.isSafeInteger(configuration.maximumSnapshotRows) ||
    configuration.maximumSnapshotRows < 1 ||
    configuration.maximumSnapshotRows >= Number.MAX_SAFE_INTEGER ||
    !Number.isSafeInteger(configuration.sessionMaxAgeMs) ||
    configuration.sessionMaxAgeMs < 1 ||
    !Number.isSafeInteger(configuration.maximumAbsoluteClockSkewMs) ||
    configuration.maximumAbsoluteClockSkewMs < 0
  )
    throw new AuthSessionSqlPreconditionError();
  const mutation = structuredClone(input);
  const admittedAt = configuration.now();
  const wallTime = Date.now();
  if (!Number.isSafeInteger(admittedAt) || Math.abs(admittedAt - wallTime) > configuration.maximumAbsoluteClockSkewMs)
    throw new AuthSessionSqlPreconditionError();
  const maximumExpiresAt = admittedAt + configuration.sessionMaxAgeMs;
  if (!Number.isSafeInteger(maximumExpiresAt)) throw new AuthSessionSqlPreconditionError();
  let deadlineAt = bounded.deadlineAt;
  const requireFreshExpiry = (expires: Date) => {
    requireFiniteDate(expires);
    if (expires.getTime() <= admittedAt || expires.getTime() > maximumExpiresAt)
      throw new AuthSessionSqlPreconditionError();
  };
  if (mutation.kind === "establish") {
    const identity = mutation.identity;
    let user: AuthUserWitness;
    if (identity.kind === "existing") user = identity.witness;
    else user = { ...identity.user, password: null };
    requireUser(user);
    if (identity.selections.length > configuration.maximumSnapshotRows) throw new AuthSessionSqlPreconditionError();
    for (const selection of identity.selections) {
      if (
        (selection.field !== "name" && selection.field !== "email") ||
        !["credentials", "ldap", "oidc"].includes(selection.provider) ||
        typeof selection.value !== "string" ||
        (selection.selectedUserId !== null && selection.selectedUserId !== user.id)
      )
        throw new AuthSessionSqlPreconditionError();
    }
    if (
      identity.kind === "create" &&
      user.email !== null &&
      !identity.selections.some(
        (selection) =>
          selection.field === "email" &&
          selection.value === user.email &&
          selection.provider === user.provider &&
          selection.selectedUserId === null,
      )
    )
      throw new AuthSessionSqlPreconditionError();
    if (identity.kind === "create" && !["ldap", "oidc"].includes(user.provider))
      throw new AuthSessionSqlPreconditionError();
    if (mutation.account.kind !== "none") {
      let account: AuthAccountWitness;
      if (mutation.account.kind === "existing") account = mutation.account.witness;
      else account = mutation.account.account;
      requireAccount(account, user.id);
    }
    let session: AuthSessionWitness;
    if (mutation.session.kind === "existing") session = mutation.session.witness;
    else session = mutation.session.session;
    requireSession(session, user.id);
    if (mutation.session.kind === "create") {
      if (!/^[a-f0-9]{96}$/.test(session.sessionToken)) throw new AuthSessionSqlPreconditionError();
      requireFreshExpiry(session.expires);
    } else {
      const credential = requireSessionCredential(mutation.session.credential, session, user.provider);
      deadlineAt = Math.min(deadlineAt, credential.hostDeadlineAt);
    }
    deadlineAt = Math.min(deadlineAt, session.expires.getTime() - configuration.maximumAbsoluteClockSkewMs);
    requireNullableString(mutation.effects.name);
    if (mutation.effects.email !== undefined) requireNullableString(mutation.effects.email);
    if (mutation.effects.emailVerified !== undefined) requireFiniteDate(mutation.effects.emailVerified);
    if (mutation.effects.image !== undefined && typeof mutation.effects.image !== "string")
      throw new AuthSessionSqlPreconditionError();
    const names = mutation.effects.externalGroupNames;
    if (
      names !== undefined &&
      (names.length > configuration.maximumSnapshotRows || names.some((name) => typeof name !== "string"))
    )
      throw new AuthSessionSqlPreconditionError();
  } else {
    requireUser(mutation.user);
    requireSession(mutation.session, mutation.user.id);
    const credential = requireSessionCredential(mutation.credential, mutation.session, mutation.user.provider);
    if (mutation.account !== undefined) requireAccount(mutation.account, mutation.user.id);
    if (mutation.kind === "renew") {
      requireFreshExpiry(mutation.expires);
      if (mutation.expires.getTime() <= mutation.session.expires.getTime()) throw new AuthSessionSqlPreconditionError();
      deadlineAt = Math.min(deadlineAt, mutation.session.expires.getTime() - configuration.maximumAbsoluteClockSkewMs);
      deadlineAt = Math.min(deadlineAt, credential.hostDeadlineAt);
    } else if (mutation.kind === "expire") {
      if (
        !Number.isSafeInteger(wallTime) ||
        wallTime < 0 ||
        wallTime > 8_640_000_000_000_000 ||
        admittedAt < 0 ||
        admittedAt > 8_640_000_000_000_000 ||
        mutation.session.expires.getTime() >= admittedAt ||
        mutation.session.expires.getTime() >= wallTime ||
        credential.hostDeadlineAt !== mutation.session.expires.getTime() - configuration.maximumAbsoluteClockSkewMs ||
        bounded.deadlineAt <= admittedAt ||
        bounded.deadlineAt <= wallTime
      )
        throw new AuthSessionSqlPreconditionError();
    } else if (mutation.kind !== "revoke") throw new AuthSessionSqlPreconditionError();
  }
  return {
    prepared: {
      mutation,
      maximumSnapshotRows: configuration.maximumSnapshotRows,
      admittedAt,
      maximumExpiresAt,
      maximumAbsoluteClockSkewMs: configuration.maximumAbsoluteClockSkewMs,
      wallTimeAtAdmission: wallTime,
      now: configuration.now,
    },
    operation: {
      signal: bounded.signal,
      lifetime: AbortSignal.any([bounded.lifetime, configuration.lifetime]),
      deadlineAt,
    },
  };
};
