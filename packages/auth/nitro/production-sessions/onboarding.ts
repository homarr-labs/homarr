import { constants } from "node:buffer";

import { createId } from "@homarr/common/id";
import type {
  OnboardingClaimResult,
  OnboardingInvocation,
  OnboardingNativePublicationHandle,
  OnboardingNativePublicationRead,
  OnboardingNativePublicationReader,
  OnboardingOperation,
  OnboardingStepWitness,
} from "@homarr/db/runtime";
import type { SupportedAuthProvider } from "@homarr/definitions";
import { groupCreateSchema } from "@homarr/validation/group";
import { userInitSchema } from "@homarr/validation/user";

import { hashPasswordAsync } from "../../security";
import { sessionTokenCookieName } from "../session-primitives";
import { createBoundedIssuerBodyReader, IssuerBodyRejectedError } from "./bounded-body";
import type { IssuerBodyBudget } from "./bounded-body";
import { createIssuerOriginGuard, readSingleCookie } from "./origin";
import type { IssuerOriginConfiguration } from "./origin";
import { IssuerOperationLedger } from "./persistence";

const requestIdentity = Symbol("onboarding-request");
const operationIdentity = Symbol("onboarding-operation");
const packetIdentity = Symbol("onboarding-packet");
const frameIdentity = Symbol("onboarding-frame");
const ticketIdentity = Symbol("onboarding-input-ticket");
const csrfIdentity = Symbol("onboarding-csrf-read");
const publicationIdentity = Symbol("onboarding-publication");

export type ProductionOnboardingRpcCommand = "nextStep" | "initUser" | "initialExternalGroup";

export interface ProductionOnboardingRpcPacket {
  readonly [packetIdentity]: true;
}

export interface ProductionOnboardingRpcFrame {
  readonly [frameIdentity]: true;
  readonly kind: ProductionOnboardingRpcCommand;
}

export interface ProductionOnboardNextStepInputTicket {
  readonly [ticketIdentity]: true;
  readonly kind: "nextStep";
}

export interface ProductionOnboardingInitUserInputTicket {
  readonly [ticketIdentity]: true;
  readonly kind: "initUser";
}

export interface ProductionInitialExternalGroupInputTicket {
  readonly [ticketIdentity]: true;
  readonly kind: "initialExternalGroup";
}

export type ProductionOnboardingInputTicket =
  | ProductionOnboardNextStepInputTicket
  | ProductionOnboardingInitUserInputTicket
  | ProductionInitialExternalGroupInputTicket;

export interface ProductionOnboardingRpcContext {
  readonly request: Request;
  readonly signal: AbortSignal;
}

export interface ProductionOnboardingRpcInputSource {
  consumeNextStepInput(
    ticket: ProductionOnboardNextStepInputTicket,
    packet: ProductionOnboardingRpcPacket,
    finalContext: ProductionOnboardingRpcContext,
  ): void;
  consumeInitUserInput(
    ticket: ProductionOnboardingInitUserInputTicket,
    packet: ProductionOnboardingRpcPacket,
    finalContext: ProductionOnboardingRpcContext,
  ): ReturnType<typeof userInitSchema.parse>;
  consumeInitialExternalGroupInput(
    ticket: ProductionInitialExternalGroupInputTicket,
    packet: ProductionOnboardingRpcPacket,
    finalContext: ProductionOnboardingRpcContext,
  ): ReturnType<typeof groupCreateSchema.parse>;
}

export interface ProductionOnboardingCsrfRequest {
  readonly [csrfIdentity]: true;
}

export interface ProductionOnboardingCsrfOutput {
  readonly token: string;
  readonly setCookie: string;
  readonly response: Response;
}

export interface ProductionOnboardingPublication {
  readonly [publicationIdentity]: true;
}

export type ProductionOnboardingResponseOutcome =
  | { readonly kind: "output"; readonly response: Response }
  | { readonly kind: "error"; readonly response: Response; readonly error: unknown };

export type ProductionOnboardingPublicationResult = {
  readonly sourceOutcome: "output" | "error";
  readonly native: OnboardingNativePublicationRead | null;
  readonly primary: { readonly kind: "none" } | { readonly kind: "failed"; readonly error: unknown };
  readonly cleanup: "complete" | "failed";
} & ({ readonly kind: "published" } | { readonly kind: "abandoned"; readonly cause: unknown });

export function createOnboardingPacketHandle(): ProductionOnboardingRpcPacket {
  return Object.freeze<ProductionOnboardingRpcPacket>({ [packetIdentity]: true });
}

export function createOnboardingFrameHandle(kind: ProductionOnboardingRpcCommand): ProductionOnboardingRpcFrame {
  return Object.freeze<ProductionOnboardingRpcFrame>({ [frameIdentity]: true, kind });
}

export function createOnboardingInputTicket(kind: ProductionOnboardingRpcCommand): ProductionOnboardingInputTicket {
  if (kind === "nextStep") return Object.freeze<ProductionOnboardNextStepInputTicket>({ [ticketIdentity]: true, kind });
  if (kind === "initUser")
    return Object.freeze<ProductionOnboardingInitUserInputTicket>({ [ticketIdentity]: true, kind });
  return Object.freeze<ProductionInitialExternalGroupInputTicket>({ [ticketIdentity]: true, kind });
}

export function createOnboardingCsrfHandle(): ProductionOnboardingCsrfRequest {
  return Object.freeze<ProductionOnboardingCsrfRequest>({ [csrfIdentity]: true });
}

export function createOnboardingPublicationHandle(): ProductionOnboardingPublication {
  return Object.freeze<ProductionOnboardingPublication>({ [publicationIdentity]: true });
}

export function onboardingRpcCommand(request: Request): ProductionOnboardingRpcCommand {
  const url = new URL(request.url);
  if (request.method !== "POST" || url.search || url.hash) throw new ProductionOnboardingError();
  if (url.pathname === "/rpc/onboard/nextStep") return "nextStep";
  if (url.pathname === "/rpc/user/initUser") return "initUser";
  if (url.pathname === "/rpc/group/createInitialExternalGroup") return "initialExternalGroup";
  throw new ProductionOnboardingError();
}

function isOnboardingCsrfRead(request: Request): boolean {
  const url = new URL(request.url);
  return request.method === "GET" && url.pathname === "/api/onboarding/claim" && !url.search && !url.hash;
}

export class OwnedOnboardingNativePublication {
  private association:
    | {
        readonly operation: OnboardingOperation;
        readonly invocation: OnboardingInvocation;
        readonly clock: () => number;
        readonly publication: OnboardingNativePublicationHandle;
        readonly reader: OnboardingNativePublicationReader;
      }
    | undefined;

  constructor(
    operation: OnboardingOperation,
    invocation: OnboardingInvocation,
    clock: () => number,
    publication: OnboardingNativePublicationHandle,
    reader: OnboardingNativePublicationReader,
  ) {
    this.association = Object.freeze({ operation, invocation, clock, publication, reader });
  }

  read(): OnboardingNativePublicationRead {
    const slot = this.association;
    if (!slot) throw new ProductionOnboardingError();
    return slot.reader.readOnboardingNativePublication(slot.publication, slot.operation, slot.invocation);
  }

  consume(): Extract<OnboardingNativePublicationRead, { readonly kind: "settled" }> {
    const slot = this.association;
    if (!slot) throw new ProductionOnboardingError();
    return slot.reader.consumeOnboardingNativePublication(slot.publication, slot.operation, slot.invocation);
  }

  dispose(): void {
    const slot = this.association;
    if (!slot) return;
    slot.reader.disposeOnboardingNativePublication(slot.publication, slot.operation, slot.invocation);
    this.association = undefined;
  }
}

export interface ProductionOnboardingRequest {
  readonly [requestIdentity]: true;
}

export interface PreparedProductionOnboardingClaim {
  readonly [operationIdentity]: true;
  readonly kind: "claim";
}

export interface PreparedProductionOnboardNextStep {
  readonly [operationIdentity]: true;
  readonly kind: "nextStep";
}

export interface PreparedProductionOnboardingInitUser {
  readonly [operationIdentity]: true;
  readonly kind: "initUser";
}

export interface PreparedProductionInitialExternalGroup {
  readonly [operationIdentity]: true;
  readonly kind: "initialExternalGroup";
}

export type PreparedProductionOnboardingOperation =
  | PreparedProductionOnboardingClaim
  | PreparedProductionOnboardNextStep
  | PreparedProductionOnboardingInitUser
  | PreparedProductionInitialExternalGroup;

export interface ProductionOnboardingPolicy {
  readonly demoEnabled: boolean;
  readonly readOnly: boolean;
  readonly requestBudgetMs: number;
  readonly maximumCookieBytes: number;
  readonly maximumCredentialBytes: number;
  readonly maximumResponseBytes: number;
}

export type ProductionOnboardingClaimOutput =
  | { readonly status: "issued" | "active"; readonly expiresAt: number; readonly setCookie: string }
  | { readonly status: "locked"; readonly expiresAt: number }
  | { readonly status: "finished" | "forbidden" };

export type ProductionOnboardingFailureState =
  | "held-without-dispatch"
  | "failed-without-confirmed-commit"
  | "commit-ambiguous"
  | "confirmed-commit-settlement-failed";

export interface OnboardingCleanupFailure {
  readonly phase:
    | "body-cancel"
    | "body-release"
    | "body-detach"
    | "body-timer"
    | "request-timer"
    | "request-abort"
    | "request-detach"
    | "admission-release"
    | "lease-release"
    | "publication-dispose"
    | "native-cleanup"
    | "retirement-driver";
  readonly cause: unknown;
}

export class ProductionOnboardingError extends Error {
  readonly code = "ONBOARDING_REQUEST_UNAVAILABLE";
  readonly retryable = false;

  constructor(
    readonly state: ProductionOnboardingFailureState = "held-without-dispatch",
    cause?: unknown,
  ) {
    super("Onboarding request is unavailable", { cause });
    this.name = "ProductionOnboardingError";
  }
}

export function onboardingOwnRecord(input: unknown): Record<string, unknown> {
  if (typeof input !== "object" || input === null || Array.isArray(input)) throw new ProductionOnboardingError();
  const row: Record<string, unknown> = {};
  for (const [key, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(input))) {
    if (!("value" in descriptor)) throw new ProductionOnboardingError();
    Object.defineProperty(row, key, { value: descriptor.value, enumerable: true });
  }
  return row;
}

function boundedText(input: unknown, maximumBytes: number): string {
  if (
    typeof input !== "string" ||
    input.length === 0 ||
    !input.isWellFormed() ||
    input.includes("\u0000") ||
    Buffer.byteLength(input, "utf8") > maximumBytes
  )
    throw new ProductionOnboardingError();
  return input;
}

function finiteLimit(input: unknown, maximum: number): number {
  if (typeof input !== "number" || !Number.isSafeInteger(input) || input < 1 || input > maximum)
    throw new ProductionOnboardingError();
  return input;
}

export function captureProductionOnboardingPolicy(input: ProductionOnboardingPolicy): ProductionOnboardingPolicy {
  const value = onboardingOwnRecord(input);
  if (typeof value.demoEnabled !== "boolean" || typeof value.readOnly !== "boolean")
    throw new ProductionOnboardingError();
  return Object.freeze({
    demoEnabled: value.demoEnabled,
    readOnly: value.readOnly,
    requestBudgetMs: finiteLimit(value.requestBudgetMs, 2_147_483_647),
    maximumCookieBytes: finiteLimit(value.maximumCookieBytes, 65_536),
    maximumCredentialBytes: finiteLimit(value.maximumCredentialBytes, 4096),
    maximumResponseBytes: finiteLimit(value.maximumResponseBytes, Math.min(constants.MAX_LENGTH, 65_536)),
  });
}

export function createProductionOnboardingConfiguration(
  policy: ProductionOnboardingPolicy,
  origin: IssuerOriginConfiguration,
  providers: readonly SupportedAuthProvider[],
  bodyBudget: IssuerBodyBudget,
  maximumAbsoluteClockSkewMs: number,
) {
  const capturedPolicy = captureProductionOnboardingPolicy(policy);
  const capturedOrigin = Object.freeze({ ...origin, cookies: Object.freeze({ ...origin.cookies }) });
  const capturedProviders = Object.freeze([...providers]);
  if (
    capturedProviders.length === 0 ||
    capturedProviders.length > 3 ||
    new Set(capturedProviders).size !== capturedProviders.length ||
    capturedProviders.some((provider) => !["credentials", "ldap", "oidc"].includes(provider)) ||
    !Number.isSafeInteger(maximumAbsoluteClockSkewMs) ||
    maximumAbsoluteClockSkewMs < 0
  )
    throw new ProductionOnboardingError();
  return Object.freeze({
    policy: capturedPolicy,
    origin: capturedOrigin,
    providers: capturedProviders,
    maximumAbsoluteClockSkewMs,
    guard: createIssuerOriginGuard(capturedOrigin),
    bodyReader: createBoundedIssuerBodyReader(Object.freeze({ ...bodyBudget }), capturedOrigin.now),
  });
}

export type ProductionOnboardingConfiguration = ReturnType<typeof createProductionOnboardingConfiguration>;

function headersWitness(request: Request): string {
  const fields: [string, string][] = [];
  let size = 0;
  request.headers.forEach((value, key) => {
    size += Buffer.byteLength(key + value, "utf8");
    if (size > 65_536) throw new ProductionOnboardingError();
    fields.push([key, value]);
  });
  return JSON.stringify(fields);
}

export class OwnedOnboardingRequestState {
  readonly original: OnboardingOperation;
  readonly controller = new AbortController();
  readonly ledger = new IssuerOperationLedger();
  readonly cleanupFailures: OnboardingCleanupFailure[] = [];
  bodyTerminal: { readonly kind: "none" } | { readonly kind: "read-error"; readonly cause: unknown } = { kind: "none" };
  bodyClosed:
    | { readonly kind: "unobserved" }
    | { readonly kind: "closed" }
    | { readonly kind: "errored"; readonly cause: unknown } = { kind: "unobserved" };
  readonly requestId: string;
  readonly method: string;
  readonly url: string;
  readonly headers: string;
  private deadlineAt: number;
  private monotonicExpiresAt: number;
  private lastMonotonicAt: number;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private stopped = false;
  readonly publicationSignal: AbortSignal;
  private packetText:
    | { readonly kind: "absent" }
    | { readonly kind: "json"; readonly text: string; readonly bytes: readonly number[] }
    | undefined;

  constructor(
    readonly request: Request,
    requestId: string,
    signal: AbortSignal,
    lifetime: AbortSignal,
    ownerLifetime: AbortSignal,
    readonly configuration: ProductionOnboardingConfiguration,
  ) {
    const originalWallStartedAt = Date.now();
    const originalMonotonicStartedAt = performance.now();
    const originalBudgetMs = configuration.policy.requestBudgetMs;
    const deadlineAt = originalWallStartedAt + originalBudgetMs;
    const originalMonotonicExpiresAt = originalMonotonicStartedAt + originalBudgetMs;
    if (
      !(request instanceof Request) ||
      !(signal instanceof AbortSignal) ||
      !(lifetime instanceof AbortSignal) ||
      !(ownerLifetime instanceof AbortSignal) ||
      request.bodyUsed ||
      request.body?.locked ||
      !Number.isSafeInteger(originalWallStartedAt) ||
      originalWallStartedAt < 0 ||
      !Number.isFinite(originalMonotonicStartedAt) ||
      originalMonotonicStartedAt < 0 ||
      !Number.isSafeInteger(deadlineAt) ||
      !Number.isFinite(originalMonotonicExpiresAt) ||
      (configuration.policy.demoEnabled && configuration.policy.readOnly && !isOnboardingCsrfRead(request))
    )
      throw new ProductionOnboardingError();
    this.requestId = boundedText(requestId, 128);
    this.method = request.method;
    this.url = request.url;
    this.headers = headersWitness(request);
    this.deadlineAt = deadlineAt;
    this.monotonicExpiresAt = originalMonotonicExpiresAt;
    this.lastMonotonicAt = originalMonotonicStartedAt;
    this.original = Object.freeze({
      signal: AbortSignal.any([signal, request.signal, this.controller.signal]),
      lifetime: AbortSignal.any([lifetime, ownerLifetime, this.controller.signal]),
      deadlineAt,
      originalWallStartedAt,
      originalMonotonicStartedAt,
      originalBudgetMs,
      originalMonotonicExpiresAt,
    });
    this.publicationSignal = AbortSignal.any([signal, request.signal, lifetime, ownerLifetime]);
    this.check();
    configuration.guard.assertCanonicalRequest(request);
  }

  check(): number {
    this.original.signal.throwIfAborted();
    this.original.lifetime.throwIfAborted();
    if (this.stopped) throw new ProductionOnboardingError();
    return this.checkPublication();
  }

  checkPublication(): number {
    this.publicationSignal.throwIfAborted();
    const wall = Date.now();
    const configured = this.configuration.origin.now();
    const monotonic = performance.now();
    if (
      !Number.isSafeInteger(wall) ||
      wall < 0 ||
      !Number.isSafeInteger(configured) ||
      configured < 0 ||
      configured > 8_640_000_000_000_000 ||
      Math.abs(wall - configured) > this.configuration.maximumAbsoluteClockSkewMs ||
      !Number.isFinite(monotonic) ||
      monotonic < this.lastMonotonicAt ||
      this.request.method !== this.method ||
      this.request.url !== this.url ||
      headersWitness(this.request) !== this.headers
    )
      throw new ProductionOnboardingError();
    this.lastMonotonicAt = monotonic;
    const now = Math.max(wall, configured);
    const remaining = Math.min(
      this.original.originalWallStartedAt + this.original.originalBudgetMs - now,
      this.original.originalMonotonicExpiresAt - monotonic,
      this.deadlineAt - now,
      this.monotonicExpiresAt - monotonic,
    );
    if (!Number.isFinite(remaining) || remaining < 1) throw new ProductionOnboardingError();
    return Math.min(2_147_483_647, Math.floor(remaining));
  }

  tighten(deadlineAt: number): void {
    if (!Number.isSafeInteger(deadlineAt) || deadlineAt < 0) throw new ProductionOnboardingError();
    const mapped = this.original.originalMonotonicStartedAt + (deadlineAt - this.original.originalWallStartedAt);
    if (!Number.isFinite(mapped)) throw new ProductionOnboardingError();
    this.deadlineAt = Math.min(this.deadlineAt, deadlineAt);
    this.monotonicExpiresAt = Math.min(this.monotonicExpiresAt, this.original.originalMonotonicExpiresAt, mapped);
    this.check();
    if (this.timer !== undefined) clearTimeout(this.timer);
    this.schedule();
  }

  bounds(): OnboardingOperation {
    this.check();
    return Object.freeze({ ...this.original, deadlineAt: this.deadlineAt });
  }

  schedule(): void {
    try {
      const remaining = this.check();
      this.timer = setTimeout(() => this.schedule(), remaining);
      this.timer.unref();
    } catch (error: unknown) {
      this.controller.abort(error);
    }
  }

  retire(): void {
    this.stopped = true;
    try {
      if (this.timer !== undefined) clearTimeout(this.timer);
    } catch (cause: unknown) {
      this.cleanupFailures.push({ phase: "request-timer", cause });
    }
    try {
      this.controller.abort(new ProductionOnboardingError());
    } catch (cause: unknown) {
      this.cleanupFailures.push({ phase: "request-abort", cause });
    }
  }

  admitMutation() {
    this.check();
    const { policy, guard, origin } = this.configuration;
    if (policy.demoEnabled && policy.readOnly) throw new ProductionOnboardingError();
    const cookieHeader = this.request.headers.get("cookie");
    if (cookieHeader !== null && Buffer.byteLength(cookieHeader, "utf8") > policy.maximumCookieBytes)
      throw new ProductionOnboardingError();
    const sessionName = sessionTokenCookieName(origin.cookies.prefix);
    const selected = new Set(["homarr-onboarding-claim", sessionName, guard.csrfCookieName]);
    const seen = new Set<string>();
    for (const raw of (cookieHeader ?? "").split(";")) {
      const part = raw.trim();
      if (part === "") continue;
      const separator = part.indexOf("=");
      const name = part.slice(0, separator);
      if (separator <= 0 || name !== name.trim() || name.startsWith(`${sessionName}.`))
        throw new ProductionOnboardingError();
      if (!selected.has(name)) continue;
      if (seen.has(name)) throw new ProductionOnboardingError();
      seen.add(name);
      const maximum = Math.min(policy.maximumCredentialBytes, 4096);
      const value = readSingleCookie(this.request, name);
      boundedText(value, maximum);
    }
    const csrf = this.request.headers.get("x-homarr-csrf-token");
    boundedText(csrf, 160);
    guard.assertMutation(this.request);
    if (csrf === null) throw new ProductionOnboardingError();
    const expiresAt = Number(csrf.split(".")[1]);
    this.tighten(expiresAt);
    const currentToken = readSingleCookie(this.request, "homarr-onboarding-claim");
    if (currentToken !== null) boundedText(currentToken, 512);
    const sessionToken = readSingleCookie(this.request, sessionName);
    const apiKey = this.request.headers.get("ApiKey");
    if (apiKey !== null) boundedText(apiKey, policy.maximumCredentialBytes);
    if (sessionToken !== null && apiKey !== null) throw new ProductionOnboardingError();
    this.check();
    return Object.freeze({ currentToken, sessionToken, apiKey });
  }

  private assertBodyCurrent(): void {
    try {
      this.check();
    } catch {
      throw new IssuerBodyRejectedError("interrupted");
    }
  }

  private async readBodyBytesAsync(): Promise<Uint8Array<ArrayBuffer> | null> {
    const bounds = this.bounds();
    const request = this.request;
    const maximumBytes = this.configuration.bodyReader.maximumBytes;
    if (request.bodyUsed || request.body?.locked) throw new IssuerBodyRejectedError("used");
    if (request.method !== "POST" && request.body !== null) throw new IssuerBodyRejectedError("method");
    if (!request.body) {
      this.assertBodyCurrent();
      return null;
    }
    const reader = request.body.getReader();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let cancellation: Promise<void> | undefined;
    let pendingRead: ReturnType<typeof reader.read> | undefined;
    let interrupted = false;
    let complete = false;
    let rejection: IssuerBodyRejectedError | undefined;
    let storage = new Uint8Array(0);
    let size = 0;
    let terminalRead:
      | { readonly kind: "unobserved" }
      | { readonly kind: "observed"; readonly reader: typeof reader; readonly cause: unknown } = { kind: "unobserved" };
    const closed = reader.closed.then(
      () => {
        this.bodyClosed = { kind: "closed" };
      },
      (cause: unknown) => {
        this.bodyClosed = { kind: "errored", cause };
      },
    );
    const cancel = () => {
      if (cancellation) return;
      const atCancellation = terminalRead;
      const completion = Promise.withResolvers<void>();
      cancellation = completion.promise;
      try {
        const underlying = reader.cancel(new IssuerBodyRejectedError("interrupted"));
        void underlying.then(
          () => completion.resolve(),
          (cause: unknown) => {
            if (
              atCancellation.kind !== "observed" ||
              atCancellation.reader !== reader ||
              !Object.is(atCancellation.cause, cause)
            )
              this.cleanupFailures.push({ phase: "body-cancel", cause });
            completion.resolve();
          },
        );
      } catch (cause: unknown) {
        this.cleanupFailures.push({ phase: "body-cancel", cause });
        completion.resolve();
      }
    };
    const interrupt = () => {
      interrupted = true;
      cancel();
    };
    const signals = [...new Set([request.signal, bounds.signal, bounds.lifetime])];
    const scheduleDeadline = () => {
      let remaining: number;
      try {
        remaining = this.check();
      } catch {
        interrupt();
        return;
      }
      try {
        timer = setTimeout(scheduleDeadline, remaining);
      } catch (cause: unknown) {
        this.cleanupFailures.push({ phase: "body-timer", cause });
        interrupt();
      }
    };
    const observeReadError = (cause: unknown) => {
      terminalRead = { kind: "observed", reader, cause };
      this.bodyTerminal = { kind: "read-error", cause };
    };
    const firstCleanup = this.cleanupFailures.length;
    try {
      for (const signal of signals) signal.addEventListener("abort", interrupt, { once: true });
      scheduleDeadline();
      this.assertBodyCurrent();
      while (!complete) {
        if (interrupted) throw new IssuerBodyRejectedError("interrupted");
        this.assertBodyCurrent();
        const currentRead = reader.read();
        pendingRead = currentRead;
        let chunk: Awaited<typeof currentRead>;
        try {
          chunk = await currentRead;
        } catch (cause: unknown) {
          observeReadError(cause);
          throw cause;
        }
        pendingRead = undefined;
        if (interrupted) throw new IssuerBodyRejectedError("interrupted");
        this.assertBodyCurrent();
        if (chunk.done) {
          complete = true;
          break;
        }
        if (!(chunk.value instanceof Uint8Array)) throw new IssuerBodyRejectedError("stream");
        if (chunk.value.byteLength > maximumBytes - size) throw new IssuerBodyRejectedError("oversize");
        const nextSize = size + chunk.value.byteLength;
        if (nextSize > storage.byteLength) {
          const capacity = Math.min(maximumBytes, Math.max(nextSize, storage.byteLength * 2));
          const expanded = new Uint8Array(capacity);
          expanded.set(storage.subarray(0, size));
          storage = expanded;
        }
        storage.set(chunk.value, size);
        size = nextSize;
      }
    } catch (error: unknown) {
      if (error instanceof IssuerBodyRejectedError) rejection = error;
      else rejection = new IssuerBodyRejectedError("stream");
    } finally {
      if (!complete) cancel();
      if (pendingRead) {
        await pendingRead.then(
          () => undefined,
          (cause: unknown) => observeReadError(cause),
        );
      }
      if (cancellation) await cancellation;
      await closed;
      try {
        reader.releaseLock();
      } catch (cause: unknown) {
        this.cleanupFailures.push({ phase: "body-release", cause });
      }
      try {
        if (timer !== undefined) clearTimeout(timer);
      } catch (cause: unknown) {
        this.cleanupFailures.push({ phase: "body-timer", cause });
      }
      for (const signal of signals) {
        try {
          signal.removeEventListener("abort", interrupt);
        } catch (cause: unknown) {
          this.cleanupFailures.push({ phase: "body-detach", cause });
        }
      }
    }
    if (this.cleanupFailures.length > firstCleanup) throw new IssuerBodyRejectedError("settlement");
    if (rejection) throw rejection;
    this.assertBodyCurrent();
    return storage.subarray(0, size);
  }

  async readSourceJsonAsync(): Promise<Record<string, unknown>> {
    this.check();
    if (!/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(this.request.headers.get("content-type") ?? ""))
      throw new ProductionOnboardingError();
    const parsed = await this.ledger.run("onboarding-body", async () => {
      const bytes = await this.readBodyBytesAsync();
      if (bytes === null) throw new IssuerBodyRejectedError("json");
      try {
        const value: unknown = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
        this.assertBodyCurrent();
        return value;
      } catch (error: unknown) {
        if (error instanceof IssuerBodyRejectedError) throw error;
        throw new IssuerBodyRejectedError("json");
      }
    });
    this.check();
    return onboardingOwnRecord(parsed);
  }

  async readEmptySourceAsync(): Promise<void> {
    const bytes = await this.ledger.run("onboarding-body", () => this.readBodyBytesAsync());
    this.check();
    if (bytes === null || bytes.byteLength === 0) return;
    if (!/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(this.request.headers.get("content-type") ?? ""))
      throw new ProductionOnboardingError();
    const parsed: unknown = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
    if (Object.keys(onboardingOwnRecord(parsed)).length !== 0) throw new ProductionOnboardingError();
    this.check();
  }

  async readRpcPacketAsync(): Promise<void> {
    this.check();
    onboardingRpcCommand(this.request);
    const hint = this.request.headers.get("standard-server");
    const contentType = this.request.headers.get("content-type");
    const contentLength = this.request.headers.get("content-length");
    let interpretation: "json" | "none";
    if (hint === "none") {
      interpretation = "none";
    } else {
      if (hint !== null && hint !== "json") throw new IssuerBodyRejectedError("json");
      if (hint === null && contentType === null && (contentLength === null || contentLength === "0")) {
        interpretation = "none";
      } else {
        if (!/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(contentType ?? ""))
          throw new IssuerBodyRejectedError("json");
        interpretation = "json";
      }
    }
    if (this.packetText) return;
    await this.ledger.run("onboarding-body", async () => {
      const bytes = await this.readBodyBytesAsync();
      if (interpretation === "none") {
        if (bytes !== null && bytes.byteLength !== 0) throw new IssuerBodyRejectedError("json");
        this.check();
        this.packetText = Object.freeze({ kind: "absent" });
        return;
      }
      const ownedBytes = bytes ?? new Uint8Array(0);
      const text = new TextDecoder("utf-8", { fatal: true }).decode(ownedBytes);
      if (text === "") {
        this.check();
        this.packetText = Object.freeze({ kind: "absent" });
        return;
      }
      const parsed: unknown = JSON.parse(text);
      void parsed;
      this.check();
      this.packetText = Object.freeze({ kind: "json", text, bytes: Object.freeze(Array.from(ownedBytes)) });
    });
    this.check();
  }

  resolveRpcPacket(): unknown {
    this.check();
    const packet = this.packetText;
    if (!packet) throw new ProductionOnboardingError();
    if (packet.kind === "absent") return undefined;
    const input: unknown = JSON.parse(packet.text);
    this.check();
    return input;
  }

  assertRpcPacketReady(): void {
    this.check();
    if (!this.packetText) throw new ProductionOnboardingError();
  }

  async prepareCsrfReadAsync(): Promise<ProductionOnboardingCsrfOutput> {
    this.check();
    if (!isOnboardingCsrfRead(this.request)) throw new ProductionOnboardingError();
    const origin = this.request.headers.get("origin");
    const site = this.request.headers.get("sec-fetch-site");
    if (
      (origin !== null && origin !== this.configuration.guard.origin) ||
      (site !== null && site !== "same-origin" && site !== "none")
    )
      throw new ProductionOnboardingError();
    await this.readEmptySourceAsync();
    const output = this.configuration.guard.prepareCsrfCookie(this.request);
    this.tighten(Number(output.token.split(".")[1]));
    const body = JSON.stringify({ token: output.token });
    if (Buffer.byteLength(body, "utf8") > this.configuration.policy.maximumResponseBytes)
      throw new ProductionOnboardingError();
    const response = new Response(body, {
      headers: { "content-type": "application/json", "cache-control": "no-store", "set-cookie": output.setCookie },
    });
    return Object.freeze({ ...output, response });
  }

  publicationClock(): OwnedOnboardingPublicationClock {
    this.checkPublication();
    return new OwnedOnboardingPublicationClock(
      this.request,
      this.method,
      this.url,
      this.headers,
      this.publicationSignal,
      this.original,
      this.deadlineAt,
      this.monotonicExpiresAt,
      this.lastMonotonicAt,
      this.configuration.origin.now,
      this.configuration.maximumAbsoluteClockSkewMs,
    );
  }

  clearPacket(): void {
    this.packetText = undefined;
  }
}

export class OwnedOnboardingPublicationClock {
  constructor(
    readonly request: Request,
    private readonly method: string,
    private readonly url: string,
    private readonly headers: string,
    readonly signal: AbortSignal,
    private readonly original: OnboardingOperation,
    private readonly deadlineAt: number,
    private readonly monotonicExpiresAt: number,
    private lastMonotonicAt: number,
    readonly now: () => number,
    private readonly maximumAbsoluteClockSkewMs: number,
  ) {}

  check(): number {
    this.signal.throwIfAborted();
    const wall = Date.now();
    const configured = this.now();
    const monotonic = performance.now();
    if (
      !Number.isSafeInteger(wall) ||
      wall < 0 ||
      !Number.isSafeInteger(configured) ||
      configured < 0 ||
      configured > 8_640_000_000_000_000 ||
      Math.abs(wall - configured) > this.maximumAbsoluteClockSkewMs ||
      !Number.isFinite(monotonic) ||
      monotonic < this.lastMonotonicAt ||
      this.request.method !== this.method ||
      this.request.url !== this.url ||
      headersWitness(this.request) !== this.headers
    )
      throw new ProductionOnboardingError();
    this.lastMonotonicAt = monotonic;
    const now = Math.max(wall, configured);
    const remaining = Math.min(
      this.original.originalWallStartedAt + this.original.originalBudgetMs - now,
      this.original.originalMonotonicExpiresAt - monotonic,
      this.deadlineAt - now,
      this.monotonicExpiresAt - monotonic,
    );
    if (!Number.isFinite(remaining) || remaining < 1) throw new ProductionOnboardingError();
    return Math.min(2_147_483_647, Math.floor(remaining));
  }
}

export async function readOwnedOnboardingResponseAsync(
  response: Response,
  clock: OwnedOnboardingPublicationClock,
  controller: AbortController,
  maximumBytes: number,
  cleanupFailures: OnboardingCleanupFailure[],
): Promise<Uint8Array<ArrayBuffer>> {
  clock.check();
  if (response.bodyUsed || response.body?.locked) throw new ProductionOnboardingError();
  if (!response.body) return new Uint8Array(0);
  const reader = response.body.getReader();
  const signal = AbortSignal.any([clock.signal, controller.signal]);
  let timer: ReturnType<typeof setTimeout> | undefined;
  let pending: ReturnType<typeof reader.read> | undefined;
  let cancellation: Promise<void> | undefined;
  let terminal: { readonly kind: "none" } | { readonly kind: "read-error"; readonly cause: unknown } = { kind: "none" };
  let complete = false;
  let interrupted = false;
  let body = new Uint8Array(0);
  let size = 0;
  const closed = reader.closed.then(
    () => undefined,
    () => undefined,
  );
  const cancel = () => {
    if (cancellation) return;
    interrupted = true;
    const atCancellation = terminal;
    const completion = Promise.withResolvers<void>();
    cancellation = completion.promise;
    try {
      const underlying = reader.cancel(new ProductionOnboardingError());
      void underlying.then(completion.resolve, (cause: unknown) => {
        if (atCancellation.kind !== "read-error" || !Object.is(atCancellation.cause, cause))
          cleanupFailures.push({ phase: "body-cancel", cause });
        completion.resolve();
      });
    } catch (cause: unknown) {
      cleanupFailures.push({ phase: "body-cancel", cause });
      completion.resolve();
    }
  };
  const schedule = () => {
    try {
      timer = setTimeout(schedule, clock.check());
      timer.unref();
    } catch {
      cancel();
    }
  };
  const firstCleanup = cleanupFailures.length;
  try {
    signal.addEventListener("abort", cancel, { once: true });
    schedule();
    while (!complete) {
      if (interrupted) throw new ProductionOnboardingError();
      signal.throwIfAborted();
      clock.check();
      const task = reader.read();
      pending = task;
      let step: Awaited<typeof task>;
      try {
        step = await task;
      } catch (cause: unknown) {
        terminal = { kind: "read-error", cause };
        throw cause;
      }
      pending = undefined;
      if (interrupted) throw new ProductionOnboardingError();
      signal.throwIfAborted();
      clock.check();
      if (step.done) {
        complete = true;
        break;
      }
      if (!(step.value instanceof Uint8Array) || step.value.byteLength > maximumBytes - size)
        throw new ProductionOnboardingError();
      const nextSize = size + step.value.byteLength;
      if (nextSize > body.byteLength) {
        const next = new Uint8Array(Math.min(maximumBytes, Math.max(nextSize, body.byteLength * 2)));
        next.set(body.subarray(0, size));
        body = next;
      }
      body.set(step.value, size);
      size = nextSize;
    }
  } finally {
    if (!complete) cancel();
    if (pending)
      await pending.then(
        () => undefined,
        () => undefined,
      );
    if (cancellation) await cancellation;
    await closed;
    try {
      reader.releaseLock();
    } catch (cause: unknown) {
      cleanupFailures.push({ phase: "body-release", cause });
    }
    try {
      if (timer !== undefined) clearTimeout(timer);
    } catch (cause: unknown) {
      cleanupFailures.push({ phase: "body-timer", cause });
    }
    try {
      signal.removeEventListener("abort", cancel);
    } catch (cause: unknown) {
      cleanupFailures.push({ phase: "body-detach", cause });
    }
  }
  if (cleanupFailures.length !== firstCleanup) throw new IssuerBodyRejectedError("settlement");
  clock.check();
  return body.slice(0, size);
}

export function createOnboardingRequestHandle(): ProductionOnboardingRequest {
  return Object.freeze<ProductionOnboardingRequest>({ [requestIdentity]: true });
}

export function createOnboardingClaimHandle(): PreparedProductionOnboardingClaim {
  return Object.freeze<PreparedProductionOnboardingClaim>({ [operationIdentity]: true, kind: "claim" });
}

export function createOnboardNextStepHandle(): PreparedProductionOnboardNextStep {
  return Object.freeze<PreparedProductionOnboardNextStep>({ [operationIdentity]: true, kind: "nextStep" });
}

export function createOnboardingInitUserHandle(): PreparedProductionOnboardingInitUser {
  return Object.freeze<PreparedProductionOnboardingInitUser>({ [operationIdentity]: true, kind: "initUser" });
}

export function createInitialExternalGroupHandle(): PreparedProductionInitialExternalGroup {
  return Object.freeze<PreparedProductionInitialExternalGroup>({
    [operationIdentity]: true,
    kind: "initialExternalGroup",
  });
}

export async function prepareOwnedOnboardingUserAsync(state: OwnedOnboardingRequestState) {
  const source = await state.readSourceJsonAsync();
  return prepareOwnedOnboardingUserInputAsync(state, source);
}

export async function prepareOwnedOnboardingUserInputAsync(state: OwnedOnboardingRequestState, input: unknown) {
  const source = onboardingOwnRecord(input);
  if (Object.keys(source).some((key) => !["username", "password", "confirmPassword", "email"].includes(key)))
    throw new ProductionOnboardingError();
  const validated = userInitSchema.parse(source);
  state.check();
  const password = await state.ledger.run("onboarding-hash", () => hashPasswordAsync(validated.password));
  state.check();
  let email: string | null = null;
  if (validated.email !== undefined) email = validated.email;
  return Object.freeze({
    userRow: Object.freeze({ id: createId(), name: validated.username, email, password }),
    groupId: createId(),
  });
}

export async function prepareOwnedInitialExternalGroupAsync(state: OwnedOnboardingRequestState) {
  const source = await state.readSourceJsonAsync();
  return prepareOwnedInitialExternalGroupInput(state, source);
}

export function prepareOwnedInitialExternalGroupInput(state: OwnedOnboardingRequestState, input: unknown) {
  const source = onboardingOwnRecord(input);
  if (Object.keys(source).some((key) => key !== "name")) throw new ProductionOnboardingError();
  const validated = groupCreateSchema.parse(source);
  state.check();
  return Object.freeze({ groupId: createId(), name: validated.name });
}

export function captureOwnedOnboardingStep(input: unknown): OnboardingStepWitness {
  const row = onboardingOwnRecord(input);
  const id = boundedText(row.id, 64);
  const step = boundedText(row.step, 64);
  let previousStep: string | null = null;
  if (row.previousStep !== null) previousStep = boundedText(row.previousStep, 64);
  const steps = ["start", "user", "group", "setup", "finish", "settings", "integrations"];
  if (!steps.includes(step) || (previousStep !== null && !steps.includes(previousStep)))
    throw new ProductionOnboardingError();
  return Object.freeze({ id, step, previousStep });
}

export function prepareOwnedOnboardingClaimOutput(
  result: OnboardingClaimResult,
  state: OwnedOnboardingRequestState,
): ProductionOnboardingClaimOutput {
  const row = onboardingOwnRecord(result);
  let output: ProductionOnboardingClaimOutput;
  if (row.status === "issued" || row.status === "active") {
    if (Object.keys(row).length !== 3) throw new ProductionOnboardingError();
    const token = boundedText(row.token, 512);
    if (
      typeof row.expiresAt !== "number" ||
      !Number.isSafeInteger(row.expiresAt) ||
      row.expiresAt < 0 ||
      row.expiresAt > 8_640_000_000_000_000
    )
      throw new ProductionOnboardingError();
    state.tighten(row.expiresAt - state.configuration.maximumAbsoluteClockSkewMs);
    const attributes = ["Path=/", "HttpOnly", "SameSite=Lax", `Expires=${new Date(row.expiresAt).toUTCString()}`];
    if (state.configuration.origin.cookies.useSecureCookies) attributes.push("Secure");
    output = Object.freeze({
      status: row.status,
      expiresAt: row.expiresAt,
      setCookie: `homarr-onboarding-claim=${encodeURIComponent(token)}; ${attributes.join("; ")}`,
    });
  } else if (row.status === "locked") {
    if (
      Object.keys(row).length !== 2 ||
      typeof row.expiresAt !== "number" ||
      !Number.isSafeInteger(row.expiresAt) ||
      row.expiresAt < 0 ||
      row.expiresAt > 8_640_000_000_000_000
    )
      throw new ProductionOnboardingError();
    output = Object.freeze({ status: "locked", expiresAt: row.expiresAt });
  } else {
    if (Object.keys(row).length !== 1 || (row.status !== "finished" && row.status !== "forbidden"))
      throw new ProductionOnboardingError();
    output = Object.freeze({ status: row.status });
  }
  if (Buffer.byteLength(JSON.stringify(output), "utf8") > state.configuration.policy.maximumResponseBytes)
    throw new ProductionOnboardingError();
  state.admitMutation();
  return output;
}
