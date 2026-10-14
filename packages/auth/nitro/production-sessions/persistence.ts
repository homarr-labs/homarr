import type { AdapterAccount, AdapterSession, AdapterUser } from "@auth/core/adapters";

import type { OwnedSessionObservation, SqlAuthorityReadLease, SqlAuthorityReader } from "../sql-authority/contracts";

export type IssuerSessionReadLease = SqlAuthorityReadLease;
export type IssuerSessionAuthorityPort = Pick<SqlAuthorityReader, "admitOpaqueSessionAsync">;

export interface IssuerUserRecord {
  readonly id: string;
  readonly name: string | null;
  readonly email: string | null;
  readonly emailVerified: Date | null;
  readonly image: string | null;
  readonly password: string | null;
  readonly provider: "credentials" | "ldap" | "oidc";
  readonly colorScheme: string;
}

export interface IssuerReadRepository {
  findUserById(id: string): Promise<IssuerUserRecord | null>;
  findUserByName(selector: { name: string; provider: "credentials" }): Promise<IssuerUserRecord | null>;
  findUserByEmail(selector: {
    email: string;
    provider: "credentials" | "ldap" | "oidc";
  }): Promise<IssuerUserRecord | null>;
  findAccount(selector: { provider: string; providerAccountId: string }): Promise<AdapterAccount | null>;
  findSession(sessionToken: string): Promise<{ session: AdapterSession; user: IssuerUserRecord } | null>;
}

export type IssuerReadWitness =
  | { readonly kind: "user-id"; readonly id: string; readonly selected: IssuerUserRecord | null }
  | {
      readonly kind: "user-name";
      readonly name: string;
      readonly provider: "credentials";
      readonly selected: IssuerUserRecord | null;
    }
  | {
      readonly kind: "user-email";
      readonly email: string;
      readonly provider: "credentials" | "ldap" | "oidc";
      readonly selected: IssuerUserRecord | null;
    }
  | {
      readonly kind: "account";
      readonly provider: string;
      readonly providerAccountId: string;
      readonly selected: AdapterAccount | null;
    }
  | {
      readonly kind: "session";
      readonly token: string;
      readonly selected: { session: AdapterSession; user: IssuerUserRecord } | null;
    };

export type IssuerEffect =
  | { readonly kind: "create-user"; readonly user: IssuerUserRecord }
  | { readonly kind: "update-user"; readonly user: Partial<AdapterUser> & Pick<AdapterUser, "id"> }
  | { readonly kind: "link-account"; readonly account: AdapterAccount }
  | { readonly kind: "create-session"; readonly session: AdapterSession }
  | { readonly kind: "renew-session"; readonly previous: AdapterSession; readonly session: AdapterSession }
  | { readonly kind: "delete-session"; readonly session: AdapterSession }
  | {
      readonly kind: "expire-session";
      readonly session: AdapterSession;
      readonly observation: Extract<OwnedSessionObservation, { type: "expired" }>;
    }
  | {
      readonly kind: "login-effects";
      readonly userId: string;
      readonly name: string | null;
      readonly image: { readonly kind: "preserve" } | { readonly kind: "external"; readonly value: string };
      readonly groups:
        | { readonly kind: "preserve" }
        | { readonly kind: "synchronize-existing"; readonly names: readonly string[] };
      readonly everyone: "existing-group-only";
      readonly colorScheme: string;
    };

export class IssuerStagingError extends Error {
  readonly code = "ISSUER_STAGING_FAILED";

  constructor(
    cause?: unknown,
    readonly criticalStage?: "cleanup",
  ) {
    super("Authentication staging failed", { cause });
    this.name = "IssuerStagingError";
  }
}

export class IssuerDurableJoinRequiredError extends Error {
  readonly code = "ISSUER_DURABLE_JOIN_REQUIRED";

  constructor() {
    super("Frozen native session establishment and critical-operation settlement are not joined");
    this.name = "IssuerDurableJoinRequiredError";
  }
}

export class IssuerOperationLedger {
  private pending = 0;
  private failed = false;
  private failure: unknown;
  private sealed = false;
  private readonly completed = new Set<string>();
  private readonly tasks = new Set<Promise<unknown>>();
  private coreNegative: "credentials" | "csrf" | undefined;

  fail(): void {
    this.failed = true;
  }

  recordCoreNegative(type: "credentials" | "csrf"): void {
    if (this.sealed || this.failed || this.coreNegative) throw new IssuerStagingError();
    this.coreNegative = type;
    this.completed.add(`core-negative-${type}`);
  }

  async run<T>(name: string, operation: () => Promise<T>): Promise<T> {
    if (this.sealed || this.failed) throw new IssuerStagingError();
    return this.settle(name, operation);
  }

  async settle<T>(name: string, operation: () => Promise<T>): Promise<T> {
    if (this.sealed) throw new IssuerStagingError();
    this.pending += 1;
    const task = Promise.resolve().then(operation);
    this.tasks.add(task);
    try {
      const result = await task;
      this.completed.add(name);
      return result;
    } catch (error: unknown) {
      this.failed = true;
      const failure = new IssuerStagingError(error);
      if (name === "ldap-disconnect") {
        const cleanupFailure = new IssuerStagingError(error, "cleanup");
        this.failure = cleanupFailure;
        throw cleanupFailure;
      }
      this.failure ??= failure;
      throw failure;
    } finally {
      this.tasks.delete(task);
      this.pending -= 1;
    }
  }

  async drainAsync(): Promise<void> {
    while (this.tasks.size > 0) await Promise.allSettled([...this.tasks]);
    if (this.failed) {
      if (this.failure instanceof IssuerStagingError) throw this.failure;
      throw new IssuerStagingError(this.failure);
    }
  }

  seal(required: readonly string[]): void {
    if (this.sealed || this.failed || this.pending !== 0 || required.some((name) => !this.completed.has(name))) {
      throw new IssuerStagingError();
    }
    this.sealed = true;
  }
}

export type LegacyIssuerHttpAction =
  | "legacy-providers"
  | "legacy-csrf"
  | "legacy-signin"
  | "legacy-credentials"
  | "legacy-ldap"
  | "legacy-oidc"
  | "legacy-session"
  | "legacy-signout";

export function safeLegacyIssuerHttpAction(kind: string): kind is LegacyIssuerHttpAction {
  return (
    kind === "legacy-providers" ||
    kind === "legacy-csrf" ||
    kind === "legacy-signin" ||
    kind === "legacy-credentials" ||
    kind === "legacy-ldap" ||
    kind === "legacy-oidc" ||
    kind === "legacy-session" ||
    kind === "legacy-signout"
  );
}

export interface PreparedIssuerOperation {
  readonly kind: "oidc" | "credentials" | "ldap" | "renew" | "logout" | LegacyIssuerHttpAction;
  readonly state: "provisional-awaiting-frozen-durable-join";
}

export interface IssuerOperationBounds {
  readonly signal: AbortSignal;
  readonly lifetime: AbortSignal;
  readonly deadlineAt: number;
}

export type IssuerHttpAction = PreparedIssuerOperation["kind"];

export type IssuerPublicationOutput =
  | { readonly type: "response"; readonly response: Response }
  | { readonly type: "session-cookie-expiry"; readonly setCookie: string };

export type IssuerPublicationOutcome =
  | {
      readonly kind: IssuerHttpAction;
      readonly publication: "released";
      readonly settlement: "confirmed-commit" | "settled-without-write";
      readonly output: IssuerPublicationOutput;
    }
  | { readonly kind: IssuerHttpAction; readonly publication: "rejected-verification" }
  | {
      readonly kind: IssuerHttpAction;
      readonly publication: "held";
      readonly state:
        | "held-without-dispatch"
        | "failed-without-confirmed-commit"
        | "commit-ambiguous"
        | "confirmed-commit-settlement-failed";
      readonly criticalStage:
        | "preparation"
        | "admission"
        | "native"
        | "auth-check"
        | "output"
        | "cleanup"
        | "publication";
    };

export interface PrivateIssuerProposal {
  readonly witnesses: readonly IssuerReadWitness[];
  readonly effects: readonly IssuerEffect[];
  readonly response: Response | null;
  readonly ledger: IssuerOperationLedger;
  readonly bounds: IssuerOperationBounds;
  readonly context: IssuerProposalContext;
  consumption: "pending" | "claimed" | "discarded" | "released" | "held";
}

export interface IssuerProposalContext {
  readonly owner: object;
  readonly scope: object;
  readonly accountSelector: { readonly provider: "oidc"; readonly providerAccountId: string } | null;
  readonly legacy?: {
    readonly request: Request;
    readonly observation: OwnedSessionObservation | null;
    readonly classification:
      | { readonly type: "metadata"; readonly action: "providers" | "csrf" | "signin" }
      | { readonly type: "handshake"; readonly method: "POST" }
      | { readonly type: "verification-rejected"; readonly provider: "credentials" }
      | { readonly type: "csrf-rejected" }
      | { readonly type: "login"; readonly provider: "credentials" | "ldap" | "oidc"; readonly userId: string }
      | { readonly type: "session-absent" }
      | { readonly type: "session-active"; readonly due: boolean }
      | { readonly type: "session-expired" }
      | { readonly type: "signout"; readonly session: "active" | "expired" | "absent" };
    readonly callbackUrl: string;
    readonly coreStartedAt: number;
    readonly coreFinishedAt: number;
    readonly browserExpiresAt: number | null;
    readonly maxAgeSeconds: number;
    readonly updateAgeSeconds: number;
  };
  readonly classification?:
    | { readonly type: "write" }
    | { readonly type: "oidc-read"; readonly action: "csrf" | "providers" | "signin" }
    | { readonly type: "oidc-handshake"; readonly method: "GET" | "POST" }
    | { readonly type: "renew-not-due"; readonly dueAt: number; readonly decidedAt: number };
}

const proposals = new WeakMap<PreparedIssuerOperation, PrivateIssuerProposal>();

export function retainPreparedIssuerOperation(
  kind: PreparedIssuerOperation["kind"],
  witnesses: readonly IssuerReadWitness[],
  effects: readonly IssuerEffect[],
  response: Response | null,
  ledger: IssuerOperationLedger,
  required: readonly string[],
  bounds: IssuerOperationBounds,
  context: IssuerProposalContext,
): PreparedIssuerOperation {
  ledger.seal(required);
  const prepared = Object.freeze({ kind, state: "provisional-awaiting-frozen-durable-join" });
  proposals.set(prepared, {
    witnesses: [...witnesses],
    effects: [...effects],
    response,
    ledger,
    bounds: { ...bounds },
    context,
    consumption: "pending",
  });
  return prepared;
}

export function claimPreparedIssuerProposal(prepared: PreparedIssuerOperation, owner: object): PrivateIssuerProposal {
  const proposal = proposals.get(prepared);
  if (!proposal || proposal.context.owner !== owner || proposal.consumption !== "pending")
    throw new IssuerStagingError();
  proposal.consumption = "claimed";
  return proposal;
}

export function discardPreparedIssuerProposal(prepared: PreparedIssuerOperation, owner: object): PrivateIssuerProposal {
  const proposal = claimPreparedIssuerProposal(prepared, owner);
  proposal.consumption = "discarded";
  return proposal;
}

export function finishClaimedIssuerProposal(
  prepared: PreparedIssuerOperation,
  owner: object,
  proposal: PrivateIssuerProposal,
  consumption: "released" | "held",
): void {
  if (proposals.get(prepared) !== proposal || proposal.context.owner !== owner || proposal.consumption !== "claimed")
    throw new IssuerStagingError();
  proposal.consumption = consumption;
}

export function snapshotIssuerUser(user: IssuerUserRecord): IssuerUserRecord {
  let emailVerified: Date | null = null;
  if (user.emailVerified) emailVerified = new Date(user.emailVerified);
  return Object.freeze({ ...user, emailVerified });
}

export function snapshotIssuerSession(session: AdapterSession): AdapterSession {
  return { ...session, expires: new Date(session.expires) };
}

export function projectAdapterUser(user: IssuerUserRecord): AdapterUser {
  let email = user.email;
  if (email === null) email = "";
  let emailVerified: Date | null = null;
  if (user.emailVerified) emailVerified = new Date(user.emailVerified);
  return { id: user.id, name: user.name, email, emailVerified, image: user.image };
}
