import { Buffer, constants } from "node:buffer";

import type { AdapterAccount } from "@auth/core/adapters";

import { sql } from "@homarr/db";
import type { AppMutation, AppMutationResult } from "@homarr/db/runtime-app";
import { AppMutationPreconditionError } from "@homarr/db/runtime-app";
import type { NativeCredentialEvidence, NativeCredentialPolicyConfiguration } from "@homarr/db/runtime-auth-credential";
import type { BoardPermissionsMutation, BoardPermissionReplacement } from "@homarr/db/runtime-board";
import { BoardPermissionsMutationError } from "@homarr/db/runtime-board";
import { OnboardingCoreReadError, TransactionCommitAmbiguousError } from "@homarr/db/runtime";
import type {
  OnboardingCoreReadAuthority,
  OnboardingCoreReadBounds,
  OnboardingCoreReadConfiguration,
  OnboardingCoreReadResult,
  OnboardingCoreReadSelection,
  OnboardingClaimAuthority,
  OnboardingClaimInvocation,
  OnboardingClaimResult,
  OnboardingInitialExternalGroupInvocation,
  OnboardingInitUserInvocation,
  OnboardingNextStepInvocation,
  OnboardingNativePublicationRead,
  OnboardingObservedDispatch,
  OnboardingInvocation,
  OnboardingOperation,
  OnboardingRetainedAuthority,
  OnboardingSqlConfiguration,
  PersistenceRuntime,
} from "@homarr/db/runtime";
import type {
  AuthAccountWitness,
  AuthIdentitySelection,
  AuthLoginEffects,
  AuthSessionMutation,
  AuthSessionSqlConfiguration,
  AuthSessionSqlResult,
  AuthSessionWitness,
  AuthUserWitness,
} from "@homarr/db/runtime-auth-session";
import { colorSchemeCookieKey, getPermissionsWithChildren, groupPermissionKeys } from "@homarr/definitions";
import type { ColorScheme, GroupPermissionKey, SupportedAuthProvider } from "@homarr/definitions";

import { createCookies, sessionTokenCookieName, writeSessionTokenCookie } from "../session-primitives";
import type { AuthCookieConfiguration } from "../session-primitives";
import { createSqlSessionAuthorityOwner } from "../sql-authority/authority";
import { SqlAuthorityError } from "../sql-authority/contracts";
import type {
  SqlAuthorityAdmission,
  SqlAuthorityConfiguration,
  SqlAuthorityOperation,
  SqlAuthorityReader,
  SqlAuthorityReadLease,
  OwnedSessionObservation,
  OwnedSessionDisposition,
} from "../sql-authority/contracts";
import { sameCredentialWitness } from "../sql-authority/snapshots";
import {
  claimPreparedIssuerProposal,
  discardPreparedIssuerProposal,
  finishClaimedIssuerProposal,
  IssuerDurableJoinRequiredError,
  IssuerOperationLedger,
  IssuerStagingError,
  safeLegacyIssuerHttpAction,
} from "./persistence";
import type {
  IssuerOperationBounds,
  IssuerHttpAction,
  IssuerPublicationOutcome,
  IssuerPublicationOutput,
  IssuerUserRecord,
  PreparedIssuerOperation,
  PrivateIssuerProposal,
} from "./persistence";
import { createIssuerSqlRepository } from "./repository";
import { readSingleCookie } from "./origin";
import type { IssuerOriginConfiguration } from "./origin";
import type { IssuerBodyBudget } from "./bounded-body";
import {
  captureOwnedOnboardingStep,
  createOnboardingPacketHandle,
  createOnboardingFrameHandle,
  createOnboardingInputTicket,
  createOnboardingCsrfHandle,
  createOnboardingPublicationHandle,
  createInitialExternalGroupHandle,
  createOnboardingClaimHandle,
  createOnboardingInitUserHandle,
  createOnboardingRequestHandle,
  createOnboardNextStepHandle,
  createProductionOnboardingConfiguration,
  OwnedOnboardingRequestState,
  OwnedOnboardingNativePublication,
  onboardingRpcCommand,
  onboardingOwnRecord,
  prepareOwnedInitialExternalGroupAsync,
  prepareOwnedOnboardingClaimOutput,
  prepareOwnedOnboardingUserAsync,
  prepareOwnedOnboardingUserInputAsync,
  prepareOwnedInitialExternalGroupInput,
  readOwnedOnboardingResponseAsync,
  ProductionOnboardingError,
} from "./onboarding";
import type {
  OnboardingCleanupFailure,
  PreparedProductionInitialExternalGroup,
  PreparedProductionOnboardingClaim,
  PreparedProductionOnboardingInitUser,
  PreparedProductionOnboardingOperation,
  PreparedProductionOnboardNextStep,
  ProductionOnboardingClaimOutput,
  ProductionOnboardingConfiguration,
  ProductionOnboardingPolicy,
  ProductionOnboardingRequest,
  ProductionOnboardingRpcPacket,
  ProductionOnboardingRpcFrame,
  ProductionOnboardingRpcContext,
  ProductionOnboardingRpcInputSource,
  ProductionOnboardingInputTicket,
  ProductionOnboardNextStepInputTicket,
  ProductionOnboardingInitUserInputTicket,
  ProductionInitialExternalGroupInputTicket,
  ProductionOnboardingCsrfRequest,
  ProductionOnboardingCsrfOutput,
  ProductionOnboardingPublication,
  ProductionOnboardingPublicationResult,
  ProductionOnboardingResponseOutcome,
  OwnedOnboardingPublicationClock,
} from "./onboarding";
import type { ProductionSessionIssuer, ProductionSessionRequestConfiguration } from "./service";

export interface ProductionSessionSqlOwner {
  readonly kind: "fixed-native-session-owner";
}

export type ProductionSessionRequestReader = Pick<SqlAuthorityReader, "admitOpaqueSessionAsync" | "admitApiKeyAsync">;

export interface ProductionSessionRequestUser {
  readonly id: string;
  readonly name: string | null;
  readonly email: string | null;
  readonly image: string | null;
  readonly colorScheme: ColorScheme;
  readonly provider: SupportedAuthProvider;
  readonly permissions: readonly GroupPermissionKey[];
}

export type CoreSelection = OnboardingCoreReadSelection;
export type CoreReadResult = OnboardingCoreReadResult;
export type CoreConfiguration = Pick<
  OnboardingCoreReadConfiguration,
  "version" | "dockerEnabled" | "kubernetesEnabled" | "workshopApiUrl" | "workshopUrl" | "maximumResponseBytes"
>;

export interface CoreRequest<Selection extends CoreSelection> {
  admitAsync(): Promise<ProductionSessionRequestUser | null>;
  readOnceAsync(): Promise<Extract<CoreReadResult, { selection: Selection }>>;
  assertCurrentAsync(): Promise<void>;
  retireWorkAsync(): Promise<void>;
  closeAsync(): Promise<void>;
}

export interface CoreCurrentStepRequest extends CoreRequest<"current-step"> {
  resolveRpcBodyAsync(): Promise<unknown>;
}

export type CoreEnvironmentRequest = CoreRequest<"environment">;

export interface ProductionOnboardingCoreController {
  captureCurrentStep(
    request: Request,
    requestId: string,
    signal: AbortSignal,
    lifetime: AbortSignal,
  ): CoreCurrentStepRequest;
  captureEnvironment(
    request: Request,
    requestId: string,
    signal: AbortSignal,
    lifetime: AbortSignal,
  ): CoreEnvironmentRequest;
  closeAsync(): Promise<void>;
}

interface OwnedCoreController {
  readonly owner: WeakRef<ProductionSessionSqlOwner>;
  readonly issuer: WeakRef<object>;
  readonly onboarding: WeakRef<NonNullable<OwnedSql["onboarding"]>>;
  readonly configuration: OnboardingCoreReadConfiguration;
  readonly controller: ProductionOnboardingCoreController;
  readonly captures: Set<OwnedCoreCapture>;
  readonly capturedRequests: WeakSet<Request>;
  cleanup: { readonly kind: "none" } | { readonly kind: "failed"; readonly error: unknown };
  closing: Promise<void> | undefined;
}

type CoreCredentialPresentation =
  | { readonly kind: "absent" }
  | { readonly kind: "opaque-session"; readonly token: string }
  | { readonly kind: "api-key"; readonly header: string };

interface OwnedCoreCapture {
  readonly slot: OwnedCoreController;
  readonly request: Request;
  readonly requestId: string;
  readonly requestSignal: AbortSignal;
  readonly rootSignal: AbortSignal;
  readonly rootLifetime: AbortSignal;
  readonly selection: CoreSelection;
  readonly method: string;
  readonly url: string;
  readonly headers: string;
  readonly body: ReadableStream<Uint8Array> | null;
  readonly interpretation: "json" | "none";
  readonly presentation: CoreCredentialPresentation;
  readonly claimToken: string | null;
  readonly original: OnboardingOperation;
  readonly externalController: AbortController;
  readonly workController: AbortController;
  readonly workSignal: AbortSignal;
  readonly tasks: Set<Promise<unknown>>;
  readonly workTasks: Set<Promise<unknown>>;
  readonly cleanup: unknown[];
  failure: { readonly kind: "none" } | { readonly kind: "failed"; readonly error: unknown };
  deadlineAt: number;
  monotonicExpiresAt: number;
  lastMonotonicAt: number;
  lastWallAt: number;
  lastConfiguredAt: number;
  timer: ReturnType<typeof setTimeout> | undefined;
  detach: () => void;
  bodyStarted: boolean;
  bodySettlement: "unstarted" | "running" | "complete" | "failed";
  admission: Promise<ProductionSessionRequestUser | null> | undefined;
  packet: Promise<string | undefined> | undefined;
  read: Promise<CoreReadResult> | undefined;
  lease: SqlAuthorityReadLease | undefined;
  registration: OwnedRequestLease | undefined;
  retirement: Promise<void> | undefined;
  closing: Promise<void> | undefined;
}

type RequestCredential =
  | { readonly type: "opaque-session"; readonly token: string }
  | { readonly type: "api-key"; readonly id: string; readonly header: string };

interface OwnedRequestLease {
  readonly credential: RequestCredential;
  readonly evidence: NativeCredentialEvidence;
  readonly operation: SqlAuthorityOperation;
  readonly authorityOperation: SqlAuthorityOperation;
  readonly identity: SqlAuthorityReadLease["identity"];
  provider: SupportedAuthProvider | undefined;
}

interface OwnedScope {
  readonly owner: ProductionSessionSqlOwner;
  readonly controller: AbortController;
  readonly bounds: IssuerOperationBounds;
  readonly reads: Set<Promise<unknown>>;
  readonly repository: ReturnType<typeof createIssuerSqlRepository>;
  lease: SqlAuthorityReadLease | null;
  leaseOperation: SqlAuthorityOperation | null;
  observation: OwnedSessionObservation | null;
  observationOperation: SqlAuthorityOperation | null;
  clampDeadline: (deadlineAt: number) => void;
  detach: () => void;
  closing: Promise<void> | undefined;
}

interface OwnedSql {
  readonly runtime: PersistenceRuntime;
  readonly configuration: AuthSessionSqlConfiguration;
  readonly controller: AbortController;
  readonly authority: ReturnType<typeof createSqlSessionAuthorityOwner>;
  readonly scopes: Set<object>;
  readonly pending: Set<Promise<unknown>>;
  readonly requestReads: Set<Promise<unknown>>;
  readonly requestWrites: Set<Promise<unknown>>;
  readonly requestLeases: WeakMap<SqlAuthorityReadLease, OwnedRequestLease>;
  readonly onboardingRequests: Set<OwnedOnboardingRequest>;
  readonly capturedOnboardingRequests: WeakSet<Request>;
  readonly onboardingPublications: Set<OwnedOnboardingPublication>;
  readonly onboardingNativePublications: Set<OwnedOnboardingNativePublication>;
  core: OwnedCoreController | undefined;
  onboardingCleanup: OnboardingOwnerCleanup;
  onboarding:
    | {
        readonly issuer: object;
        readonly configuration: ProductionOnboardingConfiguration;
        readonly inputSource: ProductionOnboardingRpcInputSource | undefined;
      }
    | undefined;
  closing: Promise<void> | undefined;
}

interface OwnedOnboardingRequest {
  readonly owner: ProductionSessionSqlOwner;
  readonly issuer: object;
  readonly handle: ProductionOnboardingRequest;
  readonly state: OwnedOnboardingRequestState;
  readonly tasks: Set<Promise<unknown>>;
  phase: "captured" | "preparing" | "prepared" | "dispatching" | "settled" | "failed";
  lease: SqlAuthorityReadLease | null;
  prepared: OwnedPreparedOnboarding | undefined;
  native: RequestWriteSettlement;
  failure: { readonly type: "none" } | { readonly type: "failed"; readonly error: unknown };
  confirmed: boolean;
  retired: boolean;
  detach: () => void;
  closing: Promise<void> | undefined;
  retirement:
    | { readonly type: "none" }
    | { readonly type: "pending"; readonly promise: Promise<OnboardingRetirementResult> }
    | {
        readonly type: "settled";
        readonly promise: Promise<OnboardingRetirementResult>;
        readonly result: OnboardingRetirementResult;
      };
  packet: OwnedOnboardingPacket | undefined;
  frame: OwnedOnboardingFrame | undefined;
  csrf: ProductionOnboardingCsrfRequest | undefined;
  csrfOutput: ProductionOnboardingCsrfOutput | undefined;
  nativePublication: OwnedOnboardingNativePublication | undefined;
  publication: OwnedOnboardingPublication | undefined;
  finalContext: WeakRef<ProductionOnboardingRpcContext> | undefined;
}

interface OwnedOnboardingPacket {
  readonly handle: ProductionOnboardingRpcPacket;
  readonly record: OwnedOnboardingRequest;
  readonly task: Promise<ProductionOnboardingRpcPacket>;
}

interface OwnedOnboardingFrame {
  readonly handle: ProductionOnboardingRpcFrame;
  readonly ticket: ProductionOnboardingInputTicket;
  readonly packet: OwnedOnboardingPacket;
  readonly context: ProductionOnboardingRpcContext;
  readonly source: ProductionOnboardingRpcInputSource;
  consumed: boolean;
}

interface OwnedOnboardingPublication {
  readonly handle: ProductionOnboardingPublication;
  readonly issuer: WeakRef<object>;
  readonly clock: OwnedOnboardingPublicationClock;
  readonly response: Response;
  readonly responseHeaders: string;
  readonly responseStatus: number;
  readonly sourceOutcome: "output" | "error";
  readonly tasks: Set<Promise<unknown>>;
  readonly maximumBytes: number;
  native: OwnedOnboardingNativePublication | undefined;
  nativeRead: OnboardingNativePublicationRead | null;
  primary: { readonly kind: "none" } | { readonly kind: "failed"; readonly error: unknown };
  cleanupFailures: OnboardingCleanupFailure[];
  body: Uint8Array<ArrayBuffer> | undefined;
  ready: Promise<ProductionOnboardingPublication>;
  completion: Promise<ProductionOnboardingPublicationResult> | undefined;
  output: "pending" | "settled" | "failed";
  readonly controller: AbortController;
  readonly finalContext: WeakRef<ProductionOnboardingRpcContext> | undefined;
}

type OnboardingOwnerCleanup =
  | { readonly type: "none" }
  | {
      readonly type: "failed";
      readonly first: OnboardingCleanupFailure;
      readonly failedRetirements: number;
      readonly countStatus: "exact" | "saturated";
    };

type OnboardingRetirementResult = {
  readonly primary: OwnedOnboardingRequest["failure"];
  readonly native: RequestWriteSettlement;
  readonly confirmed: boolean;
} & (
  | { readonly kind: "settled" }
  | {
      readonly kind: "cleanup-failed";
      readonly cleanupFailures: readonly [OnboardingCleanupFailure, ...OnboardingCleanupFailure[]];
    }
);

class OnboardingOwnerCleanupError extends Error {
  constructor(
    readonly firstPhase: OnboardingCleanupFailure["phase"],
    readonly failedRetirements: number,
    readonly countStatus: "exact" | "saturated",
    cause: unknown,
  ) {
    super("Onboarding owner cleanup failed", { cause });
    this.name = "OnboardingOwnerCleanupError";
  }
}

type OwnedPreparedOnboarding =
  | {
      readonly kind: "claim";
      readonly handle: PreparedProductionOnboardingClaim;
      readonly invocation: OnboardingClaimInvocation;
      readonly request: OwnedOnboardingRequest;
    }
  | {
      readonly kind: "nextStep";
      readonly handle: PreparedProductionOnboardNextStep;
      readonly invocation: OnboardingNextStepInvocation;
      readonly request: OwnedOnboardingRequest;
    }
  | {
      readonly kind: "initUser";
      readonly handle: PreparedProductionOnboardingInitUser;
      readonly invocation: OnboardingInitUserInvocation;
      readonly request: OwnedOnboardingRequest;
    }
  | {
      readonly kind: "initialExternalGroup";
      readonly handle: PreparedProductionInitialExternalGroup;
      readonly invocation: OnboardingInitialExternalGroupInvocation;
      readonly request: OwnedOnboardingRequest;
    };

const onboardingRequests = new WeakMap<ProductionOnboardingRequest, OwnedOnboardingRequest>();
const preparedOnboarding = new WeakMap<PreparedProductionOnboardingOperation, OwnedPreparedOnboarding>();
const onboardingAdmissionOperations = new WeakMap<SqlAuthorityOperation, OwnedOnboardingRequest>();
const onboardingPackets = new WeakMap<ProductionOnboardingRpcPacket, OwnedOnboardingPacket>();
const onboardingFrames = new WeakMap<ProductionOnboardingRpcFrame, OwnedOnboardingFrame>();
const onboardingTickets = new WeakMap<ProductionOnboardingInputTicket, OwnedOnboardingFrame>();
const onboardingCsrfRequests = new WeakMap<ProductionOnboardingCsrfRequest, OwnedOnboardingRequest>();
const onboardingResponseRequests = new WeakMap<
  ProductionOnboardingRequest | ProductionOnboardingCsrfRequest,
  OwnedOnboardingRequest
>();
const onboardingPublications = new WeakMap<ProductionOnboardingPublication, OwnedOnboardingPublication>();
const onboardingPublicationTasks = new WeakMap<Promise<unknown>, WeakRef<ProductionSessionSqlOwner>>();
const onboardingTasks = new WeakMap<
  Promise<unknown>,
  {
    readonly record: OwnedOnboardingRequest;
    readonly kind: "preparation" | "dispatch" | "projected-admission" | "retirement" | "packet" | "cache" | "csrf";
  }
>();

export type IssuerPersistenceOutcome = {
  readonly kind: PreparedIssuerOperation["kind"];
  readonly publication: "held";
  readonly state:
    | "confirmed-commit"
    | "confirmed-commit-settlement-failed"
    | "commit-ambiguous"
    | "failed-without-confirmed-commit"
    | "held-without-dispatch";
};

const owners = new WeakMap<ProductionSessionSqlOwner, OwnedSql>();
const scopes = new WeakMap<object, OwnedScope>();
const committed = new WeakMap<PreparedIssuerOperation, AuthSessionSqlResult>();
const issuerFailures = new WeakMap<PreparedIssuerOperation, readonly unknown[]>();
type RequestWriteSettlement =
  | { readonly type: "not-dispatched"; readonly error: unknown }
  | { readonly type: "invoked" }
  | { readonly type: "pending"; readonly underlying: Promise<unknown> }
  | { readonly type: "fulfilled"; readonly underlying: Promise<unknown>; readonly value: unknown }
  | {
      readonly type: "rejected" | "ambiguous";
      readonly underlying: Promise<unknown> | undefined;
      readonly error: unknown;
    };
const requestWriteSettlements = new WeakMap<Promise<unknown>, RequestWriteSettlement>();
const logoutDispositions = new WeakMap<
  PreparedIssuerOperation,
  Awaited<ReturnType<OwnedSql["authority"]["revokeOwnedSessionAsync"]>>
>();
const expiryDispositions = new WeakMap<PreparedIssuerOperation, OwnedSessionDisposition>();

interface IssuerHttpCompletion {
  readonly owner: ProductionSessionSqlOwner;
  readonly issuer: ProductionSessionIssuer;
  readonly request: Request;
  readonly kind: IssuerHttpAction;
  readonly configuration: ProductionSessionRequestConfiguration;
  readonly maximumResponseBytes: number;
  bounds: IssuerOperationBounds;
  proposal: PrivateIssuerProposal | undefined;
  stage: Extract<IssuerPublicationOutcome, { publication: "held" }>["criticalStage"];
  failureStage: Extract<IssuerPublicationOutcome, { publication: "held" }>["criticalStage"] | undefined;
  authSettlement: "pending" | "settled";
  cleanupSettlement: "pending" | "settled";
  output: IssuerPublicationOutput | undefined;
  confirmation: AuthSessionSqlResult | undefined;
  native: RequestWriteSettlement | undefined;
  disposition:
    | Awaited<ReturnType<OwnedSql["authority"]["revokeOwnedSessionAsync"]>>
    | OwnedSessionDisposition
    | undefined;
  noWrite:
    | PrivateIssuerProposal["context"]["classification"]
    | NonNullable<PrivateIssuerProposal["context"]["legacy"]>["classification"];
  clampDeadline: (deadlineAt: number) => void;
}

const httpCompletions = new WeakMap<PreparedIssuerOperation, IssuerHttpCompletion>();
const httpIssuerOwners = new WeakMap<ProductionSessionIssuer, ProductionSessionSqlOwner>();

function assertResponseBudget(maximumResponseBytes: number): void {
  if (
    !Number.isSafeInteger(maximumResponseBytes) ||
    maximumResponseBytes <= 0 ||
    maximumResponseBytes > constants.MAX_LENGTH ||
    maximumResponseBytes > constants.MAX_STRING_LENGTH
  )
    throw new IssuerStagingError();
}

function assertHttpCurrent(record: IssuerHttpCompletion): void {
  const value = owned(record.owner);
  assertRequestOwnerOpen(value);
  if (record.configuration.now !== value.configuration.now || record.request.signal.aborted)
    throw new IssuerStagingError();
  assertBounds(value.configuration, record.bounds);
}

export async function settleIssuerResponseAsync(response: Response | null | undefined): Promise<void> {
  if (response?.body && !response.bodyUsed) {
    if (response.body.locked) throw new IssuerStagingError();
    const reader = response.body.getReader();
    const closed = reader.closed.catch(() => undefined);
    try {
      await reader.cancel(new IssuerStagingError());
    } finally {
      await closed;
      reader.releaseLock();
    }
  }
}

async function readIssuerResponseAsync(
  response: Response,
  record: IssuerHttpCompletion,
): Promise<Uint8Array<ArrayBuffer> | null> {
  assertResponseBudget(record.maximumResponseBytes);
  if (response.bodyUsed || response.body?.locked) throw new IssuerStagingError();
  assertHttpCurrent(record);
  if (!response.body) return null;
  const reader = response.body.getReader();
  let cancellation: Promise<void> | undefined;
  let pendingRead: ReturnType<typeof reader.read> | undefined;
  let complete = false;
  let failure: unknown;
  let settlementFailed = false;
  let storage = new Uint8Array(0);
  let size = 0;
  const closed = reader.closed.then(
    () => undefined,
    () => {
      settlementFailed = true;
    },
  );
  const cancel = () => {
    if (cancellation) return;
    try {
      cancellation = reader.cancel(new IssuerStagingError()).catch(() => {
        settlementFailed = true;
      });
    } catch {
      settlementFailed = true;
      cancellation = Promise.resolve();
    }
  };
  const signals = [...new Set([record.bounds.signal, record.bounds.lifetime, record.request.signal])];
  try {
    for (const signal of signals) signal.addEventListener("abort", cancel, { once: true });
    assertHttpCurrent(record);
    while (!complete) {
      assertHttpCurrent(record);
      pendingRead = reader.read();
      const chunk = await pendingRead;
      pendingRead = undefined;
      assertHttpCurrent(record);
      if (chunk.done) {
        complete = true;
        break;
      }
      if (!(chunk.value instanceof Uint8Array) || chunk.value.byteLength > record.maximumResponseBytes - size)
        throw new IssuerStagingError();
      const nextSize = size + chunk.value.byteLength;
      if (nextSize > storage.byteLength) {
        const capacity = Math.min(record.maximumResponseBytes, Math.max(nextSize, storage.byteLength * 2));
        const expanded = new Uint8Array(capacity);
        expanded.set(storage.subarray(0, size));
        storage = expanded;
      }
      storage.set(chunk.value, size);
      size = nextSize;
    }
  } catch (error: unknown) {
    failure = error;
  } finally {
    if (!complete) cancel();
    try {
      if (pendingRead) await pendingRead.catch(() => undefined);
      if (cancellation) await cancellation;
      await closed;
      reader.releaseLock();
    } catch {
      settlementFailed = true;
    } finally {
      for (const signal of signals) signal.removeEventListener("abort", cancel);
    }
  }
  if (failure || settlementFailed) throw new IssuerStagingError(failure);
  assertHttpCurrent(record);
  return storage.subarray(0, size);
}

function issuerSessionCookie(
  configuration: AuthCookieConfiguration,
  session: { readonly sessionToken: string; readonly expires: Date },
): string {
  if (!Number.isSafeInteger(session.expires.getTime())) throw new IssuerStagingError();
  let cookie: string | undefined;
  writeSessionTokenCookie(
    {
      set(name, value, options) {
        const attributes = ["Path=/", "HttpOnly", "SameSite=Lax", `Expires=${options.expires.toUTCString()}`];
        if (options.secure) attributes.push("Secure");
        cookie = `${name}=${encodeURIComponent(value)}; ${attributes.join("; ")}`;
      },
    },
    configuration,
    session,
  );
  if (!cookie) throw new IssuerStagingError();
  return cookie;
}

async function prepareLegacyHttpOutputAsync(
  prepared: PreparedIssuerOperation,
  proposal: PrivateIssuerProposal,
  record: IssuerHttpCompletion,
  result?: AuthSessionSqlResult,
): Promise<void> {
  const legacy = proposal.context.legacy;
  const response = proposal.response;
  if (!legacy || legacy.request !== record.request || !response || !safeLegacyIssuerHttpAction(prepared.kind))
    throw new IssuerStagingError();
  record.stage = "output";
  const bytes = await readIssuerResponseAsync(response, record);
  const headers = new Headers(response.headers);
  const classification = legacy.classification;
  const cookies = createCookies(record.configuration.cookies);
  const sessionName = cookies.sessionToken.name;
  const allowed = new Set([
    cookies.csrfToken.name,
    cookies.callbackUrl.name,
    cookies.pkceCodeVerifier.name,
    cookies.state.name,
    cookies.nonce.name,
  ]);
  const counts = new Map<string, number>();
  let sessionCookie: { value: string; expiry: number | null; maxAge: number | null } | undefined;
  for (const cookie of headers.getSetCookie()) {
    const [pair, ...attributes] = cookie.split(";").map((part) => part.trim());
    if (!pair) throw new IssuerStagingError();
    const separator = pair.indexOf("=");
    const name = pair.slice(0, separator);
    if (separator <= 0 || (!allowed.has(name) && name !== sessionName) || name === colorSchemeCookieKey)
      throw new IssuerStagingError();
    const count = (counts.get(name) ?? 0) + 1;
    if (count > 2 || (name === sessionName && count !== 1)) throw new IssuerStagingError();
    counts.set(name, count);
    const value = decodeURIComponent(pair.slice(separator + 1));
    if (value.length > 4096 || !value.isWellFormed() || value.includes("\u0000")) throw new IssuerStagingError();
    const parsed = new Map<string, string>();
    for (const attribute of attributes) {
      const separator = attribute.indexOf("=");
      let key = attribute.toLowerCase();
      let value = "";
      if (separator >= 0) {
        key = attribute.slice(0, separator).toLowerCase();
        value = attribute.slice(separator + 1);
      }
      if (parsed.has(key) || !["path", "httponly", "secure", "samesite", "expires", "max-age"].includes(key))
        throw new IssuerStagingError();
      parsed.set(key, value);
    }
    if (
      parsed.get("path") !== "/" ||
      parsed.get("samesite")?.toLowerCase() !== "lax" ||
      !parsed.has("httponly") ||
      parsed.get("httponly") !== "" ||
      parsed.has("secure") !== record.configuration.cookies.useSecureCookies ||
      (parsed.has("secure") && parsed.get("secure") !== "")
    )
      throw new IssuerStagingError();
    let expiry: number | null = null;
    let maxAge: number | null = null;
    if (parsed.has("expires")) {
      expiry = Date.parse(parsed.get("expires") ?? "");
      if (!Number.isSafeInteger(expiry)) throw new IssuerStagingError();
    }
    if (parsed.has("max-age")) {
      const age = parsed.get("max-age") ?? "";
      if (!/^(0|[1-9][0-9]*)$/.test(age)) throw new IssuerStagingError();
      maxAge = Number(age);
      if (!Number.isSafeInteger(maxAge) || maxAge > 900) throw new IssuerStagingError();
    }
    if (name === sessionName) sessionCookie = { value, expiry, maxAge };
    else if (name === cookies.callbackUrl.name) {
      const target = new URL(value);
      if (target.origin !== record.configuration.externalOrigin || target.username || target.password)
        throw new IssuerStagingError();
    } else if (name === cookies.csrfToken.name && !/^[a-f0-9]{64}\|[a-f0-9]{64}$/.test(value))
      throw new IssuerStagingError();
    else if (
      name !== cookies.csrfToken.name &&
      name !== cookies.callbackUrl.name &&
      value !== "" &&
      !["handshake", "login"].includes(classification.type)
    )
      throw new IssuerStagingError();
  }
  const contentType = headers.get("content-type");
  let parsed: unknown;
  if (contentType === "application/json") {
    if (!bytes) throw new IssuerStagingError();
    parsed = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  }
  const location = headers.get("location");
  const assertRedirect = (expected?: string) => {
    let target: string | undefined;
    if (record.request.headers.has("x-auth-return-redirect")) {
      const envelope = ownRecord(parsed);
      if (
        response.status !== 200 ||
        contentType !== "application/json" ||
        Object.keys(envelope).length !== 1 ||
        typeof envelope.url !== "string"
      )
        throw new IssuerStagingError();
      target = envelope.url;
      if (location && location !== target) throw new IssuerStagingError();
    } else {
      if (response.status !== 302 || !location || (bytes && bytes.length !== 0)) throw new IssuerStagingError();
      target = location;
    }
    const url = new URL(target, record.configuration.externalOrigin);
    if (
      !["http:", "https:"].includes(url.protocol) ||
      url.username ||
      url.password ||
      (classification.type !== "handshake" && url.origin !== record.configuration.externalOrigin) ||
      (expected && target !== expected)
    )
      throw new IssuerStagingError();
    return url;
  };
  if (classification.type === "metadata") {
    if (sessionCookie || result || proposal.effects.length !== 0) throw new IssuerStagingError();
    if (classification.action === "providers") {
      const providers = ownRecord(parsed);
      if (response.status !== 200 || Object.keys(providers).length !== record.configuration.providers.length)
        throw new IssuerStagingError();
      for (const id of record.configuration.providers) {
        const provider = ownRecord(providers[id]);
        let type = "credentials";
        if (id === "oidc") type = "oidc";
        if (
          Object.keys(provider).length !== 5 ||
          provider.id !== id ||
          provider.type !== type ||
          typeof provider.name !== "string" ||
          provider.signinUrl !== `${record.configuration.externalOrigin}/api/auth/signin/${id}` ||
          provider.callbackUrl !== `${record.configuration.externalOrigin}/api/auth/callback/${id}`
        )
          throw new IssuerStagingError();
      }
    } else if (classification.action === "csrf") {
      const csrf = ownRecord(parsed);
      if (
        response.status !== 200 ||
        Object.keys(csrf).length !== 1 ||
        typeof csrf.csrfToken !== "string" ||
        !/^[a-f0-9]{64}$/.test(csrf.csrfToken)
      )
        throw new IssuerStagingError();
    } else {
      const url = assertRedirect();
      if (
        url.pathname !== "/auth/login" ||
        url.searchParams.get("callbackUrl") !== legacy.callbackUrl ||
        url.searchParams.get("error") !== new URL(record.request.url).searchParams.get("error")
      )
        throw new IssuerStagingError();
    }
  } else if (classification.type === "csrf-rejected" || classification.type === "verification-rejected") {
    if (sessionCookie || result || proposal.effects.length !== 0) throw new IssuerStagingError();
    if (classification.type === "csrf-rejected" && prepared.kind === "legacy-session") {
      if (response.status !== 400 || parsed !== null || location) throw new IssuerStagingError();
    } else {
      const target = assertRedirect();
      let expected = "MissingCSRF";
      if (classification.type === "verification-rejected") expected = "CredentialsSignin";
      if (
        target.pathname !== "/auth/login" ||
        target.searchParams.get("error") !== expected ||
        (classification.type === "verification-rejected" && target.searchParams.get("code") !== "credentials")
      )
        throw new IssuerStagingError();
    }
  } else if (classification.type === "handshake") {
    if (record.request.method !== "POST" || sessionCookie || result || proposal.effects.length !== 0)
      throw new IssuerStagingError();
    assertRedirect();
  } else if (classification.type === "login") {
    if (!result || result.kind !== "established" || result.user.id !== classification.userId)
      throw new IssuerStagingError();
    if (
      sessionCookie &&
      (classification.provider !== "oidc" ||
        sessionCookie.value !== result.session.sessionToken ||
        sessionCookie.maxAge !== null ||
        sessionCookie.expiry !== Math.floor(result.session.expires.getTime() / 1000) * 1000)
    )
      throw new IssuerStagingError();
    assertRedirect(legacy.callbackUrl);
    headers.delete("set-cookie");
    for (const cookie of response.headers.getSetCookie())
      if (!cookie.startsWith(`${sessionName}=`)) headers.append("set-cookie", cookie);
    headers.append("set-cookie", issuerSessionCookie(record.configuration.cookies, result.session));
    const expiry = new Date(record.configuration.now());
    expiry.setFullYear(expiry.getFullYear() + 1);
    if (!Number.isSafeInteger(expiry.getTime())) throw new IssuerStagingError();
    headers.append(
      "set-cookie",
      `${colorSchemeCookieKey}=${encodeURIComponent(result.user.colorScheme)}; Path=/; Expires=${expiry.toUTCString()}`,
    );
  } else {
    const observation = legacy.observation;
    if (!observation || observation.type === "expiry-margin") throw new IssuerStagingError();
    if (classification.type === "session-active") {
      if (
        observation.type !== "active" ||
        !sessionCookie ||
        response.status !== 200 ||
        location ||
        contentType !== "application/json"
      )
        throw new IssuerStagingError();
      const body = ownRecord(parsed);
      const profile = ownRecord(body.user);
      const selected = observation.record;
      const user = result?.user ?? selected.user;
      const permissions = profile.permissions;
      const dueAt = selected.session.expires.getTime() - legacy.maxAgeSeconds * 1000 + legacy.updateAgeSeconds * 1000;
      if (
        (classification.due && (!result || result.kind !== "renewed" || dueAt > legacy.coreFinishedAt)) ||
        (!classification.due && (result || dueAt <= legacy.coreStartedAt)) ||
        Object.keys(body).length !== 2 ||
        Object.keys(profile).length !== 6 ||
        body.expires !== selected.session.expires.toISOString() ||
        profile.id !== user.id ||
        profile.name !== user.name ||
        profile.email !== user.email ||
        profile.image !== user.image ||
        profile.colorScheme !== user.colorScheme ||
        !Array.isArray(permissions) ||
        JSON.stringify(permissions) !== JSON.stringify(selected.permissions) ||
        sessionCookie.value !== selected.session.sessionToken ||
        sessionCookie.maxAge !== null ||
        sessionCookie.expiry === null ||
        sessionCookie.expiry !== legacy.browserExpiresAt ||
        sessionCookie.expiry < Math.floor((legacy.coreStartedAt + legacy.maxAgeSeconds * 1000) / 1000) * 1000 ||
        sessionCookie.expiry > Math.floor((legacy.coreFinishedAt + legacy.maxAgeSeconds * 1000) / 1000) * 1000 ||
        (result && sessionCookie.expiry !== Math.floor(result.session.expires.getTime() / 1000) * 1000)
      )
        throw new IssuerStagingError();
    } else {
      const signout = classification.type === "signout";
      if (signout) assertRedirect(legacy.callbackUrl);
      else if (response.status !== 200 || parsed !== null || location || contentType !== "application/json")
        throw new IssuerStagingError();
      if (observation.type !== "absent" && record.disposition?.state !== "confirmed-commit")
        throw new IssuerStagingError();
      const token = readSingleCookie(record.request, sessionName);
      if (
        (token !== null &&
          (!sessionCookie ||
            sessionCookie.value !== "" ||
            sessionCookie.maxAge !== 0 ||
            sessionCookie.expiry !== null)) ||
        (token === null && sessionCookie) ||
        result
      )
        throw new IssuerStagingError();
    }
  }
  headers.set("cache-control", "no-store");
  headers.set("x-content-type-options", "nosniff");
  headers.delete("content-length");
  let size = bytes?.byteLength ?? 0;
  headers.forEach((value, name) => {
    size += Buffer.byteLength(name + value, "utf8");
  });
  if (size > record.maximumResponseBytes) throw new IssuerStagingError();
  assertHttpCurrent(record);
  record.output = Object.freeze({
    type: "response",
    response: new Response(bytes, { status: response.status, headers }),
  });
}

async function prepareHttpOutputAsync(
  prepared: PreparedIssuerOperation,
  proposal: PrivateIssuerProposal,
  record: IssuerHttpCompletion,
  scope: OwnedScope,
  result?: AuthSessionSqlResult,
): Promise<void> {
  record.stage = "output";
  assertHttpCurrent(record);
  const response = proposal.response;
  if (!response || prepared.kind === "logout") throw new IssuerStagingError();
  const bytes = await readIssuerResponseAsync(response, record);
  const headers = new Headers();
  response.headers.forEach((value, name) => {
    if (name !== "set-cookie") headers.append(name, value);
  });
  const sessionName = sessionTokenCookieName(record.configuration.cookies.prefix);
  for (const cookie of response.headers.getSetCookie()) {
    const separator = cookie.indexOf("=");
    const name = cookie.slice(0, separator);
    if (separator <= 0) throw new IssuerStagingError();
    if (name === sessionName || name.startsWith(`${sessionName}.`) || name === colorSchemeCookieKey) {
      if (!result && prepared.kind !== "renew") throw new IssuerStagingError();
      continue;
    }
    headers.append("set-cookie", cookie);
  }
  const location = headers.get("location");
  if (location) {
    const target = new URL(location, record.configuration.externalOrigin);
    if (!["http:", "https:"].includes(target.protocol) || target.username || target.password)
      throw new IssuerStagingError();
    const handshake = proposal.context.classification?.type === "oidc-handshake";
    if (!handshake && target.origin !== record.configuration.externalOrigin) throw new IssuerStagingError();
    headers.set("location", target.href);
  }
  if (response.status < 200 || response.status >= 400) throw new IssuerStagingError();
  if ((prepared.kind === "credentials" || prepared.kind === "ldap") && (response.status !== 303 || !location))
    throw new IssuerStagingError();
  if (result && result.kind === "revoked") throw new IssuerStagingError();
  if (prepared.kind === "renew") {
    const witness = proposal.witnesses.find((entry) => entry.kind === "session");
    if (!witness || witness.kind !== "session" || !witness.selected || !scope.lease) throw new IssuerStagingError();
    let session = witness.selected.session;
    let user = requestProfileRow(witness.selected.user);
    if (result) {
      session = result.session;
      user = result.user;
    }
    if (response.status !== 200 || headers.get("content-type") !== "application/json" || !bytes)
      throw new IssuerStagingError();
    const parsed: unknown = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
    const body = ownRecord(parsed);
    const profile = ownRecord(body.user);
    const permissions = profile.permissions;
    if (
      Object.keys(body).length !== 2 ||
      Object.keys(profile).length !== 6 ||
      body.expires !== session.expires.toISOString() ||
      profile.id !== user.id ||
      profile.name !== user.name ||
      profile.email !== user.email ||
      profile.image !== user.image ||
      profile.colorScheme !== user.colorScheme ||
      !Array.isArray(permissions) ||
      permissions.length !== scope.lease.identity.permissions.length ||
      permissions.some((permission, index) => permission !== scope.lease?.identity.permissions[index])
    )
      throw new IssuerStagingError();
    headers.append("set-cookie", issuerSessionCookie(record.configuration.cookies, session));
  } else if (result) {
    headers.append("set-cookie", issuerSessionCookie(record.configuration.cookies, result.session));
    const expiry = new Date(record.configuration.now());
    expiry.setFullYear(expiry.getFullYear() + 1);
    if (!Number.isSafeInteger(expiry.getTime())) throw new IssuerStagingError();
    headers.append(
      "set-cookie",
      `${colorSchemeCookieKey}=${encodeURIComponent(result.user.colorScheme)}; Path=/; Expires=${expiry.toUTCString()}`,
    );
  }
  headers.set("cache-control", "no-store");
  headers.set("x-content-type-options", "nosniff");
  headers.delete("content-length");
  assertHttpCurrent(record);
  record.output = Object.freeze({
    type: "response",
    response: new Response(bytes, { status: response.status, headers }),
  });
}

function isUnavailableAuthority(error: unknown): boolean {
  const visited = new Set<unknown>();
  while (error instanceof Error && !visited.has(error)) {
    if (error instanceof SqlAuthorityError && error.code === "AUTHORITY_UNAVAILABLE") return true;
    visited.add(error);
    error = error.cause;
  }
  return false;
}

function publishPreparedIssuerOperation(
  prepared: PreparedIssuerOperation,
  record: IssuerHttpCompletion,
): IssuerPublicationOutcome {
  record.stage = "publication";
  assertHttpCurrent(record);
  const proposal = record.proposal;
  if (
    httpCompletions.get(prepared) !== record ||
    httpIssuerOwners.get(record.issuer) !== record.owner ||
    !proposal ||
    proposal.context.owner !== record.owner ||
    prepared.kind !== record.kind ||
    record.authSettlement !== "settled" ||
    record.cleanupSettlement !== "settled" ||
    record.failureStage ||
    !record.output
  )
    throw new IssuerStagingError();
  let settlement: "confirmed-commit" | "settled-without-write" = "confirmed-commit";
  if (prepared.kind === "logout") {
    if (
      !record.disposition ||
      logoutDispositions.get(prepared) !== record.disposition ||
      record.disposition.state !== "confirmed-commit" ||
      record.output.type !== "session-cookie-expiry"
    )
      throw new IssuerStagingError();
  } else if (proposal.context.legacy && record.disposition) {
    if (
      record.disposition.state !== "confirmed-commit" ||
      (expiryDispositions.get(prepared) !== record.disposition &&
        logoutDispositions.get(prepared) !== record.disposition)
    )
      throw new IssuerStagingError();
  } else if (record.noWrite) {
    if (
      (proposal.context.legacy?.classification ?? proposal.context.classification) !== record.noWrite ||
      proposal.effects.length !== 0 ||
      record.confirmation
    )
      throw new IssuerStagingError();
    settlement = "settled-without-write";
  } else if (
    !record.confirmation ||
    committed.get(prepared) !== record.confirmation ||
    record.native?.type !== "fulfilled" ||
    record.native.value !== record.confirmation
  ) {
    throw new IssuerStagingError();
  }
  finishClaimedIssuerProposal(prepared, record.owner, proposal, "released");
  return Object.freeze({ kind: prepared.kind, publication: "released", settlement, output: record.output });
}

export function createProductionSessionHttpExecutor(
  owner: ProductionSessionSqlOwner,
  issuer: ProductionSessionIssuer,
  configuration: ProductionSessionRequestConfiguration,
) {
  const value = owned(owner);
  if (configuration.now !== value.configuration.now || httpIssuerOwners.has(issuer)) throw new IssuerStagingError();
  httpIssuerOwners.set(issuer, owner);
  return (
    request: Request,
    kind: IssuerHttpAction,
    inputBounds: IssuerOperationBounds,
    maximumResponseBytes: number,
  ): Promise<IssuerPublicationOutcome> => {
    const capturedBounds = Object.freeze({ ...inputBounds });
    try {
      assertResponseBudget(maximumResponseBytes);
      assertRequestOwnerOpen(value);
      if (!(capturedBounds.signal instanceof AbortSignal) || !(capturedBounds.lifetime instanceof AbortSignal))
        throw new IssuerStagingError();
      assertBounds(value.configuration, capturedBounds);
      if (request.signal.aborted) throw new IssuerStagingError();
      if (kind === "legacy-oidc" && request.method === "GET") {
        const url = new URL(request.url);
        if (url.pathname === "/api/auth/signin/oidc") {
          if (
            url.origin !== configuration.externalOrigin ||
            url.username ||
            url.password ||
            (request.headers.has("host") && request.headers.get("host") !== url.host)
          )
            throw new IssuerStagingError();
          return Promise.resolve(
            Object.freeze({
              kind,
              publication: "released",
              settlement: "settled-without-write",
              output: Object.freeze({
                type: "response",
                response: new Response(null, { status: 405, headers: { allow: "POST", "cache-control": "no-store" } }),
              }),
            }),
          );
        }
      }
    } catch {
      return Promise.resolve(
        Object.freeze({
          kind,
          publication: "held",
          state: "held-without-dispatch",
          criticalStage: "preparation",
        }),
      );
    }
    const completion = Promise.withResolvers<IssuerPublicationOutcome>();
    value.pending.add(completion.promise);
    const controller = new AbortController();
    const record: IssuerHttpCompletion = {
      owner,
      issuer,
      request,
      kind,
      configuration,
      maximumResponseBytes,
      bounds: Object.freeze({
        signal: AbortSignal.any([request.signal, capturedBounds.signal, controller.signal]),
        lifetime: AbortSignal.any([capturedBounds.lifetime, value.configuration.lifetime]),
        deadlineAt: capturedBounds.deadlineAt,
      }),
      proposal: undefined,
      stage: "preparation",
      failureStage: undefined,
      authSettlement: "pending",
      cleanupSettlement: "pending",
      output: undefined,
      confirmation: undefined,
      native: undefined,
      disposition: undefined,
      noWrite: undefined,
      clampDeadline: () => undefined,
    };
    let timer: ReturnType<typeof setTimeout> | undefined;
    let prepared: PreparedIssuerOperation | null | undefined;
    let persistence: IssuerPersistenceOutcome | undefined;
    const schedule = () => {
      try {
        assertHttpCurrent(record);
      } catch {
        controller.abort(new IssuerStagingError());
        return;
      }
      const remaining = record.bounds.deadlineAt - Date.now();
      timer = setTimeout(schedule, Math.min(Math.ceil(remaining), 2_147_483_647));
      timer.unref();
    };
    record.clampDeadline = (deadlineAt) => {
      record.bounds = Object.freeze({ ...record.bounds, deadlineAt: Math.min(record.bounds.deadlineAt, deadlineAt) });
      if (timer !== undefined) clearTimeout(timer);
      schedule();
    };
    const execute = async (): Promise<IssuerPublicationOutcome> => {
      try {
        assertResponseBudget(maximumResponseBytes);
        assertHttpCurrent(record);
        schedule();
        if (kind === "credentials" || kind === "ldap")
          prepared = await issuer.prepareCredentials(request, kind, record.bounds);
        else if (kind === "oidc") prepared = await issuer.prepareOidc(request, record.bounds);
        else if (kind === "renew" || kind === "logout")
          prepared = await issuer.prepareSessionMutation(request, kind, record.bounds);
        else if (safeLegacyIssuerHttpAction(kind))
          prepared = await issuer.prepareLegacyHttpAsync(request, kind, record.bounds);
        else throw new IssuerStagingError();
        assertHttpCurrent(record);
        if (!prepared) return Object.freeze({ kind, publication: "rejected-verification" });
        httpCompletions.set(prepared, record);
        persistence = await persistPreparedIssuerOperation(owner, prepared);
        if (persistence.state === "confirmed-commit" || record.noWrite) {
          if (timer !== undefined) clearTimeout(timer);
          return publishPreparedIssuerOperation(prepared, record);
        }
        throw new IssuerStagingError();
      } catch (error: unknown) {
        record.failureStage ??= record.stage;
        if (error instanceof IssuerStagingError && error.criticalStage) record.failureStage = error.criticalStage;
        if (prepared && !record.proposal) {
          record.stage = "cleanup";
          try {
            await discardPreparedIssuerOperation(owner, prepared);
          } catch {
            record.failureStage = "cleanup";
          }
        }
        if (record.proposal && prepared) {
          await settleIssuerResponseAsync(record.proposal.response).catch(() => {
            record.failureStage = "cleanup";
          });
          finishClaimedIssuerProposal(prepared, owner, record.proposal, "held");
        }
        if (record.output?.type === "response") {
          await settleIssuerResponseAsync(record.output.response).catch(() => {
            record.failureStage = "cleanup";
          });
        }
        let state: Extract<IssuerPublicationOutcome, { publication: "held" }>["state"] =
          "failed-without-confirmed-commit";
        if (
          persistence?.state === "confirmed-commit" ||
          record.confirmation ||
          record.disposition?.state === "confirmed-commit"
        )
          state = "confirmed-commit-settlement-failed";
        else if (persistence) state = persistence.state;
        else if (isUnavailableAuthority(error)) state = "held-without-dispatch";
        return Object.freeze({ kind, publication: "held", state, criticalStage: record.failureStage ?? record.stage });
      } finally {
        if (timer !== undefined) clearTimeout(timer);
      }
    };
    void Promise.resolve()
      .then(execute)
      .then(
        (outcome) => {
          value.pending.delete(completion.promise);
          completion.resolve(outcome);
        },
        (error: unknown) => {
          value.pending.delete(completion.promise);
          completion.reject(error);
        },
      );
    return completion.promise;
  };
}

function owned(owner: ProductionSessionSqlOwner): OwnedSql {
  const value = owners.get(owner);
  if (!value) throw new IssuerStagingError();
  return value;
}

function scopeFor(owner: ProductionSessionSqlOwner, scope: object): OwnedScope {
  const value = scopes.get(scope);
  if (!value || value.owner !== owner || value.closing) throw new IssuerStagingError();
  return value;
}

function assertBounds(configuration: AuthSessionSqlConfiguration, bounds: IssuerOperationBounds): void {
  const now = configuration.now();
  if (
    configuration.lifetime.aborted ||
    bounds.lifetime.aborted ||
    bounds.signal.aborted ||
    !Number.isSafeInteger(now) ||
    now < 0 ||
    now > 8_640_000_000_000_000 ||
    Math.abs(now - Date.now()) > configuration.maximumAbsoluteClockSkewMs ||
    !Number.isFinite(bounds.deadlineAt) ||
    bounds.deadlineAt <= now ||
    bounds.deadlineAt <= Date.now()
  )
    throw new IssuerStagingError();
}

export function createProductionSessionSqlOwner(
  runtime: PersistenceRuntime,
  input: AuthSessionSqlConfiguration,
  requestApiKeys: SqlAuthorityConfiguration["apiKeys"],
): ProductionSessionSqlOwner {
  if (typeof requestApiKeys !== "object" || requestApiKeys === null || Array.isArray(requestApiKeys))
    throw new IssuerStagingError();
  const apiKeyType = requestApiKeys.type;
  if (apiKeyType !== "disabled" && apiKeyType !== "approved-stored-bcrypt-reader") throw new IssuerStagingError();
  const apiKeys: SqlAuthorityConfiguration["apiKeys"] = Object.freeze({ type: apiKeyType });
  const captured: AuthSessionSqlConfiguration = Object.freeze({
    lifetime: input.lifetime,
    maximumSnapshotRows: input.maximumSnapshotRows,
    sessionMaxAgeMs: input.sessionMaxAgeMs,
    maximumAbsoluteClockSkewMs: input.maximumAbsoluteClockSkewMs,
    now: input.now,
  });
  if (
    !Number.isSafeInteger(captured.maximumSnapshotRows) ||
    captured.maximumSnapshotRows < 1 ||
    captured.maximumSnapshotRows >= 2_147_483_647 ||
    !Number.isSafeInteger(captured.sessionMaxAgeMs) ||
    captured.sessionMaxAgeMs < 1 ||
    !Number.isSafeInteger(captured.maximumAbsoluteClockSkewMs) ||
    captured.maximumAbsoluteClockSkewMs < 0 ||
    typeof captured.now !== "function"
  )
    throw new IssuerStagingError();
  const controller = new AbortController();
  const configuration = Object.freeze({
    ...captured,
    lifetime: AbortSignal.any([captured.lifetime, controller.signal]),
  });
  const owner: ProductionSessionSqlOwner = Object.freeze({ kind: "fixed-native-session-owner" });
  const authority = createSqlSessionAuthorityOwner(
    {
      runtime,
      lifetime: configuration.lifetime,
      credentialSqlLogging: "disabled-by-resource-owner",
      maximumSnapshotRows: configuration.maximumSnapshotRows,
      maximumAbsoluteClockSkewMs: configuration.maximumAbsoluteClockSkewMs,
      now: configuration.now,
      opaqueSessions: {
        type: "approved-stored-expiry-reader",
        maximumAbsoluteClockSkewMs: configuration.maximumAbsoluteClockSkewMs,
      },
      apiKeys,
    },
    configuration,
  );
  owners.set(owner, {
    runtime,
    configuration,
    controller,
    authority,
    scopes: new Set(),
    pending: new Set(),
    requestReads: new Set(),
    requestWrites: new Set(),
    requestLeases: new WeakMap(),
    onboardingRequests: new Set(),
    capturedOnboardingRequests: new WeakSet(),
    onboardingPublications: new Set(),
    onboardingNativePublications: new Set(),
    core: undefined,
    onboardingCleanup: { type: "none" },
    onboarding: undefined,
    closing: undefined,
  });
  return owner;
}

function assertRequestOwnerOpen(value: OwnedSql): void {
  if (value.closing !== undefined || value.configuration.lifetime.aborted) throw new IssuerStagingError();
}

function runProjectedRequestRead<T>(
  value: OwnedSql,
  read: () => Promise<T>,
  onboarding?: OwnedOnboardingRequest,
): Promise<T> {
  assertRequestOwnerOpen(value);
  if (onboarding) {
    const completion = Promise.withResolvers<T>();
    onboardingTasks.set(completion.promise, { record: onboarding, kind: "projected-admission" });
    value.requestReads.add(completion.promise);
    onboarding.tasks.add(completion.promise);
    const execute = async () => {
      try {
        assertRequestOwnerOpen(value);
        completion.resolve(await read());
      } catch (error: unknown) {
        completion.reject(error);
      } finally {
        value.requestReads.delete(completion.promise);
        onboarding.tasks.delete(completion.promise);
      }
    };
    void Promise.resolve().then(execute);
    return completion.promise;
  }
  const task = Promise.resolve().then(() => {
    assertRequestOwnerOpen(value);
    return read();
  });
  value.requestReads.add(task);
  void task.then(
    () => value.requestReads.delete(task),
    () => value.requestReads.delete(task),
  );
  return task;
}

function projectedRequestBounds(
  value: OwnedSql,
  operation: SqlAuthorityOperation,
  lease?: SqlAuthorityReadLease,
): IssuerOperationBounds {
  assertRequestOwnerOpen(value);
  let deadlineAt = operation.deadlineAt;
  const lifetimes = [value.configuration.lifetime];
  if (lease) {
    const registration = value.requestLeases.get(lease);
    if (
      !registration ||
      lease.lifetime.aborted ||
      lease.identity !== registration.identity ||
      operation.signal !== registration.operation.signal ||
      !Number.isFinite(operation.deadlineAt) ||
      operation.deadlineAt > registration.operation.deadlineAt
    )
      throw new IssuerStagingError();
    lifetimes.push(lease.lifetime, registration.operation.signal);
    deadlineAt = Math.min(deadlineAt, registration.operation.deadlineAt);
    if (lease.validity.type === "stored-session-expiry")
      deadlineAt = Math.min(deadlineAt, lease.validity.hostDeadlineAt);
  }
  const bounds = Object.freeze({
    signal: operation.signal,
    lifetime: AbortSignal.any(lifetimes),
    deadlineAt,
  });
  assertBounds(value.configuration, bounds);
  return bounds;
}

function admitProjectedRequestAsync(
  value: OwnedSql,
  credential: RequestCredential | null,
  operation: SqlAuthorityOperation,
  branch: "opaque-session" | "api-key",
): Promise<SqlAuthorityAdmission> {
  const onboarding = onboardingAdmissionOperations.get(operation);
  onboardingAdmissionOperations.delete(operation);
  if (onboarding) {
    assertOwnedOnboarding(value, onboarding);
    if (
      owners.get(onboarding.owner) !== value ||
      onboarding.phase !== "preparing" ||
      operation.signal !== onboarding.state.original.signal ||
      !Number.isFinite(operation.deadlineAt) ||
      operation.deadlineAt > onboarding.state.bounds().deadlineAt
    )
      throw new ProductionOnboardingError();
  }
  const captured = Object.freeze({ signal: operation.signal, deadlineAt: operation.deadlineAt });
  return runProjectedRequestRead(
    value,
    async () => {
      const bounds = projectedRequestBounds(value, captured);
      const admissionOperation = Object.freeze({
        signal: AbortSignal.any([bounds.signal, bounds.lifetime]),
        deadlineAt: bounds.deadlineAt,
      });
      let admission: SqlAuthorityAdmission;
      if (branch === "opaque-session") {
        let token: string | null = null;
        if (credential?.type === "opaque-session") token = credential.token;
        admission = await value.authority.reader.admitOpaqueSessionAsync(token, admissionOperation);
      } else {
        let header: string | null = null;
        if (credential?.type === "api-key") header = credential.header;
        admission = await value.authority.reader.admitApiKeyAsync(header, admissionOperation);
      }
      if (admission.type === "anonymous") {
        projectedRequestBounds(value, captured);
        return admission;
      }
      const lease = admission.lease;
      try {
        projectedRequestBounds(value, captured);
        if (!credential || lease.credentialType !== credential.type || lease.lifetime.aborted)
          throw new IssuerStagingError();
        let deadlineAt = admissionOperation.deadlineAt;
        if (lease.validity.type === "stored-session-expiry")
          deadlineAt = Math.min(deadlineAt, lease.validity.hostDeadlineAt);
        const authorityOperation = Object.freeze({ signal: admissionOperation.signal, deadlineAt });
        const evidence = value.authority.captureOwnedCredential(lease, authorityOperation);
        if (
          (credential.type === "opaque-session" &&
            (evidence.type !== "opaque-session" || evidence.token !== credential.token)) ||
          (credential.type === "api-key" && (evidence.type !== "api-key" || evidence.id !== credential.id))
        )
          throw new IssuerStagingError();
        value.requestLeases.set(lease, {
          credential,
          evidence,
          operation: captured,
          authorityOperation,
          identity: lease.identity,
          provider: undefined,
        });
        return admission;
      } catch (error: unknown) {
        try {
          await lease.releaseAsync();
        } catch (cleanupError: unknown) {
          if (onboarding) onboarding.state.cleanupFailures.push({ phase: "admission-release", cause: cleanupError });
          throw new AggregateError([error, cleanupError], "Request admission and release failed");
        }
        throw error;
      }
    },
    onboarding,
  );
}

export function getProductionSessionSqlRequestReader(owner: ProductionSessionSqlOwner): ProductionSessionRequestReader {
  const value = owned(owner);
  assertRequestOwnerOpen(value);
  return Object.freeze({
    admitOpaqueSessionAsync(
      token: string | null | undefined,
      operation: SqlAuthorityOperation,
    ): Promise<SqlAuthorityAdmission> {
      let credential: RequestCredential | null = null;
      if (token) credential = Object.freeze({ type: "opaque-session", token });
      return admitProjectedRequestAsync(value, credential, operation, "opaque-session");
    },
    admitApiKeyAsync(
      header: string | null | undefined,
      operation: SqlAuthorityOperation,
    ): Promise<SqlAuthorityAdmission> {
      assertRequestOwnerOpen(value);
      let credential: RequestCredential | null = null;
      if (header !== null && header !== undefined) {
        const parts = header.split(".");
        const [id, token] = parts;
        if (parts.length !== 2 || !id || !token) throw new SqlAuthorityError("INVALID_OPERATION");
        credential = Object.freeze({ type: "api-key", id, header });
      }
      return admitProjectedRequestAsync(value, credential, operation, "api-key");
    },
  });
}

function ownRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new IssuerStagingError();
  const row: Record<string, unknown> = {};
  for (const [key, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(value))) {
    if (!("value" in descriptor)) throw new IssuerStagingError();
    row[key] = descriptor.value;
  }
  return row;
}

function requestProfileRow(value: unknown): Omit<ProductionSessionRequestUser, "permissions"> {
  const row = ownRecord(value);
  const { id, name, email, image, colorScheme, provider } = row;
  if (
    typeof id !== "string" ||
    id.length === 0 ||
    (name !== null && typeof name !== "string") ||
    (email !== null && typeof email !== "string") ||
    (image !== null && typeof image !== "string") ||
    (colorScheme !== "light" && colorScheme !== "dark" && colorScheme !== "auto") ||
    (provider !== "credentials" && provider !== "ldap" && provider !== "oidc")
  )
    throw new IssuerStagingError();
  return { id, name, email, image, colorScheme, provider };
}

function captureBoardReplacement(input: BoardPermissionsMutation, maximumRows: number): BoardPermissionsMutation {
  const row = ownRecord(input);
  if (
    (row.kind !== "replace-user" && row.kind !== "replace-group") ||
    typeof row.boardId !== "string" ||
    !Array.isArray(row.permissions)
  )
    throw new BoardPermissionsMutationError("BAD_REQUEST");
  if (row.permissions.length > maximumRows) throw new BoardPermissionsMutationError("PRECONDITION_FAILED");
  const permissions: BoardPermissionReplacement[] = [];
  for (let index = 0; index < row.permissions.length; index += 1) {
    const descriptor = Object.getOwnPropertyDescriptor(row.permissions, index);
    if (!descriptor || !("value" in descriptor)) throw new BoardPermissionsMutationError("BAD_REQUEST");
    const replacement = ownRecord(descriptor.value);
    if (
      typeof replacement.principalId !== "string" ||
      (replacement.permission !== "view" && replacement.permission !== "modify" && replacement.permission !== "full")
    )
      throw new BoardPermissionsMutationError("BAD_REQUEST");
    permissions.push(Object.freeze({ principalId: replacement.principalId, permission: replacement.permission }));
  }
  return Object.freeze({ kind: row.kind, boardId: row.boardId, permissions: Object.freeze(permissions) });
}

function captureAppCreate(input: AppMutation): AppMutation {
  const mutation = ownRecord(input);
  if (mutation.kind !== "create") throw new AppMutationPreconditionError();
  const values = ownRecord(mutation.values);
  const { id, name, description, iconUrl, href } = values;
  const sourcePingUrl = values.pingUrl;
  if (
    typeof id !== "string" ||
    typeof name !== "string" ||
    typeof iconUrl !== "string" ||
    (href !== null && typeof href !== "string") ||
    (description !== undefined && description !== null && typeof description !== "string") ||
    (sourcePingUrl !== undefined && sourcePingUrl !== null && typeof sourcePingUrl !== "string")
  )
    throw new AppMutationPreconditionError();
  let pingUrl = sourcePingUrl;
  if (pingUrl === "") pingUrl = null;
  return Object.freeze({ kind: "create", values: Object.freeze({ id, name, description, iconUrl, href, pingUrl }) });
}

function dispatchRequestWrite<T>(
  value: OwnedSql,
  lease: SqlAuthorityReadLease,
  input: SqlAuthorityOperation,
  invoke: (
    operation: Parameters<PersistenceRuntime["appMutationAsync"]>[0],
    credential: NativeCredentialEvidence,
    configuration: NativeCredentialPolicyConfiguration,
  ) => Promise<T>,
): Promise<T> {
  const captured = Object.freeze({ signal: input.signal, deadlineAt: input.deadlineAt });
  projectedRequestBounds(value, captured, lease);
  const registration = value.requestLeases.get(lease);
  if (!registration) throw new IssuerStagingError();
  const configuration: NativeCredentialPolicyConfiguration = Object.freeze({
    maximumSnapshotRows: value.configuration.maximumSnapshotRows,
    maximumAbsoluteClockSkewMs: value.configuration.maximumAbsoluteClockSkewMs,
    now: value.configuration.now,
  });
  const completion = Promise.withResolvers<T>();
  value.requestWrites.add(completion.promise);
  requestWriteSettlements.set(completion.promise, { type: "not-dispatched", error: undefined });
  const dispatch = async () => {
    let underlying: Promise<T> | undefined;
    let invoked = false;
    try {
      const bounds = projectedRequestBounds(value, captured, lease);
      if (value.requestLeases.get(lease) !== registration) throw new IssuerStagingError();
      const credential = value.authority.captureOwnedCredential(lease, {
        signal: registration.authorityOperation.signal,
        deadlineAt: Math.min(bounds.deadlineAt, registration.authorityOperation.deadlineAt),
      });
      if (
        credential !== registration.evidence ||
        credential.userId !== registration.identity.userId ||
        (registration.provider !== undefined && credential.provider !== registration.provider)
      )
        throw new IssuerStagingError();
      const operation = Object.freeze({
        signal: captured.signal,
        lifetime: AbortSignal.any([bounds.lifetime, registration.authorityOperation.signal]),
        deadlineAt: bounds.deadlineAt,
      });
      invoked = true;
      requestWriteSettlements.set(completion.promise, { type: "invoked" });
      underlying = invoke(operation, credential, configuration);
      requestWriteSettlements.set(completion.promise, { type: "pending", underlying });
      const result = await underlying;
      requestWriteSettlements.set(completion.promise, { type: "fulfilled", underlying, value: result });
      completion.resolve(result);
    } catch (error: unknown) {
      if (!invoked) requestWriteSettlements.set(completion.promise, { type: "not-dispatched", error });
      else if (error instanceof TransactionCommitAmbiguousError)
        requestWriteSettlements.set(completion.promise, { type: "ambiguous", underlying, error });
      else requestWriteSettlements.set(completion.promise, { type: "rejected", underlying, error });
      completion.reject(error);
    } finally {
      value.requestWrites.delete(completion.promise);
    }
  };
  void Promise.resolve().then(dispatch);
  return completion.promise;
}

export function dispatchProductionSessionSqlBoardPermissionsAsync(
  owner: ProductionSessionSqlOwner,
  lease: SqlAuthorityReadLease,
  operation: SqlAuthorityOperation,
  mutation: BoardPermissionsMutation,
): Promise<void> {
  const value = owned(owner);
  projectedRequestBounds(value, operation, lease);
  const captured = captureBoardReplacement(mutation, value.configuration.maximumSnapshotRows);
  return dispatchRequestWrite(value, lease, operation, (native, credential, configuration) =>
    value.runtime.boardPermissionsMutationAsync(native, captured, credential, configuration),
  );
}

export function dispatchProductionSessionSqlAppCreateAsync(
  owner: ProductionSessionSqlOwner,
  lease: SqlAuthorityReadLease,
  operation: SqlAuthorityOperation,
  mutation: AppMutation,
): Promise<AppMutationResult> {
  const value = owned(owner);
  projectedRequestBounds(value, operation, lease);
  const captured = captureAppCreate(mutation);
  return dispatchRequestWrite(value, lease, operation, (native, credential, configuration) =>
    value.runtime.appMutationAsync(native, captured, credential, configuration),
  );
}

export function readProductionSessionSqlRequestUserAsync(
  owner: ProductionSessionSqlOwner,
  lease: SqlAuthorityReadLease,
  operation: SqlAuthorityOperation,
): Promise<ProductionSessionRequestUser> {
  const value = owned(owner);
  const captured = Object.freeze({ signal: operation.signal, deadlineAt: operation.deadlineAt });
  if (!Number.isFinite(captured.deadlineAt) || !value.requestLeases.has(lease)) throw new IssuerStagingError();
  return runProjectedRequestRead(value, async () => {
    const bounds = projectedRequestBounds(value, captured, lease);
    const registration = value.requestLeases.get(lease);
    if (!registration) throw new IssuerStagingError();
    const currentOperation = {
      signal: AbortSignal.any([bounds.signal, bounds.lifetime]),
      deadlineAt: bounds.deadlineAt,
    };
    await lease.assertCurrentAsync(currentOperation);
    projectedRequestBounds(value, captured, lease);
    const credential = registration.credential;
    let source = sql`"apiKey"`;
    let locator = sql.empty();
    if (credential.type === "opaque-session") {
      if (lease.validity.type !== "stored-session-expiry") throw new IssuerStagingError();
      source = sql`"session"`;
      let expiry: number | string = lease.validity.expiresAt;
      if (value.runtime.engine === "postgresql") expiry = new Date(expiry).toISOString();
      locator = sql`c."session_token" = ${credential.token} AND c."expires" = ${expiry}`;
    } else {
      if (lease.validity.type !== "no-stored-api-key-expiry") throw new IssuerStagingError();
      locator = sql`c."id" = ${credential.id}`;
    }
    const statement = sql`SELECT u."id", u."name", u."email", u."image",
      u."color_scheme" AS "colorScheme", u."provider"
      FROM ${source} c INNER JOIN "user" u ON u."id" = c."user_id"
      WHERE ${locator} AND u."id" = ${registration.identity.userId} LIMIT 2`;
    let rows: readonly unknown[];
    try {
      if (value.runtime.engine === "sqlite") {
        rows = value.runtime.boundedTransactionSync(bounds, (database) => database.all<unknown>(statement));
      } else {
        rows = await value.runtime.boundedSnapshotAsync(
          bounds,
          async (database) => (await database.execute<Record<string, unknown>>(statement)).rows,
        );
      }
    } catch {
      throw new IssuerStagingError();
    }
    projectedRequestBounds(value, captured, lease);
    if (rows.length !== 1) throw new IssuerStagingError();
    const profile = requestProfileRow(rows[0]);
    if (
      profile.id !== registration.identity.userId ||
      profile.provider !== registration.evidence.provider ||
      (registration.provider !== undefined && registration.provider !== profile.provider)
    )
      throw new IssuerStagingError();
    await lease.assertCurrentAsync(currentOperation);
    projectedRequestBounds(value, captured, lease);
    registration.provider = profile.provider;
    return Object.freeze({ ...profile, permissions: Object.freeze([...registration.identity.permissions]) });
  });
}

function coreUnavailable(): never {
  throw new OnboardingCoreReadError("ONBOARDING_CORE_UNAVAILABLE");
}

function coreOwner(slot: OwnedCoreController): ProductionSessionSqlOwner {
  const owner = slot.owner.deref();
  if (!owner) return coreUnavailable();
  return owner;
}

function coreValue(slot: OwnedCoreController): OwnedSql {
  return owned(coreOwner(slot));
}

function coreOwnData(input: unknown, keys: readonly string[]): Record<string, unknown> {
  const value = ownRecord(input);
  if (
    Object.getOwnPropertySymbols(input).length !== 0 ||
    Object.keys(value).length !== keys.length ||
    keys.some((key) => !Object.hasOwn(value, key))
  )
    return coreUnavailable();
  return value;
}

function coreText(input: unknown, units: number, bytes: number): string {
  if (typeof input !== "string" || input.length === 0 || !input.isWellFormed()) return coreUnavailable();
  for (let index = 0; index < input.length; index++) {
    const code = input.charCodeAt(index);
    if (code <= 32 || code === 127) return coreUnavailable();
  }
  if (input.length > units || Buffer.byteLength(input, "utf8") > bytes)
    throw new OnboardingCoreReadError("ONBOARDING_CORE_OVERFLOW");
  return input;
}

function coreUrl(input: unknown): string {
  const value = coreText(input, 4096, 4096);
  const url = new URL(value);
  if ((url.protocol !== "http:" && url.protocol !== "https:") || url.username || url.password || url.search || url.hash)
    return coreUnavailable();
  return value;
}

function coreHeaders(request: Request): string {
  const fields: [string, string][] = [];
  let bytes = 0;
  request.headers.forEach((value, name) => {
    bytes += Buffer.byteLength(name, "utf8") + Buffer.byteLength(value, "utf8") + 4;
    if (bytes > 65_536 || fields.length >= 128) throw new OnboardingCoreReadError("ONBOARDING_CORE_OVERFLOW");
    fields.push([name, value]);
  });
  return JSON.stringify(fields);
}

function coreConfiguration(value: OwnedSql, input: CoreConfiguration): OnboardingCoreReadConfiguration {
  const source = coreOwnData(input, [
    "version",
    "dockerEnabled",
    "kubernetesEnabled",
    "workshopApiUrl",
    "workshopUrl",
    "maximumResponseBytes",
  ]);
  const retained = value.onboarding;
  if (
    !retained ||
    retained.configuration.origin.now !== value.configuration.now ||
    retained.configuration.maximumAbsoluteClockSkewMs !== value.configuration.maximumAbsoluteClockSkewMs ||
    value.configuration.maximumAbsoluteClockSkewMs > 1000 ||
    typeof source.dockerEnabled !== "boolean" ||
    typeof source.kubernetesEnabled !== "boolean" ||
    typeof source.maximumResponseBytes !== "number" ||
    !Number.isSafeInteger(source.maximumResponseBytes) ||
    source.maximumResponseBytes < 1
  )
    return coreUnavailable();
  const version = coreText(source.version, 256, 256);
  if (version === "0.0.0") return coreUnavailable();
  const serverOrigin = coreUrl(retained.configuration.origin.externalBaseUrl);
  if (new URL(serverOrigin).origin !== serverOrigin) return coreUnavailable();
  coreText(`${serverOrigin}/api/mcp`, 4096, 4096);
  return Object.freeze({
    maximumSnapshotRows: value.configuration.maximumSnapshotRows,
    maximumAbsoluteClockSkewMs: value.configuration.maximumAbsoluteClockSkewMs,
    now: value.configuration.now,
    version,
    enabledProviders: retained.configuration.providers,
    serverOrigin,
    dockerEnabled: source.dockerEnabled,
    kubernetesEnabled: source.kubernetesEnabled,
    workshopApiUrl: coreUrl(source.workshopApiUrl),
    workshopUrl: coreUrl(source.workshopUrl),
    maximumResponseBytes: Math.min(source.maximumResponseBytes, 8 * 1024 * 1024),
  });
}

function retainCoreCleanup(record: OwnedCoreCapture, error: unknown): void {
  if (
    (record.failure.kind !== "failed" || !Object.is(record.failure.error, error)) &&
    !record.cleanup.some((cause) => Object.is(cause, error))
  )
    record.cleanup.push(error);
}

function retainCorePrimary(record: OwnedCoreCapture, error: unknown): void {
  if (record.failure.kind !== "none") return;
  record.failure = { kind: "failed", error };
  for (let index = record.cleanup.length - 1; index >= 0; index--) {
    if (Object.is(record.cleanup[index], error)) record.cleanup.splice(index, 1);
  }
}

function coreFailure(record: OwnedCoreCapture, fallback: unknown): unknown {
  let primary = fallback;
  if (record.failure.kind === "failed") primary = record.failure.error;
  const cleanup = record.cleanup.filter((cause) => !Object.is(cause, primary));
  if (cleanup.length === 0) return primary;
  return new AggregateError([primary, ...cleanup], "CORE request and cleanup failed", { cause: primary });
}

function checkCoreCapture(record: OwnedCoreCapture, work: boolean): number {
  const value = coreValue(record.slot);
  assertRequestOwnerOpen(value);
  if (
    value.core !== record.slot ||
    value.onboarding !== record.slot.onboarding.deref() ||
    value.onboarding?.issuer !== record.slot.issuer.deref() ||
    !record.slot.captures.has(record) ||
    record.slot.closing ||
    record.closing ||
    value.runtime.engine !== "sqlite" ||
    value.runtime.phase !== "ready" ||
    record.failure.kind === "failed" ||
    record.request.method !== record.method ||
    record.request.url !== record.url ||
    record.request.signal !== record.requestSignal ||
    record.request.body !== record.body ||
    (!record.bodyStarted && (record.request.bodyUsed || record.body?.locked)) ||
    coreHeaders(record.request) !== record.headers
  )
    return coreUnavailable();
  record.requestSignal.throwIfAborted();
  record.rootSignal.throwIfAborted();
  record.rootLifetime.throwIfAborted();
  record.original.signal.throwIfAborted();
  record.original.lifetime.throwIfAborted();
  if (record.lease) {
    record.lease.lifetime.throwIfAborted();
    if (
      !record.registration ||
      value.requestLeases.get(record.lease) !== record.registration ||
      record.lease.identity !== record.registration.identity ||
      record.registration.operation.signal !== record.original.signal
    )
      return coreUnavailable();
  }
  if (work) {
    if (record.retirement) return coreUnavailable();
    record.workSignal.throwIfAborted();
  }
  const wall = Date.now();
  const configured = value.configuration.now();
  const monotonic = performance.now();
  if (
    !Number.isSafeInteger(wall) ||
    wall < record.lastWallAt ||
    !Number.isSafeInteger(configured) ||
    configured < record.lastConfiguredAt ||
    configured < 0 ||
    configured > 8_640_000_000_000_000 ||
    Math.abs(wall - configured) > value.configuration.maximumAbsoluteClockSkewMs ||
    !Number.isFinite(monotonic) ||
    monotonic < record.lastMonotonicAt
  )
    return coreUnavailable();
  record.lastWallAt = wall;
  record.lastConfiguredAt = configured;
  record.lastMonotonicAt = monotonic;
  const remaining = Math.min(
    record.original.originalWallStartedAt + record.original.originalBudgetMs - Math.max(wall, configured),
    record.original.originalMonotonicExpiresAt - monotonic,
    record.deadlineAt - Math.max(wall, configured),
    record.monotonicExpiresAt - monotonic,
  );
  if (!Number.isFinite(remaining) || remaining < 1) return coreUnavailable();
  return Math.floor(remaining);
}

function tightenCoreCapture(record: OwnedCoreCapture, deadlineAt: number): void {
  if (!Number.isSafeInteger(deadlineAt) || deadlineAt < 0) return coreUnavailable();
  const mapped = record.original.originalMonotonicStartedAt + (deadlineAt - record.original.originalWallStartedAt);
  if (!Number.isFinite(mapped)) return coreUnavailable();
  const previousDeadline = record.deadlineAt;
  const previousExpiry = record.monotonicExpiresAt;
  record.deadlineAt = Math.min(record.deadlineAt, deadlineAt);
  record.monotonicExpiresAt = Math.min(record.monotonicExpiresAt, mapped);
  if (record.deadlineAt !== previousDeadline || record.monotonicExpiresAt !== previousExpiry)
    scheduleCoreCapture(record);
}

function applyCoreBounds(record: OwnedCoreCapture, bounds: OnboardingCoreReadBounds): void {
  const sample = performance.now();
  const mapped =
    record.original.originalMonotonicStartedAt + (bounds.deadlineAt - record.original.originalWallStartedAt);
  if (
    !Number.isSafeInteger(bounds.deadlineAt) ||
    bounds.deadlineAt <= record.original.originalWallStartedAt ||
    bounds.deadlineAt > record.deadlineAt ||
    !Number.isFinite(bounds.monotonicExpiresAt) ||
    bounds.monotonicExpiresAt > record.monotonicExpiresAt ||
    bounds.monotonicExpiresAt > mapped ||
    !Number.isFinite(bounds.lastMonotonicAt) ||
    bounds.lastMonotonicAt < record.lastMonotonicAt ||
    !Number.isFinite(sample) ||
    bounds.lastMonotonicAt > sample ||
    bounds.monotonicExpiresAt <= sample
  )
    return coreUnavailable();
  record.deadlineAt = bounds.deadlineAt;
  record.monotonicExpiresAt = bounds.monotonicExpiresAt;
  record.lastMonotonicAt = bounds.lastMonotonicAt;
  scheduleCoreCapture(record);
}

function scheduleCoreCapture(record: OwnedCoreCapture): void {
  if (record.timer !== undefined) {
    try {
      clearTimeout(record.timer);
      record.timer = undefined;
    } catch (error: unknown) {
      retainCoreCleanup(record, error);
      throw error;
    }
  }
  const remaining = checkCoreCapture(record, false);
  record.timer = setTimeout(() => {
    record.timer = undefined;
    try {
      scheduleCoreCapture(record);
    } catch (error: unknown) {
      retainCorePrimary(record, error);
      void closeCoreCapture(record).catch(() => undefined);
    }
  }, remaining);
  record.timer.unref();
}

function coreLeaseOperation(record: OwnedCoreCapture): SqlAuthorityOperation {
  return Object.freeze({ signal: record.original.signal, deadlineAt: record.deadlineAt });
}

function coreWorkOperation(record: OwnedCoreCapture): OnboardingOperation {
  return Object.freeze({ ...record.original, signal: record.workSignal, deadlineAt: record.deadlineAt });
}

function stopCoreWork(record: OwnedCoreCapture, reason: unknown): void {
  try {
    record.workController.abort(reason);
  } catch (error: unknown) {
    retainCoreCleanup(record, error);
  }
}

function runCoreTask<T>(record: OwnedCoreCapture, work: boolean, action: () => Promise<T>): Promise<T> {
  const completion = Promise.withResolvers<T>();
  void completion.promise.catch(() => undefined);
  let value: OwnedSql;
  try {
    value = coreValue(record.slot);
    assertRequestOwnerOpen(value);
    if (record.closing || record.slot.closing || !record.slot.captures.has(record) || (work && record.retirement))
      coreUnavailable();
  } catch (error: unknown) {
    completion.reject(coreFailure(record, error));
    return completion.promise;
  }
  record.tasks.add(completion.promise);
  if (work) record.workTasks.add(completion.promise);
  value.requestReads.add(completion.promise);
  const execute = async () => {
    try {
      const result = await runProjectedRequestRead(value, async () => {
        checkCoreCapture(record, work);
        return await action();
      });
      completion.resolve(result);
    } catch (error: unknown) {
      retainCorePrimary(record, error);
      stopCoreWork(record, error);
      completion.reject(coreFailure(record, error));
    } finally {
      record.tasks.delete(completion.promise);
      record.workTasks.delete(completion.promise);
      value.requestReads.delete(completion.promise);
    }
  };
  const forwarding = Promise.resolve().then(execute);
  void forwarding.catch((error: unknown) => {
    retainCorePrimary(record, error);
    completion.reject(coreFailure(record, error));
  });
  return completion.promise;
}

async function currentCoreCredential(record: OwnedCoreCapture): Promise<NativeCredentialEvidence | undefined> {
  checkCoreCapture(record, false);
  const value = coreValue(record.slot);
  const lease = record.lease;
  if (!lease) {
    if (record.presentation.kind !== "absent") return coreUnavailable();
    return undefined;
  }
  const registration = record.registration;
  if (
    !registration ||
    value.requestLeases.get(lease) !== registration ||
    lease.identity !== registration.identity ||
    registration.operation.signal !== record.original.signal
  )
    return coreUnavailable();
  const bounds = projectedRequestBounds(value, coreLeaseOperation(record), lease);
  const operation = Object.freeze({
    signal: registration.authorityOperation.signal,
    deadlineAt: Math.min(bounds.deadlineAt, registration.authorityOperation.deadlineAt),
  });
  await lease.assertCurrentAsync(operation);
  checkCoreCapture(record, false);
  if (value.requestLeases.get(lease) !== registration || lease.identity !== registration.identity)
    return coreUnavailable();
  const evidence = value.authority.captureOwnedCredential(lease, operation);
  if (
    evidence !== registration.evidence ||
    evidence.userId !== registration.identity.userId ||
    (registration.provider !== undefined && registration.provider !== evidence.provider) ||
    !record.slot.configuration.enabledProviders.includes(evidence.provider) ||
    (record.presentation.kind === "opaque-session" &&
      (registration.credential.type !== "opaque-session" ||
        registration.credential.token !== record.presentation.token)) ||
    (record.presentation.kind === "api-key" &&
      (registration.credential.type !== "api-key" || registration.credential.header !== record.presentation.header)) ||
    record.presentation.kind === "absent"
  )
    return coreUnavailable();
  if (evidence.type === "opaque-session")
    tightenCoreCapture(
      record,
      Math.min(evidence.hostDeadlineAt, evidence.expiresAt - record.slot.configuration.maximumAbsoluteClockSkewMs),
    );
  checkCoreCapture(record, false);
  return evidence;
}

function admitCoreRequest(record: OwnedCoreCapture): Promise<ProductionSessionRequestUser | null> {
  if (record.admission) return record.admission;
  record.admission = runCoreTask(record, true, async () => {
    if (record.presentation.kind === "absent") {
      checkCoreCapture(record, true);
      return null;
    }
    const value = coreValue(record.slot);
    const reader = getProductionSessionSqlRequestReader(coreOwner(record.slot));
    const operation = coreLeaseOperation(record);
    projectedRequestBounds(value, operation);
    let admission: SqlAuthorityAdmission;
    if (record.presentation.kind === "api-key")
      admission = await reader.admitApiKeyAsync(record.presentation.header, operation);
    else admission = await reader.admitOpaqueSessionAsync(record.presentation.token, operation);
    if (admission.type === "anonymous") return coreUnavailable();
    record.lease = admission.lease;
    record.registration = value.requestLeases.get(admission.lease);
    await currentCoreCredential(record);
    checkCoreCapture(record, true);
    const profile = await readProductionSessionSqlRequestUserAsync(
      coreOwner(record.slot),
      admission.lease,
      coreLeaseOperation(record),
    );
    await currentCoreCredential(record);
    checkCoreCapture(record, true);
    return profile;
  });
  return record.admission;
}

async function readCorePacket(record: OwnedCoreCapture): Promise<string | undefined> {
  checkCoreCapture(record, true);
  const body = record.body;
  if (!body) return undefined;
  const reader = body.getReader();
  record.bodyStarted = true;
  record.bodySettlement = "running";
  const closed = Promise.withResolvers<void>();
  void closed.promise.catch(() => undefined);
  let pending: ReturnType<typeof reader.read> | undefined;
  let cancellation: Promise<void> | undefined;
  let eof = false;
  let terminal: { readonly kind: "none" } | { readonly kind: "failed"; readonly error: unknown } = { kind: "none" };
  const storage = new Uint8Array(2048);
  let size = 0;
  try {
    const observe = reader.closed.then(
      () => closed.resolve(),
      (error: unknown) => {
        if (terminal.kind !== "failed" || !Object.is(terminal.error, error)) retainCoreCleanup(record, error);
        closed.resolve();
      },
    );
    void observe.catch((error: unknown) => {
      record.bodySettlement = "failed";
      retainCoreCleanup(record, error);
      closed.resolve();
    });
  } catch (error: unknown) {
    record.bodySettlement = "failed";
    retainCorePrimary(record, error);
    closed.resolve();
  }
  const cancel = () => {
    if (cancellation) return cancellation;
    const completion = Promise.withResolvers<void>();
    cancellation = completion.promise;
    const atCancellation = terminal;
    try {
      const underlying = reader.cancel(new OnboardingCoreReadError("ONBOARDING_CORE_UNAVAILABLE"));
      const forwarding = underlying.then(
        () => completion.resolve(),
        (error: unknown) => {
          if (atCancellation.kind !== "failed" || !Object.is(atCancellation.error, error))
            retainCoreCleanup(record, error);
          completion.resolve();
        },
      );
      void forwarding.catch((error: unknown) => {
        retainCoreCleanup(record, error);
        completion.resolve();
      });
    } catch (error: unknown) {
      record.bodySettlement = "failed";
      retainCoreCleanup(record, error);
      completion.resolve();
    }
    return completion.promise;
  };
  const interrupt = () => {
    void cancel();
  };
  try {
    record.workSignal.addEventListener("abort", interrupt, { once: true });
    checkCoreCapture(record, true);
    while (!eof) {
      checkCoreCapture(record, true);
      const read = Promise.withResolvers<Awaited<ReturnType<typeof reader.read>>>();
      pending = read.promise;
      void read.promise.catch(() => undefined);
      try {
        const underlying = reader.read();
        const forwarding = underlying.then(read.resolve, read.reject);
        void forwarding.catch(read.reject);
      } catch (error: unknown) {
        read.reject(error);
      }
      let chunk: Awaited<ReturnType<typeof reader.read>>;
      try {
        chunk = await read.promise;
      } catch (error: unknown) {
        terminal = { kind: "failed", error };
        throw error;
      } finally {
        pending = undefined;
      }
      checkCoreCapture(record, true);
      if (chunk.done) {
        eof = true;
        break;
      }
      if (!(chunk.value instanceof Uint8Array)) return coreUnavailable();
      if (chunk.value.byteLength > storage.length - size) throw new OnboardingCoreReadError("ONBOARDING_CORE_OVERFLOW");
      storage.set(chunk.value, size);
      size += chunk.value.byteLength;
    }
  } catch (error: unknown) {
    retainCorePrimary(record, error);
  } finally {
    if (!eof) await cancel();
    if (pending) {
      try {
        await pending;
      } catch (error: unknown) {
        retainCorePrimary(record, error);
      }
    }
    await closed.promise;
    try {
      reader.releaseLock();
    } catch (error: unknown) {
      record.bodySettlement = "failed";
      retainCoreCleanup(record, error);
    }
    try {
      record.workSignal.removeEventListener("abort", interrupt);
    } catch (error: unknown) {
      retainCoreCleanup(record, error);
    }
  }
  if (record.bodySettlement !== "failed") {
    record.bodySettlement = "complete";
    if (record.cleanup.length > 0) record.bodySettlement = "failed";
  }
  try {
    if (record.failure.kind === "failed" || record.cleanup.length > 0 || record.bodySettlement === "failed")
      throw coreFailure(record, new OnboardingCoreReadError("ONBOARDING_CORE_UNAVAILABLE"));
    checkCoreCapture(record, true);
    if (record.interpretation === "none") {
      if (size !== 0) return coreUnavailable();
      return undefined;
    }
    const text = new TextDecoder("utf-8", { fatal: true }).decode(storage.subarray(0, size));
    if (text === "") return undefined;
    JSON.parse(text);
    checkCoreCapture(record, true);
    return text;
  } finally {
    storage.fill(0);
  }
}

function corePacket(record: OwnedCoreCapture): Promise<string | undefined> {
  if (record.packet) return record.packet;
  record.packet = runCoreTask(record, true, () => readCorePacket(record));
  return record.packet;
}

function readCoreOnce(record: OwnedCoreCapture): Promise<CoreReadResult> {
  if (record.read) return record.read;
  record.read = runCoreTask(record, true, async () => {
    await admitCoreRequest(record);
    if (record.selection === "current-step") await corePacket(record);
    checkCoreCapture(record, true);
    const evidence = await currentCoreCredential(record);
    const value = coreValue(record.slot);
    let authority: OnboardingCoreReadAuthority = Object.freeze({ kind: "anonymous", claimToken: record.claimToken });
    if (evidence) authority = Object.freeze({ kind: "credential", credential: evidence });
    const bounds = projectedRequestBounds(value, coreLeaseOperation(record), record.lease);
    tightenCoreCapture(record, bounds.deadlineAt);
    const result = await value.runtime.readOnboardingCoreAsync(
      coreWorkOperation(record),
      record.selection,
      authority,
      record.slot.configuration,
    );
    if (result.selection !== record.selection) return coreUnavailable();
    applyCoreBounds(record, result.bounds);
    checkCoreCapture(record, true);
    await currentCoreCredential(record);
    projectedRequestBounds(value, coreLeaseOperation(record), record.lease);
    checkCoreCapture(record, true);
    return result;
  });
  return record.read;
}

function retireCoreWork(record: OwnedCoreCapture): Promise<void> {
  if (record.retirement) return record.retirement;
  const completion = Promise.withResolvers<void>();
  record.retirement = completion.promise;
  void completion.promise.catch(() => undefined);
  const tasks = [...record.workTasks];
  stopCoreWork(record, new OnboardingCoreReadError("ONBOARDING_CORE_UNAVAILABLE"));
  const settle = async () => {
    await Promise.allSettled(tasks);
    if (record.failure.kind === "failed") throw coreFailure(record, record.failure.error);
    if (record.cleanup.length > 0) throw coreFailure(record, record.cleanup[0]);
  };
  const forwarding = Promise.resolve().then(settle).then(completion.resolve, completion.reject);
  void forwarding.catch(completion.reject);
  return completion.promise;
}

async function cancelUnreadCoreBody(record: OwnedCoreCapture): Promise<void> {
  if (!record.body || record.bodyStarted) return;
  let reader: ReadableStreamDefaultReader<Uint8Array>;
  try {
    reader = record.body.getReader();
    record.bodyStarted = true;
    record.bodySettlement = "running";
  } catch (error: unknown) {
    record.bodySettlement = "failed";
    retainCoreCleanup(record, error);
    return;
  }
  const closed = Promise.withResolvers<void>();
  void closed.promise.catch(() => undefined);
  try {
    const observing = reader.closed.then(
      () => closed.resolve(),
      (error: unknown) => {
        retainCoreCleanup(record, error);
        closed.resolve();
      },
    );
    void observing.catch((error: unknown) => {
      record.bodySettlement = "failed";
      retainCoreCleanup(record, error);
      closed.resolve();
    });
  } catch (error: unknown) {
    record.bodySettlement = "failed";
    retainCoreCleanup(record, error);
    closed.resolve();
  }
  try {
    await reader.cancel(new OnboardingCoreReadError("ONBOARDING_CORE_UNAVAILABLE"));
  } catch (error: unknown) {
    record.bodySettlement = "failed";
    retainCoreCleanup(record, error);
  }
  await closed.promise;
  try {
    reader.releaseLock();
  } catch (error: unknown) {
    record.bodySettlement = "failed";
    retainCoreCleanup(record, error);
  }
  if (record.bodySettlement !== "failed") {
    record.bodySettlement = "complete";
    if (record.cleanup.length > 0) record.bodySettlement = "failed";
  }
}

function closeCoreCapture(record: OwnedCoreCapture): Promise<void> {
  if (record.closing) return record.closing;
  const completion = Promise.withResolvers<void>();
  record.closing = completion.promise;
  void completion.promise.catch(() => undefined);
  stopCoreWork(record, new OnboardingCoreReadError("ONBOARDING_CORE_UNAVAILABLE"));
  try {
    record.externalController.abort(new OnboardingCoreReadError("ONBOARDING_CORE_UNAVAILABLE"));
  } catch (error: unknown) {
    retainCoreCleanup(record, error);
  }
  const tasks = [...record.tasks];
  const close = async () => {
    await Promise.allSettled(tasks);
    try {
      await cancelUnreadCoreBody(record);
    } catch (error: unknown) {
      record.bodySettlement = "failed";
      retainCoreCleanup(record, error);
    }
    if (record.lease) {
      try {
        await record.lease.releaseAsync();
      } catch (error: unknown) {
        retainCoreCleanup(record, error);
      }
    }
    try {
      if (record.timer !== undefined) clearTimeout(record.timer);
    } catch (error: unknown) {
      retainCoreCleanup(record, error);
    }
    try {
      record.detach();
    } catch (error: unknown) {
      retainCoreCleanup(record, error);
    }
    record.slot.captures.delete(record);
    record.lease = undefined;
    record.registration = undefined;
    if (record.cleanup.length > 0 || record.bodySettlement === "failed") {
      let cause: unknown = record.cleanup[0];
      if (record.failure.kind === "failed") cause = record.failure.error;
      const error = coreFailure(record, cause);
      if (record.slot.cleanup.kind === "none") record.slot.cleanup = { kind: "failed", error };
      throw error;
    }
  };
  const forwarding = Promise.resolve().then(close).then(completion.resolve, completion.reject);
  void forwarding.catch(completion.reject);
  return completion.promise;
}

function closeCoreController(slot: OwnedCoreController): Promise<void> {
  if (slot.closing) return slot.closing;
  const completion = Promise.withResolvers<void>();
  slot.closing = completion.promise;
  void completion.promise.catch(() => undefined);
  const captures = [...slot.captures];
  const tasks = captures.map((record) => closeCoreCapture(record));
  const close = async () => {
    const settled = await Promise.allSettled(tasks);
    const failures: unknown[] = [];
    if (slot.cleanup.kind === "failed") failures.push(slot.cleanup.error);
    for (const result of settled) {
      if (result.status === "rejected" && !failures.some((error) => Object.is(error, result.reason)))
        failures.push(result.reason);
    }
    if (failures.length > 0) throw new AggregateError(failures, "CORE controller cleanup failed");
  };
  const forwarding = Promise.resolve().then(close).then(completion.resolve, completion.reject);
  void forwarding.catch(completion.reject);
  return completion.promise;
}

function captureCoreRequest(
  slot: OwnedCoreController,
  request: Request,
  requestId: string,
  signal: AbortSignal,
  lifetime: AbortSignal,
  selection: CoreSelection,
): OwnedCoreCapture {
  const wall = Date.now();
  const monotonic = performance.now();
  const value = coreValue(slot);
  assertRequestOwnerOpen(value);
  const onboarding = slot.onboarding.deref();
  if (
    value.core !== slot ||
    !onboarding ||
    value.onboarding !== onboarding ||
    slot.closing ||
    !(request instanceof Request) ||
    !(signal instanceof AbortSignal) ||
    !(lifetime instanceof AbortSignal) ||
    request.bodyUsed ||
    request.body?.locked ||
    slot.capturedRequests.has(request) ||
    !Number.isSafeInteger(wall) ||
    wall < 0 ||
    !Number.isFinite(monotonic) ||
    monotonic < 0
  )
    return coreUnavailable();
  coreText(requestId, 128, 128);
  coreText(request.url, 4096, 4096);
  const headers = coreHeaders(request);
  onboarding.configuration.guard.assertCanonicalRequest(request);
  const url = new URL(request.url);
  if (url.search || url.hash || request.headers.get("sec-fetch-site") === "cross-site") return coreUnavailable();
  const origin = request.headers.get("origin");
  if (origin !== null && origin !== slot.configuration.serverOrigin) return coreUnavailable();
  let interpretation: "json" | "none" = "none";
  if (selection === "current-step") {
    if (request.method !== "POST" || url.pathname !== "/rpc/onboard/currentStep") return coreUnavailable();
    const hint = request.headers.get("standard-server");
    const contentType = request.headers.get("content-type");
    const contentLength = request.headers.get("content-length");
    if (contentLength !== null && (!/^(0|[1-9][0-9]*)$/u.test(contentLength) || Number(contentLength) > 2048))
      throw new OnboardingCoreReadError("ONBOARDING_CORE_OVERFLOW");
    if (hint === "none") interpretation = "none";
    else {
      if (hint !== null && hint !== "json") return coreUnavailable();
      if (hint !== null || contentType !== null || (contentLength !== null && contentLength !== "0")) {
        if (!/^application\/json(?:\s*;\s*charset=utf-8)?$/iu.test(contentType ?? "")) return coreUnavailable();
        interpretation = "json";
      }
    }
  } else if (
    request.method !== "GET" ||
    url.pathname !== "/init" ||
    request.body !== null ||
    (request.headers.get("content-length") !== null && request.headers.get("content-length") !== "0")
  )
    return coreUnavailable();
  const cookie = request.headers.get("cookie");
  if (
    cookie !== null &&
    Buffer.byteLength(cookie, "utf8") > Math.min(16_384, onboarding.configuration.policy.maximumCookieBytes)
  )
    throw new OnboardingCoreReadError("ONBOARDING_CORE_OVERFLOW");
  const sessionName = sessionTokenCookieName(onboarding.configuration.origin.cookies.prefix);
  for (const raw of (cookie ?? "").split(";")) {
    const part = raw.trim();
    if (part === "") continue;
    const separator = part.indexOf("=");
    const name = part.slice(0, separator);
    if (separator <= 0 || name !== name.trim() || name.startsWith(`${sessionName}.`)) return coreUnavailable();
  }
  const token = readSingleCookie(request, sessionName);
  const apiKey = request.headers.get("ApiKey");
  const claimToken = readSingleCookie(request, "homarr-onboarding-claim");
  if (token !== null && apiKey !== null) return coreUnavailable();
  const maximumCredentialBytes = onboarding.configuration.policy.maximumCredentialBytes;
  let presentation: CoreCredentialPresentation = Object.freeze({ kind: "absent" });
  if (apiKey !== null)
    presentation = Object.freeze({
      kind: "api-key",
      header: coreText(apiKey, maximumCredentialBytes, maximumCredentialBytes),
    });
  else if (token !== null)
    presentation = Object.freeze({
      kind: "opaque-session",
      token: coreText(token, maximumCredentialBytes, maximumCredentialBytes),
    });
  if (claimToken !== null) coreText(claimToken, 512, 512);
  const budget = Math.min(onboarding.configuration.policy.requestBudgetMs, 10_000);
  const deadlineAt = wall + budget;
  const monotonicExpiresAt = monotonic + budget;
  if (!Number.isSafeInteger(deadlineAt) || !Number.isFinite(monotonicExpiresAt)) return coreUnavailable();
  const externalController = new AbortController();
  const workController = new AbortController();
  const externalSignal = AbortSignal.any([
    signal,
    request.signal,
    value.configuration.lifetime,
    externalController.signal,
  ]);
  const original: OnboardingOperation = Object.freeze({
    signal: externalSignal,
    lifetime: AbortSignal.any([lifetime, value.configuration.lifetime, externalController.signal]),
    deadlineAt,
    originalWallStartedAt: wall,
    originalMonotonicStartedAt: monotonic,
    originalBudgetMs: budget,
    originalMonotonicExpiresAt: monotonicExpiresAt,
  });
  const record: OwnedCoreCapture = {
    slot,
    request,
    requestId,
    requestSignal: request.signal,
    rootSignal: signal,
    rootLifetime: lifetime,
    selection,
    method: request.method,
    url: request.url,
    headers,
    body: request.body,
    interpretation,
    presentation,
    claimToken,
    original,
    externalController,
    workController,
    workSignal: AbortSignal.any([original.signal, original.lifetime, workController.signal]),
    tasks: new Set(),
    workTasks: new Set(),
    cleanup: [],
    failure: { kind: "none" },
    deadlineAt,
    monotonicExpiresAt,
    lastMonotonicAt: monotonic,
    lastWallAt: wall,
    lastConfiguredAt: 0,
    timer: undefined,
    detach: () => undefined,
    bodyStarted: false,
    bodySettlement: "unstarted",
    admission: undefined,
    packet: undefined,
    read: undefined,
    lease: undefined,
    registration: undefined,
    retirement: undefined,
    closing: undefined,
  };
  slot.capturedRequests.add(request);
  slot.captures.add(record);
  attachCoreCapture(record);
  return record;
}

function attachCoreCapture(record: OwnedCoreCapture): void {
  const originals = [...new Set([record.original.signal, record.original.lifetime])];
  const abort = () => {
    void closeCoreCapture(record).catch(() => undefined);
  };
  record.detach = () => {
    for (const originalSignal of originals) {
      try {
        originalSignal.removeEventListener("abort", abort);
      } catch (error: unknown) {
        retainCoreCleanup(record, error);
      }
    }
  };
  try {
    for (const originalSignal of originals) originalSignal.addEventListener("abort", abort, { once: true });
    checkCoreCapture(record, false);
    scheduleCoreCapture(record);
    checkCoreCapture(record, false);
  } catch (error: unknown) {
    retainCorePrimary(record, error);
    void closeCoreCapture(record).catch(() => undefined);
    throw error;
  }
}

function createOwnedCoreController(
  owner: WeakRef<ProductionSessionSqlOwner>,
  issuer: WeakRef<object>,
  onboarding: WeakRef<NonNullable<OwnedSql["onboarding"]>>,
  configuration: OnboardingCoreReadConfiguration,
): OwnedCoreController {
  const controller: ProductionOnboardingCoreController = Object.freeze({
    captureCurrentStep(request: Request, requestId: string, signal: AbortSignal, lifetime: AbortSignal) {
      const record = captureCoreRequest(slot, request, requestId, signal, lifetime, "current-step");
      let read: Promise<Extract<CoreReadResult, { selection: "current-step" }>> | undefined;
      return Object.freeze<CoreCurrentStepRequest>({
        admitAsync: () => admitCoreRequest(record),
        readOnceAsync() {
          if (read) return read;
          read = runCoreTask(record, true, async () => {
            const result = await readCoreOnce(record);
            if (result.selection !== "current-step") return coreUnavailable();
            checkCoreCapture(record, true);
            return result;
          });
          void read.catch(() => undefined);
          return read;
        },
        resolveRpcBodyAsync() {
          return runCoreTask(record, true, async () => {
            const text = await corePacket(record);
            checkCoreCapture(record, true);
            if (text === undefined) return undefined;
            const packet: unknown = JSON.parse(text);
            checkCoreCapture(record, true);
            return packet;
          });
        },
        assertCurrentAsync: () =>
          runCoreTask(record, false, async () => {
            await currentCoreCredential(record);
            checkCoreCapture(record, false);
          }),
        retireWorkAsync: () => retireCoreWork(record),
        closeAsync: () => closeCoreCapture(record),
      });
    },
    captureEnvironment(request: Request, requestId: string, signal: AbortSignal, lifetime: AbortSignal) {
      const record = captureCoreRequest(slot, request, requestId, signal, lifetime, "environment");
      let read: Promise<Extract<CoreReadResult, { selection: "environment" }>> | undefined;
      return Object.freeze<CoreEnvironmentRequest>({
        admitAsync: () => admitCoreRequest(record),
        readOnceAsync() {
          if (read) return read;
          read = runCoreTask(record, true, async () => {
            const result = await readCoreOnce(record);
            if (result.selection !== "environment") return coreUnavailable();
            checkCoreCapture(record, true);
            return result;
          });
          void read.catch(() => undefined);
          return read;
        },
        assertCurrentAsync: () =>
          runCoreTask(record, false, async () => {
            await currentCoreCredential(record);
            checkCoreCapture(record, false);
          }),
        retireWorkAsync: () => retireCoreWork(record),
        closeAsync: () => closeCoreCapture(record),
      });
    },
    closeAsync: () => closeCoreController(slot),
  });
  const slot: OwnedCoreController = {
    owner,
    issuer,
    onboarding,
    configuration,
    controller,
    captures: new Set(),
    capturedRequests: new WeakSet(),
    cleanup: { kind: "none" },
    closing: undefined,
  };
  return slot;
}

export function createProductionSessionSqlOnboardingCoreController(
  owner: ProductionSessionSqlOwner,
  issuer: object,
  configuration: CoreConfiguration,
): ProductionOnboardingCoreController {
  const value = owned(owner);
  assertRequestOwnerOpen(value);
  const onboarding = value.onboarding;
  if (
    value.core ||
    !onboarding ||
    onboarding.issuer !== issuer ||
    value.runtime.engine !== "sqlite" ||
    value.runtime.phase !== "ready"
  )
    return coreUnavailable();
  const captured = coreConfiguration(value, configuration);
  const slot = createOwnedCoreController(new WeakRef(owner), new WeakRef(issuer), new WeakRef(onboarding), captured);
  value.core = slot;
  return slot.controller;
}

export function assertProductionSessionSqlOnboardingCoreController(
  owner: ProductionSessionSqlOwner,
  issuer: object,
  controller: ProductionOnboardingCoreController,
): void {
  const value = owned(owner);
  assertRequestOwnerOpen(value);
  if (
    !value.core ||
    value.core.issuer.deref() !== issuer ||
    value.core.controller !== controller ||
    value.core.onboarding.deref() !== value.onboarding ||
    value.core.closing ||
    value.runtime.engine !== "sqlite" ||
    value.runtime.phase !== "ready" ||
    !Object.isFrozen(controller)
  )
    coreUnavailable();
}

export function configureProductionSessionSqlOnboarding(
  owner: ProductionSessionSqlOwner,
  issuer: object,
  policy: ProductionOnboardingPolicy,
  origin: IssuerOriginConfiguration,
  providers: readonly SupportedAuthProvider[],
  bodyBudget: IssuerBodyBudget,
  inputSource?: ProductionOnboardingRpcInputSource,
): void {
  const value = owned(owner);
  assertRequestOwnerOpen(value);
  if (value.onboarding || origin.now !== value.configuration.now) throw new ProductionOnboardingError();
  if (inputSource !== undefined) {
    const source = onboardingOwnRecord(inputSource);
    if (
      !Object.isFrozen(inputSource) ||
      Object.keys(source).length !== 3 ||
      typeof source.consumeNextStepInput !== "function" ||
      typeof source.consumeInitUserInput !== "function" ||
      typeof source.consumeInitialExternalGroupInput !== "function"
    )
      throw new ProductionOnboardingError();
  }
  value.onboarding = Object.freeze({
    issuer,
    inputSource,
    configuration: createProductionOnboardingConfiguration(
      policy,
      origin,
      providers,
      bodyBudget,
      value.configuration.maximumAbsoluteClockSkewMs,
    ),
  });
}

function assertOwnedOnboarding(value: OwnedSql, record: OwnedOnboardingRequest): void {
  assertRequestOwnerOpen(value);
  const configuration = value.onboarding;
  if (
    record.retired ||
    record.closing ||
    value.runtime.phase !== "ready" ||
    !configuration ||
    configuration.issuer !== record.issuer ||
    configuration.configuration !== record.state.configuration ||
    !value.onboardingRequests.has(record) ||
    onboardingRequests.get(record.handle) !== record
  )
    throw new ProductionOnboardingError();
  record.state.check();
}

function onboardingRequestFor(
  owner: ProductionSessionSqlOwner,
  issuer: object,
  handle: ProductionOnboardingRequest,
  request: Request,
): OwnedOnboardingRequest {
  const record = onboardingRequests.get(handle);
  if (!record || record.owner !== owner || record.issuer !== issuer || record.state.request !== request)
    throw new ProductionOnboardingError();
  assertOwnedOnboarding(owned(owner), record);
  return record;
}

export function captureProductionSessionSqlOnboardingRequest(
  owner: ProductionSessionSqlOwner,
  issuer: object,
  request: Request,
  requestId: string,
  signal: AbortSignal,
  lifetime: AbortSignal,
): ProductionOnboardingRequest {
  const value = owned(owner);
  assertRequestOwnerOpen(value);
  const configuration = value.onboarding;
  if (
    !configuration ||
    configuration.issuer !== issuer ||
    value.runtime.phase !== "ready" ||
    value.capturedOnboardingRequests.has(request)
  )
    throw new ProductionOnboardingError();
  value.capturedOnboardingRequests.add(request);
  const state = new OwnedOnboardingRequestState(
    request,
    requestId,
    signal,
    lifetime,
    value.configuration.lifetime,
    configuration.configuration,
  );
  const handle = createOnboardingRequestHandle();
  const record: OwnedOnboardingRequest = {
    owner,
    issuer,
    handle,
    state,
    tasks: new Set(),
    phase: "captured",
    lease: null,
    prepared: undefined,
    native: { type: "not-dispatched", error: undefined },
    failure: { type: "none" },
    confirmed: false,
    retired: false,
    detach: () => undefined,
    closing: undefined,
    retirement: { type: "none" },
    packet: undefined,
    frame: undefined,
    csrf: undefined,
    csrfOutput: undefined,
    nativePublication: undefined,
    publication: undefined,
    finalContext: undefined,
  };
  onboardingRequests.set(handle, record);
  onboardingResponseRequests.set(handle, record);
  value.onboardingRequests.add(record);
  const retire = () => {
    void retireOwnedOnboardingRequest(value, record);
  };
  const signals = [...new Set([state.original.signal, state.original.lifetime])];
  record.detach = () => {
    for (const original of signals) {
      try {
        original.removeEventListener("abort", retire);
      } catch (cause: unknown) {
        state.cleanupFailures.push({ phase: "request-detach", cause });
      }
    }
  };
  for (const original of signals) original.addEventListener("abort", retire, { once: true });
  state.schedule();
  assertOwnedOnboarding(value, record);
  return handle;
}

async function admitOwnedOnboardingAsync(value: OwnedSql, record: OwnedOnboardingRequest): Promise<void> {
  const credentials = record.state.admitMutation();
  if (credentials.sessionToken === null && credentials.apiKey === null) return;
  const operation = record.state.bounds();
  const reader = getProductionSessionSqlRequestReader(record.owner);
  onboardingAdmissionOperations.set(operation, record);
  let admission: SqlAuthorityAdmission;
  try {
    admission = await record.state.ledger.run("onboarding-admission", () => {
      if (credentials.apiKey !== null) return reader.admitApiKeyAsync(credentials.apiKey, operation);
      return reader.admitOpaqueSessionAsync(credentials.sessionToken, operation);
    });
  } finally {
    onboardingAdmissionOperations.delete(operation);
  }
  if (admission.type === "anonymous") throw new ProductionOnboardingError();
  record.lease = admission.lease;
  assertOwnedOnboarding(value, record);
  const registration = value.requestLeases.get(admission.lease);
  if (!registration || registration.operation.signal !== record.state.original.signal)
    throw new ProductionOnboardingError();
  if (
    (credentials.apiKey !== null &&
      (registration.credential.type !== "api-key" || registration.credential.header !== credentials.apiKey)) ||
    (credentials.sessionToken !== null &&
      (registration.credential.type !== "opaque-session" || registration.credential.token !== credentials.sessionToken))
  )
    throw new ProductionOnboardingError();
  if (admission.lease.validity.type === "stored-session-expiry")
    record.state.tighten(admission.lease.validity.hostDeadlineAt);
}

async function ownedOnboardingAuthorityAsync(
  value: OwnedSql,
  record: OwnedOnboardingRequest,
): Promise<OnboardingRetainedAuthority | null> {
  assertOwnedOnboarding(value, record);
  const cookies = record.state.admitMutation();
  const lease = record.lease;
  if (!lease) {
    if (cookies.apiKey !== null || cookies.sessionToken !== null) throw new ProductionOnboardingError();
    if (cookies.currentToken === null) return null;
    return Object.freeze({ kind: "stored-claim", token: cookies.currentToken });
  }
  const registration = value.requestLeases.get(lease);
  if (!registration || registration.operation.signal !== record.state.original.signal)
    throw new ProductionOnboardingError();
  const bounds = projectedRequestBounds(value, record.state.bounds(), lease);
  const operation = Object.freeze({
    signal: registration.authorityOperation.signal,
    deadlineAt: Math.min(bounds.deadlineAt, registration.authorityOperation.deadlineAt),
  });
  await record.state.ledger.run("onboarding-current-authority", () => lease.assertCurrentAsync(operation));
  assertOwnedOnboarding(value, record);
  if (value.requestLeases.get(lease) !== registration || lease.identity !== registration.identity)
    throw new ProductionOnboardingError();
  const credential = value.authority.captureOwnedCredential(lease, operation);
  if (
    credential !== registration.evidence ||
    credential.userId !== registration.identity.userId ||
    (registration.provider !== undefined && credential.provider !== registration.provider)
  )
    throw new ProductionOnboardingError();
  if (credential.type === "opaque-session") record.state.tighten(credential.hostDeadlineAt);
  return Object.freeze({ kind: "stored-admin", credential });
}

function onboardingClaimAuthority(
  authority: OnboardingRetainedAuthority | null,
  record: OwnedOnboardingRequest,
): OnboardingClaimAuthority {
  const { currentToken } = record.state.admitMutation();
  if (authority?.kind === "stored-admin")
    return Object.freeze({ kind: "stored-admin", credential: authority.credential, currentToken });
  return Object.freeze({ kind: "claim-request", currentToken });
}

function onboardingConfiguration(value: OwnedSql, record: OwnedOnboardingRequest): OnboardingSqlConfiguration {
  assertOwnedOnboarding(value, record);
  return Object.freeze({
    maximumSnapshotRows: value.configuration.maximumSnapshotRows,
    maximumAbsoluteClockSkewMs: value.configuration.maximumAbsoluteClockSkewMs,
    now: value.configuration.now,
    demoEnabled: record.state.configuration.policy.demoEnabled,
    readOnly: record.state.configuration.policy.readOnly,
    enabledProviders: record.state.configuration.providers,
  });
}

async function readOwnedOnboardingFirstStepAsync(value: OwnedSql, record: OwnedOnboardingRequest) {
  assertOwnedOnboarding(value, record);
  const bounds = record.state.bounds();
  const statement = sql`SELECT "id", "step", "previous_step" AS "previousStep" FROM "onboarding" LIMIT 2`;
  let rows: readonly unknown[];
  if (value.runtime.engine === "sqlite") {
    rows = value.runtime.boundedTransactionSync(bounds, (database) => database.all<unknown>(statement));
  } else {
    rows = await value.runtime.boundedSnapshotAsync(
      bounds,
      async (database) => (await database.execute(statement)).rows,
    );
  }
  assertOwnedOnboarding(value, record);
  if (rows.length !== 1) throw new ProductionOnboardingError();
  const firstRead = captureOwnedOnboardingStep(rows[0]);
  if (firstRead.step !== "start") throw new ProductionOnboardingError();
  return firstRead;
}

function prepareOwnedOnboardingAsync(
  record: OwnedOnboardingRequest,
  kind: "claim",
  frame?: OwnedOnboardingFrame,
): Promise<PreparedProductionOnboardingClaim>;
function prepareOwnedOnboardingAsync(
  record: OwnedOnboardingRequest,
  kind: "nextStep",
  frame?: OwnedOnboardingFrame,
): Promise<PreparedProductionOnboardNextStep>;
function prepareOwnedOnboardingAsync(
  record: OwnedOnboardingRequest,
  kind: "initUser",
  frame?: OwnedOnboardingFrame,
): Promise<PreparedProductionOnboardingInitUser>;
function prepareOwnedOnboardingAsync(
  record: OwnedOnboardingRequest,
  kind: "initialExternalGroup",
  frame?: OwnedOnboardingFrame,
): Promise<PreparedProductionInitialExternalGroup>;
function prepareOwnedOnboardingAsync(
  record: OwnedOnboardingRequest,
  kind: PreparedProductionOnboardingOperation["kind"],
  frame?: OwnedOnboardingFrame,
): Promise<PreparedProductionOnboardingOperation> {
  const value = owned(record.owner);
  assertOwnedOnboarding(value, record);
  if (record.phase !== "captured" || (record.packet !== undefined && frame === undefined))
    throw new ProductionOnboardingError();
  if (frame) {
    assertOnboardingFrame(value, record, frame);
    if (frame.consumed || frame.handle.kind !== kind) throw new ProductionOnboardingError();
    frame.consumed = true;
  }
  record.phase = "preparing";
  const completion = Promise.withResolvers<PreparedProductionOnboardingOperation>();
  onboardingTasks.set(completion.promise, { record, kind: "preparation" });
  value.requestReads.add(completion.promise);
  record.tasks.add(completion.promise);
  const prepare = async () => {
    try {
      assertOwnedOnboarding(value, record);
      await admitOwnedOnboardingAsync(value, record);
      const authority = await ownedOnboardingAuthorityAsync(value, record);
      let sourceInput: unknown;
      if (frame) {
        sourceInput = await record.state.ledger.run("onboarding-codec-input", async () => {
          assertOnboardingFrame(value, record, frame);
          const ticket = frame.ticket;
          if (ticket.kind === "nextStep") {
            const output = frame.source.consumeNextStepInput(ticket, frame.packet.handle, frame.context);
            if (output !== undefined) throw new ProductionOnboardingError();
            return undefined;
          }
          if (ticket.kind === "initUser")
            return onboardingOwnRecord(frame.source.consumeInitUserInput(ticket, frame.packet.handle, frame.context));
          return onboardingOwnRecord(
            frame.source.consumeInitialExternalGroupInput(ticket, frame.packet.handle, frame.context),
          );
        });
        assertOnboardingFrame(value, record, frame);
      }
      let prepared: OwnedPreparedOnboarding;
      if (kind === "claim") {
        await record.state.readEmptySourceAsync();
        prepared = {
          kind,
          handle: createOnboardingClaimHandle(),
          invocation: Object.freeze({ kind, authority: onboardingClaimAuthority(authority, record) }),
          request: record,
        };
      } else {
        if (authority === null) throw new ProductionOnboardingError();
        if (kind === "nextStep") {
          if (!frame) await record.state.readEmptySourceAsync();
          const firstRead = await record.state.ledger.run("onboarding-first-step", () =>
            readOwnedOnboardingFirstStepAsync(value, record),
          );
          prepared = {
            kind,
            handle: createOnboardNextStepHandle(),
            invocation: Object.freeze({ kind, authority, firstRead }),
            request: record,
          };
        } else if (kind === "initUser") {
          if (!record.state.configuration.providers.includes("credentials")) throw new ProductionOnboardingError();
          let user: Awaited<ReturnType<typeof prepareOwnedOnboardingUserAsync>>;
          if (frame) user = await prepareOwnedOnboardingUserInputAsync(record.state, sourceInput);
          else user = await prepareOwnedOnboardingUserAsync(record.state);
          prepared = {
            kind,
            handle: createOnboardingInitUserHandle(),
            invocation: Object.freeze({ kind, authority, ...user }),
            request: record,
          };
        } else {
          if (!record.state.configuration.providers.some((provider) => provider === "ldap" || provider === "oidc"))
            throw new ProductionOnboardingError();
          let group: Awaited<ReturnType<typeof prepareOwnedInitialExternalGroupAsync>>;
          if (frame) group = prepareOwnedInitialExternalGroupInput(record.state, sourceInput);
          else group = await prepareOwnedInitialExternalGroupAsync(record.state);
          prepared = {
            kind,
            handle: createInitialExternalGroupHandle(),
            invocation: Object.freeze({ kind, authority, ...group }),
            request: record,
          };
        }
      }
      await record.state.ledger.drainAsync();
      assertOwnedOnboarding(value, record);
      record.prepared = prepared;
      preparedOnboarding.set(prepared.handle, prepared);
      record.phase = "prepared";
      completion.resolve(prepared.handle);
    } catch (error: unknown) {
      record.phase = "failed";
      const failure = new ProductionOnboardingError("held-without-dispatch", error);
      record.failure = { type: "failed", error: failure };
      completion.reject(failure);
    } finally {
      value.requestReads.delete(completion.promise);
      record.tasks.delete(completion.promise);
    }
  };
  void Promise.resolve().then(prepare);
  return completion.promise;
}

export function prepareProductionSessionSqlOnboardingClaimAsync(
  owner: ProductionSessionSqlOwner,
  issuer: object,
  handle: ProductionOnboardingRequest,
  request: Request,
) {
  return prepareOwnedOnboardingAsync(onboardingRequestFor(owner, issuer, handle, request), "claim");
}

export function prepareProductionSessionSqlOnboardNextStepAsync(
  owner: ProductionSessionSqlOwner,
  issuer: object,
  handle: ProductionOnboardingRequest,
  request: Request,
) {
  return prepareOwnedOnboardingAsync(onboardingRequestFor(owner, issuer, handle, request), "nextStep");
}

export function prepareProductionSessionSqlOnboardingInitUserAsync(
  owner: ProductionSessionSqlOwner,
  issuer: object,
  handle: ProductionOnboardingRequest,
  request: Request,
) {
  return prepareOwnedOnboardingAsync(onboardingRequestFor(owner, issuer, handle, request), "initUser");
}

export function prepareProductionSessionSqlInitialExternalGroupAsync(
  owner: ProductionSessionSqlOwner,
  issuer: object,
  handle: ProductionOnboardingRequest,
  request: Request,
) {
  return prepareOwnedOnboardingAsync(onboardingRequestFor(owner, issuer, handle, request), "initialExternalGroup");
}

function runOnboardingRead<Value>(
  value: OwnedSql,
  record: OwnedOnboardingRequest,
  kind: "packet" | "cache" | "csrf",
  operation: () => Promise<Value>,
): Promise<Value> {
  const completion = Promise.withResolvers<Value>();
  onboardingTasks.set(completion.promise, { record, kind });
  value.requestReads.add(completion.promise);
  record.tasks.add(completion.promise);
  const run = async () => {
    try {
      assertOwnedOnboarding(value, record);
      completion.resolve(await operation());
    } catch (error: unknown) {
      record.phase = "failed";
      if (record.failure.type === "none") record.failure = { type: "failed", error };
      completion.reject(error);
    } finally {
      value.requestReads.delete(completion.promise);
      record.tasks.delete(completion.promise);
    }
  };
  void Promise.resolve().then(run);
  return completion.promise;
}

export function readProductionSessionSqlOnboardingRpcPacketAsync(
  owner: ProductionSessionSqlOwner,
  issuer: object,
  handle: ProductionOnboardingRequest,
  request: Request,
): Promise<ProductionOnboardingRpcPacket> {
  const record = onboardingRequestFor(owner, issuer, handle, request);
  const value = owned(owner);
  if (!value.onboarding?.inputSource || record.phase !== "captured") throw new ProductionOnboardingError();
  if (record.packet) return record.packet.task;
  onboardingRpcCommand(request);
  const packet = createOnboardingPacketHandle();
  const task = runOnboardingRead(value, record, "packet", async () => {
    record.state.admitMutation();
    await record.state.readRpcPacketAsync();
    assertOwnedOnboarding(value, record);
    return packet;
  });
  const registration: OwnedOnboardingPacket = { handle: packet, record, task };
  record.packet = registration;
  onboardingPackets.set(packet, registration);
  return task;
}

export function resolveProductionSessionSqlOnboardingRpcPacketAsync(
  owner: ProductionSessionSqlOwner,
  issuer: object,
  packet: ProductionOnboardingRpcPacket,
  request: Request,
): Promise<unknown> {
  const registration = onboardingPackets.get(packet);
  if (!registration) throw new ProductionOnboardingError();
  const record = onboardingRequestFor(owner, issuer, registration.record.handle, request);
  if (record.packet !== registration || record.phase !== "captured") throw new ProductionOnboardingError();
  return runOnboardingRead(owned(owner), record, "cache", async () => {
    await registration.task;
    return record.state.resolveRpcPacket();
  });
}

function assertOnboardingFrame(value: OwnedSql, record: OwnedOnboardingRequest, frame: OwnedOnboardingFrame): void {
  assertOwnedOnboarding(value, record);
  if (
    record.frame !== frame ||
    frame.packet.record !== record ||
    record.packet !== frame.packet ||
    onboardingPackets.get(frame.packet.handle) !== frame.packet ||
    onboardingFrames.get(frame.handle) !== frame ||
    onboardingTickets.get(frame.ticket) !== frame ||
    value.onboarding?.inputSource !== frame.source ||
    frame.context.request !== record.state.request ||
    frame.context.signal !== record.state.original.signal ||
    !Object.isFrozen(frame.context) ||
    onboardingRpcCommand(record.state.request) !== frame.handle.kind ||
    frame.ticket.kind !== frame.handle.kind
  )
    throw new ProductionOnboardingError();
}

export function createProductionSessionSqlOnboardingRpcFrame(
  owner: ProductionSessionSqlOwner,
  issuer: object,
  handle: ProductionOnboardingRequest,
  request: Request,
  packet: ProductionOnboardingRpcPacket,
  context: ProductionOnboardingRpcContext,
) {
  const record = onboardingRequestFor(owner, issuer, handle, request);
  const value = owned(owner);
  const source = value.onboarding?.inputSource;
  const registration = onboardingPackets.get(packet);
  if (
    !source ||
    !registration ||
    record.packet !== registration ||
    registration.record !== record ||
    record.phase !== "captured" ||
    record.frame ||
    !Object.isFrozen(context) ||
    context.request !== request ||
    context.signal !== record.state.original.signal
  )
    throw new ProductionOnboardingError();
  record.state.assertRpcPacketReady();
  const kind = onboardingRpcCommand(request);
  const frame: OwnedOnboardingFrame = {
    handle: createOnboardingFrameHandle(kind),
    ticket: createOnboardingInputTicket(kind),
    packet: registration,
    context,
    source,
    consumed: false,
  };
  record.frame = frame;
  record.finalContext = new WeakRef(context);
  onboardingFrames.set(frame.handle, frame);
  onboardingTickets.set(frame.ticket, frame);
  return Object.freeze({ frame: frame.handle, ticket: frame.ticket, packet, context, bounds: record.state.bounds() });
}

function onboardingCodecFrameFor(
  owner: ProductionSessionSqlOwner,
  issuer: object,
  handle: ProductionOnboardingRpcFrame,
  ticket: ProductionOnboardingInputTicket,
): OwnedOnboardingFrame {
  const frame = onboardingFrames.get(handle);
  if (!frame || frame.ticket !== ticket || frame.packet.record.owner !== owner || frame.packet.record.issuer !== issuer)
    throw new ProductionOnboardingError();
  assertOnboardingFrame(owned(owner), frame.packet.record, frame);
  return frame;
}

export function assertProductionSessionSqlOnboardingRpcFrame(
  owner: ProductionSessionSqlOwner,
  issuer: object,
  originalRequest: Request,
  frame: ProductionOnboardingRpcFrame,
  ticket: ProductionOnboardingInputTicket,
  packet: ProductionOnboardingRpcPacket,
  finalContext: ProductionOnboardingRpcContext,
  inputSource: ProductionOnboardingRpcInputSource,
): void {
  const registration = onboardingCodecFrameFor(owner, issuer, frame, ticket);
  const record = registration.packet.record;
  const source = owned(owner).onboarding?.inputSource;
  const policy = record.state.configuration.policy;
  if (
    record.phase !== "captured" ||
    registration.consumed ||
    record.failure.type !== "none" ||
    record.state.request !== originalRequest ||
    registration.ticket !== ticket ||
    registration.packet.handle !== packet ||
    registration.context !== finalContext ||
    source === undefined ||
    inputSource !== registration.source ||
    registration.source !== source ||
    (policy.demoEnabled && policy.readOnly)
  )
    throw new ProductionOnboardingError();
}

export function prepareProductionSessionSqlOnboardNextStepFromCodecAsync(
  owner: ProductionSessionSqlOwner,
  issuer: object,
  handle: ProductionOnboardingRpcFrame,
  ticket: ProductionOnboardNextStepInputTicket,
): Promise<PreparedProductionOnboardNextStep> {
  const frame = onboardingCodecFrameFor(owner, issuer, handle, ticket);
  return prepareOwnedOnboardingAsync(frame.packet.record, "nextStep", frame);
}

export function prepareProductionSessionSqlOnboardingInitUserFromCodecAsync(
  owner: ProductionSessionSqlOwner,
  issuer: object,
  handle: ProductionOnboardingRpcFrame,
  ticket: ProductionOnboardingInitUserInputTicket,
): Promise<PreparedProductionOnboardingInitUser> {
  const frame = onboardingCodecFrameFor(owner, issuer, handle, ticket);
  return prepareOwnedOnboardingAsync(frame.packet.record, "initUser", frame);
}

export function prepareProductionSessionSqlInitialExternalGroupFromCodecAsync(
  owner: ProductionSessionSqlOwner,
  issuer: object,
  handle: ProductionOnboardingRpcFrame,
  ticket: ProductionInitialExternalGroupInputTicket,
): Promise<PreparedProductionInitialExternalGroup> {
  const frame = onboardingCodecFrameFor(owner, issuer, handle, ticket);
  return prepareOwnedOnboardingAsync(frame.packet.record, "initialExternalGroup", frame);
}

export function captureProductionSessionSqlOnboardingCsrfRequest(
  owner: ProductionSessionSqlOwner,
  issuer: object,
  request: Request,
  requestId: string,
  signal: AbortSignal,
  lifetime: AbortSignal,
): ProductionOnboardingCsrfRequest {
  const url = new URL(request.url);
  if (request.method !== "GET" || url.pathname !== "/api/onboarding/claim" || url.search || url.hash)
    throw new ProductionOnboardingError();
  const original = captureProductionSessionSqlOnboardingRequest(owner, issuer, request, requestId, signal, lifetime);
  const record = onboardingRequestFor(owner, issuer, original, request);
  const handle = createOnboardingCsrfHandle();
  record.csrf = handle;
  onboardingCsrfRequests.set(handle, record);
  onboardingResponseRequests.set(handle, record);
  return handle;
}

export function prepareProductionSessionSqlOnboardingCsrfAsync(
  owner: ProductionSessionSqlOwner,
  issuer: object,
  handle: ProductionOnboardingCsrfRequest,
  request: Request,
): Promise<ProductionOnboardingCsrfOutput> {
  const record = onboardingCsrfRequests.get(handle);
  if (!record || record.csrf !== handle) throw new ProductionOnboardingError();
  onboardingRequestFor(owner, issuer, record.handle, request);
  if (record.phase !== "captured") throw new ProductionOnboardingError();
  record.phase = "preparing";
  return runOnboardingRead(owned(owner), record, "csrf", async () => {
    const output = await record.state.prepareCsrfReadAsync();
    assertOwnedOnboarding(owned(owner), record);
    record.csrfOutput = output;
    record.phase = "settled";
    return output;
  });
}

export function getProductionSessionSqlOnboardingRequestBounds(
  owner: ProductionSessionSqlOwner,
  issuer: object,
  handle: ProductionOnboardingRequest,
  request: Request,
) {
  return onboardingRequestFor(owner, issuer, handle, request).state.bounds();
}

function publicationHeaders(response: Response): string {
  const fields: [string, string][] = [];
  let size = 0;
  response.headers.forEach((value, key) => {
    size += Buffer.byteLength(value + key, "utf8");
    if (size > 65_536) throw new ProductionOnboardingError();
    fields.push([key, value]);
  });
  return JSON.stringify(fields);
}

function assertOnboardingPublication(record: OwnedOnboardingPublication): void {
  if (
    record.completion ||
    record.output !== "settled" ||
    record.response.status !== record.responseStatus ||
    publicationHeaders(record.response) !== record.responseHeaders
  )
    throw new ProductionOnboardingError();
  record.clock.check();
  if (record.native) {
    const observed = record.native.read();
    record.nativeRead = observed;
    if (observed.kind !== "settled") throw new ProductionOnboardingError();
    if (observed.facts.bounds !== null && observed.temporal !== "within-original-and-observed-bounds")
      throw new ProductionOnboardingError();
    if (
      record.primary.kind === "none" &&
      (observed.facts.commit !== "acknowledged" ||
        observed.facts.finalGate !== "passed" ||
        observed.facts.unit !== "returned" ||
        observed.facts.cleanup !== "complete" ||
        observed.facts.runtimeGuard !== "passed" ||
        observed.temporal !== "within-original-and-observed-bounds")
    )
      throw new ProductionOnboardingError();
  }
  if (record.cleanupFailures.length !== 0) throw new ProductionOnboardingError();
}

export function recordProductionSessionSqlOnboardingResponseAsync(
  owner: ProductionSessionSqlOwner,
  issuer: object,
  handle: ProductionOnboardingRequest | ProductionOnboardingCsrfRequest,
  request: Request,
  outcome: ProductionOnboardingResponseOutcome,
): Promise<ProductionOnboardingPublication> {
  const record = onboardingResponseRequests.get(handle);
  if (!record || record.owner !== owner || record.issuer !== issuer || record.state.request !== request)
    throw new ProductionOnboardingError();
  const value = owned(owner);
  assertRequestOwnerOpen(value);
  if (
    record.publication ||
    record.phase === "preparing" ||
    record.phase === "dispatching" ||
    !(outcome.response instanceof Response) ||
    outcome.response.bodyUsed ||
    outcome.response.body?.locked
  )
    throw new ProductionOnboardingError();
  if (record.native.type !== "not-dispatched" && !record.nativePublication) throw new ProductionOnboardingError();
  if (outcome.kind === "output") {
    if (record.phase !== "settled" || record.failure.type !== "none") throw new ProductionOnboardingError();
    if (record.csrf && record.csrfOutput?.response !== outcome.response) throw new ProductionOnboardingError();
  } else {
    if (record.failure.type === "none") record.failure = { type: "failed", error: outcome.error };
    record.phase = "failed";
  }
  const completion = Promise.withResolvers<ProductionOnboardingPublication>();
  const publication: OwnedOnboardingPublication = {
    handle: createOnboardingPublicationHandle(),
    issuer: new WeakRef(issuer),
    clock: record.state.publicationClock(),
    response: outcome.response,
    responseHeaders: publicationHeaders(outcome.response),
    responseStatus: outcome.response.status,
    sourceOutcome: outcome.kind,
    tasks: new Set(),
    maximumBytes: record.state.configuration.policy.maximumResponseBytes,
    native: record.nativePublication,
    nativeRead: null,
    primary: { kind: "none" },
    cleanupFailures: [],
    body: undefined,
    ready: completion.promise,
    completion: undefined,
    output: "pending",
    controller: new AbortController(),
    finalContext: record.finalContext,
  };
  if (record.failure.type === "failed") publication.primary = { kind: "failed", error: record.failure.error };
  if (record.nativePublication) value.onboardingNativePublications.delete(record.nativePublication);
  record.nativePublication = undefined;
  record.publication = publication;
  onboardingPublications.set(publication.handle, publication);
  value.onboardingPublications.add(publication);
  value.pending.add(completion.promise);
  onboardingPublicationTasks.set(completion.promise, new WeakRef(owner));
  const readCompletion = Promise.withResolvers<void>();
  publication.tasks.add(readCompletion.promise);
  const read = async () => {
    try {
      publication.body = await readOwnedOnboardingResponseAsync(
        publication.response,
        publication.clock,
        publication.controller,
        publication.maximumBytes,
        publication.cleanupFailures,
      );
      publication.output = "settled";
      readCompletion.resolve();
    } catch (error: unknown) {
      publication.output = "failed";
      if (publication.primary.kind === "none") publication.primary = { kind: "failed", error };
      readCompletion.reject(error);
    } finally {
      publication.tasks.delete(readCompletion.promise);
    }
  };
  const settle = async () => {
    try {
      const retirement = await retireOwnedOnboardingRequest(value, record);
      if (retirement.primary.type === "failed")
        publication.primary = { kind: "failed", error: retirement.primary.error };
      if (retirement.kind === "cleanup-failed") throw new ProductionOnboardingError();
      await readCompletion.promise;
      assertOnboardingPublication(publication);
      completion.resolve(publication.handle);
    } catch (error: unknown) {
      if (publication.primary.kind === "none") publication.primary = { kind: "failed", error };
      completion.reject(error);
      void settleOnboardingPublication(value, publication, { kind: "abandoned", cause: error }).catch(() => undefined);
    } finally {
      value.pending.delete(completion.promise);
    }
  };
  void readCompletion.promise.catch(() => undefined);
  void completion.promise.catch(() => undefined);
  void Promise.resolve().then(read);
  void Promise.resolve().then(settle);
  return completion.promise;
}

function onboardingPublicationFor(
  issuer: object,
  handle: ProductionOnboardingPublication,
  request: Request,
  response: Response,
): OwnedOnboardingPublication {
  const record = onboardingPublications.get(handle);
  if (!record || record.issuer.deref() !== issuer || record.clock.request !== request || record.response !== response)
    throw new ProductionOnboardingError();
  return record;
}

export function readProductionSessionSqlOnboardingPublication(
  issuer: object,
  handle: ProductionOnboardingPublication,
  request: Request,
  response: Response,
) {
  const record = onboardingPublicationFor(issuer, handle, request, response);
  assertOnboardingPublication(record);
  if (!record.body) throw new ProductionOnboardingError();
  return Object.freeze({
    body: record.body.slice(),
    native: record.nativeRead,
    primary: record.primary,
    sourceOutcome: record.sourceOutcome,
  });
}

function settleOnboardingPublication(
  value: OwnedSql,
  record: OwnedOnboardingPublication,
  terminal: { readonly kind: "published" } | { readonly kind: "abandoned"; readonly cause: unknown },
): Promise<ProductionOnboardingPublicationResult> {
  if (record.completion) return record.completion;
  if (terminal.kind === "published") assertOnboardingPublication(record);
  const completion = Promise.withResolvers<ProductionOnboardingPublicationResult>();
  record.completion = completion.promise;
  value.pending.add(completion.promise);
  const settle = async () => {
    let observedTerminal = terminal;
    if (terminal.kind === "abandoned") record.controller.abort(terminal.cause);
    await record.ready.catch(() => undefined);
    await Promise.allSettled([...record.tasks]);
    if (observedTerminal.kind === "published") {
      try {
        if (
          record.output !== "settled" ||
          record.body === undefined ||
          record.response.status !== record.responseStatus ||
          publicationHeaders(record.response) !== record.responseHeaders ||
          record.completion !== completion.promise ||
          value.closing !== undefined
        )
          throw new ProductionOnboardingError();
        record.clock.check();
      } catch (error: unknown) {
        if (record.primary.kind === "none") record.primary = { kind: "failed", error };
        observedTerminal = { kind: "abandoned", cause: error };
      }
    }
    if (record.native) {
      try {
        record.nativeRead = record.native.consume();
        if (
          terminal.kind === "published" &&
          record.nativeRead.facts.bounds !== null &&
          record.nativeRead.temporal !== "within-original-and-observed-bounds"
        )
          observedTerminal = { kind: "abandoned", cause: new ProductionOnboardingError() };
      } catch (error: unknown) {
        if (record.primary.kind === "none") record.primary = { kind: "failed", error };
        observedTerminal = { kind: "abandoned", cause: error };
      }
      try {
        record.native.dispose();
      } catch (cause: unknown) {
        record.cleanupFailures.push({ phase: "publication-dispose", cause });
      }
      record.native = undefined;
    }
    const first = record.cleanupFailures[0];
    if (first) {
      observedTerminal = { kind: "abandoned", cause: first.cause };
      retainOnboardingOwnerCleanup(value, {
        kind: "cleanup-failed",
        primary: { type: "none" },
        native: { type: "not-dispatched", error: undefined },
        confirmed: record.nativeRead?.facts.commit === "acknowledged",
        cleanupFailures: [first],
      });
      value.controller.abort(new IssuerStagingError(first.cause, "cleanup"));
    }
    if (observedTerminal.kind === "published") {
      try {
        if (
          record.output !== "settled" ||
          record.body === undefined ||
          record.response.status !== record.responseStatus ||
          publicationHeaders(record.response) !== record.responseHeaders ||
          record.completion !== completion.promise ||
          value.closing !== undefined
        )
          throw new ProductionOnboardingError();
        record.clock.check();
        const observed = record.nativeRead;
        if (observed) {
          if (observed.kind !== "settled") throw new ProductionOnboardingError();
          if (observed.facts.bounds !== null && observed.temporal !== "within-original-and-observed-bounds")
            throw new ProductionOnboardingError();
          if (observed.facts.cleanup === "failed") throw new ProductionOnboardingError();
          if (
            record.primary.kind === "none" &&
            (observed.facts.commit !== "acknowledged" ||
              observed.facts.finalGate !== "passed" ||
              observed.facts.unit !== "returned" ||
              observed.facts.cleanup !== "complete" ||
              observed.facts.runtimeGuard !== "passed" ||
              observed.temporal !== "within-original-and-observed-bounds")
          )
            throw new ProductionOnboardingError();
        }
        if (record.cleanupFailures.length !== 0) throw new ProductionOnboardingError();
      } catch (error: unknown) {
        if (record.primary.kind === "none") record.primary = { kind: "failed", error };
        observedTerminal = { kind: "abandoned", cause: error };
      }
    }
    const result = Object.freeze<ProductionOnboardingPublicationResult>({
      ...observedTerminal,
      sourceOutcome: record.sourceOutcome,
      native: record.nativeRead,
      primary: record.primary,
      cleanup: first ? "failed" : "complete",
    });
    record.body = undefined;
    record.cleanupFailures = [];
    value.onboardingPublications.delete(record);
    value.pending.delete(completion.promise);
    completion.resolve(result);
  };
  void Promise.resolve().then(settle).catch(completion.reject);
  return completion.promise;
}

export function settleProductionSessionSqlOnboardingPublicationAsync(
  owner: ProductionSessionSqlOwner,
  issuer: object,
  handle: ProductionOnboardingPublication,
  request: Request,
  response: Response,
  terminal: { readonly kind: "published" } | { readonly kind: "abandoned"; readonly cause: unknown },
): Promise<ProductionOnboardingPublicationResult> {
  return settleOnboardingPublication(
    owned(owner),
    onboardingPublicationFor(issuer, handle, request, response),
    terminal,
  );
}

function dispatchOwnedOnboardingAsync(
  record: OwnedOnboardingRequest,
  prepared: Extract<OwnedPreparedOnboarding, { kind: "claim" }>,
): Promise<ProductionOnboardingClaimOutput>;
function dispatchOwnedOnboardingAsync(
  record: OwnedOnboardingRequest,
  prepared: Exclude<OwnedPreparedOnboarding, { kind: "claim" }>,
): Promise<void>;
function dispatchOwnedOnboardingAsync(
  record: OwnedOnboardingRequest,
  prepared: OwnedPreparedOnboarding,
): Promise<ProductionOnboardingClaimOutput | void> {
  const value = owned(record.owner);
  assertOwnedOnboarding(value, record);
  if (
    record.phase !== "prepared" ||
    record.prepared !== prepared ||
    preparedOnboarding.get(prepared.handle) !== prepared
  )
    throw new ProductionOnboardingError();
  record.phase = "dispatching";
  const completion = Promise.withResolvers<ProductionOnboardingClaimOutput | void>();
  onboardingTasks.set(completion.promise, { record, kind: "dispatch" });
  value.requestWrites.add(completion.promise);
  record.tasks.add(completion.promise);
  requestWriteSettlements.set(completion.promise, record.native);
  const dispatch = async () => {
    let underlying: Promise<OnboardingClaimResult | void> | undefined;
    try {
      const authority = await ownedOnboardingAuthorityAsync(value, record);
      const configuration = onboardingConfiguration(value, record);
      if (record.prepared !== prepared || preparedOnboarding.get(prepared.handle) !== prepared)
        throw new ProductionOnboardingError();
      if (prepared.kind !== "claim" && authority === null) throw new ProductionOnboardingError();
      record.state.admitMutation();
      let result: OnboardingClaimResult | void;
      if (prepared.kind === "claim") {
        const claimAuthority = onboardingClaimAuthority(authority, record);
        const operation = record.state.bounds();
        record.native = { type: "invoked" };
        requestWriteSettlements.set(completion.promise, record.native);
        const invocation: OnboardingClaimInvocation = Object.freeze({ kind: "claim", authority: claimAuthority });
        const packet = value.runtime.onboardingObservedMutation(operation, invocation, configuration);
        underlying = retainOnboardingNativePacket(record, operation, invocation, configuration.now, packet);
      } else {
        if (authority === null) throw new ProductionOnboardingError();
        const operation = record.state.bounds();
        record.native = { type: "invoked" };
        requestWriteSettlements.set(completion.promise, record.native);
        if (prepared.kind === "nextStep") {
          const invocation: OnboardingNextStepInvocation = Object.freeze({
            kind: "nextStep",
            authority,
            firstRead: prepared.invocation.firstRead,
          });
          const packet = value.runtime.onboardingObservedMutation(operation, invocation, configuration);
          underlying = retainOnboardingNativePacket(record, operation, invocation, configuration.now, packet);
        } else if (prepared.kind === "initUser") {
          const invocation: OnboardingInitUserInvocation = Object.freeze({
            kind: "initUser",
            authority,
            userRow: prepared.invocation.userRow,
            groupId: prepared.invocation.groupId,
          });
          const packet = value.runtime.onboardingObservedMutation(operation, invocation, configuration);
          underlying = retainOnboardingNativePacket(record, operation, invocation, configuration.now, packet);
        } else {
          const invocation: OnboardingInitialExternalGroupInvocation = Object.freeze({
            kind: "initialExternalGroup",
            authority,
            groupId: prepared.invocation.groupId,
            name: prepared.invocation.name,
          });
          const packet = value.runtime.onboardingObservedMutation(operation, invocation, configuration);
          underlying = retainOnboardingNativePacket(record, operation, invocation, configuration.now, packet);
        }
      }
      record.native = { type: "pending", underlying };
      requestWriteSettlements.set(completion.promise, record.native);
      result = await underlying;
      const native = record.nativePublication?.read();
      record.confirmed = native?.facts.commit === "acknowledged";
      record.native = { type: "fulfilled", underlying, value: result };
      requestWriteSettlements.set(completion.promise, record.native);
      if (
        !native ||
        native.kind !== "settled" ||
        native.facts.unit !== "returned" ||
        native.facts.finalGate !== "passed" ||
        native.facts.cleanup !== "complete" ||
        native.facts.runtimeGuard !== "passed" ||
        native.temporal !== "within-original-and-observed-bounds"
      )
        throw new ProductionOnboardingError();
      assertOwnedOnboarding(value, record);
      record.state.admitMutation();
      if (prepared.kind === "claim") {
        if (result === undefined) throw new ProductionOnboardingError();
        const output = prepareOwnedOnboardingClaimOutput(result, record.state);
        record.phase = "settled";
        completion.resolve(output);
      } else {
        if (result !== undefined) throw new ProductionOnboardingError();
        record.phase = "settled";
        completion.resolve(undefined);
      }
    } catch (error: unknown) {
      record.phase = "failed";
      let observed: OnboardingNativePublicationRead | undefined;
      try {
        observed = observeOwnedOnboardingNative(record);
      } catch (observationError: unknown) {
        if (record.failure.type === "none") record.failure = { type: "failed", error: observationError };
      }
      if (record.confirmed && record.native.type !== "fulfilled")
        record.native = { type: "rejected", underlying, error };
      requestWriteSettlements.set(completion.promise, record.native);
      if (record.confirmed) {
        const failure = new ProductionOnboardingError("confirmed-commit-settlement-failed", error);
        record.failure = { type: "failed", error: failure };
        completion.reject(failure);
      } else if (
        error instanceof TransactionCommitAmbiguousError ||
        observed?.facts.commit === "dispatched-unconfirmed"
      ) {
        let ambiguity = error;
        if (!(ambiguity instanceof TransactionCommitAmbiguousError))
          ambiguity = new TransactionCommitAmbiguousError(error);
        record.native = { type: "ambiguous", underlying, error: ambiguity };
        requestWriteSettlements.set(completion.promise, record.native);
        record.failure = { type: "failed", error: ambiguity };
        completion.reject(ambiguity);
      } else {
        const invoked = record.native.type !== "not-dispatched";
        if (invoked) record.native = { type: "rejected", underlying, error };
        else record.native = { type: "not-dispatched", error };
        requestWriteSettlements.set(completion.promise, record.native);
        let state: "held-without-dispatch" | "failed-without-confirmed-commit" = "held-without-dispatch";
        if (invoked) state = "failed-without-confirmed-commit";
        const failure = new ProductionOnboardingError(state, error);
        record.failure = { type: "failed", error: failure };
        completion.reject(failure);
      }
    } finally {
      value.requestWrites.delete(completion.promise);
      record.tasks.delete(completion.promise);
    }
  };
  void Promise.resolve().then(dispatch);
  return completion.promise;
}

function retainOnboardingNativePacket<Value>(
  record: OwnedOnboardingRequest,
  operation: OnboardingOperation,
  invocation: OnboardingInvocation,
  clock: () => number,
  packet: OnboardingObservedDispatch<Value>,
): Promise<Value> {
  if (record.nativePublication) throw new ProductionOnboardingError();
  record.nativePublication = new OwnedOnboardingNativePublication(
    operation,
    invocation,
    clock,
    packet.publication,
    packet.reader,
  );
  const value = owned(record.owner);
  value.onboardingNativePublications.add(record.nativePublication);
  onboardingTasks.set(packet.completion, { record, kind: "dispatch" });
  record.tasks.add(packet.completion);
  value.requestWrites.add(packet.completion);
  const settled = () => {
    record.tasks.delete(packet.completion);
    value.requestWrites.delete(packet.completion);
  };
  void packet.completion.then(settled, settled);
  return packet.completion;
}

function observeOwnedOnboardingNative(record: OwnedOnboardingRequest): OnboardingNativePublicationRead | undefined {
  const observed = record.nativePublication?.read();
  if (!observed) return undefined;
  record.confirmed = observed.facts.commit === "acknowledged";
  if (
    observed.facts.cleanup === "failed" &&
    !record.state.cleanupFailures.some((failure) => failure.phase === "native-cleanup")
  )
    record.state.cleanupFailures.push({
      phase: "native-cleanup",
      cause: new IssuerStagingError(
        Object.freeze({
          stage: observed.facts.failureStage,
          count: observed.facts.cleanupFailureCount,
        }),
        "cleanup",
      ),
    });
  return observed;
}

function preparedOnboardingFor(
  owner: ProductionSessionSqlOwner,
  issuer: object,
  handle: PreparedProductionOnboardingOperation,
  request: Request,
): OwnedPreparedOnboarding {
  const prepared = preparedOnboarding.get(handle);
  if (
    !prepared ||
    prepared.request.owner !== owner ||
    prepared.request.issuer !== issuer ||
    prepared.request.state.request !== request
  )
    throw new ProductionOnboardingError();
  assertOwnedOnboarding(owned(owner), prepared.request);
  return prepared;
}

export function dispatchProductionSessionSqlOnboardingClaimAsync(
  owner: ProductionSessionSqlOwner,
  issuer: object,
  handle: PreparedProductionOnboardingClaim,
  request: Request,
): Promise<ProductionOnboardingClaimOutput> {
  const prepared = preparedOnboardingFor(owner, issuer, handle, request);
  if (prepared.kind !== "claim") throw new ProductionOnboardingError();
  return dispatchOwnedOnboardingAsync(prepared.request, prepared);
}

export function dispatchProductionSessionSqlOnboardNextStepAsync(
  owner: ProductionSessionSqlOwner,
  issuer: object,
  handle: PreparedProductionOnboardNextStep,
  request: Request,
): Promise<void> {
  const prepared = preparedOnboardingFor(owner, issuer, handle, request);
  if (prepared.kind !== "nextStep") throw new ProductionOnboardingError();
  return dispatchOwnedOnboardingAsync(prepared.request, prepared);
}

export function dispatchProductionSessionSqlOnboardingInitUserAsync(
  owner: ProductionSessionSqlOwner,
  issuer: object,
  handle: PreparedProductionOnboardingInitUser,
  request: Request,
): Promise<void> {
  const prepared = preparedOnboardingFor(owner, issuer, handle, request);
  if (prepared.kind !== "initUser") throw new ProductionOnboardingError();
  return dispatchOwnedOnboardingAsync(prepared.request, prepared);
}

export function dispatchProductionSessionSqlInitialExternalGroupAsync(
  owner: ProductionSessionSqlOwner,
  issuer: object,
  handle: PreparedProductionInitialExternalGroup,
  request: Request,
): Promise<void> {
  const prepared = preparedOnboardingFor(owner, issuer, handle, request);
  if (prepared.kind !== "initialExternalGroup") throw new ProductionOnboardingError();
  return dispatchOwnedOnboardingAsync(prepared.request, prepared);
}

function retainOnboardingOwnerCleanup(
  value: OwnedSql,
  result: Extract<OnboardingRetirementResult, { kind: "cleanup-failed" }>,
): void {
  const previous = value.onboardingCleanup;
  if (previous.type === "none") {
    value.onboardingCleanup = Object.freeze({
      type: "failed",
      first: result.cleanupFailures[0],
      failedRetirements: 1,
      countStatus: "exact",
    });
    return;
  }
  if (previous.countStatus === "saturated") return;
  if (previous.failedRetirements === 2_147_483_647) {
    value.onboardingCleanup = Object.freeze({ ...previous, countStatus: "saturated" });
    return;
  }
  value.onboardingCleanup = Object.freeze({ ...previous, failedRetirements: previous.failedRetirements + 1 });
}

function retireOwnedOnboardingRequest(
  value: OwnedSql,
  record: OwnedOnboardingRequest,
): Promise<OnboardingRetirementResult> {
  if (record.retirement.type !== "none") return record.retirement.promise;
  const completion = Promise.withResolvers<OnboardingRetirementResult>();
  record.retirement = { type: "pending", promise: completion.promise };
  onboardingTasks.set(completion.promise, { record, kind: "retirement" });
  value.pending.add(completion.promise);
  record.retired = true;
  const retire = async () => {
    try {
      record.detach();
    } catch (cause: unknown) {
      record.state.cleanupFailures.push({ phase: "request-detach", cause });
    }
    try {
      record.state.retire();
    } catch (cause: unknown) {
      record.state.cleanupFailures.push({ phase: "retirement-driver", cause });
    }
    const tasks = await Promise.allSettled([...record.tasks]);
    for (const task of tasks) {
      if (task.status === "rejected" && record.failure.type === "none")
        record.failure = { type: "failed", error: task.reason };
    }
    try {
      await record.state.ledger.drainAsync();
    } catch (error: unknown) {
      if (record.failure.type === "none") record.failure = { type: "failed", error };
    }
    try {
      await record.lease?.releaseAsync();
    } catch (cause: unknown) {
      record.state.cleanupFailures.push({ phase: "lease-release", cause });
    }
    try {
      if (record.prepared) preparedOnboarding.delete(record.prepared.handle);
      record.prepared = undefined;
      record.lease = null;
      if (record.packet) onboardingPackets.delete(record.packet.handle);
      if (record.frame) {
        onboardingFrames.delete(record.frame.handle);
        onboardingTickets.delete(record.frame.ticket);
      }
      record.packet = undefined;
      record.frame = undefined;
      record.csrfOutput = undefined;
      record.state.clearPacket();
      if (record.nativePublication && value.onboarding?.inputSource === undefined) {
        const native = record.nativePublication;
        try {
          native.dispose();
        } catch (cause: unknown) {
          record.state.cleanupFailures.push({ phase: "publication-dispose", cause });
        }
        value.onboardingNativePublications.delete(native);
        record.nativePublication = undefined;
      }
    } catch (cause: unknown) {
      record.state.cleanupFailures.push({ phase: "retirement-driver", cause });
    }
    const first = record.state.cleanupFailures[0];
    let result: OnboardingRetirementResult;
    if (first !== undefined) {
      let cleanupFailures = Object.freeze<readonly [OnboardingCleanupFailure, ...OnboardingCleanupFailure[]]>([
        first,
        ...record.state.cleanupFailures.slice(1),
      ]);
      result = Object.freeze({
        kind: "cleanup-failed",
        primary: record.failure,
        native: record.native,
        confirmed: record.confirmed,
        cleanupFailures,
      });
      try {
        value.controller.abort(new IssuerStagingError(result.cleanupFailures[0].cause, "cleanup"));
      } catch (cause: unknown) {
        const failure: OnboardingCleanupFailure = { phase: "retirement-driver", cause };
        record.state.cleanupFailures.push(failure);
        cleanupFailures = Object.freeze<readonly [OnboardingCleanupFailure, ...OnboardingCleanupFailure[]]>([
          first,
          ...record.state.cleanupFailures.slice(1),
        ]);
        result = Object.freeze({ ...result, cleanupFailures });
      }
      retainOnboardingOwnerCleanup(value, result);
    } else {
      result = Object.freeze({
        kind: "settled",
        primary: record.failure,
        native: record.native,
        confirmed: record.confirmed,
      });
    }
    record.retirement = { type: "settled", promise: completion.promise, result };
    value.onboardingRequests.delete(record);
    value.pending.delete(completion.promise);
    completion.resolve(result);
  };
  void Promise.resolve().then(retire);
  return completion.promise;
}

function disposeOwnedOnboardingRequestAsync(value: OwnedSql, record: OwnedOnboardingRequest): Promise<void> {
  if (record.closing) return record.closing;
  const completion = Promise.withResolvers<void>();
  record.closing = completion.promise;
  void retireOwnedOnboardingRequest(value, record).then((result) => {
    if (result.kind === "settled") {
      if (result.primary.type === "failed") completion.reject(result.primary.error);
      else if (result.native.type === "ambiguous") completion.reject(result.native.error);
      else completion.resolve();
      return;
    }
    const failures: unknown[] = [];
    let primary: unknown;
    if (result.primary.type === "failed") {
      primary = result.primary.error;
      failures.push(primary);
    } else if (result.native.type === "ambiguous") {
      primary = result.native.error;
      failures.push(primary);
    }
    for (const failure of result.cleanupFailures) failures.push(failure.cause);
    const error = new AggregateError(failures, "Onboarding request settlement failed", { cause: primary });
    if (result.native.type === "ambiguous") {
      completion.reject(new TransactionCommitAmbiguousError(error));
      return;
    }
    let state: "held-without-dispatch" | "failed-without-confirmed-commit" | "confirmed-commit-settlement-failed" =
      "failed-without-confirmed-commit";
    if (result.confirmed) state = "confirmed-commit-settlement-failed";
    else if (result.native.type === "not-dispatched") state = "held-without-dispatch";
    completion.reject(new ProductionOnboardingError(state, error));
  });
  return completion.promise;
}

export function disposeProductionSessionSqlOnboardingRequestAsync(
  owner: ProductionSessionSqlOwner,
  issuer: object,
  handle: ProductionOnboardingRequest,
  request: Request,
): Promise<void> {
  const record = onboardingRequests.get(handle);
  if (!record || record.owner !== owner || record.issuer !== issuer || record.state.request !== request)
    throw new ProductionOnboardingError();
  return disposeOwnedOnboardingRequestAsync(owned(owner), record);
}

export function disposeProductionSessionSqlOnboardingCsrfRequestAsync(
  owner: ProductionSessionSqlOwner,
  issuer: object,
  handle: ProductionOnboardingCsrfRequest,
  request: Request,
): Promise<void> {
  const record = onboardingCsrfRequests.get(handle);
  if (!record || record.owner !== owner || record.issuer !== issuer || record.state.request !== request)
    throw new ProductionOnboardingError();
  return disposeOwnedOnboardingRequestAsync(owned(owner), record);
}

export function assertProductionSessionSqlConfiguration(
  owner: ProductionSessionSqlOwner,
  maxAgeSeconds: number,
  now: () => number,
): void {
  const value = owned(owner);
  if (value.configuration.sessionMaxAgeMs !== maxAgeSeconds * 1000 || value.configuration.now !== now || value.closing)
    throw new IssuerStagingError();
}

export function beginIssuerSqlScope(owner: ProductionSessionSqlOwner, input: IssuerOperationBounds): object {
  const value = owned(owner);
  const controller = new AbortController();
  const bounds = Object.freeze({
    ...input,
    lifetime: AbortSignal.any([input.lifetime, value.configuration.lifetime, controller.signal]),
  });
  assertBounds(value.configuration, bounds);
  if (value.closing) throw new IssuerStagingError();
  const scope = Object.freeze({});
  const reads = new Set<Promise<unknown>>();
  const bounded: OwnedScope = {
    owner,
    controller,
    bounds,
    reads,
    repository: createIssuerSqlRepository(value.runtime, bounds, reads),
    lease: null,
    leaseOperation: null,
    observation: null,
    observationOperation: null,
    clampDeadline: () => undefined,
    detach: () => undefined,
    closing: undefined,
  };
  scopes.set(scope, bounded);
  value.scopes.add(scope);
  const signals = [bounds.signal, input.lifetime, value.configuration.lifetime];
  let timer: ReturnType<typeof setTimeout> | undefined;
  let deadlineAt = bounds.deadlineAt;
  const close = () => {
    void closeIssuerSqlScope(owner, scope).catch(() => value.controller.abort(new IssuerStagingError()));
  };
  const schedule = () => {
    const remaining = deadlineAt - Date.now();
    if (remaining <= 0) {
      close();
      return;
    }
    timer = setTimeout(schedule, Math.min(remaining, 2_147_483_647));
    timer.unref();
  };
  bounded.detach = () => {
    if (timer) clearTimeout(timer);
    for (const signal of signals) signal.removeEventListener("abort", close);
  };
  bounded.clampDeadline = (next) => {
    deadlineAt = Math.min(deadlineAt, next);
    if (timer) clearTimeout(timer);
    schedule();
  };
  for (const signal of signals) signal.addEventListener("abort", close, { once: true });
  schedule();
  return scope;
}

export function issuerSqlScopeResources(owner: ProductionSessionSqlOwner, scope: object) {
  const value = scopeFor(owner, scope);
  assertBounds(owned(owner).configuration, value.bounds);
  return { repository: value.repository, bounds: value.bounds };
}

export async function runIssuerSqlScopeAsync<T>(
  owner: ProductionSessionSqlOwner,
  scope: object,
  operation: () => Promise<T>,
): Promise<T> {
  const value = scopeFor(owner, scope);
  assertBounds(owned(owner).configuration, value.bounds);
  const task = Promise.resolve().then(operation);
  value.reads.add(task);
  try {
    return await task;
  } finally {
    value.reads.delete(task);
  }
}

export function admitIssuerSessionReadAsync(owner: ProductionSessionSqlOwner, scope: object, token: string) {
  return runIssuerSqlScopeAsync(owner, scope, async () => {
    const value = scopeFor(owner, scope);
    const admissionOperation = Object.freeze({
      signal: AbortSignal.any([value.bounds.signal, value.bounds.lifetime]),
      deadlineAt: value.bounds.deadlineAt,
    });
    const admission = await owned(owner).authority.reader.admitOpaqueSessionAsync(token, admissionOperation);
    if (admission.type === "anonymous") return null;
    try {
      scopeFor(owner, scope);
      if (value.lease || admission.lease.credentialType !== "opaque-session") throw new IssuerStagingError();
      value.lease = admission.lease;
      if (admission.lease.validity.type !== "stored-session-expiry") throw new IssuerStagingError();
      value.leaseOperation = Object.freeze({
        signal: admissionOperation.signal,
        deadlineAt: Math.min(admissionOperation.deadlineAt, admission.lease.validity.hostDeadlineAt),
      });
      owned(owner).authority.captureOwnedCredential(admission.lease, value.leaseOperation);
      value.clampDeadline(admission.lease.validity.hostDeadlineAt);
      return admission.lease;
    } catch (error: unknown) {
      try {
        await admission.lease.releaseAsync();
      } catch (cleanupError: unknown) {
        throw new AggregateError([error, cleanupError], "Issuer admission and release failed");
      }
      throw error;
    }
  });
}

export function observeIssuerSessionAsync(owner: ProductionSessionSqlOwner, scope: object, token: string | null) {
  return runIssuerSqlScopeAsync(owner, scope, async () => {
    const bounded = scopeFor(owner, scope);
    if (bounded.observation || bounded.lease) throw new IssuerStagingError();
    const operation = Object.freeze({
      signal: AbortSignal.any([bounded.bounds.signal, bounded.bounds.lifetime]),
      deadlineAt: bounded.bounds.deadlineAt,
    });
    const authority = owned(owner).authority;
    const observation = await authority.observeSessionForIssuerAsync(token, operation);
    try {
      scopeFor(owner, scope);
      bounded.observation = observation;
      bounded.observationOperation = operation;
      if (observation.type === "expiry-margin") throw new IssuerStagingError();
      if (observation.type === "active") {
        bounded.lease = observation.lease;
        bounded.leaseOperation = Object.freeze({
          signal: operation.signal,
          deadlineAt: Math.min(operation.deadlineAt, observation.record.locator.hostDeadlineAt),
        });
        authority.captureOwnedCredential(observation.lease, bounded.leaseOperation);
        bounded.clampDeadline(bounded.leaseOperation.deadlineAt);
      }
      return observation;
    } catch (error: unknown) {
      await authority.releaseOwnedSessionObservationAsync(observation);
      throw error;
    }
  });
}

export function recheckIssuerSessionObservationAsync(
  owner: ProductionSessionSqlOwner,
  scope: object,
  deadlineAt: number,
) {
  return runIssuerSqlScopeAsync(owner, scope, () => {
    const bounded = scopeFor(owner, scope);
    if (!bounded.observation || !bounded.observationOperation) throw new IssuerStagingError();
    return owned(owner).authority.recheckOwnedSessionObservationAsync(bounded.observation, {
      signal: bounded.observationOperation.signal,
      deadlineAt: Math.min(deadlineAt, bounded.observationOperation.deadlineAt),
    });
  });
}

export function closeIssuerSqlScope(owner: ProductionSessionSqlOwner, scope: object): Promise<void> {
  const value = scopes.get(scope);
  if (!value || value.owner !== owner) throw new IssuerStagingError();
  if (value.closing) return value.closing;
  value.closing = Promise.resolve().then(async () => {
    const tasks: Promise<unknown>[] = [...value.reads];
    try {
      value.detach();
    } catch (error: unknown) {
      tasks.push(Promise.reject(error));
    }
    try {
      value.controller.abort(new IssuerStagingError());
    } catch (error: unknown) {
      tasks.push(Promise.reject(error));
    }
    const lease = value.lease;
    if (lease) tasks.push((async () => lease.releaseAsync())());
    if (value.observation) {
      const observation = value.observation;
      tasks.push((async () => owned(owner).authority.releaseOwnedSessionObservationAsync(observation))());
    }
    const result = await Promise.allSettled(tasks);
    const failures: unknown[] = [];
    for (const item of result) if (item.status === "rejected") failures.push(item.reason);
    if (failures.length > 0) {
      owned(owner).controller.abort(new IssuerStagingError());
      throw new AggregateError(failures, "Issuer scope operations and cleanup failed");
    }
    owned(owner).scopes.delete(scope);
  });
  return value.closing;
}

function userWitness(value: IssuerUserRecord): AuthUserWitness {
  return {
    id: value.id,
    name: value.name,
    email: value.email,
    emailVerified: value.emailVerified && new Date(value.emailVerified),
    image: value.image,
    password: value.password,
    provider: value.provider,
  };
}

function accountWitness(value: AdapterAccount): AuthAccountWitness {
  if (value.session_state !== undefined && typeof value.session_state !== "string") throw new IssuerStagingError();
  return {
    userId: value.userId,
    type: value.type,
    provider: value.provider,
    providerAccountId: value.providerAccountId,
    refresh_token: value.refresh_token ?? null,
    access_token: value.access_token ?? null,
    expires_at: value.expires_at ?? null,
    token_type: value.token_type ?? null,
    scope: value.scope ?? null,
    id_token: value.id_token ?? null,
    session_state: value.session_state ?? null,
  };
}

function selectedUser(proposal: PrivateIssuerProposal, id: string): IssuerUserRecord {
  const selected: IssuerUserRecord[] = [];
  for (const witness of proposal.witnesses) {
    if (witness.kind === "account" || !witness.selected) continue;
    let user: IssuerUserRecord;
    if (witness.kind === "session") user = witness.selected.user;
    else user = witness.selected;
    if (user.id === id) selected.push(user);
  }
  const user = selected.at(0);
  if (!user || selected.some((other) => JSON.stringify(other) !== JSON.stringify(user))) throw new IssuerStagingError();
  return user;
}

function issuerSessionCredential(
  proposal: PrivateIssuerProposal,
  scope: OwnedScope,
  session: { readonly sessionToken: string; readonly userId: string; readonly expires: Date },
  provider: SupportedAuthProvider,
): Extract<NativeCredentialEvidence, { type: "opaque-session" }> {
  const lease = scope.lease;
  const admitted = scope.leaseOperation;
  if (
    scopeFor(scope.owner, proposal.context.scope) !== scope ||
    proposal.context.owner !== scope.owner ||
    !lease ||
    !admitted ||
    proposal.bounds.signal !== scope.bounds.signal ||
    proposal.bounds.lifetime !== scope.bounds.lifetime ||
    !Number.isFinite(proposal.bounds.deadlineAt) ||
    proposal.bounds.deadlineAt > scope.bounds.deadlineAt ||
    proposal.bounds.deadlineAt > admitted.deadlineAt
  )
    throw new IssuerStagingError();
  assertBounds(owned(scope.owner).configuration, proposal.bounds);
  const credential = owned(scope.owner).authority.captureOwnedCredential(lease, {
    signal: admitted.signal,
    deadlineAt: proposal.bounds.deadlineAt,
  });
  if (
    credential.type !== "opaque-session" ||
    lease.credentialType !== "opaque-session" ||
    lease.validity.type !== "stored-session-expiry" ||
    credential.token !== session.sessionToken ||
    credential.userId !== session.userId ||
    credential.userId !== lease.identity.userId ||
    credential.provider !== provider ||
    !(session.expires instanceof Date) ||
    credential.expiresAt !== session.expires.getTime() ||
    credential.expiresAt !== lease.validity.expiresAt ||
    credential.hostDeadlineAt !== lease.validity.hostDeadlineAt ||
    proposal.bounds.deadlineAt > credential.hostDeadlineAt
  )
    throw new IssuerStagingError();
  return credential;
}

function logoutMutationFor(
  proposal: PrivateIssuerProposal,
  scope: OwnedScope,
  lease: SqlAuthorityReadLease,
): Extract<AuthSessionMutation, { kind: "revoke" }> {
  if (
    lease !== scope.lease ||
    lease.credentialType !== "opaque-session" ||
    lease.validity.type !== "stored-session-expiry" ||
    proposal.bounds.signal !== scope.bounds.signal ||
    proposal.bounds.lifetime !== scope.bounds.lifetime ||
    proposal.bounds.deadlineAt > scope.bounds.deadlineAt ||
    proposal.bounds.deadlineAt > lease.validity.hostDeadlineAt
  )
    throw new IssuerStagingError();
  const sessions = proposal.witnesses.filter((witness) => witness.kind === "session");
  const selected = sessions.at(0);
  const effect = proposal.effects.at(0);
  if (
    sessions.length !== 1 ||
    !selected?.selected ||
    selected.token !== selected.selected.session.sessionToken ||
    selected.selected.session.userId !== lease.identity.userId ||
    selected.selected.user.id !== lease.identity.userId ||
    selected.selected.session.expires.getTime() !== lease.validity.expiresAt ||
    proposal.effects.length !== 1 ||
    !effect ||
    effect.kind !== "delete-session" ||
    effect.session.sessionToken !== selected.token ||
    effect.session.userId !== selected.selected.session.userId ||
    effect.session.expires.getTime() !== selected.selected.session.expires.getTime()
  )
    throw new IssuerStagingError();
  const user = userWitness(selectedUser(proposal, lease.identity.userId));
  const session = { ...selected.selected.session, expires: new Date(selected.selected.session.expires) };
  const mutation: Extract<AuthSessionMutation, { kind: "revoke" }> = {
    kind: "revoke",
    user,
    session,
    credential: issuerSessionCredential(proposal, scope, session, user.provider),
  };
  const accounts = proposal.witnesses.filter((witness) => witness.kind === "account");
  const account = accounts.at(0);
  const selector = proposal.context.accountSelector;
  if (accounts.length > 1 || (selector && !account)) throw new IssuerStagingError();
  if (account) {
    if (
      !account.selected ||
      account.selected.userId !== lease.identity.userId ||
      account.selected.provider !== account.provider ||
      account.selected.providerAccountId !== account.providerAccountId ||
      (selector && (selector.provider !== account.provider || selector.providerAccountId !== account.providerAccountId))
    )
      throw new IssuerStagingError();
    return { ...mutation, account: accountWitness(account.selected) };
  }
  return mutation;
}

function mutationFor(
  prepared: PreparedIssuerOperation,
  proposal: PrivateIssuerProposal,
  scope: OwnedScope,
): Extract<AuthSessionMutation, { kind: "establish" | "renew" }> | null {
  if (prepared.kind === "logout") throw new IssuerDurableJoinRequiredError();
  if (
    prepared.kind === "renew" ||
    (prepared.kind === "legacy-session" && proposal.context.legacy?.classification.type === "session-active")
  ) {
    const lease = scope.lease;
    if (!lease || lease.validity.type !== "stored-session-expiry") throw new IssuerStagingError();
    const selected = proposal.witnesses.find(
      (entry) => entry.kind === "session" && entry.selected?.session.userId === lease.identity.userId,
    );
    if (
      !selected ||
      selected.kind !== "session" ||
      !selected.selected ||
      selected.token !== selected.selected.session.sessionToken ||
      selected.selected.session.expires.getTime() !== lease.validity.expiresAt
    )
      throw new IssuerStagingError();
    const user = userWitness(selectedUser(proposal, lease.identity.userId));
    const session = selected.selected.session;
    const renewals = proposal.effects.filter((effect) => effect.kind === "renew-session");
    if (renewals.length === 0) return null;
    const renewal = renewals.at(0);
    if (
      renewals.length !== 1 ||
      !renewal ||
      renewal.kind !== "renew-session" ||
      renewal.previous.sessionToken !== session.sessionToken ||
      renewal.previous.userId !== session.userId ||
      renewal.previous.expires.getTime() !== session.expires.getTime()
    )
      throw new IssuerStagingError();
    if (renewal.session.sessionToken !== session.sessionToken || renewal.session.userId !== session.userId)
      throw new IssuerStagingError();
    return {
      kind: "renew",
      user,
      session,
      expires: renewal.session.expires,
      credential: issuerSessionCredential(proposal, scope, session, user.provider),
    };
  }
  const logins = proposal.effects.filter((effect) => effect.kind === "login-effects");
  const login = logins.at(0);
  if (logins.length !== 1 || !login || login.kind !== "login-effects") throw new IssuerDurableJoinRequiredError();
  const creates = proposal.effects.filter((effect) => effect.kind === "create-user");
  const created = creates.at(0);
  const selections: AuthIdentitySelection[] = [];
  for (const witness of proposal.witnesses) {
    if (witness.kind === "user-name")
      selections.push({
        field: "name",
        value: witness.name,
        provider: witness.provider,
        selectedUserId: witness.selected?.id ?? null,
      });
    if (witness.kind === "user-email")
      selections.push({
        field: "email",
        value: witness.email,
        provider: witness.provider,
        selectedUserId: witness.selected?.id ?? null,
      });
  }
  let identity: Extract<AuthSessionMutation, { kind: "establish" }>["identity"];
  if (created && created.kind === "create-user") {
    const user = created.user;
    if (creates.length !== 1 || user.id !== login.userId || user.provider === "credentials")
      throw new IssuerStagingError();
    identity = {
      kind: "create",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        emailVerified: user.emailVerified,
        image: user.image,
        provider: user.provider,
      },
      selections,
    };
  } else identity = { kind: "existing", witness: userWitness(selectedUser(proposal, login.userId)), selections };
  let account: Extract<AuthSessionMutation, { kind: "establish" }>["account"] = { kind: "none" };
  const links = proposal.effects.filter((effect) => effect.kind === "link-account");
  const selector = proposal.context.accountSelector;
  if (selector) {
    const selected = proposal.witnesses.find(
      (entry) =>
        entry.kind === "account" &&
        entry.provider === selector.provider &&
        entry.providerAccountId === selector.providerAccountId,
    );
    if (!selected || selected.kind !== "account") throw new IssuerStagingError();
    const link = links.at(0);
    if (link && link.kind === "link-account") {
      if (
        links.length !== 1 ||
        selected.selected ||
        link.account.provider !== selector.provider ||
        link.account.providerAccountId !== selector.providerAccountId
      )
        throw new IssuerStagingError();
      account = { kind: "link", account: accountWitness(link.account) };
    } else {
      if (!selected.selected) throw new IssuerStagingError();
      account = { kind: "existing", witness: accountWitness(selected.selected) };
    }
  } else if (links.length || prepared.kind === "oidc" || prepared.kind === "legacy-oidc")
    throw new IssuerStagingError();
  const sessions = proposal.effects.filter((effect) => effect.kind === "create-session");
  const createdSession = sessions.at(0);
  let session: Extract<AuthSessionMutation, { kind: "establish" }>["session"];
  if (createdSession && createdSession.kind === "create-session") {
    if (sessions.length !== 1) throw new IssuerStagingError();
    session = { kind: "create", session: createdSession.session };
  } else {
    const lease = scope.lease;
    const selected = proposal.witnesses.find(
      (entry) => entry.kind === "session" && entry.selected?.session.userId === login.userId,
    );
    if (
      !lease ||
      lease.identity.userId !== login.userId ||
      lease.validity.type !== "stored-session-expiry" ||
      !selected ||
      selected.kind !== "session" ||
      !selected.selected ||
      selected.token !== selected.selected.session.sessionToken ||
      selected.selected.session.expires.getTime() !== lease.validity.expiresAt
    )
      throw new IssuerStagingError();
    const user = selectedUser(proposal, login.userId);
    session = {
      kind: "existing",
      witness: selected.selected.session,
      credential: issuerSessionCredential(proposal, scope, selected.selected.session, user.provider),
    };
  }
  let updates: Pick<AuthLoginEffects, "email" | "emailVerified"> = {};
  for (const effect of proposal.effects) {
    if (effect.kind === "renew-session" || effect.kind === "delete-session" || effect.kind === "expire-session")
      throw new IssuerStagingError();
    if (effect.kind !== "update-user") continue;
    if (
      effect.user.id !== login.userId ||
      Object.keys(effect.user).some((key) => !["id", "name", "email", "emailVerified"].includes(key))
    )
      throw new IssuerDurableJoinRequiredError();
    if (effect.user.email !== undefined) updates = { ...updates, email: effect.user.email };
    if (effect.user.emailVerified !== undefined) updates = { ...updates, emailVerified: effect.user.emailVerified };
  }
  const effects: AuthLoginEffects = {
    ...updates,
    name: login.name,
    ...(login.image.kind === "external" && { image: login.image.value }),
    ...(login.groups.kind === "synchronize-existing" && { externalGroupNames: login.groups.names }),
  };
  return { kind: "establish", identity, account, session, effects };
}

function resultSequence(value: unknown): string {
  if (typeof value !== "string" || value.length > 19 || !/^[1-9][0-9]*$/.test(value)) throw new IssuerStagingError();
  const parsed = BigInt(value);
  if (parsed > 9_223_372_036_854_775_807n || parsed.toString() !== value) throw new IssuerStagingError();
  return value;
}

function mapNativeAuthSessionSqlResult(
  result: AuthSessionSqlResult,
  mutation: Extract<AuthSessionMutation, { kind: "establish" | "renew" | "revoke" }>,
  configuration: AuthSessionSqlConfiguration,
): AuthSessionSqlResult {
  const row = ownRecord(result);
  const profile = requestProfileRow(row.user);
  const user = ownRecord(row.user);
  const session = ownRecord(row.session);
  if (
    (user.emailVerified !== null &&
      (!(user.emailVerified instanceof Date) || !Number.isSafeInteger(user.emailVerified.getTime()))) ||
    typeof session.sessionToken !== "string" ||
    session.sessionToken.length === 0 ||
    session.sessionToken.length > 512 ||
    session.userId !== profile.id ||
    !(session.expires instanceof Date) ||
    !Number.isSafeInteger(session.expires.getTime()) ||
    !Array.isArray(row.groupIds) ||
    !Array.isArray(row.permissions) ||
    row.groupIds.length > configuration.maximumSnapshotRows ||
    row.permissions.length > configuration.maximumSnapshotRows
  )
    throw new IssuerStagingError();
  let expectedSession: AuthSessionWitness;
  let expectedUser: Omit<AuthUserWitness, "password">;
  if (mutation.kind === "establish") {
    if (mutation.session.kind === "existing") expectedSession = mutation.session.witness;
    else expectedSession = mutation.session.session;
    if (mutation.identity.kind === "existing") expectedUser = mutation.identity.witness;
    else expectedUser = mutation.identity.user;
  } else {
    expectedSession = mutation.session;
    expectedUser = mutation.user;
  }
  let expiresAt = expectedSession.expires.getTime();
  if (mutation.kind === "renew") expiresAt = mutation.expires.getTime();
  let name = expectedUser.name;
  let email = expectedUser.email;
  let emailVerified = expectedUser.emailVerified;
  let image = expectedUser.image;
  if (mutation.kind === "establish") {
    name = mutation.effects.name;
    if (mutation.effects.email !== undefined) email = mutation.effects.email;
    if (mutation.effects.emailVerified !== undefined) emailVerified = mutation.effects.emailVerified;
    if (mutation.effects.image !== undefined && expectedUser.provider === "oidc" && !image?.startsWith("data:"))
      image = mutation.effects.image;
  }
  if (
    profile.id !== expectedUser.id ||
    profile.provider !== expectedUser.provider ||
    profile.name !== name ||
    profile.email !== email ||
    profile.image !== image ||
    (user.emailVerified === null && emailVerified !== null) ||
    (user.emailVerified instanceof Date && user.emailVerified.getTime() !== emailVerified?.getTime()) ||
    session.sessionToken !== expectedSession.sessionToken ||
    session.userId !== expectedSession.userId ||
    session.expires.getTime() !== expiresAt
  )
    throw new IssuerStagingError();
  const groupIds: string[] = [];
  for (const groupId of row.groupIds) {
    if (typeof groupId !== "string" || groupId.length === 0 || groupIds.includes(groupId))
      throw new IssuerStagingError();
    groupIds.push(groupId);
  }
  const permissions: { readonly groupId: string; readonly permission: string }[] = [];
  for (const permission of row.permissions) {
    const grant = ownRecord(permission);
    if (
      typeof grant.groupId !== "string" ||
      !groupIds.includes(grant.groupId) ||
      typeof grant.permission !== "string" ||
      !groupPermissionKeys.some((key) => key === grant.permission)
    )
      throw new IssuerStagingError();
    permissions.push(Object.freeze({ groupId: grant.groupId, permission: grant.permission }));
  }
  const record = {
    user: Object.freeze({ ...profile, emailVerified: user.emailVerified && new Date(user.emailVerified) }),
    session: Object.freeze({
      sessionToken: session.sessionToken,
      userId: profile.id,
      expires: new Date(session.expires),
    }),
    groupIds: Object.freeze(groupIds),
    permissions: Object.freeze(permissions),
  };
  if (mutation.kind === "revoke") {
    if (row.kind !== "revoked" || row.credential !== null) throw new IssuerStagingError();
    return Object.freeze({ ...record, kind: "revoked", credential: null });
  }
  if (
    (mutation.kind === "renew" && row.kind !== "renewed") ||
    (mutation.kind === "establish" && row.kind !== "established")
  )
    throw new IssuerStagingError();
  const evidence = ownRecord(row.credential);
  const namespace = evidence.namespace;
  const hostDeadlineAt = evidence.hostDeadlineAt;
  if (
    evidence.type !== "opaque-session" ||
    typeof namespace !== "string" ||
    namespace.length !== 36 ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(namespace) ||
    evidence.token !== session.sessionToken ||
    evidence.userId !== profile.id ||
    evidence.provider !== profile.provider ||
    evidence.expiresAt !== expiresAt ||
    typeof hostDeadlineAt !== "number" ||
    !Number.isSafeInteger(hostDeadlineAt) ||
    hostDeadlineAt > expiresAt - configuration.maximumAbsoluteClockSkewMs
  )
    throw new IssuerStagingError();
  const lifetimeSequence = resultSequence(evidence.lifetimeSequence);
  const writeSequence = resultSequence(evidence.writeSequence);
  if (BigInt(lifetimeSequence) > BigInt(writeSequence)) throw new IssuerStagingError();
  const credential: Extract<NativeCredentialEvidence, { type: "opaque-session" }> = Object.freeze({
    type: "opaque-session",
    namespace,
    lifetimeSequence,
    writeSequence,
    token: session.sessionToken,
    userId: profile.id,
    provider: profile.provider,
    expiresAt,
    hostDeadlineAt,
  });
  if (mutation.kind === "renew") {
    const previous = mutation.credential;
    if (
      credential.namespace !== previous.namespace ||
      credential.lifetimeSequence !== previous.lifetimeSequence ||
      BigInt(credential.writeSequence) <= BigInt(previous.writeSequence) ||
      credential.hostDeadlineAt !== expiresAt - configuration.maximumAbsoluteClockSkewMs
    )
      throw new IssuerStagingError();
    return Object.freeze({ ...record, kind: "renewed", credential });
  }
  if (mutation.session.kind === "existing") {
    if (
      !sameCredentialWitness(credential, mutation.session.credential) ||
      credential.hostDeadlineAt !== mutation.session.credential.hostDeadlineAt
    )
      throw new IssuerStagingError();
  } else if (
    lifetimeSequence !== writeSequence ||
    hostDeadlineAt !== expiresAt - configuration.maximumAbsoluteClockSkewMs
  )
    throw new IssuerStagingError();
  return Object.freeze({ ...record, kind: "established", credential });
}

function assertFreshResult(
  value: OwnedSql,
  result: AuthSessionSqlResult,
  lease: SqlAuthorityReadLease,
  operation: SqlAuthorityOperation,
): void {
  if (result.kind === "revoked") throw new IssuerStagingError();
  const evidence = value.authority.captureOwnedCredential(lease, operation);
  if (
    !sameCredentialWitness(result.credential, evidence) ||
    evidence.type !== "opaque-session" ||
    evidence.hostDeadlineAt < result.credential.hostDeadlineAt
  )
    throw new IssuerStagingError();
  const permissions = result.permissions.map((row) => {
    const key = groupPermissionKeys.find((candidate) => candidate === row.permission);
    if (!key || !result.groupIds.includes(row.groupId)) throw new IssuerStagingError();
    return key;
  });
  const expanded = [...new Set(getPermissionsWithChildren(permissions))].toSorted();
  if (
    lease.identity.userId !== result.user.id ||
    lease.validity.type !== "stored-session-expiry" ||
    lease.validity.expiresAt !== result.session.expires.getTime() ||
    JSON.stringify(lease.identity.groupIds.toSorted()) !== JSON.stringify(result.groupIds.toSorted()) ||
    JSON.stringify(lease.identity.permissions.toSorted()) !== JSON.stringify(expanded)
  )
    throw new IssuerStagingError();
}

async function retainIssuerFailureAsync<T>(failures: unknown[], operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error: unknown) {
    failures.push(error);
    throw error;
  }
}

function persistPreparedLegacyHttp(
  owner: ProductionSessionSqlOwner,
  prepared: PreparedIssuerOperation,
  proposal: PrivateIssuerProposal,
): Promise<IssuerPersistenceOutcome> {
  const value = owned(owner);
  const publication = httpCompletions.get(prepared);
  const task = Promise.resolve().then(async (): Promise<IssuerPersistenceOutcome> => {
    let state: IssuerPersistenceOutcome["state"] = "held-without-dispatch";
    const failures: unknown[] = [];
    const ledger = new IssuerOperationLedger();
    let fresh: SqlAuthorityReadLease | undefined;
    try {
      const legacy = proposal.context.legacy;
      const scope = scopeFor(owner, proposal.context.scope);
      if (
        !publication ||
        !legacy ||
        !safeLegacyIssuerHttpAction(prepared.kind) ||
        legacy.request !== publication.request ||
        legacy.observation !== scope.observation ||
        proposal.bounds.signal !== scope.bounds.signal ||
        proposal.bounds.lifetime !== scope.bounds.lifetime ||
        proposal.bounds.deadlineAt > scope.bounds.deadlineAt
      )
        throw new IssuerStagingError();
      publication.stage = "admission";
      assertHttpCurrent(publication);
      assertBounds(value.configuration, proposal.bounds);
      const classification = legacy.classification;
      const observation = legacy.observation;
      if (observation)
        await ledger.run("observation-current", () =>
          recheckIssuerSessionObservationAsync(owner, proposal.context.scope, proposal.bounds.deadlineAt),
        );
      if (
        (classification.type === "metadata" && prepared.kind !== `legacy-${classification.action}`) ||
        (classification.type === "handshake" &&
          (prepared.kind !== "legacy-oidc" ||
            legacy.request.method !== "POST" ||
            new URL(legacy.request.url).pathname !== "/api/auth/signin/oidc")) ||
        (classification.type === "verification-rejected" && prepared.kind !== "legacy-credentials") ||
        (classification.type === "csrf-rejected" && legacy.request.method !== "POST") ||
        (classification.type === "login" && prepared.kind !== `legacy-${classification.provider}`) ||
        ((classification.type === "session-active" ||
          classification.type === "session-absent" ||
          classification.type === "session-expired") &&
          prepared.kind !== "legacy-session") ||
        (classification.type === "signout" && prepared.kind !== "legacy-signout")
      )
        throw new IssuerStagingError();
      const expiry =
        classification.type === "session-expired" ||
        (classification.type === "signout" && classification.session === "expired");
      const revoke = classification.type === "signout" && classification.session === "active";
      const login = classification.type === "login";
      const renewal = classification.type === "session-active" && classification.due;
      if (expiry || revoke) {
        publication.stage = "native";
        if (!observation || !scope.observationOperation || proposal.effects.length !== 1)
          throw new IssuerStagingError();
        const effect = proposal.effects[0];
        if (!effect) throw new IssuerStagingError();
        if (expiry) {
          if (
            observation.type !== "expired" ||
            effect.kind !== "expire-session" ||
            effect.observation !== observation ||
            JSON.stringify(effect.session) !== JSON.stringify(observation.record.session)
          )
            throw new IssuerStagingError();
          const mutation: Extract<AuthSessionMutation, { kind: "expire" }> = {
            kind: "expire",
            user: userWitness(observation.record.user),
            session: { ...observation.record.session, expires: new Date(observation.record.session.expires) },
            credential: observation.record.locator,
          };
          const observed = scope.observationOperation;
          const disposition = await ledger.run("owned-expire", () =>
            runIssuerSqlScopeAsync(owner, proposal.context.scope, () =>
              value.authority.expireOwnedSessionAsync(
                observation,
                {
                  signal: observed.signal,
                  deadlineAt: proposal.bounds.deadlineAt,
                },
                mutation,
              ),
            ),
          );
          expiryDispositions.set(prepared, disposition);
          publication.disposition = disposition;
          state = disposition.state;
        } else {
          if (
            observation.type !== "active" ||
            scope.lease !== observation.lease ||
            !scope.leaseOperation ||
            effect.kind !== "delete-session"
          )
            throw new IssuerStagingError();
          const mutation = logoutMutationFor(proposal, scope, observation.lease);
          const admitted = scope.leaseOperation;
          const disposition = await ledger.run("owned-revoke", () =>
            runIssuerSqlScopeAsync(owner, proposal.context.scope, () =>
              value.authority.revokeOwnedSessionAsync(
                observation.lease,
                { signal: admitted.signal, deadlineAt: proposal.bounds.deadlineAt },
                mutation,
              ),
            ),
          );
          logoutDispositions.set(prepared, disposition);
          publication.disposition = disposition;
          state = disposition.state;
        }
        if (state !== "confirmed-commit") throw new IssuerStagingError();
        publication.stage = "auth-check";
        assertHttpCurrent(publication);
        await ledger.run("finite-output", () => prepareLegacyHttpOutputAsync(prepared, proposal, publication));
        publication.authSettlement = "settled";
      } else if (login || renewal) {
        if (renewal && (observation?.type !== "active" || proposal.effects.length !== 1))
          throw new IssuerStagingError();
        if (
          login &&
          (proposal.effects.filter((effect) => effect.kind === "login-effects").length !== 1 ||
            proposal.effects.some(
              (effect) =>
                effect.kind === "expire-session" || effect.kind === "delete-session" || effect.kind === "renew-session",
            ))
        )
          throw new IssuerStagingError();
        const mutation = mutationFor(prepared, proposal, scope);
        if (!mutation || (renewal && mutation.kind !== "renew") || (login && mutation.kind !== "establish"))
          throw new IssuerStagingError();
        const operation = Object.freeze({
          signal: proposal.bounds.signal,
          lifetime: proposal.bounds.lifetime,
          deadlineAt: proposal.bounds.deadlineAt,
        });
        publication.stage = "native";
        const mapped = await ledger.run("native-unit", () =>
          runIssuerSqlScopeAsync(owner, proposal.context.scope, async () => {
            assertHttpCurrent(publication);
            state = "failed-without-confirmed-commit";
            publication.native = { type: "invoked" };
            let underlying: Promise<AuthSessionSqlResult> | undefined;
            let confirmed: AuthSessionSqlResult;
            try {
              if (mutation.kind === "establish")
                underlying = value.authority.producer.establishAsync(operation, mutation);
              else underlying = value.authority.producer.renewAsync(operation, mutation);
              publication.native = { type: "pending", underlying };
              confirmed = await underlying;
            } catch (error: unknown) {
              let type: "rejected" | "ambiguous" = "rejected";
              if (error instanceof TransactionCommitAmbiguousError) {
                type = "ambiguous";
                state = "commit-ambiguous";
              }
              publication.native = { type, underlying, error };
              throw error;
            }
            state = "confirmed-commit";
            committed.set(prepared, confirmed);
            publication.native = { type: "fulfilled", underlying, value: confirmed };
            publication.confirmation = confirmed;
            return mapNativeAuthSessionSqlResult(confirmed, mutation, value.configuration);
          }),
        );
        publication.stage = "auth-check";
        assertHttpCurrent(publication);
        const operationForFresh = Object.freeze({
          signal: AbortSignal.any([proposal.bounds.signal, proposal.bounds.lifetime]),
          deadlineAt: proposal.bounds.deadlineAt,
        });
        const admission = await ledger.run("fresh-reader", () =>
          value.authority.reader.admitOpaqueSessionAsync(mapped.session.sessionToken, operationForFresh),
        );
        if (admission.type !== "authenticated-read-snapshot") throw new IssuerStagingError();
        fresh = admission.lease;
        const current = fresh;
        let deadlineAt = operationForFresh.deadlineAt;
        if (current.validity.type === "stored-session-expiry")
          deadlineAt = Math.min(deadlineAt, current.validity.hostDeadlineAt);
        const boundedFreshOperation = Object.freeze({ signal: operationForFresh.signal, deadlineAt });
        publication.clampDeadline(deadlineAt);
        assertFreshResult(value, mapped, current, boundedFreshOperation);
        const selected = await scope.repository.findSession(mapped.session.sessionToken);
        if (
          !selected ||
          JSON.stringify(selected.session) !== JSON.stringify(mapped.session) ||
          JSON.stringify(requestProfileRow(selected.user)) !== JSON.stringify(requestProfileRow(mapped.user))
        )
          throw new IssuerStagingError();
        if (
          renewal &&
          observation?.type === "active" &&
          (JSON.stringify(current.identity.groupIds.toSorted()) !==
            JSON.stringify(observation.record.groupIds.toSorted()) ||
            JSON.stringify(current.identity.permissions.toSorted()) !==
              JSON.stringify(observation.record.permissions.toSorted()))
        )
          throw new IssuerStagingError();
        await ledger.run("fresh-current", () => current.assertCurrentAsync(boundedFreshOperation));
        await ledger.run("finite-output", () => prepareLegacyHttpOutputAsync(prepared, proposal, publication, mapped));
        publication.stage = "auth-check";
        await ledger.run("fresh-current", () => current.assertCurrentAsync(boundedFreshOperation));
        assertFreshResult(value, mapped, current, boundedFreshOperation);
        const after = await scope.repository.findSession(mapped.session.sessionToken);
        if (JSON.stringify(after) !== JSON.stringify(selected)) throw new IssuerStagingError();
        assertHttpCurrent(publication);
        publication.authSettlement = "settled";
      } else {
        if (proposal.effects.length !== 0 || proposal.context.accountSelector !== null) throw new IssuerStagingError();
        if (
          (classification.type === "session-absent" ||
            (classification.type === "signout" && classification.session === "absent")) &&
          observation?.type !== "absent"
        )
          throw new IssuerStagingError();
        if (classification.type === "session-active" && (observation?.type !== "active" || classification.due))
          throw new IssuerStagingError();
        publication.noWrite = classification;
        await ledger.run("finite-output", () => prepareLegacyHttpOutputAsync(prepared, proposal, publication));
        publication.stage = "auth-check";
        if (observation)
          await ledger.run("observation-current", () =>
            recheckIssuerSessionObservationAsync(owner, proposal.context.scope, proposal.bounds.deadlineAt),
          );
        assertHttpCurrent(publication);
        publication.authSettlement = "settled";
      }
    } catch (error: unknown) {
      failures.push(error);
      if (publication) publication.failureStage ??= publication.stage;
      if (
        state === "confirmed-commit" ||
        publication?.confirmation ||
        publication?.disposition?.state === "confirmed-commit-settlement-failed"
      )
        state = "confirmed-commit-settlement-failed";
      ledger.fail();
    }
    try {
      if (publication) publication.stage = "cleanup";
      const tasks: Promise<unknown>[] = [
        ledger.settle("output-release", () => settleIssuerResponseAsync(proposal.response)),
        ledger.settle("scope-release", () => closeIssuerSqlScope(owner, proposal.context.scope)),
      ];
      if (fresh) {
        const lease = fresh;
        tasks.push(ledger.settle("fresh-release", () => lease.releaseAsync()));
      }
      const settled = await Promise.allSettled(tasks);
      for (const item of settled) if (item.status === "rejected") failures.push(item.reason);
      if (settled.some((item) => item.status === "rejected")) throw new IssuerStagingError();
      if (publication && !publication.failureStage && publication.authSettlement === "settled") {
        ledger.seal(["finite-output", "output-release", "scope-release"]);
        publication.cleanupSettlement = "settled";
      }
    } catch (error: unknown) {
      failures.push(error);
      if (publication) publication.failureStage ??= "cleanup";
      if (state === "confirmed-commit") state = "confirmed-commit-settlement-failed";
    }
    issuerFailures.set(prepared, Object.freeze(failures));
    return Object.freeze({ kind: prepared.kind, publication: "held", state });
  });
  value.pending.add(task);
  void task.then(
    () => value.pending.delete(task),
    () => value.pending.delete(task),
  );
  return task;
}

function persistPreparedLogout(
  owner: ProductionSessionSqlOwner,
  prepared: PreparedIssuerOperation,
  proposal: PrivateIssuerProposal,
): Promise<IssuerPersistenceOutcome> {
  const value = owned(owner);
  const publication = httpCompletions.get(prepared);
  const ledger = new IssuerOperationLedger();
  const task = Promise.resolve().then(async (): Promise<IssuerPersistenceOutcome> => {
    const outcome: { state: IssuerPersistenceOutcome["state"] } = { state: "held-without-dispatch" };
    const failures: unknown[] = [];
    try {
      const scope = scopeFor(owner, proposal.context.scope);
      assertBounds(value.configuration, proposal.bounds);
      const lease = scope.lease;
      const admitted = scope.leaseOperation;
      if (!lease || !admitted) throw new IssuerStagingError();
      const mutation = logoutMutationFor(proposal, scope, lease);
      if (publication) {
        assertHttpCurrent(publication);
        publication.stage = "native";
      }
      await ledger.run("owned-revoke", () =>
        runIssuerSqlScopeAsync(owner, proposal.context.scope, async () => {
          outcome.state = "failed-without-confirmed-commit";
          const disposition = await value.authority.revokeOwnedSessionAsync(
            lease,
            {
              signal: admitted.signal,
              deadlineAt: proposal.bounds.deadlineAt,
            },
            mutation,
          );
          logoutDispositions.set(prepared, disposition);
          if (publication) publication.disposition = disposition;
          outcome.state = disposition.state;
          return disposition;
        }),
      );
      if (publication) {
        if (outcome.state !== "confirmed-commit") throw new IssuerStagingError();
        publication.stage = "auth-check";
        assertHttpCurrent(publication);
        publication.authSettlement = "settled";
        publication.stage = "output";
        const setCookie = issuerSessionCookie(publication.configuration.cookies, {
          sessionToken: "",
          expires: new Date(0),
        });
        if (Buffer.byteLength(setCookie, "utf8") > publication.maximumResponseBytes) throw new IssuerStagingError();
        publication.output = Object.freeze({ type: "session-cookie-expiry", setCookie });
      }
    } catch (error: unknown) {
      failures.push(error);
      if (publication) publication.failureStage ??= publication.stage;
      if (outcome.state === "confirmed-commit") outcome.state = "confirmed-commit-settlement-failed";
      ledger.fail();
    }
    try {
      if (publication) publication.stage = "cleanup";
      await ledger.settle("scope-release", () =>
        retainIssuerFailureAsync(failures, () => closeIssuerSqlScope(owner, proposal.context.scope)),
      );
      if (outcome.state === "confirmed-commit") {
        ledger.seal(["owned-revoke", "scope-release"]);
        if (publication) publication.cleanupSettlement = "settled";
      }
    } catch (error: unknown) {
      failures.push(error);
      if (publication) publication.failureStage ??= "cleanup";
      if (outcome.state === "confirmed-commit") outcome.state = "confirmed-commit-settlement-failed";
    }
    issuerFailures.set(prepared, Object.freeze(failures));
    return Object.freeze({ kind: prepared.kind, publication: "held", state: outcome.state });
  });
  value.pending.add(task);
  void task.then(
    () => value.pending.delete(task),
    () => value.pending.delete(task),
  );
  return task;
}

export function persistPreparedIssuerOperation(
  owner: ProductionSessionSqlOwner,
  prepared: PreparedIssuerOperation,
): Promise<IssuerPersistenceOutcome> {
  const value = owned(owner);
  if (value.closing !== undefined) throw new IssuerStagingError();
  const proposal = claimPreparedIssuerProposal(prepared, owner);
  const publication = httpCompletions.get(prepared);
  if (publication) {
    publication.proposal = proposal;
    publication.clampDeadline(proposal.bounds.deadlineAt);
  }
  if (prepared.kind === "logout") return persistPreparedLogout(owner, prepared, proposal);
  if (safeLegacyIssuerHttpAction(prepared.kind)) return persistPreparedLegacyHttp(owner, prepared, proposal);
  const ledger = new IssuerOperationLedger();
  const perform = async (): Promise<IssuerPersistenceOutcome> => {
    const outcome: { state: IssuerPersistenceOutcome["state"] } = { state: "failed-without-confirmed-commit" };
    const failures: unknown[] = [];
    let fresh: SqlAuthorityReadLease | undefined;
    let scope: OwnedScope | undefined;
    let dispatched = false;
    try {
      const currentScope = scopeFor(owner, proposal.context.scope);
      scope = currentScope;
      assertBounds(value.configuration, proposal.bounds);
      if (publication) {
        publication.stage = "admission";
        assertHttpCurrent(publication);
      }
      const existing = scope.lease;
      if (existing)
        await ledger.run("reader-current", () =>
          retainIssuerFailureAsync(failures, () =>
            existing.assertCurrentAsync({ signal: proposal.bounds.signal, deadlineAt: proposal.bounds.deadlineAt }),
          ),
        );
      const classification = proposal.context.classification;
      let mutation: ReturnType<typeof mutationFor>;
      if (
        publication &&
        prepared.kind === "oidc" &&
        (classification?.type === "oidc-read" || classification?.type === "oidc-handshake")
      ) {
        if (proposal.effects.length !== 0 || proposal.context.accountSelector !== null) throw new IssuerStagingError();
        mutation = null;
      } else mutation = mutationFor(prepared, proposal, scope);
      if (!mutation) {
        outcome.state = "held-without-dispatch";
        if (publication) {
          publication.stage = "auth-check";
          if (!classification || classification.type === "write" || proposal.effects.length !== 0)
            throw new IssuerStagingError();
          if (prepared.kind === "renew") {
            if (
              classification.type !== "renew-not-due" ||
              !Number.isSafeInteger(classification.dueAt) ||
              !Number.isSafeInteger(classification.decidedAt) ||
              classification.decidedAt >= classification.dueAt ||
              !existing ||
              !scope.leaseOperation
            )
              throw new IssuerStagingError();
            const witness = proposal.witnesses.find((entry) => entry.kind === "session");
            if (!witness || witness.kind !== "session" || !witness.selected) throw new IssuerStagingError();
            issuerSessionCredential(proposal, scope, witness.selected.session, witness.selected.user.provider);
            const current = await scope.repository.findSession(witness.token);
            if (JSON.stringify(current) !== JSON.stringify(witness.selected)) throw new IssuerStagingError();
          } else if (
            prepared.kind !== "oidc" ||
            (classification.type !== "oidc-read" && classification.type !== "oidc-handshake")
          )
            throw new IssuerStagingError();
          publication.noWrite = classification;
          await ledger.run("finite-output", () =>
            prepareHttpOutputAsync(prepared, proposal, publication, currentScope),
          );
          publication.stage = "auth-check";
          if (existing) {
            const admitted = scope.leaseOperation;
            if (!admitted) throw new IssuerStagingError();
            await ledger.run("reader-current", () =>
              existing.assertCurrentAsync({ signal: admitted.signal, deadlineAt: proposal.bounds.deadlineAt }),
            );
            if (prepared.kind === "renew") {
              const witness = proposal.witnesses.find((entry) => entry.kind === "session");
              if (!witness || witness.kind !== "session" || !witness.selected) throw new IssuerStagingError();
              const current = await scope.repository.findSession(witness.token);
              if (JSON.stringify(current) !== JSON.stringify(witness.selected)) throw new IssuerStagingError();
              issuerSessionCredential(proposal, scope, witness.selected.session, witness.selected.user.provider);
            }
          }
          assertHttpCurrent(publication);
          publication.authSettlement = "settled";
        }
      } else {
        if (prepared.kind === "renew" && proposal.effects.length !== 1) throw new IssuerStagingError();
        const lifetime = [proposal.bounds.lifetime, value.configuration.lifetime];
        if (scope.lease) lifetime.push(scope.lease.lifetime);
        const operation = {
          signal: proposal.bounds.signal,
          lifetime: AbortSignal.any(lifetime),
          deadlineAt: proposal.bounds.deadlineAt,
        };
        const result = await ledger.run("native-unit", async () => {
          try {
            if (publication) {
              assertHttpCurrent(publication);
              publication.stage = "native";
            }
            const confirmed = await runIssuerSqlScopeAsync(owner, proposal.context.scope, () => {
              outcome.state = "failed-without-confirmed-commit";
              dispatched = true;
              let native: Promise<AuthSessionSqlResult>;
              if (publication) publication.native = { type: "invoked" };
              try {
                if (mutation.kind === "establish")
                  native = value.authority.producer.establishAsync(operation, mutation);
                else native = value.authority.producer.renewAsync(operation, mutation);
              } catch (error: unknown) {
                if (publication) publication.native = { type: "rejected", underlying: undefined, error };
                throw error;
              }
              if (publication) publication.native = { type: "pending", underlying: native };
              return native.then(
                (result) => {
                  outcome.state = "confirmed-commit";
                  committed.set(prepared, result);
                  if (publication) {
                    publication.native = { type: "fulfilled", underlying: native, value: result };
                    publication.confirmation = result;
                  }
                  return mapNativeAuthSessionSqlResult(result, mutation, value.configuration);
                },
                (error: unknown) => {
                  if (publication) {
                    let type: "rejected" | "ambiguous" = "rejected";
                    if (error instanceof TransactionCommitAmbiguousError) type = "ambiguous";
                    publication.native = { type, underlying: native, error };
                  }
                  throw error;
                },
              );
            });
            return confirmed;
          } catch (error: unknown) {
            failures.push(error);
            if (outcome.state !== "confirmed-commit" && error instanceof TransactionCommitAmbiguousError)
              outcome.state = "commit-ambiguous";
            throw error;
          }
        });
        if (publication) {
          publication.stage = "auth-check";
          assertHttpCurrent(publication);
        }
        const freshOperation = Object.freeze({
          signal: AbortSignal.any([proposal.bounds.signal, proposal.bounds.lifetime]),
          deadlineAt: proposal.bounds.deadlineAt,
        });
        const admission = await ledger.run("fresh-reader", () =>
          retainIssuerFailureAsync(failures, () =>
            value.authority.reader.admitOpaqueSessionAsync(result.session.sessionToken, freshOperation),
          ),
        );
        if (admission.type !== "authenticated-read-snapshot") throw new IssuerStagingError();
        fresh = admission.lease;
        const current = fresh;
        let deadlineAt = freshOperation.deadlineAt;
        if (current.validity.type === "stored-session-expiry")
          deadlineAt = Math.min(deadlineAt, current.validity.hostDeadlineAt);
        if (publication) publication.clampDeadline(deadlineAt);
        assertFreshResult(value, result, current, { signal: freshOperation.signal, deadlineAt });
        if (
          prepared.kind === "renew" &&
          existing &&
          (JSON.stringify(existing.identity.groupIds.toSorted()) !==
            JSON.stringify(current.identity.groupIds.toSorted()) ||
            JSON.stringify(existing.identity.permissions.toSorted()) !==
              JSON.stringify(current.identity.permissions.toSorted()))
        )
          throw new IssuerStagingError();
        await ledger.run("fresh-current", () =>
          retainIssuerFailureAsync(failures, () =>
            current.assertCurrentAsync({ signal: proposal.bounds.signal, deadlineAt: proposal.bounds.deadlineAt }),
          ),
        );
        if (publication) {
          await ledger.run("finite-output", () =>
            prepareHttpOutputAsync(prepared, proposal, publication, currentScope, result),
          );
          publication.stage = "auth-check";
          await ledger.run("fresh-current", () =>
            current.assertCurrentAsync({ signal: freshOperation.signal, deadlineAt: proposal.bounds.deadlineAt }),
          );
          assertFreshResult(value, result, current, { signal: freshOperation.signal, deadlineAt });
          assertHttpCurrent(publication);
          publication.authSettlement = "settled";
        }
      }
    } catch (error: unknown) {
      failures.push(error);
      if (publication) publication.failureStage ??= publication.stage;
      ledger.fail();
      if (outcome.state === "confirmed-commit") outcome.state = "confirmed-commit-settlement-failed";
      else if (
        !dispatched &&
        (error instanceof IssuerDurableJoinRequiredError || isUnavailableAuthority(error)) &&
        outcome.state !== "commit-ambiguous"
      )
        outcome.state = "held-without-dispatch";
    }
    try {
      if (publication) publication.stage = "cleanup";
      const cleanup: Promise<unknown>[] = [];
      if (publication)
        cleanup.push(ledger.settle("output-release", () => settleIssuerResponseAsync(proposal.response)));
      if (fresh) {
        const current = fresh;
        cleanup.push(
          ledger.settle("fresh-release", () => retainIssuerFailureAsync(failures, () => current.releaseAsync())),
        );
      }
      cleanup.push(
        ledger.settle("scope-release", () =>
          retainIssuerFailureAsync(failures, () => closeIssuerSqlScope(owner, proposal.context.scope)),
        ),
      );
      const settled = await Promise.allSettled(cleanup);
      if (settled.some((item) => item.status === "rejected")) {
        value.controller.abort(new IssuerStagingError());
        throw new IssuerStagingError();
      }
      if (outcome.state === "confirmed-commit") {
        const required = ["native-unit", "fresh-reader", "fresh-current", "fresh-release", "scope-release"];
        if (scope?.lease) required.push("reader-current");
        if (publication) required.push("finite-output", "output-release");
        ledger.seal(required);
        if (publication) publication.cleanupSettlement = "settled";
      } else if (publication?.noWrite && !publication.failureStage) {
        const required = ["finite-output", "output-release", "scope-release"];
        if (scope?.lease) required.push("reader-current");
        ledger.seal(required);
        publication.cleanupSettlement = "settled";
      }
    } catch (error: unknown) {
      failures.push(error);
      if (publication) publication.failureStage ??= "cleanup";
      if (outcome.state === "confirmed-commit") outcome.state = "confirmed-commit-settlement-failed";
    }
    issuerFailures.set(prepared, Object.freeze(failures));
    return Object.freeze({ kind: prepared.kind, publication: "held", state: outcome.state });
  };
  const task = Promise.resolve().then(perform);
  value.pending.add(task);
  void task.then(
    () => value.pending.delete(task),
    () => value.pending.delete(task),
  );
  return task;
}

export async function discardPreparedIssuerOperation(
  owner: ProductionSessionSqlOwner,
  prepared: PreparedIssuerOperation,
): Promise<void> {
  const proposal = discardPreparedIssuerProposal(prepared, owner);
  const settled = await Promise.allSettled([
    settleIssuerResponseAsync(proposal.response),
    closeIssuerSqlScope(owner, proposal.context.scope),
  ]);
  for (const item of settled) if (item.status === "rejected") throw new IssuerStagingError(item.reason, "cleanup");
}

export function closeProductionSessionSqlOwner(owner: ProductionSessionSqlOwner): Promise<void> {
  const value = owned(owner);
  if (value.closing) return value.closing;
  const completion = Promise.withResolvers<void>();
  value.closing = completion.promise;
  const pending = [...value.pending];
  const requestReads = [...value.requestReads];
  const requestWrites = [...value.requestWrites];
  const closingScopes = [...value.scopes];
  const closingOnboarding = [...value.onboardingRequests];
  const closingPublications = [...value.onboardingPublications];
  let coreClosing: Promise<void> | undefined;
  if (value.core) coreClosing = closeCoreController(value.core);
  const close = async () => {
    const tasks: Promise<unknown>[] = [...pending, ...requestReads, ...requestWrites];
    if (coreClosing) {
      try {
        await coreClosing;
      } catch (error: unknown) {
        tasks.push(Promise.reject(error));
      }
    }
    try {
      value.controller.abort(new IssuerStagingError());
    } catch (error: unknown) {
      tasks.push(Promise.reject(error));
    }
    tasks.push((async () => value.authority.closeAsync())());
    tasks.push(...closingScopes.map(async (scope) => closeIssuerSqlScope(owner, scope)));
    tasks.push(...closingOnboarding.map((record) => retireOwnedOnboardingRequest(value, record)));
    tasks.push(
      ...closingPublications.map((record) =>
        settleOnboardingPublication(value, record, { kind: "abandoned", cause: new IssuerStagingError() }),
      ),
    );
    const result = await Promise.allSettled(tasks);
    const failures: unknown[] = [];
    for (const publication of value.onboardingNativePublications) {
      try {
        publication.dispose();
      } catch (error: unknown) {
        failures.push(error);
      }
    }
    value.onboardingNativePublications.clear();
    const cleanup = value.onboardingCleanup;
    if (cleanup.type === "failed")
      failures.push(
        new OnboardingOwnerCleanupError(
          cleanup.first.phase,
          cleanup.failedRetirements,
          cleanup.countStatus,
          cleanup.first.cause,
        ),
      );
    for (const [index, item] of result.entries()) {
      const task = tasks[index];
      let onboarding: ReturnType<typeof onboardingTasks.get> = undefined;
      if (task) onboarding = onboardingTasks.get(task);
      let publicationOwner: ProductionSessionSqlOwner | undefined;
      if (task) publicationOwner = onboardingPublicationTasks.get(task)?.deref();
      if (
        item.status === "rejected" &&
        (!onboarding || onboarding.record.owner !== owner) &&
        publicationOwner !== owner
      )
        failures.push(item.reason);
    }
    if (failures.length > 0) throw new AggregateError(failures, "Auth SQL owner operations and cleanup failed");
  };
  void close().then(completion.resolve, completion.reject);
  return value.closing;
}
