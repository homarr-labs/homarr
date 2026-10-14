import {
  assertProductionOnboardingRpcFrame,
  captureProductionOnboardingCsrfRequest,
  captureProductionOnboardingRequest,
  createProductionOnboardingRpcFrame,
  disposeProductionOnboardingCsrfRequestAsync,
  disposeProductionOnboardingRequestAsync,
  getProductionOnboardingRequestBounds,
  getProductionSessionRequestReader,
  prepareProductionOnboardingClaimAsync,
  prepareProductionOnboardingCsrfAsync,
  readProductionOnboardingRpcPacketAsync,
  readProductionOnboardingPublication,
  readProductionSessionRequestUserAsync,
  readSingleCookie,
  settleProductionOnboardingPublicationAsync,
} from "@homarr/auth/nitro/production-sessions";
import type {
  IssuerOperationBounds,
  PreparedProductionOnboardingClaim,
  ProductionOnboardingCsrfOutput,
  ProductionOnboardingCsrfRequest,
  ProductionOnboardingRpcCommand,
  ProductionOnboardingRpcInputSource,
  ProductionOnboardingRpcPacket,
  ProductionOnboardingPolicy,
  ProductionOnboardingRequest,
  ProductionOnboardingPublication,
  ProductionSessionRequestConfiguration,
  ProductionSessionRequestUser,
  ProductionSqlSessionIssuer,
} from "@homarr/auth/nitro/production-sessions";
import {
  assertAuthorized,
  enforceMutationMode,
  requireAuthenticated,
  requireGlobalPermission,
} from "@homarr/auth/nitro/policy";
import { sessionTokenCookieName } from "@homarr/auth/nitro/session-primitives";
import type {
  SqlAuthorityAdmission,
  SqlAuthorityOperation,
  SqlAuthorityReadLease,
} from "@homarr/auth/nitro/sql-authority";
import type {
  AccessDecision,
  AccessRequirement,
  OnboardingRequestCarrier,
  OnboardingRequestCommand,
  Principal,
  RequestContext,
  RequestServices,
  SetupState,
} from "@homarr/contracts/request";
import { groupPermissionKeys } from "@homarr/definitions";
import type { GroupPermissionKey } from "@homarr/definitions";
import type { BackendContext } from "@homarr/api/nitro/context";
import { createSetupBackedContext } from "@homarr/api/nitro/resources/setup-read";
import {
  assertOnboardingRpcInputProducer,
  createOnboardingRpcRequestController,
} from "@homarr/api/nitro/assembly/onboarding-wire";
import type {
  OwnedOnboardingRpcRequestBinding,
  OnboardingRpcRequestResult,
} from "@homarr/api/nitro/assembly/onboarding-wire";
import { eq } from "@homarr/db";
import { TransactionCommitAmbiguousError } from "@homarr/db/runtime";

import { assertApplicationOnboardingRequestContext } from "../application";
import type { prepareAuthenticatedRpcRequestAsync } from "./authenticated-rpc";
import type {
  FixedWriteLeaf,
  FixedWriteRequestBinding,
  MainFixedWriteDispatch,
  MainOnboardingScopeResources,
  MainOnboardingScope,
  OwnedOnboardingBackendRequest,
} from "./contracts";

type FixedPreparation = Awaited<ReturnType<typeof prepareAuthenticatedRpcRequestAsync>>;
type FixedSettlement<Value> =
  | { kind: "not-forwarded" }
  | { kind: "pending" }
  | { kind: "fulfilled"; value: Value }
  | { kind: "rejected"; error: unknown }
  | { kind: "ambiguous"; error: TransactionCommitAmbiguousError };

interface FixedWriteRecord {
  readonly completion: Promise<unknown>;
  underlying: Promise<unknown> | undefined;
  settlement: FixedSettlement<unknown>;
  admissionFailure: unknown;
}

interface FixedHandlerRecord {
  readonly completion: Promise<Response>;
  underlying: Promise<Response> | undefined;
  settlement: FixedSettlement<Response>;
}

interface FixedBindingEntry {
  readonly association: RequestAssociation;
  readonly context: BackendContext;
  readonly outerContext: RequestContext;
  readonly preparation: FixedPreparation;
  readonly selectedLeaf: FixedWriteLeaf;
  readonly binding: FixedWriteRequestBinding;
  handler: FixedHandlerRecord | undefined;
  write: FixedWriteRecord | undefined;
  active: boolean;
  dispatchClaimed: boolean;
  retired: boolean;
}

export type AuthenticatedReadAccess = {
  readonly action: "read";
  readonly resource: string;
  readonly policy:
    | { readonly kind: "authenticated" }
    | { readonly kind: "global-permission"; readonly permission: GroupPermissionKey };
};

export interface AuthenticatedRequestConfiguration extends ProductionSessionRequestConfiguration {
  readonly lifetime: AbortSignal;
  readonly requestDeadlineMs: number;
  readonly demo: { readonly enabled: boolean; readonly readOnly: boolean };
  readonly readAccess: readonly AuthenticatedReadAccess[];
}

type AdmissionContext = Parameters<RequestServices["resolvePrincipal"]>[0];
type OnboardingStartContext = Parameters<NonNullable<RequestServices["captureOnboardingRequest"]>>[0];

const onboardingRequestDescriptors: readonly {
  readonly command: OnboardingRequestCommand;
  readonly method: "GET" | "POST";
  readonly path: string;
}[] = Object.freeze([
  Object.freeze({ command: "claim", method: "GET", path: "/api/onboarding/claim" }),
  Object.freeze({ command: "claim", method: "POST", path: "/api/onboarding/claim" }),
  Object.freeze({ command: "nextStep", method: "POST", path: "/rpc/onboard/nextStep" }),
  Object.freeze({ command: "initUser", method: "POST", path: "/rpc/user/initUser" }),
  Object.freeze({ command: "initialExternalGroup", method: "POST", path: "/rpc/group/createInitialExternalGroup" }),
]);

interface OnboardingCaptureRetirement {
  readonly completion: Promise<void>;
  underlying: Promise<void> | undefined;
  settlement:
    | { readonly kind: "registered" }
    | { readonly kind: "pending" }
    | { readonly kind: "fulfilled" }
    | { readonly kind: "rejected"; readonly error: unknown };
}

interface OnboardingCaptureBase {
  readonly context: OnboardingStartContext;
  readonly requestSignal: AbortSignal;
  readonly issuer: ProductionSqlSessionIssuer;
  readonly policy: ProductionOnboardingPolicy;
  readonly resourceLifetime: AbortSignal;
  readonly carrier: OnboardingRequestCarrier;
  principal: Principal | undefined;
  principalTask: Promise<Principal> | undefined;
  authPrimary: { readonly kind: "none" } | { readonly kind: "failed"; readonly error: unknown };
  retired: boolean;
  retirement: OnboardingCaptureRetirement | undefined;
}

type OnboardingRequestCapture = OnboardingCaptureBase &
  (
    | {
        readonly kind: "post";
        readonly handle: ProductionOnboardingRequest;
        packet: Promise<ProductionOnboardingRpcPacket> | undefined;
        claim: Promise<PreparedProductionOnboardingClaim> | undefined;
      }
    | {
        readonly kind: "get";
        readonly handle: ProductionOnboardingCsrfRequest;
        csrf: Promise<ProductionOnboardingCsrfOutput> | undefined;
      }
  );

interface OnboardingBackendRecord {
  readonly capture: Extract<OnboardingRequestCapture, { kind: "post" }>;
  readonly outer: RequestContext;
  readonly context: BackendContext;
  readonly packet: ProductionOnboardingRpcPacket;
  readonly source: ProductionOnboardingRpcInputSource;
  readonly command: ProductionOnboardingRpcCommand;
  readonly scope: MainOnboardingScope;
  binding: OwnedOnboardingRpcRequestBinding | undefined;
}

interface RequestAssociation {
  readonly context: AdmissionContext;
  readonly lease: SqlAuthorityReadLease;
  readonly operation: SqlAuthorityOperation;
  readonly reads: Set<Promise<ProductionSessionRequestUser>>;
  readonly writes: Set<Promise<unknown>>;
  readonly handlers: Set<Promise<Response>>;
  readonly bindings: Set<FixedBindingEntry>;
  readonly cleanupFailures: unknown[];
  readonly onboarding?: Extract<OnboardingRequestCapture, { kind: "post" }>;
  fixedBindingRegistered: boolean;
  principal: Principal | undefined;
  releasing: Promise<void> | undefined;
}

interface HttpPreflightRecord {
  readonly completion: Promise<void>;
  underlying: Promise<void> | undefined;
  settlement:
    | { kind: "registered" }
    | { kind: "pending" }
    | { kind: "fulfilled" }
    | { kind: "rejected"; error: unknown };
}

interface HttpRequestCapture {
  readonly context: AdmissionContext;
  readonly principal: Principal;
  readonly originalOperation: SqlAuthorityOperation;
  readonly bounds: IssuerOperationBounds;
  readonly channel: "browser" | "api-key";
  readonly association: RequestAssociation | undefined;
  preflight: HttpPreflightRecord | undefined;
  retired: boolean;
}

export class AuthenticatedRequestReadError extends Error {
  readonly code = "AUTHENTICATED_REQUEST_READ_UNAVAILABLE";

  constructor() {
    super("Authenticated request read unavailable");
    this.name = "AuthenticatedRequestReadError";
  }
}

export function createAuthenticatedRequestResources(options: {
  readonly issuer: ProductionSqlSessionIssuer;
  readonly onboardingPolicy: ProductionOnboardingPolicy;
  readonly configuration: AuthenticatedRequestConfiguration;
  readonly fixedDispatch: MainFixedWriteDispatch;
  readonly onboarding: MainOnboardingScopeResources & { readonly source: ProductionOnboardingRpcInputSource };
}) {
  const issuer = options.issuer;
  const onboardingPolicy = options.onboardingPolicy;
  const onboarding: MainOnboardingScopeResources = Object.freeze({ reserveScope: options.onboarding.reserveScope });
  const inputSource = options.onboarding.source;
  assertOnboardingRpcInputProducer(inputSource);
  const fixedDispatch: MainFixedWriteDispatch = Object.freeze({
    dispatchBoardPermissionsAsync: options.fixedDispatch.dispatchBoardPermissionsAsync,
    dispatchAppCreateAsync: options.fixedDispatch.dispatchAppCreateAsync,
  });
  const reader = getProductionSessionRequestReader(issuer);
  const input = options.configuration;
  const pinned = issuer.requestConfiguration;
  const readAccess = input.readAccess.map((rule): AuthenticatedReadAccess => {
    if (
      rule.action !== "read" ||
      !/^[a-zA-Z0-9][a-zA-Z0-9:._/-]*$/.test(rule.resource) ||
      (rule.policy.kind !== "authenticated" && rule.policy.kind !== "global-permission")
    )
      throw new AuthenticatedRequestReadError();
    if (rule.policy.kind === "global-permission") {
      const permission = rule.policy.permission;
      if (!groupPermissionKeys.includes(permission)) throw new AuthenticatedRequestReadError();
      return Object.freeze({
        action: "read",
        resource: rule.resource,
        policy: Object.freeze({ kind: "global-permission", permission }),
      });
    }
    return Object.freeze({
      action: "read",
      resource: rule.resource,
      policy: Object.freeze({ kind: "authenticated" }),
    });
  });
  const configuration: AuthenticatedRequestConfiguration = Object.freeze({
    externalOrigin: input.externalOrigin,
    cookies: Object.freeze({ prefix: input.cookies.prefix, useSecureCookies: input.cookies.useSecureCookies }),
    providers: Object.freeze([...input.providers]),
    now: input.now,
    lifetime: input.lifetime,
    requestDeadlineMs: input.requestDeadlineMs,
    demo: Object.freeze({ enabled: input.demo.enabled, readOnly: input.demo.readOnly }),
    readAccess: Object.freeze(readAccess),
  });
  const originUrl = new URL(configuration.externalOrigin);
  const onboardingBaseUrl: `${string}://${string}` = `${originUrl.protocol.slice(0, -1)}://${originUrl.host}`;
  if (
    onboardingBaseUrl !== configuration.externalOrigin ||
    (originUrl.protocol !== "http:" && originUrl.protocol !== "https:") ||
    originUrl.username ||
    originUrl.password ||
    originUrl.pathname !== "/" ||
    originUrl.search ||
    originUrl.hash
  )
    throw new AuthenticatedRequestReadError();
  for (const key of [
    "demoEnabled",
    "readOnly",
    "requestBudgetMs",
    "maximumCookieBytes",
    "maximumCredentialBytes",
    "maximumResponseBytes",
  ]) {
    const descriptor = Object.getOwnPropertyDescriptor(onboardingPolicy, key);
    if (!descriptor || !("value" in descriptor)) throw new AuthenticatedRequestReadError();
  }
  if (
    configuration.externalOrigin !== pinned.externalOrigin ||
    configuration.cookies.prefix !== pinned.cookies.prefix ||
    configuration.cookies.useSecureCookies !== pinned.cookies.useSecureCookies ||
    configuration.now !== pinned.now ||
    configuration.providers.length !== pinned.providers.length ||
    configuration.providers.some((provider, index) => provider !== pinned.providers[index]) ||
    !Number.isSafeInteger(configuration.requestDeadlineMs) ||
    configuration.requestDeadlineMs <= 0 ||
    configuration.requestDeadlineMs > 2_147_483_647 ||
    typeof configuration.demo.enabled !== "boolean" ||
    typeof configuration.demo.readOnly !== "boolean" ||
    new Set(readAccess.map((rule) => rule.resource)).size !== readAccess.length ||
    !Object.isFrozen(onboardingPolicy) ||
    onboardingPolicy.demoEnabled !== configuration.demo.enabled ||
    onboardingPolicy.readOnly !== configuration.demo.readOnly ||
    onboardingPolicy.requestBudgetMs !== configuration.requestDeadlineMs ||
    onboardingPolicy.maximumCookieBytes !== 16_384 ||
    onboardingPolicy.maximumCredentialBytes !== 4096 ||
    onboardingPolicy.maximumResponseBytes !== 4096
  )
    throw new AuthenticatedRequestReadError();
  if (configuration.lifetime.aborted) throw new AuthenticatedRequestReadError();
  const controller = new AbortController();
  const lifetime = AbortSignal.any([configuration.lifetime, controller.signal]);
  const principals = new WeakMap<Principal, RequestAssociation>();
  const httpPrincipals = new WeakMap<Principal, HttpRequestCapture>();
  const httpCaptures = new Set<HttpRequestCapture>();
  const httpPreflightContexts = new WeakSet<RequestContext>();
  const fixedBindings = new WeakMap<BackendContext, FixedBindingEntry>();
  const associations = new Set<RequestAssociation>();
  const pending = new Set<Promise<unknown>>();
  const onboardingRequests = new WeakSet<Request>();
  const onboardingCarriers = new WeakMap<OnboardingRequestCarrier, OnboardingRequestCapture>();
  const onboardingCaptures = new Set<OnboardingRequestCapture>();
  const onboardingBackends = new WeakMap<BackendContext, OnboardingBackendRecord>();
  const onboardingFactories = new WeakSet<RequestContext>();
  const onboardingAdmissions = new WeakMap<AbortSignal, Map<string, OnboardingRequestCapture>>();
  const failures = new WeakMap<AuthenticatedRequestReadError, readonly unknown[]>();
  let closing: Promise<void> | undefined;

  function failure(primary: unknown, cleanup?: unknown): AuthenticatedRequestReadError {
    const error = new AuthenticatedRequestReadError();
    const causes = [primary];
    if (cleanup !== undefined) causes.push(cleanup);
    failures.set(error, Object.freeze(causes));
    return error;
  }

  function assertOpen(): void {
    if (closing !== undefined || lifetime.aborted) throw new AuthenticatedRequestReadError();
  }

  function disposeOnboardingCapture(capture: OnboardingRequestCapture): Promise<void> {
    if (capture.retirement) return capture.retirement.completion;
    capture.retired = true;
    const completion = Promise.withResolvers<void>();
    const record: OnboardingCaptureRetirement = {
      completion: completion.promise,
      underlying: undefined,
      settlement: { kind: "registered" },
    };
    capture.retirement = record;
    pending.add(completion.promise);
    void completion.promise.catch(() => undefined);
    const task = Promise.resolve().then(() => {
      record.settlement = { kind: "pending" };
      if (capture.kind === "get")
        record.underlying = disposeProductionOnboardingCsrfRequestAsync(
          issuer,
          capture.handle,
          capture.context.request,
        );
      else record.underlying = disposeProductionOnboardingRequestAsync(issuer, capture.handle, capture.context.request);
      return record.underlying;
    });
    void task.then(
      () => {
        record.settlement = { kind: "fulfilled" };
        onboardingCaptures.delete(capture);
        pending.delete(completion.promise);
        completion.resolve();
      },
      (error: unknown) => {
        record.settlement = { kind: "rejected", error };
        onboardingCaptures.delete(capture);
        pending.delete(completion.promise);
        if (capture.authPrimary.kind === "failed" && Object.is(error, capture.authPrimary.error)) completion.resolve();
        else completion.reject(error);
      },
    );
    return completion.promise;
  }

  function retireOnboardingCaptures(): void {
    for (const capture of onboardingCaptures) void disposeOnboardingCapture(capture).catch(() => undefined);
  }

  lifetime.addEventListener("abort", retireOnboardingCaptures, { once: true });

  function captureOnboardingRequest(context: OnboardingStartContext): OnboardingRequestCarrier | undefined {
    const url = new URL(context.request.url);
    const descriptor = onboardingRequestDescriptors.find(
      (candidate) => candidate.method === context.request.method && candidate.path === url.pathname,
    );
    if (!descriptor) return undefined;
    assertOpen();
    const host = context.request.headers.get("host");
    if (
      url.origin !== configuration.externalOrigin ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      (host !== null && host !== url.host) ||
      context.lifetime.aborted ||
      onboardingRequests.has(context.request)
    )
      throw new AuthenticatedRequestReadError();
    let admissions = onboardingAdmissions.get(context.signal);
    if (!admissions) {
      admissions = new Map();
      onboardingAdmissions.set(context.signal, admissions);
    }
    if (admissions.has(context.requestId)) throw new AuthenticatedRequestReadError();
    onboardingRequests.add(context.request);
    const captured: OnboardingStartContext = Object.freeze({
      request: context.request,
      requestId: context.requestId,
      signal: context.signal,
      onDispose: context.onDispose,
      lifetime: context.lifetime,
    });
    const carrier: OnboardingRequestCarrier = Object.freeze({
      command: descriptor.command,
      disposeAsync() {
        return disposeOnboardingCapture(capture);
      },
    });
    const base: OnboardingCaptureBase = {
      context: captured,
      requestSignal: captured.request.signal,
      issuer,
      policy: onboardingPolicy,
      resourceLifetime: lifetime,
      carrier,
      principal: undefined,
      principalTask: undefined,
      authPrimary: { kind: "none" },
      retired: false,
      retirement: undefined,
    };
    let capture: OnboardingRequestCapture;
    if (descriptor.method === "GET") {
      capture = {
        ...base,
        kind: "get",
        handle: captureProductionOnboardingCsrfRequest(
          issuer,
          captured.request,
          captured.requestId,
          captured.signal,
          captured.lifetime,
        ),
        csrf: undefined,
      };
    } else {
      capture = {
        ...base,
        kind: "post",
        handle: captureProductionOnboardingRequest(
          issuer,
          captured.request,
          captured.requestId,
          captured.signal,
          captured.lifetime,
        ),
        packet: undefined,
        claim: undefined,
      };
    }
    onboardingCarriers.set(carrier, capture);
    onboardingCaptures.add(capture);
    admissions.set(captured.requestId, capture);
    return carrier;
  }

  function onboardingCaptureFor(
    context: AdmissionContext,
    command?: OnboardingRequestCommand,
  ): OnboardingRequestCapture {
    assertOpen();
    const carrier = context.onboardingRequest;
    const capture = carrier && onboardingCarriers.get(carrier);
    if (
      !capture ||
      capture.retired ||
      capture.retirement ||
      !onboardingCaptures.has(capture) ||
      capture.carrier !== carrier ||
      (command !== undefined && carrier.command !== command) ||
      capture.issuer !== issuer ||
      capture.policy !== onboardingPolicy ||
      capture.resourceLifetime !== lifetime ||
      capture.context.request !== context.request ||
      capture.requestSignal !== context.request.signal ||
      capture.context.requestId !== context.requestId ||
      capture.context.signal !== context.signal ||
      capture.context.onDispose !== context.onDispose
    )
      throw new AuthenticatedRequestReadError();
    capture.context.lifetime.throwIfAborted();
    capture.context.signal.throwIfAborted();
    capture.requestSignal.throwIfAborted();
    return capture;
  }

  function finalOnboardingCapture(
    context: RequestContext,
    command: OnboardingRequestCommand,
  ): OnboardingRequestCapture {
    const capture = onboardingCaptureFor(context, command);
    assertApplicationOnboardingRequestContext(context, capture.carrier);
    if (context.principal !== capture.principal) throw new AuthenticatedRequestReadError();
    return capture;
  }

  function prepareOnboardingPrelude(capture: OnboardingRequestCapture): Promise<unknown> {
    if (capture.kind === "get") {
      if (!capture.csrf) {
        capture.csrf = Promise.resolve().then(() =>
          prepareProductionOnboardingCsrfAsync(issuer, capture.handle, capture.context.request),
        );
        const task = capture.csrf;
        pending.add(task);
        void task.then(
          () => pending.delete(task),
          (error: unknown) => {
            capture.authPrimary = { kind: "failed", error };
            pending.delete(task);
          },
        );
      }
      return capture.csrf;
    }
    if (capture.carrier.command === "claim") {
      if (!capture.claim) {
        capture.claim = Promise.resolve().then(() =>
          prepareProductionOnboardingClaimAsync(issuer, capture.handle, capture.context.request),
        );
        const task = capture.claim;
        pending.add(task);
        void task.then(
          () => pending.delete(task),
          (error: unknown) => {
            capture.authPrimary = { kind: "failed", error };
            pending.delete(task);
          },
        );
      }
      return capture.claim;
    }
    if (!capture.packet) {
      capture.packet = Promise.resolve().then(() =>
        readProductionOnboardingRpcPacketAsync(issuer, capture.handle, capture.context.request),
      );
      const task = capture.packet;
      pending.add(task);
      void task.then(
        () => pending.delete(task),
        (error: unknown) => {
          capture.authPrimary = { kind: "failed", error };
          pending.delete(task);
        },
      );
    }
    return capture.packet;
  }

  function resolveOnboardingPrincipalAsync(context: AdmissionContext): Promise<Principal> {
    const capture = onboardingCaptureFor(context);
    if (capture.principalTask) throw new AuthenticatedRequestReadError();
    const completion = Promise.withResolvers<Principal>();
    capture.principalTask = completion.promise;
    pending.add(completion.promise);
    void completion.promise.catch(() => undefined);
    const resolve = async (): Promise<Principal> => {
      await prepareOnboardingPrelude(capture);
      if (onboardingCaptureFor(context) !== capture) throw new AuthenticatedRequestReadError();
      if (capture.kind === "get") {
        const principal: Principal = Object.freeze({ kind: "anonymous" });
        capture.principal = principal;
        return principal;
      }
      const operation = getProductionOnboardingRequestBounds(issuer, capture.handle, context.request);
      const apiKey = context.request.headers.get("ApiKey");
      let admission: SqlAuthorityAdmission;
      if (apiKey !== null) admission = await reader.admitApiKeyAsync(apiKey, operation);
      else
        admission = await reader.admitOpaqueSessionAsync(
          readSingleCookie(context.request, sessionTokenCookieName(configuration.cookies.prefix)),
          operation,
        );
      try {
        if (onboardingCaptureFor(context) !== capture) throw new AuthenticatedRequestReadError();
        getProductionOnboardingRequestBounds(issuer, capture.handle, context.request);
        if (admission.type === "anonymous") {
          const principal: Principal = Object.freeze({ kind: "anonymous" });
          capture.principal = principal;
          return principal;
        }
      } catch (error: unknown) {
        if (admission.type !== "anonymous") {
          try {
            await admission.lease.releaseAsync();
          } catch (cleanup: unknown) {
            throw failure(error, cleanup);
          }
        }
        throw error;
      }
      const lease = admission.lease;
      let deadlineAt = operation.deadlineAt;
      if (lease.validity.type === "stored-session-expiry")
        deadlineAt = Math.min(deadlineAt, lease.validity.hostDeadlineAt);
      const association: RequestAssociation = {
        context: capture.context,
        lease,
        operation: Object.freeze({ signal: operation.signal, deadlineAt }),
        onboarding: capture,
        reads: new Set(),
        writes: new Set(),
        handlers: new Set(),
        bindings: new Set(),
        cleanupFailures: [],
        fixedBindingRegistered: false,
        principal: undefined,
        releasing: undefined,
      };
      associations.add(association);
      try {
        context.onDispose(() => release(association));
        const user = await readUser(association);
        assertAssociation(association);
        const principal: Principal = Object.freeze({ kind: "authenticated", subject: user.id });
        association.principal = principal;
        principals.set(principal, association);
        capture.principal = principal;
        return principal;
      } catch (error: unknown) {
        try {
          await release(association);
        } catch (cleanup: unknown) {
          throw failure(error, cleanup);
        }
        throw error;
      }
    };
    void Promise.resolve()
      .then(resolve)
      .then(
        (principal) => {
          pending.delete(completion.promise);
          completion.resolve(principal);
        },
        (error: unknown) => {
          pending.delete(completion.promise);
          completion.reject(error);
        },
      );
    return completion.promise;
  }

  function assertAssociation(association: RequestAssociation): void {
    assertOpen();
    if (association.onboarding)
      getProductionOnboardingRequestBounds(issuer, association.onboarding.handle, association.context.request);
    const now = configuration.now();
    if (
      association.releasing !== undefined ||
      association.lease.lifetime.aborted ||
      association.operation.signal.aborted ||
      !Number.isSafeInteger(now) ||
      now >= association.operation.deadlineAt ||
      Date.now() >= association.operation.deadlineAt
    )
      throw new AuthenticatedRequestReadError();
  }

  function trackRead<T>(read: () => Promise<T>): Promise<T> {
    assertOpen();
    const task = Promise.resolve().then(() => {
      assertOpen();
      return read().catch((error: unknown) => {
        throw failure(error);
      });
    });
    pending.add(task);
    void task.then(
      () => pending.delete(task),
      () => pending.delete(task),
    );
    return task;
  }

  function release(association: RequestAssociation): Promise<void> {
    if (association.releasing) return association.releasing;
    const completion = Promise.withResolvers<void>();
    association.releasing = completion.promise;
    if (association.principal) {
      const capture = httpPrincipals.get(association.principal);
      if (capture) retireHttpCapture(capture);
      principals.delete(association.principal);
    }
    const reads = [...association.reads];
    const task = Promise.resolve().then(async () => {
      await Promise.allSettled([...association.handlers, ...association.writes, ...reads]);
      try {
        await association.lease.releaseAsync();
      } catch (error) {
        association.cleanupFailures.push(error);
        throw error;
      } finally {
        for (const entry of association.bindings) entry.retired = true;
        association.bindings.clear();
      }
    });
    void task.then(
      () => {
        associations.delete(association);
        completion.resolve();
      },
      (error: unknown) => completion.reject(failure(error)),
    );
    return completion.promise;
  }

  function readUser(association: RequestAssociation): Promise<ProductionSessionRequestUser> {
    assertAssociation(association);
    const task = Promise.resolve().then(async () => {
      assertAssociation(association);
      const user = await readProductionSessionRequestUserAsync(issuer, association.lease, association.operation);
      assertAssociation(association);
      if (user.id !== association.lease.identity.userId || !configuration.providers.includes(user.provider))
        throw new AuthenticatedRequestReadError();
      return user;
    });
    association.reads.add(task);
    void task.then(
      () => association.reads.delete(task),
      () => association.reads.delete(task),
    );
    return task;
  }

  function associationFor(context: RequestContext): RequestAssociation {
    const association = principals.get(context.principal);
    if (
      !association ||
      context.principal.kind !== "authenticated" ||
      context.request !== association.context.request ||
      context.requestId !== association.context.requestId ||
      context.signal !== association.context.signal ||
      context.onDispose !== association.context.onDispose
    )
      throw new AuthenticatedRequestReadError();
    assertAssociation(association);
    return association;
  }

  function retireHttpCapture(capture: HttpRequestCapture): void {
    capture.retired = true;
    httpPrincipals.delete(capture.principal);
    httpCaptures.delete(capture);
  }

  function assertHttpCapture(capture: HttpRequestCapture): void {
    assertOpen();
    const now = configuration.now();
    if (
      capture.retired ||
      httpPrincipals.get(capture.principal) !== capture ||
      capture.context.signal.aborted ||
      capture.context.request.signal.aborted ||
      capture.originalOperation.signal.aborted ||
      capture.bounds.signal !== capture.originalOperation.signal ||
      capture.bounds.lifetime !== lifetime ||
      capture.bounds.lifetime.aborted ||
      !Number.isSafeInteger(capture.bounds.deadlineAt) ||
      capture.bounds.deadlineAt > capture.originalOperation.deadlineAt ||
      !Number.isSafeInteger(now) ||
      now >= capture.bounds.deadlineAt ||
      Date.now() >= capture.bounds.deadlineAt
    )
      throw new AuthenticatedRequestReadError();
  }

  function registerHttpCapture(
    principal: Principal,
    context: AdmissionContext,
    operation: SqlAuthorityOperation,
    apiKeyPresent: boolean,
    association?: RequestAssociation,
  ): void {
    let deadlineAt = operation.deadlineAt;
    if (association) deadlineAt = association.operation.deadlineAt;
    let channel: HttpRequestCapture["channel"] = "browser";
    if (apiKeyPresent) channel = "api-key";
    const capture: HttpRequestCapture = {
      context,
      principal,
      originalOperation: operation,
      bounds: Object.freeze({ signal: operation.signal, lifetime, deadlineAt }),
      channel,
      association,
      preflight: undefined,
      retired: false,
    };
    httpPrincipals.set(principal, capture);
    httpCaptures.add(capture);
    try {
      context.onDispose(() => retireHttpCapture(capture));
      assertHttpCapture(capture);
      if (association) assertAssociation(association);
    } catch (error) {
      retireHttpCapture(capture);
      throw error;
    }
  }

  function httpCaptureFor(context: RequestContext): HttpRequestCapture {
    const capture = httpPrincipals.get(context.principal);
    if (
      !capture ||
      context.principal !== capture.principal ||
      context.request !== capture.context.request ||
      context.requestId !== capture.context.requestId ||
      context.signal !== capture.context.signal ||
      context.onDispose !== capture.context.onDispose ||
      capture.channel !== "browser" ||
      context.request.headers.get("ApiKey") !== null
    )
      throw new AuthenticatedRequestReadError();
    return capture;
  }

  function assertHttpAdmission(capture: HttpRequestCapture): void {
    assertHttpCapture(capture);
    if (capture.channel !== "browser") throw new AuthenticatedRequestReadError();
    const association = capture.association;
    if (!association) {
      if (capture.principal.kind !== "anonymous") throw new AuthenticatedRequestReadError();
      return;
    }
    if (
      capture.principal.kind !== "authenticated" ||
      principals.get(capture.principal) !== association ||
      association.principal !== capture.principal ||
      association.context !== capture.context ||
      association.operation.signal !== capture.bounds.signal ||
      association.operation.deadlineAt !== capture.bounds.deadlineAt ||
      association.lease.credentialType !== "opaque-session"
    )
      throw new AuthenticatedRequestReadError();
    assertAssociation(association);
  }

  function admitHttpRequestAsync(context: RequestContext): Promise<void> {
    if (httpPreflightContexts.has(context)) throw new AuthenticatedRequestReadError();
    httpPreflightContexts.add(context);
    const capture = httpCaptureFor(context);
    if (capture.preflight) throw new AuthenticatedRequestReadError();
    const completion = Promise.withResolvers<void>();
    const record: HttpPreflightRecord = {
      completion: completion.promise,
      underlying: undefined,
      settlement: { kind: "registered" },
    };
    capture.preflight = record;
    pending.add(completion.promise);
    void completion.promise.catch(() => undefined);
    const task = Promise.resolve().then(async () => {
      if (httpCaptureFor(context) !== capture) throw new AuthenticatedRequestReadError();
      assertHttpAdmission(capture);
      const association = capture.association;
      if (association) await association.lease.assertCurrentAsync(association.operation);
      if (httpCaptureFor(context) !== capture) throw new AuthenticatedRequestReadError();
      assertHttpAdmission(capture);
    });
    record.underlying = task;
    record.settlement = { kind: "pending" };
    void task.then(
      () => {
        record.settlement = { kind: "fulfilled" };
        pending.delete(completion.promise);
        completion.resolve();
      },
      (error: unknown) => {
        record.settlement = { kind: "rejected", error };
        pending.delete(completion.promise);
        completion.reject(failure(error));
      },
    );
    return completion.promise;
  }

  function assertFixedPolicy(association: RequestAssociation, leaf: FixedWriteLeaf): void {
    assertAssociation(association);
    assertAuthorized(
      enforceMutationMode(
        { demoMode: configuration.demo.enabled, demoReadOnly: configuration.demo.readOnly },
        "mutation",
      ),
    );
    assertAuthorized(requireAuthenticated(association.lease.identity));
    if (leaf === "app.create") assertAuthorized(requireGlobalPermission(association.lease.identity, "app-create"));
  }

  function sameBackendUser(
    observed: ProductionSessionRequestUser,
    candidate: Extract<BackendContext["principal"], { kind: "authenticated" }>["user"],
  ): boolean {
    return (
      candidate.id === observed.id &&
      candidate.name === observed.name &&
      candidate.email === observed.email &&
      candidate.image === observed.image &&
      candidate.colorScheme === observed.colorScheme &&
      "provider" in candidate &&
      candidate.provider === observed.provider &&
      candidate.permissions.length === observed.permissions.length &&
      candidate.permissions.every((permission, index) => permission === observed.permissions[index])
    );
  }

  function assertFixedBinding(entry: FixedBindingEntry): void {
    if (
      entry.retired ||
      fixedBindings.get(entry.context) !== entry ||
      associationFor(entry.outerContext) !== entry.association ||
      !entry.association.bindings.has(entry)
    )
      throw new AuthenticatedRequestReadError();
    entry.preparation.assertCurrent();
    assertFixedPolicy(entry.association, entry.selectedLeaf);
  }

  function registerFixedWrite<Value>(entry: FixedBindingEntry, invoke: () => Promise<Value>): Promise<Value> {
    assertFixedBinding(entry);
    if (!entry.active || entry.dispatchClaimed) throw new AuthenticatedRequestReadError();
    entry.dispatchClaimed = true;
    const completion = Promise.withResolvers<Value>();
    const record: FixedWriteRecord = {
      completion: completion.promise,
      underlying: undefined,
      settlement: { kind: "not-forwarded" },
      admissionFailure: undefined,
    };
    entry.write = record;
    entry.association.writes.add(completion.promise);
    void completion.promise.catch(() => undefined);
    void Promise.resolve().then(async () => {
      try {
        assertFixedBinding(entry);
        if (!entry.active) throw new AuthenticatedRequestReadError();
        await entry.preparation.assertCurrentAsync();
        assertFixedBinding(entry);
        if (!entry.active) throw new AuthenticatedRequestReadError();
      } catch (error) {
        record.admissionFailure = error;
        entry.association.writes.delete(completion.promise);
        completion.reject(error);
        return;
      }
      const reject = (error: unknown) => {
        if (error instanceof TransactionCommitAmbiguousError) record.settlement = { kind: "ambiguous", error };
        else record.settlement = { kind: "rejected", error };
        entry.association.writes.delete(completion.promise);
        completion.reject(error);
      };
      try {
        record.settlement = { kind: "pending" };
        const underlying = invoke();
        record.underlying = underlying;
        void underlying.then((value) => {
          record.settlement = { kind: "fulfilled", value };
          entry.association.writes.delete(completion.promise);
          completion.resolve(value);
        }, reject);
      } catch (error) {
        reject(error);
      }
    });
    return completion.promise;
  }

  async function bindFixedWriteBackendAsync(
    outerContext: RequestContext,
    finalBackend: BackendContext,
    preparation: FixedPreparation,
    selectedLeaf: FixedWriteLeaf,
  ): Promise<FixedWriteRequestBinding> {
    const association = associationFor(outerContext);
    if (
      (selectedLeaf !== "app.create" &&
        selectedLeaf !== "board.saveUserBoardPermissions" &&
        selectedLeaf !== "board.saveGroupBoardPermissions") ||
      fixedBindings.has(finalBackend) ||
      association.fixedBindingRegistered ||
      !Object.isFrozen(finalBackend) ||
      finalBackend.request !== outerContext.request ||
      finalBackend.signal !== preparation.signal ||
      finalBackend.principal.kind !== "authenticated" ||
      finalBackend.principal === preparation.principal ||
      finalBackend.principal.user === preparation.principal.user ||
      !Object.isFrozen(finalBackend.principal) ||
      !Object.isFrozen(finalBackend.principal.user) ||
      !Object.isFrozen(finalBackend.principal.user.permissions) ||
      finalBackend.baseUrl !== configuration.externalOrigin ||
      finalBackend.demo.enabled !== configuration.demo.enabled ||
      finalBackend.demo.readOnly !== configuration.demo.readOnly ||
      !Number.isSafeInteger(preparation.deadlineAt) ||
      preparation.deadlineAt > association.operation.deadlineAt ||
      (association.lease.validity.type === "stored-session-expiry" &&
        preparation.deadlineAt > association.lease.validity.hostDeadlineAt)
    )
      throw new AuthenticatedRequestReadError();
    assertFixedPolicy(association, selectedLeaf);
    await preparation.assertCurrentAsync();
    const observed = await readUser(association);
    preparation.assertCurrent();
    if (
      associationFor(outerContext) !== association ||
      observed.id !== association.lease.identity.userId ||
      !sameBackendUser(observed, finalBackend.principal.user) ||
      !sameBackendUser(observed, preparation.principal.user) ||
      association.fixedBindingRegistered ||
      fixedBindings.has(finalBackend)
    )
      throw new AuthenticatedRequestReadError();
    const binding: FixedWriteRequestBinding = Object.freeze({
      saveBoardPermissionsAsync(mutation: Parameters<FixedWriteRequestBinding["saveBoardPermissionsAsync"]>[0]) {
        if (
          (selectedLeaf !== "board.saveUserBoardPermissions" || mutation.kind !== "replace-user") &&
          (selectedLeaf !== "board.saveGroupBoardPermissions" || mutation.kind !== "replace-group")
        )
          throw new AuthenticatedRequestReadError();
        const captured = Object.freeze({
          kind: mutation.kind,
          boardId: mutation.boardId,
          permissions: Object.freeze(
            mutation.permissions.map((permission) =>
              Object.freeze({ principalId: permission.principalId, permission: permission.permission }),
            ),
          ),
        });
        return registerFixedWrite(entry, () =>
          fixedDispatch.dispatchBoardPermissionsAsync(association.lease, association.operation, captured),
        );
      },
      createAppAsync(mutation: Parameters<FixedWriteRequestBinding["createAppAsync"]>[0]) {
        if (selectedLeaf !== "app.create" || mutation.kind !== "create") throw new AuthenticatedRequestReadError();
        const values = mutation.values;
        const captured = Object.freeze({
          kind: mutation.kind,
          values: Object.freeze({
            id: values.id,
            name: values.name,
            description: values.description,
            iconUrl: values.iconUrl,
            href: values.href,
            pingUrl: values.pingUrl,
          }),
        });
        return registerFixedWrite(entry, () =>
          fixedDispatch.dispatchAppCreateAsync(association.lease, association.operation, captured),
        );
      },
      runHandlerAsync(handle: () => Promise<Response>) {
        assertFixedBinding(entry);
        if (entry.handler) throw new AuthenticatedRequestReadError();
        const completion = Promise.withResolvers<Response>();
        const record: FixedHandlerRecord = {
          completion: completion.promise,
          underlying: undefined,
          settlement: { kind: "not-forwarded" },
        };
        entry.handler = record;
        association.handlers.add(completion.promise);
        void completion.promise.catch(() => undefined);
        const reject = (error: unknown) => {
          record.settlement = { kind: "rejected", error };
          association.handlers.delete(completion.promise);
          completion.reject(error);
        };
        void Promise.resolve().then(async () => {
          try {
            assertFixedBinding(entry);
            entry.active = true;
            record.settlement = { kind: "pending" };
            let response: Response;
            try {
              const underlying = handle();
              record.underlying = underlying;
              response = await underlying;
            } finally {
              if (entry.write) await Promise.allSettled([entry.write.completion]);
              entry.active = false;
            }
            record.settlement = { kind: "fulfilled", value: response };
            association.handlers.delete(completion.promise);
            completion.resolve(response);
          } catch (error) {
            entry.active = false;
            reject(error);
          }
        });
        return completion.promise;
      },
    });
    const entry: FixedBindingEntry = {
      association,
      context: finalBackend,
      outerContext,
      preparation,
      selectedLeaf,
      binding,
      handler: undefined,
      write: undefined,
      active: false,
      dispatchClaimed: false,
      retired: false,
    };
    association.fixedBindingRegistered = true;
    fixedBindings.set(finalBackend, entry);
    association.bindings.add(entry);
    outerContext.onDispose(() => release(association));
    assertFixedBinding(entry);
    return binding;
  }

  const services: Pick<RequestServices, "resolvePrincipal" | "authorize"> &
    Required<Pick<RequestServices, "captureOnboardingRequest">> = Object.freeze({
    captureOnboardingRequest,
    resolvePrincipal(context: AdmissionContext): Promise<Principal> {
      if (context.onboardingRequest) return resolveOnboardingPrincipalAsync(context);
      const captured = Object.freeze({
        request: context.request,
        requestId: context.requestId,
        signal: context.signal,
        onDispose: context.onDispose,
        onboardingRequest: context.onboardingRequest,
      });
      return trackRead(async () => {
        const url = new URL(captured.request.url);
        const host = captured.request.headers.get("host");
        if (
          url.origin !== configuration.externalOrigin ||
          url.username ||
          url.password ||
          (host !== null && host !== url.host)
        )
          throw new AuthenticatedRequestReadError();
        const now = configuration.now();
        const deadlineAt = now + configuration.requestDeadlineMs;
        if (!Number.isSafeInteger(now) || !Number.isSafeInteger(deadlineAt)) throw new AuthenticatedRequestReadError();
        const operation = Object.freeze({
          signal: AbortSignal.any([captured.signal, captured.request.signal, lifetime]),
          deadlineAt,
        });
        operation.signal.throwIfAborted();
        const apiKey = captured.request.headers.get("ApiKey");
        let admission: SqlAuthorityAdmission;
        try {
          if (apiKey !== null) {
            admission = await reader.admitApiKeyAsync(apiKey, operation);
          } else {
            const token = readSingleCookie(captured.request, sessionTokenCookieName(configuration.cookies.prefix));
            admission = await reader.admitOpaqueSessionAsync(token, operation);
          }
        } catch (error: unknown) {
          throw failure(error);
        }
        if (admission.type === "anonymous") {
          assertOpen();
          operation.signal.throwIfAborted();
          const principal: Principal = Object.freeze({ kind: "anonymous" });
          registerHttpCapture(principal, captured, operation, apiKey !== null);
          return principal;
        }
        const lease = admission.lease;
        let boundedDeadline = operation.deadlineAt;
        if (lease.validity.type === "stored-session-expiry")
          boundedDeadline = Math.min(boundedDeadline, lease.validity.hostDeadlineAt);
        const association: RequestAssociation = {
          context: captured,
          lease,
          operation: Object.freeze({ signal: operation.signal, deadlineAt: boundedDeadline }),
          reads: new Set(),
          writes: new Set(),
          handlers: new Set(),
          bindings: new Set(),
          cleanupFailures: [],
          fixedBindingRegistered: false,
          principal: undefined,
          releasing: undefined,
        };
        associations.add(association);
        try {
          captured.onDispose(() => release(association));
          assertAssociation(association);
          const user = await readUser(association);
          assertAssociation(association);
          const principal: Principal = Object.freeze({ kind: "authenticated", subject: user.id });
          association.principal = principal;
          principals.set(principal, association);
          registerHttpCapture(principal, captured, operation, apiKey !== null, association);
          return principal;
        } catch (error: unknown) {
          try {
            await release(association);
          } catch (cleanupError: unknown) {
            throw failure(error, cleanupError);
          }
          throw failure(error);
        }
      });
    },
    authorize(
      principal: Principal,
      requirement: Extract<AccessRequirement, { kind: "protected" }>,
      signal: AbortSignal,
    ): Promise<AccessDecision> {
      if (principal.kind === "anonymous") return Promise.resolve({ kind: "deny", status: 401 });
      const association = principals.get(principal);
      const rule = configuration.readAccess.find(
        (candidate) => requirement.action === candidate.action && requirement.resource === candidate.resource,
      );
      if (
        association &&
        signal === association.context.signal &&
        requirement.action === "write" &&
        (requirement.resource === "app.create" ||
          requirement.resource === "board.saveUserBoardPermissions" ||
          requirement.resource === "board.saveGroupBoardPermissions")
      ) {
        const leaf = requirement.resource;
        return trackRead(async (): Promise<AccessDecision> => {
          try {
            await readUser(association);
            assertFixedPolicy(association, leaf);
            return { kind: "allow" };
          } catch (error) {
            failure(error);
            return { kind: "deny", status: 403 };
          }
        });
      }
      if (!association || !rule || signal !== association.context.signal)
        return Promise.resolve({ kind: "deny", status: 403 });
      return trackRead(async (): Promise<AccessDecision> => {
        try {
          await readUser(association);
          const identity = association.lease.identity;
          assertAuthorized(
            enforceMutationMode(
              { demoMode: configuration.demo.enabled, demoReadOnly: configuration.demo.readOnly },
              "query",
            ),
          );
          if (rule.policy.kind === "authenticated") assertAuthorized(requireAuthenticated(identity));
          else assertAuthorized(requireGlobalPermission(identity, rule.policy.permission));
          assertAssociation(association);
          return { kind: "allow" };
        } catch (error: unknown) {
          failure(error);
          return { kind: "deny", status: 403 };
        }
      });
    },
  });

  function createOnboardingBackendRequestAsync(
    context: RequestContext,
    command: ProductionOnboardingRpcCommand,
  ): Promise<OwnedOnboardingBackendRequest> {
    if (command !== "nextStep" && command !== "initUser" && command !== "initialExternalGroup")
      throw new AuthenticatedRequestReadError();
    const capture = finalOnboardingCapture(context, command);
    if (capture.kind !== "post" || !capture.packet || onboardingFactories.has(context))
      throw new AuthenticatedRequestReadError();
    onboardingFactories.add(context);
    const completion = Promise.withResolvers<OwnedOnboardingBackendRequest>();
    pending.add(completion.promise);
    void completion.promise.catch(() => undefined);
    let scope: MainOnboardingScope | undefined;
    let association: RequestAssociation | undefined;
    const create = async (): Promise<OwnedOnboardingBackendRequest> => {
      if (finalOnboardingCapture(context, command) !== capture || !capture.packet)
        throw new AuthenticatedRequestReadError();
      const packet = await capture.packet;
      if (finalOnboardingCapture(context, command) !== capture) throw new AuthenticatedRequestReadError();
      getProductionOnboardingRequestBounds(issuer, capture.handle, context.request);
      let principal: BackendContext["principal"] = Object.freeze({ kind: "anonymous" });
      if (context.principal.kind === "authenticated") {
        association = associationFor(context);
        const user = await readUser(association);
        if (
          finalOnboardingCapture(context, command) !== capture ||
          user.id !== context.principal.subject ||
          !configuration.providers.includes(user.provider)
        )
          throw new AuthenticatedRequestReadError();
        principal = Object.freeze({ kind: "authenticated", user });
      }
      getProductionOnboardingRequestBounds(issuer, capture.handle, context.request);
      const reservation = onboarding.reserveScope(context, capture.handle, completion.promise);
      scope = reservation;
      context.onDispose(reservation.closeAsync);
      const admission = await reservation.ready;
      reservation.assertCurrent();
      if (finalOnboardingCapture(context, command) !== capture) throw new AuthenticatedRequestReadError();
      const finalContext = createSetupBackedContext(
        {
          request: context.request,
          signal: admission.signal,
          principal,
          deviceType: undefined,
          baseUrl: onboardingBaseUrl,
          demo: configuration.demo,
          effect: (effect) => context.effect(effect),
          onDispose(dispose) {
            reservation.assertCurrent();
            reservation.disposers.add(dispose);
            context.onDispose(dispose);
          },
        },
        admission,
        { operators: { eq }, now: configuration.now },
      );
      reservation.assertCurrent();
      const record: OnboardingBackendRecord = {
        capture,
        outer: context,
        context: finalContext,
        packet,
        source: inputSource,
        command,
        scope: reservation,
        binding: undefined,
      };
      onboardingBackends.set(finalContext, record);
      const frame = createProductionOnboardingRpcFrame(issuer, capture.handle, context.request, packet, finalContext);
      const binding: OwnedOnboardingRpcRequestBinding = {
        issuer,
        original: capture.handle,
        request: context.request,
        frame: frame.frame,
        ticket: frame.ticket,
        packet,
        context: finalContext,
        basePath: "",
      };
      record.binding = binding;
      reservation.assertCurrent();
      if (onboardingBackends.get(finalContext) !== record || frame.frame.kind !== command)
        throw new AuthenticatedRequestReadError();
      assertProductionOnboardingRpcFrame(
        issuer,
        context.request,
        frame.frame,
        frame.ticket,
        packet,
        finalContext,
        inputSource,
      );
      const actualController = createOnboardingRpcRequestController(inputSource, binding);
      reservation.controller = actualController;
      reservation.assertCurrent();
      let execution: Promise<OnboardingRpcRequestResult> | undefined;
      return Object.freeze<OwnedOnboardingBackendRequest>({
        executeAsync() {
          if (execution) throw new AuthenticatedRequestReadError();
          reservation.assertCurrent();
          if (
            onboardingBackends.get(finalContext) !== record ||
            record.binding !== binding ||
            finalOnboardingCapture(context, command) !== capture
          )
            throw new AuthenticatedRequestReadError();
          const finished = Promise.withResolvers<OnboardingRpcRequestResult>();
          execution = finished.promise;
          pending.add(finished.promise);
          void finished.promise.catch(() => undefined);
          const controllerWork = Promise.withResolvers<OnboardingRpcRequestResult>();
          reservation.work.add(controllerWork.promise);
          void controllerWork.promise.catch(() => undefined);
          const run = async () => {
            let result: OnboardingRpcRequestResult | undefined;
            try {
              reservation.assertCurrent();
              reservation.delegated = true;
              const underlying = actualController.executeAsync();
              void underlying.then(controllerWork.resolve, controllerWork.reject);
              result = await controllerWork.promise;
              if (result.finite.primary.kind === "failed") capture.authPrimary = result.finite.primary;
              if (result.cleanup.kind === "failed") throw result.cleanup.error;
              reservation.release();
              await reservation.task;
              await reservation.closeAsync();
              if (association) await release(association);
              context.signal.throwIfAborted();
              capture.requestSignal.throwIfAborted();
              capture.context.lifetime.throwIfAborted();
              return result;
            } catch (error: unknown) {
              controllerWork.reject(error);
              reservation.stop(error);
              let primary = error;
              const observed = reservation.readFailure().primary;
              if (observed.kind === "failed") primary = observed.error;
              if (result?.finite.primary.kind === "failed") primary = result.finite.primary.error;
              const cleanup: unknown[] = [];
              try {
                await reservation.closeAsync();
              } catch (cause: unknown) {
                cleanup.push(cause);
              }
              if (result) {
                try {
                  const abandoned = await settleProductionOnboardingPublicationAsync(
                    issuer,
                    result.publication,
                    context.request,
                    result.response,
                    { kind: "abandoned", cause: primary },
                  );
                  if (abandoned.cleanup === "failed")
                    cleanup.push(new Error("MAIN_ONBOARDING_PUBLICATION_CLEANUP_FAILED"));
                } catch (cause: unknown) {
                  cleanup.push(cause);
                }
              }
              if (cleanup.length) throw new AggregateError([primary, ...cleanup], "MAIN_ONBOARDING_REQUEST_FAILED");
              throw primary;
            } finally {
              reservation.work.delete(controllerWork.promise);
              onboardingBackends.delete(finalContext);
              record.binding = undefined;
            }
          };
          void Promise.resolve()
            .then(run)
            .then(
              (result) => {
                pending.delete(finished.promise);
                finished.resolve(result);
              },
              (error: unknown) => {
                pending.delete(finished.promise);
                finished.reject(error);
              },
            );
          return finished.promise;
        },
        closeAsync: reservation.closeAsync,
      });
    };
    const fail = async (error: unknown) => {
      const cleanup: unknown[] = [];
      let primary = error;
      let controllerBorn = false;
      if (scope) {
        controllerBorn = scope.controller !== undefined || scope.disposers.size > 0;
        scope.stop(error);
        const observed = scope.readFailure().primary;
        if (observed.kind === "failed") primary = observed.error;
        try {
          await scope.closeAsync();
        } catch (cause: unknown) {
          cleanup.push(cause);
        }
      }
      if (association) {
        try {
          await release(association);
        } catch (cause: unknown) {
          cleanup.push(cause);
        }
      }
      if (!controllerBorn) {
        try {
          await disposeOnboardingCapture(capture);
        } catch (cause: unknown) {
          if (!Object.is(cause, primary)) cleanup.push(cause);
        }
      }
      pending.delete(completion.promise);
      if (cleanup.length)
        completion.reject(new AggregateError([primary, ...cleanup], "MAIN_ONBOARDING_FACTORY_FAILED"));
      else completion.reject(primary);
    };
    void Promise.resolve()
      .then(create)
      .then(
        (request) => {
          try {
            if (!scope) throw new AuthenticatedRequestReadError();
            scope.assertCurrent();
            if (finalOnboardingCapture(context, command) !== capture) throw new AuthenticatedRequestReadError();
            pending.delete(completion.promise);
            completion.resolve(request);
          } catch (error: unknown) {
            void fail(error).catch(completion.reject);
          }
        },
        (error: unknown) => {
          void fail(error).catch(completion.reject);
        },
      );
    return completion.promise;
  }

  return Object.freeze({
    configuration,
    services,
    createOnboardingBackendRequestAsync,
    getOnboardingSetupState(context: Pick<RequestContext, "signal" | "requestId">): SetupState | undefined {
      const capture = onboardingAdmissions.get(context.signal)?.get(context.requestId);
      if (!capture) return undefined;
      onboardingCaptureFor({ ...capture.context, onboardingRequest: capture.carrier });
      if (!capture.principal) throw new AuthenticatedRequestReadError();
      return Object.freeze({ kind: "unavailable" });
    },
    getOnboardingClaimPreparation(context: RequestContext) {
      const capture = finalOnboardingCapture(context, "claim");
      if (capture.kind === "get") {
        if (!capture.csrf) throw new AuthenticatedRequestReadError();
        return Object.freeze({ kind: "get", handle: capture.handle, prepared: capture.csrf });
      }
      if (!capture.claim) throw new AuthenticatedRequestReadError();
      getProductionOnboardingRequestBounds(issuer, capture.handle, context.request);
      return Object.freeze({ kind: "post", handle: capture.handle, prepared: capture.claim });
    },
    retireOnboardingPrincipalAsync(
      context: RequestContext,
      publication: ProductionOnboardingPublication,
      response: Response,
    ): Promise<void> {
      const capture = finalOnboardingCapture(context, "claim");
      const observed = readProductionOnboardingPublication(issuer, publication, context.request, response);
      if (observed.primary.kind === "failed") capture.authPrimary = observed.primary;
      if (context.principal.kind === "anonymous") return Promise.resolve();
      const association = principals.get(context.principal);
      if (
        !association ||
        association.onboarding !== capture ||
        association.context.request !== context.request ||
        association.context.requestId !== context.requestId ||
        association.context.signal !== context.signal ||
        association.context.onDispose !== context.onDispose
      )
        throw new AuthenticatedRequestReadError();
      return release(association);
    },
    getOnboardingRequestCapture(
      context: RequestContext,
      expectedCommand: OnboardingRequestCommand,
    ): ProductionOnboardingRequest {
      const carrier = context.onboardingRequest;
      if (!carrier) throw new AuthenticatedRequestReadError();
      assertApplicationOnboardingRequestContext(context, carrier);
      const capture = onboardingCarriers.get(carrier);
      assertOpen();
      if (
        !capture ||
        capture.retired ||
        capture.retirement !== undefined ||
        !onboardingCaptures.has(capture) ||
        capture.carrier !== carrier ||
        carrier.command !== expectedCommand ||
        capture.issuer !== issuer ||
        capture.policy !== onboardingPolicy ||
        capture.resourceLifetime !== lifetime ||
        capture.context.request !== context.request ||
        capture.requestSignal !== context.request.signal ||
        capture.context.requestId !== context.requestId ||
        capture.context.signal !== context.signal ||
        capture.context.onDispose !== context.onDispose ||
        capture.context.lifetime.aborted ||
        capture.requestSignal.aborted ||
        capture.context.signal.aborted
      )
        throw new AuthenticatedRequestReadError();
      if (capture.kind !== "post") throw new AuthenticatedRequestReadError();
      return capture.handle;
    },
    bindFixedWriteBackendAsync,
    getHttpRequestBounds(context: RequestContext): IssuerOperationBounds {
      const capture = httpCaptureFor(context);
      assertHttpAdmission(capture);
      return capture.bounds;
    },
    admitHttpRequestAsync,
    assertHttpRequestCurrent(context: RequestContext): void {
      assertHttpCapture(httpCaptureFor(context));
    },
    getRequestReadBounds(context: RequestContext): Readonly<{ signal: AbortSignal; deadlineAt: number }> {
      return associationFor(context).operation;
    },
    getCurrentBackendUserAsync(context: RequestContext): Promise<ProductionSessionRequestUser> {
      return trackRead(async () => {
        try {
          return await readUser(associationFor(context));
        } catch (error: unknown) {
          throw failure(error);
        }
      });
    },
    getRequestLeaseAsync(context: RequestContext): Promise<SqlAuthorityReadLease> {
      return trackRead(async () => {
        try {
          const association = associationFor(context);
          await association.lease.assertCurrentAsync(association.operation);
          assertAssociation(association);
          return association.lease;
        } catch (error: unknown) {
          throw failure(error);
        }
      });
    },
    closeAsync(): Promise<void> {
      if (closing) return closing;
      const completion = Promise.withResolvers<void>();
      closing = completion.promise;
      for (const capture of httpCaptures) retireHttpCapture(capture);
      const onboardingRetirements = [...onboardingCaptures].map((capture) => disposeOnboardingCapture(capture));
      const reads = [...pending];
      const active = [...associations];
      const close = async () => {
        const tasks: Promise<unknown>[] = [Promise.allSettled(reads), Promise.allSettled(onboardingRetirements)];
        try {
          lifetime.removeEventListener("abort", retireOnboardingCaptures);
        } catch (error: unknown) {
          tasks.push(Promise.reject(error));
        }
        try {
          controller.abort(new AuthenticatedRequestReadError());
        } catch (error: unknown) {
          tasks.push(Promise.reject(error));
        }
        tasks.push(...active.map(async (association) => release(association)));
        const settled = await Promise.allSettled(tasks);
        const rejected = settled.filter((result) => result.status === "rejected");
        if (rejected.length > 0) throw failure(rejected.map((result) => result.reason));
      };
      void close().then(completion.resolve, completion.reject);
      return completion.promise;
    },
  });
}

export type AuthenticatedRequestResources = ReturnType<typeof createAuthenticatedRequestResources>;
