import { TransactionCommitAmbiguousError } from "@homarr/db/runtime";
import type { PersistenceRuntime } from "@homarr/db/runtime";
import type { NativeCredentialEvidence } from "@homarr/db/runtime-auth-credential";
import { createAuthSessionSqlRuntime } from "@homarr/db/runtime-auth-session";
import type {
  AuthSessionMutation,
  AuthSessionSqlConfiguration,
  AuthSessionSqlResult,
} from "@homarr/db/runtime-auth-session";
import { getPermissionsWithChildren, groupPermissionKeys } from "@homarr/definitions";
import type { GroupPermissionKey } from "@homarr/definitions";

import { comparePasswordsAsync } from "../../security";
import type {
  AuthenticatedPolicyIdentity,
  OwnedIssuerSessionRecord,
  OwnedSessionDisposition,
  OwnedSessionObservation,
  SqlAuthorityAdmission,
  SqlAuthorityConfiguration,
  SqlAuthorityOperation,
  SqlAuthorityReader,
  SqlAuthorityReadLease,
} from "./contracts";
import { SqlAuthorityError } from "./contracts";
import { createAuthorityLifetime } from "./lifetime";
import {
  credentialSnapshotStatement,
  decodeCredentialSnapshot,
  decodeIssuerSessionSnapshot,
  sameCredentialWitness,
  sameIdentity,
} from "./snapshots";
import type { CredentialSelector, CredentialSnapshot, IssuerSessionSelector, IssuerSessionSnapshot } from "./snapshots";

interface OwnedReadLease {
  readonly snapshot: CredentialSnapshot;
  readonly operation: SqlAuthorityOperation;
  readonly deadlineAt: number;
  readonly resource: ReturnType<typeof createAuthorityLifetime>;
  invalidated: boolean;
}

type OwnedSessionMutation = Extract<AuthSessionMutation, { kind: "revoke" }>;

type SqlSessionRevokeDisposition = {
  readonly kind: "revoke";
  readonly publication: "held";
  readonly state:
    | "confirmed-commit"
    | "confirmed-commit-settlement-failed"
    | "commit-ambiguous"
    | "failed-without-confirmed-commit"
    | "held-without-dispatch";
};

interface OpaqueAdmission {
  invalidated: boolean;
  readonly finished: Promise<void>;
}

interface TokenRevocationFence {
  readonly token: string;
  readonly admissions: readonly OpaqueAdmission[];
  readonly finished: Promise<void>;
  readonly finish: () => void;
}

type OwnedSessionEvidence =
  | { readonly type: "not-dispatched" }
  | { readonly type: "invoked" }
  | { readonly type: "pending"; readonly promise: Promise<AuthSessionSqlResult> }
  | {
      readonly type: "confirmed";
      readonly promise: Promise<AuthSessionSqlResult>;
      readonly result: AuthSessionSqlResult;
    }
  | {
      readonly type: "ambiguous";
      readonly promise: Promise<AuthSessionSqlResult> | undefined;
      readonly error: TransactionCommitAmbiguousError;
    }
  | {
      readonly type: "failed";
      readonly promise: Promise<AuthSessionSqlResult> | undefined;
      readonly error: unknown;
    };

interface OwnedSessionClaim {
  readonly lease: SqlAuthorityReadLease;
  readonly owned: OwnedReadLease;
  readonly fence: TokenRevocationFence;
  mutation: OwnedSessionMutation | undefined;
  evidence: OwnedSessionEvidence;
  readonly cleanup: PromiseSettledResult<unknown>[];
  readonly failures: unknown[];
}

interface OwnedObservation {
  readonly observation: OwnedSessionObservation;
  readonly snapshot: IssuerSessionSnapshot;
  readonly selector: IssuerSessionSelector;
  readonly operation: SqlAuthorityOperation;
  readonly resource: ReturnType<typeof createAuthorityLifetime>;
  consumption: "pending" | "claimed" | "released";
  releasing: Promise<void> | undefined;
  claim: OwnedExpiryClaim | undefined;
}

interface OwnedExpiryClaim {
  readonly owned: OwnedObservation;
  readonly fence: TokenRevocationFence;
  readonly mutation: Extract<AuthSessionMutation, { kind: "expire" }>;
  readonly finished: Promise<OwnedSessionDisposition>;
  evidence: OwnedSessionEvidence;
  readonly cleanup: PromiseSettledResult<unknown>[];
  readonly failures: unknown[];
}

type AuthorityConstruction =
  | { readonly type: "reader"; readonly configuration: SqlAuthorityConfiguration }
  | {
      readonly type: "session-owner";
      readonly configuration: SqlAuthorityConfiguration & { readonly runtime: PersistenceRuntime };
      readonly sessionConfiguration: AuthSessionSqlConfiguration;
    };

function validConfiguration(configuration: SqlAuthorityConfiguration) {
  if (
    configuration.credentialSqlLogging !== "disabled-by-resource-owner" ||
    !Number.isSafeInteger(configuration.maximumSnapshotRows) ||
    configuration.maximumSnapshotRows < 1 ||
    configuration.maximumSnapshotRows >= 2147483647 ||
    typeof configuration.now !== "function" ||
    !Number.isSafeInteger(configuration.maximumAbsoluteClockSkewMs) ||
    configuration.maximumAbsoluteClockSkewMs < 0 ||
    (configuration.opaqueSessions.type !== "disabled" &&
      configuration.opaqueSessions.type !== "approved-stored-expiry-reader") ||
    (configuration.apiKeys.type !== "disabled" && configuration.apiKeys.type !== "approved-stored-bcrypt-reader") ||
    (configuration.opaqueSessions.type !== "disabled" &&
      configuration.opaqueSessions.maximumAbsoluteClockSkewMs !== configuration.maximumAbsoluteClockSkewMs)
  ) {
    throw new SqlAuthorityError("INVALID_CONFIGURATION");
  }
}

function matchesOwnedMutation(claim: OwnedSessionClaim, mutation: OwnedSessionMutation) {
  const witness = claim.owned.snapshot.witness;
  if (witness.type !== "opaque-session" || mutation.kind !== "revoke") return false;
  if (
    mutation.user.id !== witness.userId ||
    mutation.user.provider !== witness.provider ||
    mutation.session.sessionToken !== witness.token ||
    mutation.session.userId !== witness.userId ||
    !(mutation.session.expires instanceof Date) ||
    mutation.session.expires.getTime() !== witness.expiresAt ||
    !sameCredentialWitness(mutation.credential, witness) ||
    mutation.credential.hostDeadlineAt !== witness.hostDeadlineAt ||
    claim.owned.snapshot.identity.userId !== witness.userId ||
    (mutation.account !== undefined && mutation.account.userId !== witness.userId)
  ) {
    return false;
  }
  for (const value of [mutation.user.name, mutation.user.email, mutation.user.image, mutation.user.password]) {
    if (value !== null && typeof value !== "string") return false;
  }
  return (
    mutation.user.emailVerified === null ||
    (mutation.user.emailVerified instanceof Date && Number.isSafeInteger(mutation.user.emailVerified.getTime()))
  );
}

function constructSqlAuthority(input: AuthorityConstruction) {
  const configuration = input.configuration;
  const runtime = configuration.runtime;
  const frozenConfiguration: SqlAuthorityConfiguration = Object.freeze({
    runtime,
    lifetime: configuration.lifetime,
    credentialSqlLogging: configuration.credentialSqlLogging,
    maximumSnapshotRows: configuration.maximumSnapshotRows,
    maximumAbsoluteClockSkewMs: configuration.maximumAbsoluteClockSkewMs,
    now: configuration.now,
    opaqueSessions: Object.freeze({ ...configuration.opaqueSessions }),
    apiKeys: Object.freeze({ ...configuration.apiKeys }),
  });
  validConfiguration(frozenConfiguration);
  let suppliedSessionConfiguration: AuthSessionSqlConfiguration | undefined;
  if (input.type === "session-owner") {
    const supplied = input.sessionConfiguration;
    suppliedSessionConfiguration = Object.freeze({
      lifetime: supplied.lifetime,
      maximumSnapshotRows: supplied.maximumSnapshotRows,
      maximumAbsoluteClockSkewMs: supplied.maximumAbsoluteClockSkewMs,
      sessionMaxAgeMs: supplied.sessionMaxAgeMs,
      now: supplied.now,
    });
  }
  const ownerLifetime = new AbortController();
  const parentLifetimes = [frozenConfiguration.lifetime, ownerLifetime.signal];
  if (suppliedSessionConfiguration !== undefined) parentLifetimes.push(suppliedSessionConfiguration.lifetime);
  const resource = createAuthorityLifetime(AbortSignal.any(parentLifetimes), "AUTHORITY_CLOSED");
  let sessionProducer: ReturnType<typeof createAuthSessionSqlRuntime> | undefined;
  let sessionConfiguration: AuthSessionSqlConfiguration | undefined;
  if (input.type === "session-owner") {
    const sqlConfiguration = suppliedSessionConfiguration;
    if (sqlConfiguration === undefined) throw new SqlAuthorityError("INVALID_CONFIGURATION");
    const sessionRuntime = input.configuration.runtime;
    if (
      sessionRuntime !== runtime ||
      frozenConfiguration.opaqueSessions.type !== "approved-stored-expiry-reader" ||
      sqlConfiguration.maximumSnapshotRows !== frozenConfiguration.maximumSnapshotRows ||
      sqlConfiguration.maximumAbsoluteClockSkewMs !== frozenConfiguration.opaqueSessions.maximumAbsoluteClockSkewMs ||
      sqlConfiguration.maximumAbsoluteClockSkewMs !== frozenConfiguration.maximumAbsoluteClockSkewMs ||
      sqlConfiguration.now !== frozenConfiguration.now ||
      !Number.isSafeInteger(sqlConfiguration.maximumSnapshotRows) ||
      !Number.isSafeInteger(sqlConfiguration.maximumAbsoluteClockSkewMs) ||
      !Number.isSafeInteger(sqlConfiguration.sessionMaxAgeMs) ||
      sqlConfiguration.sessionMaxAgeMs < 1 ||
      typeof sqlConfiguration.now !== "function"
    ) {
      throw new SqlAuthorityError("INVALID_CONFIGURATION");
    }
    sessionConfiguration = Object.freeze({
      lifetime: AbortSignal.any([sqlConfiguration.lifetime, resource.lifetime]),
      maximumSnapshotRows: sqlConfiguration.maximumSnapshotRows,
      maximumAbsoluteClockSkewMs: sqlConfiguration.maximumAbsoluteClockSkewMs,
      sessionMaxAgeMs: sqlConfiguration.sessionMaxAgeMs,
      now: sqlConfiguration.now,
    });
    sessionProducer = createAuthSessionSqlRuntime(sessionRuntime, sessionConfiguration);
  }
  const leases = new WeakMap<SqlAuthorityReadLease, OwnedReadLease>();
  const activeLeases = new Set<SqlAuthorityReadLease>();
  const admissions = new Map<string, Set<OpaqueAdmission>>();
  const fences = new Map<string, TokenRevocationFence>();
  const sessionClaims = new WeakMap<SqlAuthorityReadLease, OwnedSessionClaim>();
  const observations = new WeakMap<OwnedSessionObservation, OwnedObservation>();
  const activeObservations = new Set<OwnedSessionObservation>();
  const expiryTasks = new Set<Promise<OwnedSessionDisposition>>();
  let closing: Promise<void> | undefined;

  function checkOpen() {
    if (closing !== undefined) throw new SqlAuthorityError("AUTHORITY_CLOSED");
  }

  function claimTokenRevocation(lease: SqlAuthorityReadLease) {
    checkOpen();
    const owned = leases.get(lease);
    if (!owned || owned.invalidated || owned.resource.lifetime.aborted) {
      throw new SqlAuthorityError("AUTHORITY_NOT_CURRENT");
    }
    const witness = owned.snapshot.witness;
    if (witness.type === "api-key") throw new SqlAuthorityError("COMMIT_AUTHORITY_JOIN_REQUIRED");
    if (fences.has(witness.token)) throw new SqlAuthorityError("AUTHORITY_NOT_CURRENT");
    const completion = Promise.withResolvers<void>();
    const marked = [...(admissions.get(witness.token) ?? [])];
    const fence: TokenRevocationFence = {
      token: witness.token,
      admissions: marked,
      finished: completion.promise,
      finish: completion.resolve,
    };
    fences.set(witness.token, fence);
    for (const admission of marked) admission.invalidated = true;
    return { owned, fence };
  }

  async function finishFenceAsync(fence: TokenRevocationFence) {
    try {
      await Promise.allSettled(fence.admissions.map((admission) => admission.finished));
    } finally {
      if (fences.get(fence.token) === fence) fences.delete(fence.token);
      fence.finish();
    }
  }

  function nativeOperation(operation: SqlAuthorityOperation, lifetime: AbortSignal) {
    checkOpen();
    resource.check(operation);
    if (lifetime.aborted) throw new SqlAuthorityError("AUTHORITY_RELEASED");
    return {
      signal: operation.signal,
      lifetime: AbortSignal.any([resource.lifetime, lifetime]),
      deadlineAt: operation.deadlineAt,
    };
  }

  async function readSnapshotAsync(
    selector: CredentialSelector,
    operation: SqlAuthorityOperation,
    lifetime: AbortSignal,
  ): Promise<CredentialSnapshot | null> {
    const native = nativeOperation(operation, lifetime);
    const statement = credentialSnapshotStatement(runtime.engine, selector, frozenConfiguration.maximumSnapshotRows);
    try {
      const snapshot =
        runtime.engine === "sqlite"
          ? runtime.boundedTransactionSync(native, (database) =>
              decodeCredentialSnapshot(database.all<unknown>(statement), selector, frozenConfiguration),
            )
          : await runtime.boundedTransactionAsync(native, async (database) => {
              const result = await database.execute<Record<string, unknown>>(statement);
              return decodeCredentialSnapshot(result.rows, selector, frozenConfiguration);
            });
      resource.check(operation);
      if (lifetime.aborted) throw new SqlAuthorityError("AUTHORITY_RELEASED");
      if (
        snapshot?.witness.type === "opaque-session" &&
        (Date.now() >= snapshot.witness.hostDeadlineAt || frozenConfiguration.now() >= snapshot.witness.hostDeadlineAt)
      )
        return null;
      return snapshot;
    } catch (error) {
      if (error instanceof SqlAuthorityError) throw error;
      throw new SqlAuthorityError("AUTHORITY_UNAVAILABLE");
    }
  }

  function createLease(snapshot: CredentialSnapshot, selector: CredentialSelector, operation: SqlAuthorityOperation) {
    checkOpen();
    if (selector.type === "opaque-session" && fences.has(selector.token)) {
      throw new SqlAuthorityError("AUTHORITY_NOT_CURRENT");
    }
    resource.check(operation);
    const owned = createAuthorityLifetime(AbortSignal.any([resource.lifetime, operation.signal]), "AUTHORITY_RELEASED");
    const witness = snapshot.witness;
    const deadlineAt = Math.min(
      operation.deadlineAt,
      witness.type === "opaque-session" ? witness.hostDeadlineAt : operation.deadlineAt,
    );
    const validity: SqlAuthorityReadLease["validity"] =
      witness.type === "opaque-session"
        ? Object.freeze({
            type: "stored-session-expiry",
            expiresAt: witness.expiresAt,
            hostDeadlineAt: witness.hostDeadlineAt,
          })
        : Object.freeze({ type: "no-stored-api-key-expiry" });
    const registration: OwnedReadLease = {
      snapshot,
      operation: Object.freeze({ signal: operation.signal, deadlineAt }),
      deadlineAt,
      resource: owned,
      invalidated: false,
    };
    let releasing: Promise<void> | undefined;
    const lease: SqlAuthorityReadLease = Object.freeze({
      identity: snapshot.identity,
      credentialType: witness.type,
      validity,
      lifetime: owned.lifetime,
      assertCurrentAsync: (nextOperation: SqlAuthorityOperation) => {
        checkOpen();
        if (registration.invalidated || releasing !== undefined) throw new SqlAuthorityError("AUTHORITY_NOT_CURRENT");
        const boundedOperation = {
          signal: nextOperation.signal,
          deadlineAt: Math.min(deadlineAt, nextOperation.deadlineAt),
        };
        return owned.runAsync(boundedOperation, async () => {
          const current = await readSnapshotAsync(selector, boundedOperation, owned.lifetime);
          if (
            current === null ||
            !sameCredentialWitness(witness, current.witness) ||
            current.storedExpiry !== snapshot.storedExpiry ||
            !sameIdentity(snapshot.identity, current.identity)
          ) {
            void owned.closeAsync();
            throw new SqlAuthorityError("AUTHORITY_NOT_CURRENT");
          }
          owned.check(boundedOperation);
        });
      },
      releaseAsync: () => {
        if (releasing !== undefined) return releasing;
        const completion = Promise.withResolvers<void>();
        releasing = completion.promise;
        registration.invalidated = true;
        const release = async () => {
          try {
            await owned.closeAsync();
          } finally {
            activeLeases.delete(lease);
            leases.delete(lease);
          }
        };
        void release().then(completion.resolve, completion.reject);
        return releasing;
      },
    });
    leases.set(lease, registration);
    activeLeases.add(lease);
    return lease;
  }

  async function settleMatchingLeasesAsync(snapshot: Pick<CredentialSnapshot, "witness" | "storedExpiry">) {
    const affected: SqlAuthorityReadLease[] = [];
    for (const currentLease of activeLeases) {
      const current = leases.get(currentLease);
      if (
        current &&
        sameCredentialWitness(snapshot.witness, current.snapshot.witness) &&
        snapshot.storedExpiry === current.snapshot.storedExpiry
      ) {
        current.invalidated = true;
        affected.push(currentLease);
      }
    }
    return Promise.allSettled(affected.map(async (lease) => lease.releaseAsync()));
  }

  function captureOwnedCredential(
    lease: SqlAuthorityReadLease,
    operation: SqlAuthorityOperation,
  ): NativeCredentialEvidence {
    checkOpen();
    const registration = leases.get(lease);
    if (
      !registration ||
      registration.invalidated ||
      lease.identity !== registration.snapshot.identity ||
      lease.credentialType !== registration.snapshot.witness.type ||
      lease.lifetime !== registration.resource.lifetime ||
      operation.signal !== registration.operation.signal ||
      !Number.isFinite(operation.deadlineAt) ||
      operation.deadlineAt > registration.deadlineAt
    )
      throw new SqlAuthorityError("AUTHORITY_NOT_CURRENT");
    registration.resource.check(operation);
    const now = frozenConfiguration.now();
    if (
      !Number.isSafeInteger(now) ||
      now < 0 ||
      now > 8_640_000_000_000_000 ||
      now >= operation.deadlineAt ||
      Math.abs(now - Date.now()) > frozenConfiguration.maximumAbsoluteClockSkewMs
    )
      throw new SqlAuthorityError("AUTHORITY_NOT_CURRENT");
    return registration.snapshot.witness;
  }

  function matchesOwnedResult(claim: OwnedSessionClaim, result: AuthSessionSqlResult) {
    const mutation = claim.mutation;
    if (mutation === undefined || result.kind !== "revoked" || result.credential !== null) return false;
    if (
      result.user.id !== mutation.user.id ||
      result.user.provider !== mutation.user.provider ||
      result.user.name !== mutation.user.name ||
      result.user.email !== mutation.user.email ||
      result.user.image !== mutation.user.image ||
      result.session.sessionToken !== mutation.session.sessionToken ||
      result.session.userId !== mutation.session.userId ||
      !(result.session.expires instanceof Date) ||
      result.session.expires.getTime() !== mutation.session.expires.getTime() ||
      !["dark", "light", "auto"].includes(result.user.colorScheme) ||
      !Array.isArray(result.groupIds) ||
      !Array.isArray(result.permissions) ||
      result.groupIds.length > frozenConfiguration.maximumSnapshotRows ||
      result.permissions.length > frozenConfiguration.maximumSnapshotRows
    ) {
      return false;
    }
    if (mutation.user.emailVerified === null) {
      if (result.user.emailVerified !== null) return false;
    } else if (
      !(result.user.emailVerified instanceof Date) ||
      result.user.emailVerified.getTime() !== mutation.user.emailVerified.getTime()
    ) {
      return false;
    }
    const groups = new Set<string>();
    for (const groupId of result.groupIds) {
      if (typeof groupId !== "string" || groupId.length === 0 || groups.has(groupId)) return false;
      groups.add(groupId);
    }
    const selected: GroupPermissionKey[] = [];
    for (const grant of result.permissions) {
      if (!groups.has(grant.groupId)) return false;
      const permission = groupPermissionKeys.find((key) => key === grant.permission);
      if (permission === undefined) return false;
      selected.push(permission);
    }
    const identity: AuthenticatedPolicyIdentity = {
      type: "authenticated",
      userId: result.user.id,
      groupIds: [...groups].toSorted(),
      permissions: getPermissionsWithChildren(selected).toSorted(),
    };
    return sameIdentity(claim.owned.snapshot.identity, identity);
  }

  function revokeOwnedSessionAsync(
    lease: SqlAuthorityReadLease,
    operation: SqlAuthorityOperation,
    mutation: OwnedSessionMutation,
  ): Promise<SqlSessionRevokeDisposition> {
    const held: SqlSessionRevokeDisposition = { kind: "revoke", publication: "held", state: "held-without-dispatch" };
    const producer = sessionProducer;
    const sqlConfiguration = sessionConfiguration;
    if (producer === undefined || sqlConfiguration === undefined || sessionClaims.has(lease)) {
      return Promise.resolve(held);
    }
    let claim: OwnedSessionClaim;
    try {
      const { owned, fence } = claimTokenRevocation(lease);
      claim = {
        lease,
        owned,
        fence,
        mutation: undefined,
        evidence: { type: "not-dispatched" },
        cleanup: [],
        failures: [],
      };
      sessionClaims.set(lease, claim);
    } catch {
      return Promise.resolve(held);
    }
    const capturedClaim = claim;
    let cleanupPromise: Promise<void> | undefined;
    const cleanupClaimAsync = (invalidate: boolean): Promise<void> => {
      if (cleanupPromise !== undefined) return cleanupPromise;
      const completion = Promise.withResolvers<void>();
      cleanupPromise = completion.promise;
      const cleanup = async () => {
        try {
          if (invalidate) {
            const settled = await Promise.allSettled([settleMatchingLeasesAsync(capturedClaim.owned.snapshot)]);
            for (const settlement of settled) {
              capturedClaim.cleanup.push(settlement);
              if (settlement.status === "fulfilled") capturedClaim.cleanup.push(...settlement.value);
            }
          }
          capturedClaim.cleanup.push(
            ...(await Promise.allSettled([(async () => capturedClaim.lease.releaseAsync())()])),
          );
        } finally {
          await finishFenceAsync(capturedClaim.fence);
        }
      };
      void cleanup().then(completion.resolve, completion.reject);
      return cleanupPromise;
    };
    try {
      const witness = capturedClaim.owned.snapshot.witness;
      if (witness.type !== "opaque-session") throw new SqlAuthorityError("AUTHORITY_NOT_CURRENT");
      const deadlineAt = operation.deadlineAt;
      if (
        !Number.isFinite(deadlineAt) ||
        operation.signal !== capturedClaim.owned.operation.signal ||
        deadlineAt > capturedClaim.owned.deadlineAt
      )
        throw new SqlAuthorityError("INVALID_OPERATION");
      const boundedOperation = Object.freeze({
        signal: operation.signal,
        deadlineAt: Math.min(deadlineAt, capturedClaim.owned.deadlineAt, witness.hostDeadlineAt),
      });
      const capturedMutation = structuredClone(mutation);
      capturedClaim.mutation = capturedMutation;
      if (!matchesOwnedMutation(capturedClaim, capturedMutation)) throw new SqlAuthorityError("AUTHORITY_NOT_CURRENT");
      capturedClaim.owned.resource.check(boundedOperation);
      const native = Object.freeze({
        signal: boundedOperation.signal,
        deadlineAt: boundedOperation.deadlineAt,
        lifetime: AbortSignal.any([
          resource.lifetime,
          capturedClaim.owned.resource.lifetime,
          sqlConfiguration.lifetime,
        ]),
      });
      const task = resource.runAsync<SqlSessionRevokeDisposition>(boundedOperation, async () => {
        let state: SqlSessionRevokeDisposition["state"] = "held-without-dispatch";
        let failed = false;
        try {
          await capturedClaim.lease.assertCurrentAsync(boundedOperation);
          checkOpen();
          capturedClaim.owned.resource.check(boundedOperation);
          if (native.lifetime.aborted || fences.get(witness.token) !== capturedClaim.fence) {
            throw new SqlAuthorityError("AUTHORITY_NOT_CURRENT");
          }
          await capturedClaim.owned.resource.runAsync(boundedOperation, async () => {
            checkOpen();
            capturedClaim.owned.resource.check(boundedOperation);
            if (native.lifetime.aborted || fences.get(witness.token) !== capturedClaim.fence) {
              throw new SqlAuthorityError("AUTHORITY_NOT_CURRENT");
            }
            let nativePromise: Promise<AuthSessionSqlResult> | undefined;
            capturedClaim.evidence = { type: "invoked" };
            try {
              nativePromise = producer.revokeAsync(native, capturedMutation);
              capturedClaim.evidence = { type: "pending", promise: nativePromise };
              const result = await nativePromise;
              capturedClaim.evidence = { type: "confirmed", promise: nativePromise, result };
            } catch (error) {
              if (error instanceof TransactionCommitAmbiguousError) {
                capturedClaim.evidence = { type: "ambiguous", promise: nativePromise, error };
              } else {
                capturedClaim.evidence = { type: "failed", promise: nativePromise, error };
              }
              throw error;
            }
          });
        } catch (error: unknown) {
          capturedClaim.failures.push(error);
          failed = true;
        }
        const evidence = capturedClaim.evidence;
        if (evidence.type === "confirmed") {
          state = "confirmed-commit-settlement-failed";
          try {
            if (!failed) {
              if (matchesOwnedResult(capturedClaim, evidence.result)) state = "confirmed-commit";
              else capturedClaim.failures.push(new SqlAuthorityError("AUTHORITY_NOT_CURRENT"));
            }
          } catch (error: unknown) {
            capturedClaim.failures.push(error);
            failed = true;
          }
        } else if (evidence.type === "ambiguous") {
          state = "commit-ambiguous";
        } else if (evidence.type !== "not-dispatched") {
          state = "failed-without-confirmed-commit";
        }
        capturedClaim.cleanup.push(
          ...(await Promise.allSettled([
            cleanupClaimAsync(evidence.type === "confirmed" || evidence.type === "ambiguous"),
          ])),
        );
        if (state === "confirmed-commit" && capturedClaim.cleanup.some((result) => result.status === "rejected")) {
          state = "confirmed-commit-settlement-failed";
        }
        return { kind: "revoke", publication: "held", state };
      });
      return task.catch(async (error: unknown): Promise<SqlSessionRevokeDisposition> => {
        capturedClaim.failures.push(error);
        const evidence = capturedClaim.evidence;
        capturedClaim.cleanup.push(
          ...(await Promise.allSettled([
            cleanupClaimAsync(evidence.type === "confirmed" || evidence.type === "ambiguous"),
          ])),
        );
        if (evidence.type === "confirmed") {
          return { kind: "revoke", publication: "held", state: "confirmed-commit-settlement-failed" };
        }
        if (evidence.type === "ambiguous") return { kind: "revoke", publication: "held", state: "commit-ambiguous" };
        if (evidence.type !== "not-dispatched") {
          return { kind: "revoke", publication: "held", state: "failed-without-confirmed-commit" };
        }
        return held;
      });
    } catch (error: unknown) {
      capturedClaim.failures.push(error);
      return Promise.allSettled([cleanupClaimAsync(false)]).then((settled) => {
        capturedClaim.cleanup.push(...settled);
        return held;
      });
    }
  }

  function checkIssuerOperation(operation: SqlAuthorityOperation) {
    checkOpen();
    resource.check(operation);
    const configured = frozenConfiguration.now();
    const wall = Date.now();
    if (
      !(operation.signal instanceof AbortSignal) ||
      !Number.isSafeInteger(configured) ||
      configured < 0 ||
      configured > 8_640_000_000_000_000 ||
      !Number.isSafeInteger(wall) ||
      wall < 0 ||
      wall > 8_640_000_000_000_000 ||
      Math.abs(configured - wall) > frozenConfiguration.maximumAbsoluteClockSkewMs
    )
      throw new SqlAuthorityError("AUTHORITY_UNAVAILABLE");
    if (configured >= operation.deadlineAt) throw new SqlAuthorityError("AUTHORITY_NOT_CURRENT");
  }

  async function readIssuerSessionSnapshotAsync(
    selector: IssuerSessionSelector,
    operation: SqlAuthorityOperation,
    lifetime: AbortSignal,
  ): Promise<IssuerSessionSnapshot> {
    checkIssuerOperation(operation);
    const native = nativeOperation(operation, lifetime);
    const statement = credentialSnapshotStatement(runtime.engine, selector, frozenConfiguration.maximumSnapshotRows);
    try {
      let snapshot: IssuerSessionSnapshot;
      if (runtime.engine === "sqlite") {
        snapshot = runtime.boundedTransactionSync(native, (database) =>
          decodeIssuerSessionSnapshot(database.all<unknown>(statement), selector, frozenConfiguration),
        );
      } else {
        snapshot = await runtime.boundedTransactionAsync(native, async (database) => {
          const result = await database.execute<Record<string, unknown>>(statement);
          return decodeIssuerSessionSnapshot(result.rows, selector, frozenConfiguration);
        });
      }
      checkIssuerOperation(operation);
      if (lifetime.aborted) throw new SqlAuthorityError("AUTHORITY_RELEASED");
      if (
        snapshot.type === "active" &&
        (Date.now() >= snapshot.record.locator.hostDeadlineAt ||
          frozenConfiguration.now() >= snapshot.record.locator.hostDeadlineAt)
      )
        return Object.freeze({ ...snapshot, type: "expiry-margin" });
      return snapshot;
    } catch (error: unknown) {
      if (error instanceof SqlAuthorityError) throw error;
      throw new SqlAuthorityError("AUTHORITY_UNAVAILABLE");
    }
  }

  function runIssuerObservationReadAsync<T>(
    selector: IssuerSessionSelector,
    operation: SqlAuthorityOperation,
    read: (admission: OpaqueAdmission) => Promise<T>,
  ): Promise<T> {
    checkIssuerOperation(operation);
    let token: string | undefined;
    if (selector.type === "opaque-session") token = selector.token;
    if (token && fences.has(token)) throw new SqlAuthorityError("AUTHORITY_NOT_CURRENT");
    const completion = Promise.withResolvers<void>();
    const admission: OpaqueAdmission = { invalidated: false, finished: completion.promise };
    if (token) {
      let tracked = admissions.get(token);
      if (!tracked) {
        tracked = new Set();
        admissions.set(token, tracked);
      }
      tracked.add(admission);
    }
    const finish = () => {
      if (token) {
        const tracked = admissions.get(token);
        tracked?.delete(admission);
        if (tracked?.size === 0) admissions.delete(token);
      }
      completion.resolve();
    };
    try {
      return resource.runAsync(operation, () => read(admission)).finally(finish);
    } catch (error: unknown) {
      finish();
      throw error;
    }
  }

  function copyIssuerSessionRecord(record: OwnedIssuerSessionRecord): OwnedIssuerSessionRecord {
    let emailVerified: Date | null = null;
    if (record.user.emailVerified !== null) emailVerified = new Date(record.user.emailVerified.getTime());
    return Object.freeze({
      ...record,
      user: Object.freeze({ ...record.user, emailVerified }),
      session: Object.freeze({ ...record.session, expires: new Date(record.session.expires.getTime()) }),
    });
  }

  function sameIssuerSessionRecord(left: OwnedIssuerSessionRecord, right: OwnedIssuerSessionRecord): boolean {
    return (
      sameCredentialWitness(left.locator, right.locator) &&
      left.user.id === right.user.id &&
      left.user.provider === right.user.provider &&
      left.user.name === right.user.name &&
      left.user.email === right.user.email &&
      left.user.image === right.user.image &&
      left.user.password === right.user.password &&
      left.user.colorScheme === right.user.colorScheme &&
      left.user.emailVerified?.getTime() === right.user.emailVerified?.getTime() &&
      left.session.sessionToken === right.session.sessionToken &&
      left.session.userId === right.session.userId &&
      left.session.expires.getTime() === right.session.expires.getTime() &&
      left.groupIds.length === right.groupIds.length &&
      left.groupIds.every((id, index) => id === right.groupIds[index]) &&
      left.permissions.length === right.permissions.length &&
      left.permissions.every((permission, index) => permission === right.permissions[index])
    );
  }

  function observationOperation(owned: OwnedObservation, operation: SqlAuthorityOperation): SqlAuthorityOperation {
    if (
      owned.snapshot.type !== "absent" &&
      (owned.observation.type === "active" || owned.observation.type === "expired") &&
      !sameIssuerSessionRecord(owned.snapshot.record, owned.observation.record)
    )
      throw new SqlAuthorityError("AUTHORITY_NOT_CURRENT");
    if (
      operation.signal !== owned.operation.signal ||
      !Number.isFinite(operation.deadlineAt) ||
      operation.deadlineAt > owned.operation.deadlineAt
    )
      throw new SqlAuthorityError("INVALID_OPERATION");
    let deadlineAt = operation.deadlineAt;
    if (owned.snapshot.type === "active")
      deadlineAt = Math.min(deadlineAt, owned.snapshot.record.locator.hostDeadlineAt);
    const bounded = Object.freeze({ signal: owned.operation.signal, deadlineAt });
    checkIssuerOperation(bounded);
    owned.resource.check(bounded);
    return bounded;
  }

  async function recheckObservationSnapshotAsync(owned: OwnedObservation, operation: SqlAuthorityOperation) {
    const snapshot = owned.snapshot;
    const current = await readIssuerSessionSnapshotAsync(owned.selector, operation, owned.resource.lifetime);
    if (
      current.type !== snapshot.type ||
      current.namespace !== snapshot.namespace ||
      BigInt(current.headSequence) < BigInt(snapshot.headSequence)
    )
      throw new SqlAuthorityError("AUTHORITY_NOT_CURRENT");
    if (
      snapshot.type !== "absent" &&
      (current.type === "absent" ||
        current.storedExpiry !== snapshot.storedExpiry ||
        !sameIssuerSessionRecord(snapshot.record, current.record))
    )
      throw new SqlAuthorityError("AUTHORITY_NOT_CURRENT");
    checkIssuerOperation(operation);
    owned.resource.check(operation);
  }

  function releaseObservationResourcesAsync(owned: OwnedObservation): Promise<void> {
    if (owned.releasing) return owned.releasing;
    const completion = Promise.withResolvers<void>();
    owned.releasing = completion.promise;
    owned.consumption = "released";
    const release = async () => {
      const tasks: Promise<unknown>[] = [(async () => owned.resource.closeAsync())()];
      if (owned.observation.type === "active") {
        const lease = owned.observation.lease;
        tasks.push((async () => lease.releaseAsync())());
      }
      const settled = await Promise.allSettled(tasks);
      activeObservations.delete(owned.observation);
      const failures: unknown[] = [];
      for (const item of settled) if (item.status === "rejected") failures.push(item.reason);
      if (failures.length > 0) throw new AggregateError(failures, "Issuer observation cleanup failed");
    };
    void release().then(completion.resolve, completion.reject);
    return completion.promise;
  }

  function observeSessionForIssuerAsync(
    token: string | null,
    operation: SqlAuthorityOperation,
  ): Promise<OwnedSessionObservation> {
    if (sessionProducer === undefined) throw new SqlAuthorityError("COMMIT_AUTHORITY_JOIN_REQUIRED");
    checkIssuerOperation(operation);
    if (
      token !== null &&
      (typeof token !== "string" ||
        token.length === 0 ||
        token.length > 512 ||
        !token.isWellFormed() ||
        token.includes("\u0000"))
    )
      throw new SqlAuthorityError("AUTHORITY_UNAVAILABLE");
    let selector: IssuerSessionSelector = Object.freeze({ type: "no-session-cookie" });
    if (token !== null) selector = Object.freeze({ type: "opaque-session", token });
    const captured = Object.freeze({ signal: operation.signal, deadlineAt: operation.deadlineAt });
    return runIssuerObservationReadAsync(selector, captured, async (admission) => {
      const snapshot = await readIssuerSessionSnapshotAsync(selector, captured, resource.lifetime);
      if (admission.invalidated || (token !== null && fences.has(token)))
        throw new SqlAuthorityError("AUTHORITY_NOT_CURRENT");
      let lease: SqlAuthorityReadLease | undefined;
      let lifetime: ReturnType<typeof createAuthorityLifetime> | undefined;
      try {
        let observation: OwnedSessionObservation;
        if (snapshot.type === "active") {
          if (selector.type !== "opaque-session") throw new SqlAuthorityError("AUTHORITY_UNAVAILABLE");
          const identity: AuthenticatedPolicyIdentity = Object.freeze({
            type: "authenticated",
            userId: snapshot.record.user.id,
            groupIds: snapshot.record.groupIds,
            permissions: snapshot.record.permissions,
          });
          lease = createLease(
            { identity, witness: snapshot.record.locator, storedExpiry: snapshot.storedExpiry },
            selector,
            captured,
          );
          observation = Object.freeze({ type: "active", lease, record: copyIssuerSessionRecord(snapshot.record) });
        } else if (snapshot.type === "expired") {
          observation = Object.freeze({ type: "expired", record: copyIssuerSessionRecord(snapshot.record) });
        } else if (snapshot.type === "expiry-margin") {
          observation = Object.freeze({ type: "expiry-margin" });
        } else observation = Object.freeze({ type: "absent" });
        lifetime = createAuthorityLifetime(AbortSignal.any([resource.lifetime, captured.signal]), "AUTHORITY_RELEASED");
        const registration: OwnedObservation = {
          observation,
          snapshot,
          selector,
          operation: captured,
          resource: lifetime,
          consumption: "pending",
          releasing: undefined,
          claim: undefined,
        };
        checkIssuerOperation(captured);
        if (admission.invalidated || (token !== null && fences.has(token)))
          throw new SqlAuthorityError("AUTHORITY_NOT_CURRENT");
        if (lease) {
          if (snapshot.type !== "active") throw new SqlAuthorityError("AUTHORITY_NOT_CURRENT");
          captureOwnedCredential(lease, {
            signal: captured.signal,
            deadlineAt: Math.min(captured.deadlineAt, snapshot.record.locator.hostDeadlineAt),
          });
        }
        observations.set(observation, registration);
        activeObservations.add(observation);
        return observation;
      } catch (error: unknown) {
        const cleanup: Promise<unknown>[] = [];
        if (lease) cleanup.push((async () => lease.releaseAsync())());
        if (lifetime) {
          const current = lifetime;
          cleanup.push((async () => current.closeAsync())());
        }
        const settled = await Promise.allSettled(cleanup);
        const failures: unknown[] = [error];
        for (const item of settled) if (item.status === "rejected") failures.push(item.reason);
        if (failures.length > 1) throw new AggregateError(failures, "Issuer observation and cleanup failed");
        throw error;
      }
    });
  }

  function recheckOwnedSessionObservationAsync(
    observation: OwnedSessionObservation,
    operation: SqlAuthorityOperation,
  ): Promise<void> {
    const owned = observations.get(observation);
    if (!owned || owned.consumption !== "pending") throw new SqlAuthorityError("AUTHORITY_NOT_CURRENT");
    const bounded = observationOperation(owned, operation);
    return runIssuerObservationReadAsync(owned.selector, bounded, (admission) =>
      owned.resource.runAsync(bounded, async () => {
        await recheckObservationSnapshotAsync(owned, bounded);
        if (admission.invalidated || owned.consumption !== "pending")
          throw new SqlAuthorityError("AUTHORITY_NOT_CURRENT");
        if (observation.type === "active") {
          await observation.lease.assertCurrentAsync(bounded);
          captureOwnedCredential(observation.lease, bounded);
        }
        checkIssuerOperation(bounded);
      }),
    );
  }

  async function releaseOwnedSessionObservationAsync(observation: OwnedSessionObservation): Promise<void> {
    const owned = observations.get(observation);
    if (!owned) throw new SqlAuthorityError("AUTHORITY_NOT_CURRENT");
    if (owned.claim) await owned.claim.finished;
    await releaseObservationResourcesAsync(owned);
  }

  function matchesExpiredMutation(
    owned: OwnedObservation,
    mutation: Extract<AuthSessionMutation, { kind: "expire" }>,
  ): boolean {
    const snapshot = owned.snapshot;
    if (snapshot.type !== "expired" || owned.observation.type !== "expired" || mutation.kind !== "expire") return false;
    const record = snapshot.record;
    if (
      mutation.credential !== owned.observation.record.locator ||
      !sameCredentialWitness(mutation.credential, record.locator) ||
      mutation.session.sessionToken !== record.session.sessionToken ||
      mutation.session.userId !== record.user.id ||
      !(mutation.session.expires instanceof Date) ||
      mutation.session.expires.getTime() !== record.locator.expiresAt ||
      mutation.user.id !== record.user.id ||
      mutation.user.provider !== record.user.provider ||
      mutation.user.name !== record.user.name ||
      mutation.user.email !== record.user.email ||
      mutation.user.image !== record.user.image ||
      mutation.user.password !== record.user.password ||
      (mutation.account !== undefined && mutation.account.userId !== record.user.id)
    )
      return false;
    if (record.user.emailVerified === null) return mutation.user.emailVerified === null;
    return (
      mutation.user.emailVerified instanceof Date &&
      mutation.user.emailVerified.getTime() === record.user.emailVerified.getTime()
    );
  }

  function matchesExpiredResult(claim: OwnedExpiryClaim, result: AuthSessionSqlResult): boolean {
    const snapshot = claim.owned.snapshot;
    if (snapshot.type !== "expired" || result.kind !== "revoked" || result.credential !== null) return false;
    const expected = snapshot.record;
    if (
      result.user.id !== expected.user.id ||
      result.user.provider !== expected.user.provider ||
      result.user.name !== expected.user.name ||
      result.user.email !== expected.user.email ||
      result.user.image !== expected.user.image ||
      result.user.colorScheme !== expected.user.colorScheme ||
      !(result.session.expires instanceof Date) ||
      result.session.expires.getTime() !== expected.locator.expiresAt ||
      result.session.sessionToken !== expected.locator.token ||
      result.session.userId !== expected.user.id ||
      !Array.isArray(result.groupIds) ||
      !Array.isArray(result.permissions) ||
      result.groupIds.length > frozenConfiguration.maximumSnapshotRows ||
      result.permissions.length > frozenConfiguration.maximumSnapshotRows
    )
      return false;
    if (expected.user.emailVerified === null) {
      if (result.user.emailVerified !== null) return false;
    } else if (
      !(result.user.emailVerified instanceof Date) ||
      result.user.emailVerified.getTime() !== expected.user.emailVerified.getTime()
    )
      return false;
    const groups = new Set<string>();
    for (const groupId of result.groupIds) {
      if (typeof groupId !== "string" || groupId.length === 0 || groups.has(groupId)) return false;
      groups.add(groupId);
    }
    const permissions = new Set<GroupPermissionKey>();
    for (const grant of result.permissions) {
      const permission = groupPermissionKeys.find((key) => key === grant.permission);
      if (!groups.has(grant.groupId) || !permission) return false;
      permissions.add(permission);
    }
    const groupIds = [...groups].toSorted();
    const expanded = getPermissionsWithChildren([...permissions]).toSorted();
    return (
      groupIds.length === expected.groupIds.length &&
      groupIds.every((id, index) => id === expected.groupIds[index]) &&
      expanded.length === expected.permissions.length &&
      expanded.every((permission, index) => permission === expected.permissions[index])
    );
  }

  function expireOwnedSessionAsync(
    observation: OwnedSessionObservation,
    operation: SqlAuthorityOperation,
    mutation: Extract<AuthSessionMutation, { kind: "expire" }>,
  ): Promise<OwnedSessionDisposition> {
    const held: OwnedSessionDisposition = Object.freeze({
      kind: "expire",
      publication: "held",
      state: "held-without-dispatch",
    });
    const producer = sessionProducer;
    const sqlConfiguration = sessionConfiguration;
    const owned = observations.get(observation);
    if (
      !producer ||
      !sqlConfiguration ||
      !owned ||
      owned.consumption !== "pending" ||
      owned.snapshot.type !== "expired"
    )
      return Promise.resolve(held);
    let bounded: SqlAuthorityOperation;
    let claim: OwnedExpiryClaim;
    const completion = Promise.withResolvers<OwnedSessionDisposition>();
    try {
      bounded = observationOperation(owned, operation);
      if (!matchesExpiredMutation(owned, mutation)) throw new SqlAuthorityError("AUTHORITY_NOT_CURRENT");
      const token = owned.snapshot.record.locator.token;
      if (fences.has(token)) throw new SqlAuthorityError("AUTHORITY_NOT_CURRENT");
      const capturedMutation = structuredClone(mutation);
      const finished = Promise.withResolvers<void>();
      const marked = [...(admissions.get(token) ?? [])];
      const fence: TokenRevocationFence = {
        token,
        admissions: marked,
        finished: finished.promise,
        finish: finished.resolve,
      };
      claim = {
        owned,
        fence,
        mutation: capturedMutation,
        finished: completion.promise,
        evidence: { type: "not-dispatched" },
        cleanup: [],
        failures: [],
      };
      owned.consumption = "claimed";
      owned.claim = claim;
      fences.set(token, fence);
      for (const admission of marked) admission.invalidated = true;
    } catch {
      return Promise.resolve(held);
    }
    const capturedClaim = claim;
    expiryTasks.add(completion.promise);
    let cleaning: Promise<void> | undefined;
    const cleanupClaimAsync = (): Promise<void> => {
      if (cleaning) return cleaning;
      const completion = Promise.withResolvers<void>();
      cleaning = completion.promise;
      const cleanup = async () => {
        try {
          const snapshot = owned.snapshot;
          const evidence = capturedClaim.evidence;
          if (snapshot.type !== "absent" && (evidence.type === "confirmed" || evidence.type === "ambiguous")) {
            const retirement = await Promise.allSettled([
              settleMatchingLeasesAsync({ witness: snapshot.record.locator, storedExpiry: snapshot.storedExpiry }),
            ]);
            for (const item of retirement) {
              capturedClaim.cleanup.push(item);
              if (item.status === "fulfilled") capturedClaim.cleanup.push(...item.value);
            }
          }
          capturedClaim.cleanup.push(...(await Promise.allSettled([releaseObservationResourcesAsync(owned)])));
        } finally {
          capturedClaim.cleanup.push(...(await Promise.allSettled([finishFenceAsync(capturedClaim.fence)])));
        }
      };
      void cleanup().then(completion.resolve, completion.reject);
      return completion.promise;
    };
    const perform = async (): Promise<OwnedSessionDisposition> => {
      let state: OwnedSessionDisposition["state"] = "held-without-dispatch";
      try {
        await Promise.allSettled(capturedClaim.fence.admissions.map((admission) => admission.finished));
        await recheckObservationSnapshotAsync(owned, bounded);
        checkIssuerOperation(bounded);
        if (fences.get(capturedClaim.fence.token) !== capturedClaim.fence)
          throw new SqlAuthorityError("AUTHORITY_NOT_CURRENT");
        const native = Object.freeze({
          signal: bounded.signal,
          deadlineAt: bounded.deadlineAt,
          lifetime: AbortSignal.any([resource.lifetime, owned.resource.lifetime, sqlConfiguration.lifetime]),
        });
        let nativePromise: Promise<AuthSessionSqlResult> | undefined;
        capturedClaim.evidence = { type: "invoked" };
        try {
          nativePromise = producer.expireAsync(native, capturedClaim.mutation);
          capturedClaim.evidence = { type: "pending", promise: nativePromise };
          const result = await nativePromise;
          capturedClaim.evidence = { type: "confirmed", promise: nativePromise, result };
        } catch (error: unknown) {
          if (error instanceof TransactionCommitAmbiguousError)
            capturedClaim.evidence = { type: "ambiguous", promise: nativePromise, error };
          else capturedClaim.evidence = { type: "failed", promise: nativePromise, error };
          throw error;
        }
        state = "confirmed-commit-settlement-failed";
        const evidence = capturedClaim.evidence;
        if (!matchesExpiredResult(capturedClaim, evidence.result)) throw new SqlAuthorityError("AUTHORITY_NOT_CURRENT");
        checkIssuerOperation(bounded);
        owned.resource.check(bounded);
        state = "confirmed-commit";
      } catch (error: unknown) {
        capturedClaim.failures.push(error);
        const evidence = capturedClaim.evidence;
        if (evidence.type === "confirmed") state = "confirmed-commit-settlement-failed";
        else if (evidence.type === "ambiguous") state = "commit-ambiguous";
        else if (evidence.type !== "not-dispatched") state = "failed-without-confirmed-commit";
      }
      capturedClaim.cleanup.push(...(await Promise.allSettled([cleanupClaimAsync()])));
      if (state === "confirmed-commit" && capturedClaim.cleanup.some((item) => item.status === "rejected"))
        state = "confirmed-commit-settlement-failed";
      return Object.freeze({ kind: "expire", publication: "held", state });
    };
    void Promise.resolve()
      .then(perform)
      .then(
        (result) => {
          expiryTasks.delete(completion.promise);
          completion.resolve(result);
        },
        async (error: unknown) => {
          capturedClaim.failures.push(error);
          capturedClaim.cleanup.push(...(await Promise.allSettled([cleanupClaimAsync()])));
          const evidence = capturedClaim.evidence;
          let state: OwnedSessionDisposition["state"] = "held-without-dispatch";
          if (evidence.type === "confirmed") state = "confirmed-commit-settlement-failed";
          else if (evidence.type === "ambiguous") state = "commit-ambiguous";
          else if (evidence.type !== "not-dispatched") state = "failed-without-confirmed-commit";
          expiryTasks.delete(completion.promise);
          completion.resolve(Object.freeze({ kind: "expire", publication: "held", state }));
        },
      );
    return completion.promise;
  }

  const commitAuthority: SqlAuthorityReader["commitAuthority"] = Object.freeze({
    type: "unsupported",
    reason: "all-enabled-authority-writer-protocol-not-joined",
    requiredJoin: "same-native-transaction-credential-principal-grant-locks-and-validity-through-G3-dispatch",
  });

  const reader: SqlAuthorityReader = Object.freeze({
    commitAuthority,
    requireCommitAuthority(): never {
      throw new SqlAuthorityError("COMMIT_AUTHORITY_JOIN_REQUIRED");
    },
    admitOpaqueSessionAsync(
      token: string | null | undefined,
      operation: SqlAuthorityOperation,
    ): Promise<SqlAuthorityAdmission> {
      checkOpen();
      if (token && fences.has(token)) throw new SqlAuthorityError("AUTHORITY_NOT_CURRENT");
      const completion = Promise.withResolvers<void>();
      const admission: OpaqueAdmission = { invalidated: false, finished: completion.promise };
      if (token) {
        let tracked = admissions.get(token);
        if (!tracked) {
          tracked = new Set();
          admissions.set(token, tracked);
        }
        tracked.add(admission);
      }
      const finish = () => {
        if (token) {
          const tracked = admissions.get(token);
          tracked?.delete(admission);
          if (tracked?.size === 0) admissions.delete(token);
        }
        completion.resolve();
      };
      try {
        const capturedOperation = { signal: operation.signal, deadlineAt: operation.deadlineAt };
        const task = resource.runAsync<SqlAuthorityAdmission>(capturedOperation, async () => {
          if (frozenConfiguration.opaqueSessions.type === "disabled") throw new SqlAuthorityError("READER_DISABLED");
          if (!token) return { type: "anonymous" };
          const selector: CredentialSelector = { type: "opaque-session", token };
          const snapshot = await readSnapshotAsync(selector, capturedOperation, resource.lifetime);
          if (admission.invalidated || fences.has(token)) throw new SqlAuthorityError("AUTHORITY_NOT_CURRENT");
          if (snapshot === null) return { type: "anonymous" };
          return { type: "authenticated-read-snapshot", lease: createLease(snapshot, selector, capturedOperation) };
        });
        return task.finally(finish);
      } catch (error) {
        finish();
        throw error;
      }
    },
    admitApiKeyAsync(
      header: string | null | undefined,
      operation: SqlAuthorityOperation,
    ): Promise<SqlAuthorityAdmission> {
      checkOpen();
      const capturedOperation = { signal: operation.signal, deadlineAt: operation.deadlineAt };
      return resource.runAsync<SqlAuthorityAdmission>(capturedOperation, async () => {
        if (frozenConfiguration.apiKeys.type === "disabled") throw new SqlAuthorityError("READER_DISABLED");
        if (!header) return { type: "anonymous" };
        const parts = header.split(".");
        const [id, token] = parts;
        if (parts.length !== 2 || !id || !token) return { type: "anonymous" };
        const selector: CredentialSelector = { type: "api-key", id };
        const candidate = await readSnapshotAsync(selector, capturedOperation, resource.lifetime);
        if (candidate === null || candidate.witness.type !== "api-key") return { type: "anonymous" };
        let matches: boolean;
        try {
          matches = await comparePasswordsAsync(token, candidate.witness.hash);
        } catch {
          throw new SqlAuthorityError("AUTHORITY_UNAVAILABLE");
        }
        resource.check(capturedOperation);
        if (!matches) return { type: "anonymous" };
        const current = await readSnapshotAsync(selector, capturedOperation, resource.lifetime);
        if (current === null || !sameCredentialWitness(candidate.witness, current.witness))
          return { type: "anonymous" };
        return { type: "authenticated-read-snapshot", lease: createLease(current, selector, capturedOperation) };
      });
    },
    revokeCredentialAsync(): Promise<{ readonly type: "revoked" | "not-current" }> {
      return Promise.reject(new SqlAuthorityError("COMMIT_AUTHORITY_JOIN_REQUIRED"));
    },
    closeAsync(): Promise<void> {
      if (closing) return closing;
      const completion = Promise.withResolvers<void>();
      closing = completion.promise;
      for (const lease of activeLeases) {
        const owned = leases.get(lease);
        if (owned) owned.invalidated = true;
      }
      const closingLeases = [...activeLeases];
      const closingObservations = [...activeObservations];
      const closingExpiryTasks = [...expiryTasks];
      const closingFences = [...fences.values()];
      const drain = async () => {
        const tasks: Promise<unknown>[] = [];
        const closeReader = async () => resource.closeAsync();
        const closeProducer = async () => sessionProducer?.closeAsync();
        try {
          ownerLifetime.abort();
        } catch (error: unknown) {
          tasks.push(Promise.reject(error));
        }
        tasks.push(closeReader(), closeProducer());
        tasks.push(...closingLeases.map(async (lease) => lease.releaseAsync()));
        tasks.push(...closingObservations.map(async (observation) => releaseOwnedSessionObservationAsync(observation)));
        tasks.push(...closingExpiryTasks);
        for (const fence of closingFences) tasks.push(fence.finished);
        const settled = await Promise.allSettled(tasks);
        const failures: unknown[] = [];
        for (const result of settled) if (result.status === "rejected") failures.push(result.reason);
        if (failures.length > 0) throw new AggregateError(failures, "SQL authority operations and cleanup failed");
      };
      void drain().then(completion.resolve, completion.reject);
      return closing;
    },
  });

  return {
    reader,
    sessionProducer,
    revokeOwnedSessionAsync,
    captureOwnedCredential,
    observeSessionForIssuerAsync,
    recheckOwnedSessionObservationAsync,
    releaseOwnedSessionObservationAsync,
    expireOwnedSessionAsync,
  };
}

export function createSqlAuthorityReader(configuration: SqlAuthorityConfiguration): SqlAuthorityReader {
  return constructSqlAuthority({ type: "reader", configuration }).reader;
}

export function createSqlSessionAuthorityOwner(
  configuration: SqlAuthorityConfiguration & { readonly runtime: PersistenceRuntime },
  sessionConfiguration: AuthSessionSqlConfiguration,
) {
  const owner = constructSqlAuthority({ type: "session-owner", configuration, sessionConfiguration });
  const producer = owner.sessionProducer;
  if (producer === undefined) throw new SqlAuthorityError("INVALID_CONFIGURATION");
  return Object.freeze({
    reader: owner.reader,
    producer: Object.freeze({ establishAsync: producer.establishAsync, renewAsync: producer.renewAsync }),
    revokeOwnedSessionAsync: owner.revokeOwnedSessionAsync,
    captureOwnedCredential: owner.captureOwnedCredential,
    observeSessionForIssuerAsync: owner.observeSessionForIssuerAsync,
    recheckOwnedSessionObservationAsync: owner.recheckOwnedSessionObservationAsync,
    releaseOwnedSessionObservationAsync: owner.releaseOwnedSessionObservationAsync,
    expireOwnedSessionAsync: owner.expireOwnedSessionAsync,
    closeAsync: owner.reader.closeAsync,
  });
}
