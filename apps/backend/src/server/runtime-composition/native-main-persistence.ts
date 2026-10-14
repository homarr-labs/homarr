import { constants as bufferConstants } from "node:buffer";

import type {
  AuthHttpPublicationAbandonment,
  AuthHttpPublicationHandle,
  AuthHttpPublicationTerminal,
  FetchContribution,
  FetchOutcome,
  RuntimeContribution,
  OnboardingHttpPublicationProducer,
} from "@homarr/contracts/contribution";
import type { RequestContext } from "@homarr/contracts/request";
import {
  dispatchProductionOnboardingClaimAsync,
  getProductionOnboardingRequestBounds,
  readProductionOnboardingPublication,
  recordProductionOnboardingResponseAsync,
  settleProductionOnboardingPublicationAsync,
  createProductionSqlSessionIssuer,
  dispatchProductionAppCreateAsync,
  dispatchProductionBoardPermissionsAsync,
} from "@homarr/auth/nitro/production-sessions";
import type {
  ProductionOnboardingRpcInputSource,
  ProductionOnboardingClaimOutput,
  ProductionOnboardingPublication,
  ProductionOnboardingResponseOutcome,
  ProductionOnboardingPublicationResult,
  IssuerOperationBounds,
  IssuerPublicationOutcome,
  ProductionOnboardingPolicy,
  ProductionSessionIssuerConfiguration,
  ProductionSqlSessionIssuer,
} from "@homarr/auth/nitro/production-sessions";
import { seedDataAsync } from "@homarr/db/migrations/seed";
import { createProxySettingsReader } from "@homarr/db/proxy-reader";
import type { ProxyReader } from "@homarr/db/proxy-reader";
import { createPersistenceRuntime, TransactionCommitAmbiguousError } from "@homarr/db/runtime";
import type { PersistenceConfig, PersistenceRuntime } from "@homarr/db/runtime";
import { initializeRuntimeStateEpochAsync } from "@homarr/db/runtime-state";
import { eq } from "@homarr/db";
import { createSetupReadResources } from "@homarr/api/nitro/resources/setup-read";
import type { SetupReadAdmission } from "@homarr/api/nitro/resources/setup-read";
import {
  assertOnboardingRpcInputProducer,
  createOnboardingRpcInputProducer,
} from "@homarr/api/nitro/assembly/onboarding-wire";
import type { OnboardingRpcRequestResult } from "@homarr/api/nitro/assembly/onboarding-wire";

import type {
  AuthHttpConstructionInput,
  AuthHttpController,
  AuthenticatedReadConstructionInput,
  FixedWriteRpcConstructionInput,
  FixedWriteRpcResources,
  MainFixedWriteDispatch,
  MainPersistenceConfig,
  MainOnboardingScope,
  MainOnboardingScopeResources,
  OnboardingWireConstructionInput,
  OwnedOnboardingWireController,
  OnboardingWireRequestOwner,
  OwnedOnboardingBackendRequest,
  OnboardingPublicationProducer,
} from "./contracts";
import { createAuthenticatedRequestResources } from "./auth";
import type { AuthenticatedRequestResources } from "./auth";
import {
  cancelAbandonedAuthHttpResponseAsync,
  classifyLegacyAuthHttpOutcome,
  selectAuthHttpRequest,
} from "./auth-http";
import type { AuthHttpSelection } from "./auth-http";
import { createAdmittedFixedWriteRpc } from "./fixed-write-rpc";
import { createMainPersistenceResources } from "./persistence";
import { createOnboardingRpcRoutes, createOnboardingWirePublication } from "./onboarding-rpc";
import { createOnboardingClaimRoute, createOnboardingClaimResponse } from "./onboarding-claim";

interface OnboardingScopeRecord {
  readonly scope: MainOnboardingScope;
  readonly ready: PromiseWithResolvers<SetupReadAdmission>;
  readonly release: PromiseWithResolvers<void>;
  readonly task: PromiseWithResolvers<void>;
  readonly controllerClose: AuthHttpTask<void>;
  readonly factory: Promise<unknown>;
  readonly hooks: { readonly signal: AbortSignal; readonly listener: () => void }[];
  readonly cleanup: unknown[];
  readiness: "pending" | "fulfilled" | "rejected";
  physical: "registered" | "pending" | "fulfilled" | "rejected";
  callback: "not-entered" | "pending" | "fulfilled" | "rejected";
  callbackFailure: Failure;
  active: boolean;
  released: boolean;
  primary: Failure;
  closing: Promise<void> | undefined;
}

interface OnboardingWireRequestRecord {
  readonly context: RequestContext;
  readonly handler: AuthHttpTask<FetchOutcome>;
  readonly factory: AuthHttpTask<OwnedOnboardingBackendRequest>;
  readonly execution: AuthHttpTask<OnboardingRpcRequestResult>;
  readonly claim: AuthHttpTask<ProductionOnboardingClaimOutput>;
  readonly serialization: AuthHttpTask<Response>;
  readonly errorSerialization: AuthHttpTask<Response>;
  readonly registration: AuthHttpTask<ProductionOnboardingPublication>;
  readonly cancellation: AuthHttpTask<void>;
  readonly abandonment: AuthHttpTask<ProductionOnboardingPublicationResult>;
  request: OwnedOnboardingBackendRequest | undefined;
  result: OnboardingRpcRequestResult | undefined;
  source: Response | undefined;
  reservation: ReturnType<typeof createOnboardingWirePublication> | undefined;
  primary: Failure;
  cleanup: unknown[];
}

type NativeOperation = Parameters<PersistenceRuntime["runAsync"]>[0];
type NativeDatabase = Parameters<NativeOperation>[0];
type NativeSchema = Parameters<NativeOperation>[1];
type MainResources = ReturnType<typeof createMainPersistenceResources<NativeDatabase, NativeSchema>>;
type OwnerState =
  | { kind: "constructing" }
  | { kind: "configured" }
  | { kind: "initializing" }
  | { kind: "ready" }
  | { kind: "closing" }
  | { kind: "closed"; didClose: true }
  | { kind: "close-failed"; didClose: false };
type Failure = { kind: "none" } | { kind: "failed"; error: unknown };
type Initialization = {
  task: PromiseWithResolvers<void>;
  underlying: void | Promise<void>;
  epochUnderlying: ReturnType<typeof initializeRuntimeStateEpochAsync> | undefined;
  invocation: "registered" | "invoked" | "skipped" | "settled";
};
type CleanupKind = "auth-requests" | "auth-issuer" | "helper" | "proxy" | "runtime";
type CleanupTask = {
  task: PromiseWithResolvers<void>;
  underlying: Promise<void> | undefined;
  outcome: "registered" | "fulfilled" | "rejected";
};

type FixedTaskSettlement =
  | { kind: "not-forwarded" }
  | { kind: "pending" }
  | { kind: "fulfilled"; value: unknown }
  | { kind: "rejected"; error: unknown }
  | { kind: "ambiguous"; error: TransactionCommitAmbiguousError };

interface FixedTaskRecord {
  readonly kind: "dispatch" | "setup" | "request";
  readonly completion: Promise<unknown>;
  underlying: Promise<unknown> | undefined;
  settlement: FixedTaskSettlement;
  admissionFailure: Failure;
}

interface AuthHttpTask<Value> {
  readonly completion: PromiseWithResolvers<Value>;
  underlying: Promise<Value> | undefined;
  settlement:
    | { kind: "registered" }
    | { kind: "skipped" }
    | { kind: "pending" }
    | { kind: "fulfilled"; value: Value }
    | { kind: "rejected"; error: unknown };
}

interface AuthHttpRecord {
  readonly controller: AuthHttpController;
  readonly context: RequestContext;
  readonly handler: AuthHttpTask<FetchOutcome>;
  readonly preflight: AuthHttpTask<void>;
  readonly executor: AuthHttpTask<IssuerPublicationOutcome>;
  readonly cancellations: Map<Response, AuthHttpTask<void>>;
  selection: AuthHttpSelection | undefined;
  capture: Readonly<Pick<RequestContext, "request" | "requestId" | "signal" | "principal" | "onDispose">> | undefined;
  bounds: IssuerOperationBounds | undefined;
  reservation: AuthHttpPublicationReservation | undefined;
  responseSource: "unselected" | "local-rejection" | "issuer-released-response" | "held-response" | "failure-response";
  response: Response | undefined;
  mapped: FetchOutcome | undefined;
  failure: Failure;
  reservationFailure: Failure;
  publication: "pending" | "handed-off" | "withheld";
  retired: boolean;
}

interface AuthHttpPublicationReservation {
  readonly context: RequestContext;
  readonly response: Response;
  readonly bounds: IssuerOperationBounds;
  readonly lifetime: AbortSignal;
  readonly completion: PromiseWithResolvers<AuthHttpPublicationTerminal>;
  phase:
    | { readonly kind: "reserved" }
    | { readonly kind: "claim-unwind"; readonly error: unknown }
    | { readonly kind: "awaiting-first-check"; readonly handle: AuthHttpPublicationHandle }
    | { readonly kind: "checking"; readonly handle: AuthHttpPublicationHandle }
    | { readonly kind: "terminal"; readonly terminal: AuthHttpPublicationTerminal };
}

function createAuthHttpTask<Value>(): AuthHttpTask<Value> {
  const completion = Promise.withResolvers<Value>();
  void completion.promise.catch(() => undefined);
  return { completion, underlying: undefined, settlement: { kind: "registered" } };
}

function runAuthHttpTask<Value>(entry: AuthHttpTask<Value>, invoke: () => Promise<Value>): Promise<Value> {
  if (entry.settlement.kind !== "registered") throw new Error("MAIN_AUTH_HTTP_TASK_ALREADY_CLAIMED");
  entry.settlement = { kind: "pending" };
  const reject = (error: unknown) => {
    entry.settlement = { kind: "rejected", error };
    entry.completion.reject(error);
  };
  try {
    const underlying = invoke();
    entry.underlying = underlying;
    void underlying.then((value) => {
      entry.settlement = { kind: "fulfilled", value };
      entry.completion.resolve(value);
    }, reject);
  } catch (error) {
    reject(error);
  }
  return entry.completion.promise;
}

function sanitizedFailure(code: "MAIN_PERSISTENCE_UNAVAILABLE" | "MAIN_PERSISTENCE_CONSTRUCTION_FAILED"): Error {
  return new Error(code);
}

export async function createNativeMainPersistenceResourcesAsync(configuration: MainPersistenceConfig) {
  let state: OwnerState = { kind: "constructing" };
  let runtime: PersistenceRuntime | undefined;
  let proxyReader: ProxyReader | undefined;
  let helper: MainResources | undefined;
  let initialization: Initialization | undefined;
  let readyResult: PromiseWithResolvers<void> | undefined;
  let closing: PromiseWithResolvers<void> | undefined;
  let initializationSignal: AbortSignal | undefined;
  let epochInitializationTimeoutMs: number | undefined;
  let epoch: string | undefined;
  let authConstruction: PromiseWithResolvers<AuthenticatedRequestResources> | undefined;
  let authIssuer: ProductionSqlSessionIssuer | undefined;
  let authRequests: AuthenticatedRequestResources | undefined;
  let authConstructionResult: AuthenticatedRequestResources | undefined;
  let authHttpConstruction: "unclaimed" | "claimed" = "unclaimed";
  let onboardingSource: ProductionOnboardingRpcInputSource | undefined;
  let onboardingWire: OwnedOnboardingWireController | undefined;
  const onboardingControllers = new WeakMap<
    OwnedOnboardingWireController,
    {
      readonly routes: OwnedOnboardingWireController["routes"];
      readonly endpoints: OwnedOnboardingWireController["endpoints"];
      readonly publication: OnboardingHttpPublicationProducer;
    }
  >();
  let onboardingWireClosing = false;
  const lifetime = new AbortController();
  const initializations = new Set<Promise<void>>();
  const operations = new Set<Promise<unknown>>();
  const fixedTasks = new Set<Promise<unknown>>();
  const fixedRecords = new WeakMap<Promise<unknown>, FixedTaskRecord>();
  const authHttpTasks = new Set<Promise<FetchOutcome>>();
  const authHttpRecords = new WeakMap<Promise<unknown>, AuthHttpRecord>();
  const authHttpContexts = new WeakMap<RequestContext, AuthHttpRecord>();
  const authHttpControllers = new WeakMap<AuthHttpController, () => void>();
  const authHttpResponses = new WeakMap<Response, AuthHttpRecord>();
  const authHttpHandles = new WeakMap<AuthHttpPublicationHandle, AuthHttpPublicationReservation>();
  const authHttpReservations = new Set<Promise<AuthHttpPublicationTerminal>>();
  const onboardingScopes = new Set<OnboardingScopeRecord>();
  const onboardingRequests = new Set<OnboardingWireRequestRecord>();
  const onboardingReservations = new Set<ReturnType<typeof createOnboardingWirePublication>>();
  const cleanupTasks = new Map<CleanupKind, CleanupTask>();
  const failures: {
    primary: Failure;
    primaryStage: "construction" | "initialization" | undefined;
    operation: Failure;
    cleanup: unknown[];
    aggregate: AggregateError | undefined;
  } = {
    primary: { kind: "none" },
    primaryStage: undefined,
    operation: { kind: "none" },
    cleanup: [],
    aggregate: undefined,
  };

  function retainPrimary(stage: "construction" | "initialization", error: unknown): void {
    if (failures.primary.kind === "none") {
      failures.primary = { kind: "failed", error };
      failures.primaryStage = stage;
    }
  }

  function closingPromise(): Promise<void> | undefined {
    return closing?.promise;
  }

  function assertCurrent(): void {
    if (
      closing ||
      state.kind !== "ready" ||
      initializationSignal?.aborted ||
      lifetime.signal.aborted ||
      !helper ||
      epoch === undefined
    )
      throw new Error("MAIN_PERSISTENCE_UNAVAILABLE");
    try {
      helper.assertCurrent();
    } catch (error) {
      failures.operation = { kind: "failed", error };
      throw sanitizedFailure("MAIN_PERSISTENCE_UNAVAILABLE");
    }
  }

  function registerOperation<Value>(invoke: () => Promise<Value>): Promise<Value> {
    assertCurrent();
    const task = Promise.withResolvers<Value>();
    operations.add(task.promise);
    void task.promise.catch(() => undefined);
    const settleFailure = (error: unknown) => {
      failures.operation = { kind: "failed", error };
      operations.delete(task.promise);
      task.reject(error);
    };
    try {
      const underlying = invoke();
      void underlying.then((value) => {
        operations.delete(task.promise);
        task.resolve(value);
      }, settleFailure);
    } catch (error) {
      settleFailure(error);
    }
    return task.promise.then(
      (value) => {
        assertCurrent();
        return value;
      },
      () => {
        throw new Error("MAIN_PERSISTENCE_OPERATION_FAILED");
      },
    );
  }

  function registerFixedTask<Value>(kind: FixedTaskRecord["kind"], invoke: () => Promise<Value>): Promise<Value> {
    assertCurrent();
    const completion = Promise.withResolvers<Value>();
    const entry: FixedTaskRecord = {
      kind,
      completion: completion.promise,
      underlying: undefined,
      settlement: { kind: "not-forwarded" },
      admissionFailure: { kind: "none" },
    };
    fixedRecords.set(completion.promise, entry);
    fixedTasks.add(completion.promise);
    void completion.promise.catch(() => undefined);
    void Promise.resolve().then(() => {
      try {
        assertCurrent();
      } catch (error) {
        entry.admissionFailure = { kind: "failed", error };
        fixedTasks.delete(completion.promise);
        completion.reject(error);
        return;
      }
      const reject = (error: unknown) => {
        if (kind === "dispatch" && error instanceof TransactionCommitAmbiguousError)
          entry.settlement = { kind: "ambiguous", error };
        else entry.settlement = { kind: "rejected", error };
        fixedTasks.delete(completion.promise);
        completion.reject(error);
      };
      try {
        entry.settlement = { kind: "pending" };
        const underlying = invoke();
        entry.underlying = underlying;
        void underlying.then((value) => {
          entry.settlement = { kind: "fulfilled", value };
          fixedTasks.delete(completion.promise);
          completion.resolve(value);
        }, reject);
      } catch (error) {
        reject(error);
      }
    });
    return completion.promise;
  }

  const fixedWork = {
    runRequestAsync(handle: () => Promise<Response>): Promise<Response> {
      return registerFixedTask("request", handle);
    },
    registerFixedDispatch<Value>(invoke: () => Promise<Value>): Promise<Value> {
      return registerFixedTask("dispatch", invoke);
    },
    runSetupScopeAsync(
      signal: AbortSignal,
      handle: Parameters<FixedWriteRpcResources["runSetupScopeAsync"]>[1],
    ): Promise<Response> {
      return registerFixedTask("setup", () => {
        const capturedRuntime = runtime;
        if (!capturedRuntime || capturedRuntime.engine !== "sqlite") throw new Error("MAIN_PERSISTENCE_UNAVAILABLE");
        return capturedRuntime.runAsync(async (database, schema) => {
          let active = true;
          const assertScopeCurrent = () => {
            if (!active) throw new Error("MAIN_FIXED_WRITE_SCOPE_EXPIRED");
            signal.throwIfAborted();
            assertCurrent();
          };
          try {
            assertScopeCurrent();
            return await handle({ database, schema, signal, assertCurrent: assertScopeCurrent });
          } finally {
            active = false;
          }
        });
      });
    },
  };

  const onboardingScopesResources: MainOnboardingScopeResources = Object.freeze<MainOnboardingScopeResources>({
    reserveScope(context, original, factory) {
      assertCurrent();
      if (onboardingWireClosing) throw new Error("MAIN_ONBOARDING_WIRE_CLOSED");
      const issuer = authIssuer;
      const requests = authRequests;
      const command = context.onboardingRequest?.command;
      if (
        !issuer ||
        !requests ||
        !command ||
        command === "claim" ||
        requests.getOnboardingRequestCapture(context, command) !== original
      )
        throw new Error("MAIN_ONBOARDING_SCOPE_UNAVAILABLE");
      const bounds = getProductionOnboardingRequestBounds(issuer, original, context.request);
      const ready = Promise.withResolvers<SetupReadAdmission>();
      const release = Promise.withResolvers<void>();
      const task = Promise.withResolvers<void>();
      void ready.promise.catch(() => undefined);
      void task.promise.catch(() => undefined);
      const controllerClose = createAuthHttpTask<void>();
      const retain = (error: unknown) => {
        if (record.primary.kind === "none") record.primary = { kind: "failed", error };
      };
      const rejectReady = (error: unknown) => {
        if (record.readiness !== "pending") return;
        record.readiness = "rejected";
        ready.reject(error);
      };
      const closeController = () => {
        if (controllerClose.settlement.kind !== "registered") return controllerClose.completion.promise;
        return runAuthHttpTask(controllerClose, async () => {
          const closes: Promise<void>[] = [];
          if (scope.controller) {
            const close = Promise.withResolvers<void>();
            closes.push(close.promise);
            void close.promise.catch(() => undefined);
            try {
              void scope.controller.closeAsync().then(close.resolve, close.reject);
            } catch (error: unknown) {
              close.reject(error);
            }
          }
          for (const dispose of scope.disposers) {
            const close = Promise.withResolvers<void>();
            closes.push(close.promise);
            void close.promise.catch(() => undefined);
            void Promise.resolve().then(dispose).then(close.resolve, close.reject);
          }
          const settled = await Promise.allSettled(closes);
          for (const outcome of settled)
            if (outcome.status === "rejected" && !record.cleanup.includes(outcome.reason))
              record.cleanup.push(outcome.reason);
        });
      };
      const scope: MainOnboardingScope = {
        ready: ready.promise,
        task: task.promise,
        work: new Set(),
        disposers: new Set(),
        controller: undefined,
        delegated: false,
        assertCurrent() {
          try {
            if (record.primary.kind === "failed") throw record.primary.error;
            if (!record.active || record.released || record.physical !== "pending")
              throw new Error("MAIN_ONBOARDING_SCOPE_EXPIRED");
            assertCurrent();
            if (requests.getOnboardingRequestCapture(context, command) !== original)
              throw new Error("MAIN_ONBOARDING_SCOPE_FOREIGN");
            getProductionOnboardingRequestBounds(issuer, original, context.request);
            if (context.principal.kind === "authenticated") requests.getRequestReadBounds(context);
          } catch (error: unknown) {
            record.active = false;
            scope.stop(error);
            throw error;
          }
        },
        release() {
          if (record.released) return;
          record.released = true;
          release.resolve();
        },
        stop(reason) {
          retain(reason);
          const first = record.primary;
          if (first.kind === "failed") rejectReady(first.error);
          scope.release();
          void closeController().catch((error: unknown) => {
            if (!record.cleanup.includes(error)) record.cleanup.push(error);
          });
        },
        readFailure() {
          return Object.freeze({ primary: record.primary, cleanup: Object.freeze([...record.cleanup]) });
        },
        closeAsync() {
          if (record.closing) return record.closing;
          const closed = Promise.withResolvers<void>();
          record.closing = closed.promise;
          void closed.promise.catch(() => undefined);
          if (!record.released) scope.stop(new Error("MAIN_ONBOARDING_SCOPE_CLOSED"));
          const close = async () => {
            try {
              await closeController();
            } catch (error: unknown) {
              if (!record.cleanup.includes(error)) record.cleanup.push(error);
            }
            try {
              await task.promise;
            } catch (error: unknown) {
              retain(error);
            }
            for (const hook of record.hooks) {
              try {
                hook.signal.removeEventListener("abort", hook.listener);
              } catch (error: unknown) {
                record.cleanup.push(error);
              }
            }
            record.hooks.length = 0;
            scope.controller = undefined;
            scope.disposers.clear();
            onboardingScopes.delete(record);
            if (record.cleanup.length) throw new AggregateError(record.cleanup, "MAIN_ONBOARDING_SCOPE_CLEANUP_FAILED");
          };
          void Promise.resolve().then(close).then(closed.resolve, closed.reject);
          return closed.promise;
        },
      };
      const record: OnboardingScopeRecord = {
        scope,
        ready,
        release,
        task,
        controllerClose,
        factory,
        hooks: [],
        cleanup: [],
        readiness: "pending",
        physical: "registered",
        callback: "not-entered",
        callbackFailure: { kind: "none" },
        active: false,
        released: false,
        primary: { kind: "none" },
        closing: undefined,
      };
      onboardingScopes.add(record);
      operations.add(factory);
      void factory.then(
        () => operations.delete(factory),
        () => operations.delete(factory),
      );
      const signals = [
        ...new Set([context.signal, context.request.signal, lifetime.signal, bounds.lifetime, bounds.signal]),
      ];
      try {
        for (const signal of signals) {
          const listener = () => {
            if (scope.delegated && (signal === bounds.signal || signal === bounds.lifetime)) return;
            scope.stop(signal.reason);
          };
          record.hooks.push({ signal, listener });
          signal.addEventListener("abort", listener, { once: true });
          if (signal.aborted) listener();
        }
      } catch (error: unknown) {
        scope.stop(error);
      }
      const reject = (error: unknown) => {
        record.active = false;
        record.physical = "rejected";
        if (
          (record.callback === "fulfilled" ||
            (record.callbackFailure.kind === "failed" && error !== record.callbackFailure.error)) &&
          !record.cleanup.includes(error)
        )
          record.cleanup.push(error);
        retain(error);
        const first = record.primary;
        if (first.kind === "failed") rejectReady(first.error);
        scope.stop(error);
        task.reject(error);
      };
      const dispatch = () => {
        record.physical = "pending";
        try {
          assertCurrent();
          if (!runtime || runtime.engine !== "sqlite") throw new Error("MAIN_ONBOARDING_SCOPE_UNAVAILABLE");
          const underlying = runtime.runAsync(async (database, schema) => {
            record.callback = "pending";
            record.active = true;
            try {
              scope.assertCurrent();
              const admission: SetupReadAdmission = Object.freeze({
                database,
                schema,
                signal: bounds.signal,
                assertCurrent: scope.assertCurrent,
              });
              createSetupReadResources(admission, { operators: { eq }, now: issuer.requestConfiguration.now });
              scope.assertCurrent();
              record.readiness = "fulfilled";
              ready.resolve(admission);
              await release.promise;
              await closeController();
              await Promise.allSettled([...scope.work]);
              if (record.primary.kind === "failed") throw record.primary.error;
              record.callback = "fulfilled";
            } catch (error: unknown) {
              record.callback = "rejected";
              record.callbackFailure = { kind: "failed", error };
              record.active = false;
              retain(error);
              const first = record.primary;
              if (first.kind === "failed") rejectReady(first.error);
              scope.stop(error);
              await closeController();
              await Promise.allSettled([...scope.work]);
              throw error;
            } finally {
              record.active = false;
            }
          });
          void underlying.then(() => {
            record.active = false;
            record.physical = "fulfilled";
            if (record.readiness === "pending") {
              const error = new Error("MAIN_ONBOARDING_SCOPE_NOT_READY");
              retain(error);
              rejectReady(error);
              scope.stop(error);
              task.reject(error);
            } else task.resolve();
          }, reject);
        } catch (error: unknown) {
          reject(error);
        }
      };
      void Promise.resolve().then(dispatch).catch(reject);
      return scope;
    },
  });

  function beginCleanup(kind: CleanupKind): Promise<void> {
    const previous = cleanupTasks.get(kind);
    if (previous) return previous.task.promise;
    const entry: CleanupTask = { task: Promise.withResolvers<void>(), underlying: undefined, outcome: "registered" };
    cleanupTasks.set(kind, entry);
    void entry.task.promise.catch(() => undefined);
    const reject = (error: unknown) => {
      entry.outcome = "rejected";
      entry.task.reject(error);
    };
    try {
      switch (kind) {
        case "auth-requests":
          if (!authRequests) throw new Error("MAIN_PERSISTENCE_CLEANUP_FAILED");
          entry.underlying = authRequests.closeAsync();
          break;
        case "auth-issuer":
          if (!authIssuer) throw new Error("MAIN_PERSISTENCE_CLEANUP_FAILED");
          entry.underlying = authIssuer.closeAsync();
          break;
        case "helper":
          if (!helper) throw new Error("MAIN_PERSISTENCE_CLEANUP_FAILED");
          entry.underlying = helper.closeAsync();
          break;
        case "proxy":
          if (!proxyReader) throw new Error("MAIN_PERSISTENCE_CLEANUP_FAILED");
          entry.underlying = proxyReader.closeAsync();
          break;
        case "runtime":
          if (!runtime) throw new Error("MAIN_PERSISTENCE_CLEANUP_FAILED");
          entry.underlying = runtime.closeAsync();
          break;
      }
      void entry.underlying.then(() => {
        entry.outcome = "fulfilled";
        entry.task.resolve();
      }, reject);
    } catch (error) {
      reject(error);
    }
    return entry.task.promise;
  }

  async function closeOwnedResources(): Promise<void> {
    const stopReason = new Error("MAIN_ONBOARDING_OWNER_CLOSING");
    for (const reservation of onboardingScopes) reservation.scope.stop(stopReason);
    if (onboardingWire) {
      try {
        await onboardingWire.closeAsync();
      } catch (error: unknown) {
        failures.cleanup.push(error);
      }
    }
    const pendingScopes = [...onboardingScopes];
    const scopes = await Promise.allSettled(pendingScopes.map((record) => record.scope.closeAsync()));
    for (let index = 0; index < scopes.length; index++) {
      const result = scopes[index];
      const record = pendingScopes[index];
      if (result?.status === "rejected" && record && record.cleanup.length) failures.cleanup.push(result.reason);
    }
    await Promise.allSettled(initializations);
    await Promise.allSettled(operations);
    await Promise.allSettled(fixedTasks);
    await Promise.allSettled(authHttpTasks);
    await Promise.allSettled([...authHttpReservations]);
    const obligations: CleanupKind[] = [];
    if (authRequests) obligations.push("auth-requests");
    if (authIssuer) obligations.push("auth-issuer");
    if (helper) obligations.push("helper");
    else {
      if (proxyReader) obligations.push("proxy");
      if (runtime) obligations.push("runtime");
    }
    for (const obligation of obligations) {
      try {
        await beginCleanup(obligation);
      } catch (error) {
        failures.cleanup.push(error);
        if (obligation === "helper") {
          if (proxyReader) {
            try {
              await beginCleanup("proxy");
            } catch (fallbackError) {
              failures.cleanup.push(fallbackError);
            }
          }
          if (runtime && runtime.phase !== "closed") {
            try {
              await beginCleanup("runtime");
            } catch (fallbackError) {
              failures.cleanup.push(fallbackError);
            }
          }
        }
      }
    }
    if (runtime && runtime.phase !== "closed") failures.cleanup.push(new Error("MAIN_PERSISTENCE_NOT_CLOSED"));
    if (failures.cleanup.length > 0) {
      const errors = [...failures.cleanup];
      if (failures.primary.kind === "failed") errors.unshift(failures.primary.error);
      failures.aggregate = new AggregateError(errors, "MAIN_PERSISTENCE_FAILED");
      state = { kind: "close-failed", didClose: false };
      throw new Error("MAIN_PERSISTENCE_CLEANUP_FAILED");
    }
    state = { kind: "closed", didClose: true };
  }

  function dispose(): Promise<void> {
    if (closing) return closing.promise;
    const shutdown = Promise.withResolvers<void>();
    closing = shutdown;
    state = { kind: "closing" };
    void shutdown.promise.catch(() => undefined);
    try {
      lifetime.abort(new Error("MAIN_PERSISTENCE_CLOSING"));
    } catch (error) {
      failures.cleanup.push(error);
    }
    void closeOwnedResources().then(shutdown.resolve, (error: unknown) => {
      if (state.kind !== "close-failed") {
        failures.cleanup.push(error);
        const errors = [...failures.cleanup];
        if (failures.primary.kind === "failed") errors.unshift(failures.primary.error);
        failures.aggregate = new AggregateError(errors, "MAIN_PERSISTENCE_FAILED");
        state = { kind: "close-failed", didClose: false };
      }
      shutdown.reject(new Error("MAIN_PERSISTENCE_CLEANUP_FAILED"));
    });
    return shutdown.promise;
  }

  async function initializeEpochAsync(entry: Initialization, signal: AbortSignal, timeoutMs: number): Promise<void> {
    await entry.underlying;
    if (!helper || !runtime || initialization !== entry || closingPromise())
      throw new Error("MAIN_PERSISTENCE_UNAVAILABLE");
    helper.assertCurrent();
    signal.throwIfAborted();
    if (closingPromise()) throw new Error("MAIN_PERSISTENCE_UNAVAILABLE");
    const deadlineAt = Date.now() + timeoutMs;
    if (!Number.isSafeInteger(deadlineAt) || deadlineAt < 1) throw new Error("MAIN_PERSISTENCE_INITIALIZATION_FAILED");
    const options: Parameters<typeof initializeRuntimeStateEpochAsync>[0] = {
      runtime,
      lifetime: signal,
      maxOperationMs: timeoutMs,
    };
    const operation: Parameters<typeof initializeRuntimeStateEpochAsync>[1] = { signal, deadlineAt };
    entry.epochUnderlying = initializeRuntimeStateEpochAsync(options, operation);
    const initializedEpoch = await entry.epochUnderlying;
    signal.throwIfAborted();
    epoch = initializedEpoch;
  }

  async function completeReady(entry: Initialization, result: PromiseWithResolvers<void>): Promise<void> {
    try {
      await entry.task.promise;
    } catch (error) {
      retainPrimary("initialization", error);
      await dispose().catch(() => undefined);
      result.reject(new Error("MAIN_PERSISTENCE_INITIALIZATION_FAILED"));
      return;
    }
    if (closing) {
      await closing.promise.catch(() => undefined);
      result.reject(new Error("MAIN_PERSISTENCE_UNAVAILABLE"));
      return;
    }
    try {
      if (!helper || !initializationSignal || epoch === undefined) throw new Error("MAIN_PERSISTENCE_UNAVAILABLE");
      initializationSignal.throwIfAborted();
      helper.assertCurrent();
    } catch (error) {
      retainPrimary("initialization", error);
      await dispose().catch(() => undefined);
      result.reject(new Error("MAIN_PERSISTENCE_INITIALIZATION_FAILED"));
      return;
    }
    const afterCurrentnessClosing = closingPromise();
    if (afterCurrentnessClosing) {
      await afterCurrentnessClosing.catch(() => undefined);
      result.reject(new Error("MAIN_PERSISTENCE_UNAVAILABLE"));
      return;
    }
    state = { kind: "ready" };
    result.resolve();
  }

  function ready(signal: AbortSignal): Promise<void> {
    if (closing) return Promise.reject(new Error("MAIN_PERSISTENCE_UNAVAILABLE"));
    if (readyResult) {
      if (state.kind === "ready") {
        try {
          assertCurrent();
        } catch {
          return Promise.reject(new Error("MAIN_PERSISTENCE_UNAVAILABLE"));
        }
      }
      return readyResult.promise;
    }
    if (state.kind !== "configured") return Promise.reject(new Error("MAIN_PERSISTENCE_UNAVAILABLE"));
    const entry: Initialization = {
      task: Promise.withResolvers<void>(),
      underlying: undefined,
      epochUnderlying: undefined,
      invocation: "registered",
    };
    const result = Promise.withResolvers<void>();
    initialization = entry;
    readyResult = result;
    initializations.add(entry.task.promise);
    state = { kind: "initializing" };
    void entry.task.promise.catch(() => undefined);
    void result.promise.catch(() => undefined);
    void completeReady(entry, result);
    const reject = (error: unknown) => {
      retainPrimary("initialization", error);
      initializations.delete(entry.task.promise);
      if (entry.invocation !== "skipped") entry.invocation = "settled";
      entry.task.reject(error);
    };
    try {
      initializationSignal = AbortSignal.any([lifetime.signal, signal]);
      if (closing || initializationSignal.aborted) {
        entry.invocation = "skipped";
        initializationSignal.throwIfAborted();
        throw new Error("MAIN_PERSISTENCE_UNAVAILABLE");
      }
      const initialize = helper?.contribution.ready;
      if (!initialize || initialization !== entry || epochInitializationTimeoutMs === undefined)
        throw new Error("MAIN_PERSISTENCE_INITIALIZATION_FAILED");
      entry.invocation = "invoked";
      entry.underlying = initialize(initializationSignal);
      void initializeEpochAsync(entry, initializationSignal, epochInitializationTimeoutMs).then(() => {
        initializations.delete(entry.task.promise);
        entry.invocation = "settled";
        entry.task.resolve();
      }, reject);
    } catch (error) {
      reject(error);
    }
    return result.promise;
  }

  function runAsync<Value>(
    operation: (database: NativeDatabase, schema: NativeSchema) => Value | Promise<Value>,
  ): Promise<Value> {
    return registerOperation(() => {
      if (!runtime) throw new Error("MAIN_PERSISTENCE_UNAVAILABLE");
      return runtime.runAsync(operation);
    });
  }

  function createAuthenticatedReadResourcesAsync(
    input: AuthenticatedReadConstructionInput,
  ): Promise<AuthenticatedRequestResources> {
    assertCurrent();
    if (authConstruction) return Promise.reject(new Error("MAIN_AUTH_ALREADY_CONFIGURED"));
    const construction = Promise.withResolvers<AuthenticatedRequestResources>();
    authConstruction = construction;
    operations.add(construction.promise);
    void construction.promise.catch(() => undefined);
    let captured: AuthenticatedReadConstructionInput & {
      readonly issuer: ProductionSessionIssuerConfiguration & { readonly onboarding: ProductionOnboardingPolicy };
    };
    try {
      const demo = Object.freeze({ enabled: input.demo.enabled, readOnly: input.demo.readOnly });
      const requestDeadlineMs = input.requestDeadlineMs;
      if (
        typeof demo.enabled !== "boolean" ||
        typeof demo.readOnly !== "boolean" ||
        !Number.isSafeInteger(requestDeadlineMs) ||
        requestDeadlineMs < 1 ||
        requestDeadlineMs > 2_147_483_647
      )
        throw new Error("MAIN_ONBOARDING_POLICY_UNAVAILABLE");
      const onboarding: ProductionOnboardingPolicy = Object.freeze({
        demoEnabled: demo.enabled,
        readOnly: demo.readOnly,
        requestBudgetMs: requestDeadlineMs,
        maximumCookieBytes: 16_384,
        maximumCredentialBytes: 4096,
        maximumResponseBytes: 4096,
      });
      const suppliedDescriptor = Object.getOwnPropertyDescriptor(input.issuer, "onboarding");
      if (
        (suppliedDescriptor && !("value" in suppliedDescriptor)) ||
        (!suppliedDescriptor && "onboarding" in input.issuer)
      )
        throw new Error("MAIN_ONBOARDING_POLICY_UNAVAILABLE");
      const supplied: unknown = suppliedDescriptor?.value;
      if (supplied !== undefined) {
        if (
          typeof supplied !== "object" ||
          supplied === null ||
          Array.isArray(supplied) ||
          Object.getOwnPropertyNames(supplied).length !== 6 ||
          Object.getOwnPropertySymbols(supplied).length !== 0
        )
          throw new Error("MAIN_ONBOARDING_POLICY_UNAVAILABLE");
        for (const key of [
          "demoEnabled",
          "readOnly",
          "requestBudgetMs",
          "maximumCookieBytes",
          "maximumCredentialBytes",
          "maximumResponseBytes",
        ]) {
          const descriptor = Object.getOwnPropertyDescriptor(supplied, key);
          const expected: unknown = Object.getOwnPropertyDescriptor(onboarding, key)?.value;
          const observed: unknown = descriptor?.value;
          if (!descriptor || !("value" in descriptor) || observed !== expected)
            throw new Error("MAIN_ONBOARDING_POLICY_UNAVAILABLE");
        }
      }
      captured = Object.freeze({
        ...input,
        requestDeadlineMs,
        issuer: Object.freeze({
          ...input.issuer,
          origin: Object.freeze({
            ...input.issuer.origin,
            cookies: Object.freeze({ ...input.issuer.origin.cookies }),
          }),
          providers: Object.freeze([...input.issuer.providers]),
          oidc: input.issuer.oidc && Object.freeze({ ...input.issuer.oidc }),
          bodyBudget: Object.freeze({ ...input.issuer.bodyBudget }),
          onboarding,
        }),
        sql: Object.freeze({ ...input.sql }),
        ldap:
          input.ldap && Object.freeze({ ...input.ldap, configuration: Object.freeze({ ...input.ldap.configuration }) }),
        apiKeys: Object.freeze({ ...input.apiKeys }),
        demo,
        readAccess: Object.freeze(
          input.readAccess.map((rule) => Object.freeze({ ...rule, policy: Object.freeze({ ...rule.policy }) })),
        ),
      });
    } catch (error) {
      retainPrimary("construction", error);
      operations.delete(construction.promise);
      construction.reject(new AggregateError([error], "MAIN_AUTH_CONSTRUCTION_FAILED"));
      return construction.promise;
    }
    const create = async () => {
      assertCurrent();
      if (!runtime || !initializationSignal) throw new Error("MAIN_PERSISTENCE_UNAVAILABLE");
      const ownerLifetime = AbortSignal.any([lifetime.signal, initializationSignal]);
      const source = createOnboardingRpcInputProducer();
      assertOnboardingRpcInputProducer(source);
      onboardingSource = source;
      authIssuer = await createProductionSqlSessionIssuer(
        runtime,
        captured.issuer,
        { ...captured.sql, lifetime: ownerLifetime },
        captured.ldap,
        captured.apiKeys,
        source,
      );
      assertCurrent();
      const issuer = authIssuer;
      const fixedDispatch: MainFixedWriteDispatch = Object.freeze({
        dispatchBoardPermissionsAsync(
          lease: Parameters<MainFixedWriteDispatch["dispatchBoardPermissionsAsync"]>[0],
          operation: Parameters<MainFixedWriteDispatch["dispatchBoardPermissionsAsync"]>[1],
          mutation: Parameters<MainFixedWriteDispatch["dispatchBoardPermissionsAsync"]>[2],
        ) {
          return fixedWork.registerFixedDispatch(() =>
            dispatchProductionBoardPermissionsAsync(issuer, lease, operation, mutation),
          );
        },
        dispatchAppCreateAsync(
          lease: Parameters<MainFixedWriteDispatch["dispatchAppCreateAsync"]>[0],
          operation: Parameters<MainFixedWriteDispatch["dispatchAppCreateAsync"]>[1],
          mutation: Parameters<MainFixedWriteDispatch["dispatchAppCreateAsync"]>[2],
        ) {
          return fixedWork.registerFixedDispatch(() =>
            dispatchProductionAppCreateAsync(issuer, lease, operation, mutation),
          );
        },
      });
      authRequests = createAuthenticatedRequestResources({
        issuer: authIssuer,
        onboardingPolicy: captured.issuer.onboarding,
        fixedDispatch,
        onboarding: Object.freeze({ source, reserveScope: onboardingScopesResources.reserveScope }),
        configuration: {
          ...authIssuer.requestConfiguration,
          lifetime: ownerLifetime,
          requestDeadlineMs: captured.requestDeadlineMs,
          demo: captured.demo,
          readAccess: captured.readAccess,
        },
      });
      assertCurrent();
      return authRequests;
    };
    void Promise.resolve()
      .then(create)
      .then(
        (requests) => {
          authConstructionResult = requests;
          operations.delete(construction.promise);
          construction.resolve(requests);
        },
        async (error: unknown) => {
          retainPrimary("construction", error);
          const errors: unknown[] = [error];
          for (const kind of ["auth-requests", "auth-issuer"] as const) {
            if ((kind === "auth-requests" && !authRequests) || (kind === "auth-issuer" && !authIssuer)) continue;
            try {
              await beginCleanup(kind);
            } catch (cleanupError) {
              failures.cleanup.push(cleanupError);
              errors.push(cleanupError);
            }
          }
          operations.delete(construction.promise);
          construction.reject(new AggregateError(errors, "MAIN_AUTH_CONSTRUCTION_FAILED"));
        },
      );
    return construction.promise.then((requests) => {
      assertCurrent();
      return requests;
    });
  }

  function createOnboardingWire(input: OnboardingWireConstructionInput): OwnedOnboardingWireController {
    assertCurrent();
    const issuer = authIssuer;
    const requests = authRequests;
    const source = onboardingSource;
    if (
      onboardingWire ||
      onboardingWireClosing ||
      !issuer ||
      !requests ||
      authConstructionResult !== requests ||
      !source ||
      input.path !== "/rpc" ||
      input.basePath !== "" ||
      input.baseUrl !== issuer.requestConfiguration.externalOrigin
    )
      throw new Error("MAIN_ONBOARDING_WIRE_CONSTRUCTION_UNAVAILABLE");
    const url = new URL(input.baseUrl);
    if (url.origin !== input.baseUrl || url.username || url.password || url.search || url.hash || url.pathname !== "/")
      throw new Error("MAIN_ONBOARDING_WIRE_CONSTRUCTION_UNAVAILABLE");
    assertOnboardingRpcInputProducer(source);
    const contexts = new WeakMap<RequestContext, OnboardingWireRequestRecord>();
    const responses = new WeakMap<Response, ReturnType<typeof createOnboardingWirePublication>>();
    let closing: Promise<void> | undefined;
    function start(context: RequestContext): OnboardingWireRequestRecord {
      assertCurrent();
      if (closing || contexts.has(context)) throw new Error("MAIN_ONBOARDING_WIRE_REQUEST_UNAVAILABLE");
      const record: OnboardingWireRequestRecord = {
        context,
        handler: createAuthHttpTask(),
        factory: createAuthHttpTask(),
        execution: createAuthHttpTask(),
        claim: createAuthHttpTask(),
        serialization: createAuthHttpTask(),
        errorSerialization: createAuthHttpTask(),
        registration: createAuthHttpTask(),
        cancellation: createAuthHttpTask(),
        abandonment: createAuthHttpTask(),
        request: undefined,
        result: undefined,
        source: undefined,
        reservation: undefined,
        primary: { kind: "none" },
        cleanup: [],
      };
      contexts.set(context, record);
      onboardingRequests.add(record);
      return record;
    }
    async function claimResult(record: OnboardingWireRequestRecord): Promise<OnboardingRpcRequestResult> {
      const taskIssuer = issuer;
      const taskRequests = requests;
      if (!taskIssuer || !taskRequests) throw new Error("MAIN_ONBOARDING_WIRE_REQUEST_UNAVAILABLE");
      const context = record.context;
      const preparation = taskRequests.getOnboardingClaimPreparation(context);
      let outcome: ProductionOnboardingResponseOutcome;
      if (preparation.kind === "get") {
        if (context.request.method !== "GET") throw new Error("MAIN_ONBOARDING_CLAIM_METHOD_UNAVAILABLE");
        const prepared = await preparation.prepared;
        context.signal.throwIfAborted();
        record.source = prepared.response;
        outcome = { kind: "output", response: prepared.response };
      } else {
        if (context.request.method !== "POST") throw new Error("MAIN_ONBOARDING_CLAIM_METHOD_UNAVAILABLE");
        const prepared = await preparation.prepared;
        getProductionOnboardingRequestBounds(taskIssuer, preparation.handle, context.request);
        try {
          const result = await runAuthHttpTask(record.claim, () =>
            dispatchProductionOnboardingClaimAsync(taskIssuer, prepared, context.request),
          );
          getProductionOnboardingRequestBounds(taskIssuer, preparation.handle, context.request);
          record.source = await runAuthHttpTask(record.serialization, () =>
            Promise.resolve(
              createOnboardingClaimResponse(result, taskIssuer.requestConfiguration.cookies.useSecureCookies),
            ),
          );
          outcome = { kind: "output", response: record.source };
        } catch (error: unknown) {
          if (record.primary.kind === "none") record.primary = { kind: "failed", error };
          record.source = await runAuthHttpTask(record.errorSerialization, () =>
            Promise.resolve(
              new Response(JSON.stringify({ code: "onboarding_unavailable" }), {
                status: 500,
                headers: { "content-type": "application/json", "cache-control": "no-store" },
              }),
            ),
          );
          outcome = { kind: "error", response: record.source, error };
        }
      }
      const publication = await runAuthHttpTask(record.registration, () =>
        recordProductionOnboardingResponseAsync(taskIssuer, preparation.handle, context.request, outcome),
      );
      await taskRequests.retireOnboardingPrincipalAsync(context, publication, outcome.response);
      const finite = readProductionOnboardingPublication(taskIssuer, publication, context.request, outcome.response);
      return Object.freeze<OnboardingRpcRequestResult>({
        response: outcome.response,
        outcome,
        publication,
        finite,
        cleanup: { kind: "none" },
      });
    }
    function deliver(record: OnboardingWireRequestRecord, result: OnboardingRpcRequestResult): FetchOutcome {
      record.context.signal.throwIfAborted();
      record.context.request.signal.throwIfAborted();
      if (closing || onboardingWireClosing) throw new Error("MAIN_ONBOARDING_WIRE_CLOSED");
      const publicationIssuer = issuer;
      if (!publicationIssuer) throw new Error("MAIN_ONBOARDING_WIRE_REQUEST_UNAVAILABLE");
      const reservation = createOnboardingWirePublication(publicationIssuer, record.context, result);
      record.reservation = reservation;
      responses.set(reservation.response, reservation);
      onboardingReservations.add(reservation);
      void reservation.completion.then(
        (terminal) => {
          onboardingReservations.delete(reservation);
          if (terminal.cleanup === "failed")
            failures.cleanup.push(new Error("MAIN_ONBOARDING_PUBLICATION_CLEANUP_FAILED"));
        },
        (error: unknown) => {
          onboardingReservations.delete(reservation);
          failures.cleanup.push(error);
        },
      );
      return { kind: "response", response: reservation.response };
    }
    async function fail(record: OnboardingWireRequestRecord, error: unknown): Promise<never> {
      const abandonmentIssuer = issuer;
      if (!abandonmentIssuer) throw error;
      if (record.primary.kind === "none") record.primary = { kind: "failed", error };
      if (record.result?.finite.primary.kind === "failed") record.primary = record.result.finite.primary;
      if (record.request) {
        try {
          await record.request.closeAsync();
        } catch (cause: unknown) {
          if (cause !== error) record.cleanup.push(cause);
        }
      }
      if (record.reservation) {
        try {
          const abandoned = await record.reservation.stop(error);
          if (abandoned.cleanup === "failed")
            record.cleanup.push(new Error("MAIN_ONBOARDING_PUBLICATION_CLEANUP_FAILED"));
        } catch (cause: unknown) {
          record.cleanup.push(cause);
        }
      } else if (record.result) {
        const result = record.result;
        try {
          const abandoned = await runAuthHttpTask(record.abandonment, () =>
            settleProductionOnboardingPublicationAsync(
              abandonmentIssuer,
              result.publication,
              record.context.request,
              result.response,
              { kind: "abandoned", cause: error },
            ),
          );
          if (abandoned.cleanup === "failed")
            record.cleanup.push(new Error("MAIN_ONBOARDING_PUBLICATION_CLEANUP_FAILED"));
        } catch (cause: unknown) {
          if (cause !== error) record.cleanup.push(cause);
        }
      } else if (record.registration.settlement.kind === "fulfilled" && record.source) {
        const publication = record.registration.settlement.value;
        const response = record.source;
        try {
          const abandoned = await runAuthHttpTask(record.abandonment, () =>
            settleProductionOnboardingPublicationAsync(
              abandonmentIssuer,
              publication,
              record.context.request,
              response,
              {
                kind: "abandoned",
                cause: error,
              },
            ),
          );
          if (abandoned.cleanup === "failed")
            record.cleanup.push(new Error("MAIN_ONBOARDING_PUBLICATION_CLEANUP_FAILED"));
        } catch (cause: unknown) {
          if (cause !== error) record.cleanup.push(cause);
        }
      } else if (record.source?.body && !record.source.bodyUsed && !record.source.body.locked) {
        const body = record.source.body;
        try {
          await runAuthHttpTask(record.cancellation, () => body.cancel(error));
        } catch (cause: unknown) {
          record.cleanup.push(cause);
        }
      }
      if (record.cleanup.length) {
        failures.cleanup.push(...record.cleanup);
        const primary = record.primary;
        if (primary.kind === "failed")
          throw new AggregateError([primary.error, ...record.cleanup], "MAIN_ONBOARDING_WIRE_REQUEST_FAILED");
        throw new AggregateError([error, ...record.cleanup], "MAIN_ONBOARDING_WIRE_REQUEST_FAILED");
      }
      const primary = record.primary;
      if (primary.kind === "failed") throw primary.error;
      throw error;
    }
    const owner: OnboardingWireRequestOwner = Object.freeze<OnboardingWireRequestOwner>({
      executeRpcAsync(context, command) {
        const record = start(context);
        return runAuthHttpTask(record.handler, async () => {
          try {
            record.request = await runAuthHttpTask(record.factory, () =>
              requests.createOnboardingBackendRequestAsync(context, command),
            );
            if (closing) throw new Error("MAIN_ONBOARDING_WIRE_CLOSED");
            record.result = await runAuthHttpTask(record.execution, record.request.executeAsync);
            return deliver(record, record.result);
          } catch (error: unknown) {
            return await fail(record, error);
          } finally {
            record.request = undefined;
            record.result = undefined;
            record.source = undefined;
            record.reservation = undefined;
            onboardingRequests.delete(record);
          }
        });
      },
      executeClaimAsync(context) {
        const record = start(context);
        return runAuthHttpTask(record.handler, async () => {
          try {
            record.result = await runAuthHttpTask(record.execution, () => claimResult(record));
            return deliver(record, record.result);
          } catch (error: unknown) {
            return await fail(record, error);
          } finally {
            record.request = undefined;
            record.result = undefined;
            record.source = undefined;
            record.reservation = undefined;
            onboardingRequests.delete(record);
          }
        });
      },
    });
    const controller: OwnedOnboardingWireController = Object.freeze<OwnedOnboardingWireController>({
      routes: Object.freeze([...createOnboardingRpcRoutes(owner), createOnboardingClaimRoute(owner)]),
      endpoints: Object.freeze([
        Object.freeze({ method: "GET", path: "/api/onboarding/claim" }),
        Object.freeze({ method: "POST", path: "/api/onboarding/claim" }),
        Object.freeze({ method: "POST", path: "/rpc/onboard/nextStep" }),
        Object.freeze({ method: "POST", path: "/rpc/user/initUser" }),
        Object.freeze({ method: "POST", path: "/rpc/group/createInitialExternalGroup" }),
      ]),
      publication: Object.freeze<OnboardingPublicationProducer>({
        claim(context, response) {
          const reservation = responses.get(response);
          if (!reservation) throw new Error("MAIN_ONBOARDING_PUBLICATION_FOREIGN");
          return reservation.claim(context, response);
        },
        abandonAsync(context, response, cause) {
          const reservation = responses.get(response);
          if (!reservation) throw new Error("MAIN_ONBOARDING_PUBLICATION_FOREIGN");
          return reservation.abandonAsync(context, response, cause);
        },
      }),
      closeAsync() {
        if (closing) return closing;
        const complete = Promise.withResolvers<void>();
        closing = complete.promise;
        onboardingWireClosing = true;
        void complete.promise.catch(() => undefined);
        const reason = new Error("MAIN_ONBOARDING_WIRE_CLOSED");
        const pendingScopes = [...onboardingScopes];
        for (const record of pendingScopes) record.scope.stop(reason);
        const close = async () => {
          const cleanup: unknown[] = [];
          const settledScopes = await Promise.allSettled(pendingScopes.map((record) => record.scope.closeAsync()));
          for (let index = 0; index < settledScopes.length; index++) {
            const settled = settledScopes[index];
            const record = pendingScopes[index];
            if (settled?.status === "rejected" && record && record.cleanup.length) cleanup.push(settled.reason);
          }
          await Promise.allSettled([...onboardingRequests].map((record) => record.handler.completion.promise));
          const publications = [...onboardingReservations];
          const abandoned = await Promise.allSettled(publications.map((reservation) => reservation.stop(reason)));
          for (const result of abandoned) {
            if (result.status === "rejected") cleanup.push(result.reason);
            else if (result.value.cleanup === "failed")
              cleanup.push(new Error("MAIN_ONBOARDING_PUBLICATION_CLEANUP_FAILED"));
          }
          await Promise.allSettled(publications.map((reservation) => reservation.completion));
          if (cleanup.length) throw new AggregateError(cleanup, "MAIN_ONBOARDING_WIRE_CLEANUP_FAILED");
        };
        void Promise.resolve().then(close).then(complete.resolve, complete.reject);
        return complete.promise;
      },
    });
    onboardingWire = controller;
    const publication: OnboardingHttpPublicationProducer = controller.publication;
    onboardingControllers.set(
      controller,
      Object.freeze({ routes: controller.routes, endpoints: controller.endpoints, publication }),
    );
    return controller;
  }

  function assertOnboardingWireController(controller: OwnedOnboardingWireController): void {
    assertCurrent();
    const registration = onboardingControllers.get(controller);
    if (
      !registration ||
      controller !== onboardingWire ||
      !Object.isFrozen(controller) ||
      controller.routes !== registration.routes ||
      controller.endpoints !== registration.endpoints ||
      controller.publication !== registration.publication ||
      !authIssuer ||
      !authRequests ||
      authConstructionResult !== authRequests ||
      onboardingWireClosing
    )
      throw new Error("MAIN_ONBOARDING_WIRE_CONSTRUCTION_UNAVAILABLE");
  }

  function createFixedWriteRpc(input: FixedWriteRpcConstructionInput): readonly FetchContribution[] {
    assertCurrent();
    const requests = authRequests;
    const issuer = authIssuer;
    const capturedRuntime = runtime;
    if (
      !requests ||
      authConstructionResult !== requests ||
      !issuer ||
      !capturedRuntime ||
      capturedRuntime.engine !== "sqlite" ||
      cleanupTasks.has("auth-requests") ||
      cleanupTasks.has("auth-issuer")
    )
      throw new Error("MAIN_FIXED_WRITE_RPC_UNAVAILABLE");
    const assertOwnerCurrent = () => {
      assertCurrent();
      if (
        authRequests !== requests ||
        authConstructionResult !== requests ||
        authIssuer !== issuer ||
        runtime !== capturedRuntime ||
        requests.configuration.lifetime.aborted ||
        cleanupTasks.has("auth-requests") ||
        cleanupTasks.has("auth-issuer")
      )
        throw new Error("MAIN_FIXED_WRITE_RPC_UNAVAILABLE");
    };
    const resources: FixedWriteRpcResources = Object.freeze({
      path: input.path,
      baseUrl: input.baseUrl,
      createId: input.createId,
      maximumRequestBytes: input.maximumRequestBytes,
      maximumResponseBytes: input.maximumResponseBytes,
      requests,
      assertCurrent: assertOwnerCurrent,
      runRequestAsync(handle: () => Promise<Response>) {
        assertOwnerCurrent();
        return fixedWork.runRequestAsync(handle);
      },
      runSetupScopeAsync(signal: AbortSignal, handle: Parameters<FixedWriteRpcResources["runSetupScopeAsync"]>[1]) {
        assertOwnerCurrent();
        return fixedWork.runSetupScopeAsync(signal, handle);
      },
    });
    return createAdmittedFixedWriteRpc(resources);
  }

  function finishAuthHttpReservation(
    record: AuthHttpRecord,
    reservation: AuthHttpPublicationReservation,
    terminal: AuthHttpPublicationTerminal,
  ): void {
    if (
      record.reservation !== reservation ||
      record.context !== reservation.context ||
      record.bounds !== reservation.bounds ||
      record.mapped?.kind !== "response" ||
      record.mapped.response !== reservation.response
    ) {
      throw new Error("MAIN_AUTH_HTTP_PUBLICATION_MISMATCH");
    }
    if (reservation.phase.kind === "terminal") {
      if (reservation.phase.terminal !== terminal) throw new Error("MAIN_AUTH_HTTP_PUBLICATION_ALREADY_FINISHED");
      return;
    }
    if (terminal.kind === "published" && reservation.phase.kind !== "checking") {
      throw new Error("MAIN_AUTH_HTTP_PUBLICATION_NOT_CHECKED");
    }
    Object.freeze(terminal);
    reservation.phase = { kind: "terminal", terminal };
    if (terminal.kind === "cancel-failed" || terminal.kind === "settlement-failed") {
      const errors: unknown[] = [];
      if (terminal.cause.kind === "error") errors.push(terminal.cause.error);
      else errors.push(terminal.cause.reason);
      if (terminal.kind === "cancel-failed") {
        errors.push(terminal.cancellationError, ...terminal.otherFailures.map(({ error }) => error));
      } else {
        errors.push(...terminal.failures.map(({ error }) => error));
      }
      failures.cleanup.push(new AggregateError(errors, "MAIN_AUTH_HTTP_PUBLICATION_SETTLEMENT_FAILED"));
    }
    reservation.completion.resolve(terminal);
    authHttpReservations.delete(reservation.completion.promise);
  }

  function assertAuthHttpController(controller: AuthHttpController): void {
    const assertOwner = authHttpControllers.get(controller);
    if (!assertOwner) throw new Error("MAIN_AUTH_HTTP_CONTROLLER_NOT_OWNED");
    assertOwner();
  }

  function createAuthHttpController(input: AuthHttpConstructionInput): AuthHttpController {
    if (authHttpConstruction !== "unclaimed") throw new Error("MAIN_AUTH_HTTP_ALREADY_CONFIGURED");
    authHttpConstruction = "claimed";
    assertCurrent();
    const requests = authRequests;
    const issuer = authIssuer;
    const capturedRuntime = runtime;
    if (
      !requests ||
      authConstructionResult !== requests ||
      !issuer ||
      !capturedRuntime ||
      capturedRuntime.engine !== "sqlite" ||
      cleanupTasks.has("auth-requests") ||
      cleanupTasks.has("auth-issuer")
    )
      throw new Error("MAIN_AUTH_HTTP_UNAVAILABLE");
    const requestConfiguration = requests.configuration;
    const issuerConfiguration = issuer.requestConfiguration;
    const baseUrl = input.baseUrl;
    const basePath = input.basePath;
    const maximumResponseBytes = input.maximumResponseBytes;
    const origin = new URL(baseUrl);
    if (
      (origin.protocol !== "http:" && origin.protocol !== "https:") ||
      origin.origin !== baseUrl ||
      origin.username ||
      origin.password ||
      origin.pathname !== "/" ||
      origin.search ||
      origin.hash ||
      basePath !== "" ||
      baseUrl !== requestConfiguration.externalOrigin ||
      baseUrl !== issuerConfiguration.externalOrigin ||
      requestConfiguration.cookies.prefix !== issuerConfiguration.cookies.prefix ||
      requestConfiguration.cookies.useSecureCookies !== issuerConfiguration.cookies.useSecureCookies ||
      requestConfiguration.cookies.useSecureCookies !== (origin.protocol === "https:") ||
      requestConfiguration.now !== issuerConfiguration.now ||
      requestConfiguration.providers.length !== issuerConfiguration.providers.length ||
      requestConfiguration.providers.some((provider, index) => provider !== issuerConfiguration.providers[index]) ||
      !Number.isSafeInteger(maximumResponseBytes) ||
      maximumResponseBytes < 1 ||
      maximumResponseBytes > bufferConstants.MAX_LENGTH ||
      maximumResponseBytes > bufferConstants.MAX_STRING_LENGTH
    )
      throw new Error("MAIN_AUTH_HTTP_CONSTRUCTION_UNAVAILABLE");
    const assertOwnerCurrent = () => {
      assertCurrent();
      if (
        authRequests !== requests ||
        authConstructionResult !== requests ||
        authIssuer !== issuer ||
        runtime !== capturedRuntime ||
        requests.configuration !== requestConfiguration ||
        issuer.requestConfiguration !== issuerConfiguration ||
        requestConfiguration.lifetime.aborted ||
        cleanupTasks.has("auth-requests") ||
        cleanupTasks.has("auth-issuer")
      )
        throw new Error("MAIN_AUTH_HTTP_UNAVAILABLE");
    };
    assertOwnerCurrent();

    const cancelOutputAsync = async (
      record: AuthHttpRecord,
      response: Response | undefined = record.response,
    ): Promise<Failure> => {
      if (!response || record.publication === "handed-off" || !response.body) return { kind: "none" };
      let cancellation = record.cancellations.get(response);
      if (!cancellation) {
        cancellation = createAuthHttpTask<void>();
        record.cancellations.set(response, cancellation);
        authHttpRecords.set(cancellation.completion.promise, record);
        void runAuthHttpTask(cancellation, () => cancelAbandonedAuthHttpResponseAsync(response));
      }
      try {
        await cancellation.completion.promise;
      } catch (error) {
        failures.cleanup.push(error);
        return { kind: "failed", error };
      }
      return { kind: "none" };
    };

    const publicationRecordFor = (
      context: RequestContext,
      response: Response,
    ): { readonly record: AuthHttpRecord; readonly reservation: AuthHttpPublicationReservation } => {
      const record = authHttpContexts.get(context);
      if (
        !record ||
        record.controller !== controller ||
        record.context !== context ||
        authHttpResponses.get(response) !== record ||
        record.handler.settlement.kind !== "fulfilled" ||
        record.handler.settlement.value !== record.mapped ||
        record.mapped?.kind !== "response" ||
        record.mapped.response !== response ||
        record.publication !== "handed-off" ||
        record.responseSource === "unselected" ||
        !record.bounds ||
        !record.capture ||
        !record.reservation ||
        record.reservation.response !== response ||
        record.reservation.context !== context ||
        record.reservation.bounds !== record.bounds
      ) {
        throw new Error("MAIN_AUTH_HTTP_RESPONSE_NOT_OWNED");
      }
      if (record.responseSource === "issuer-released-response") {
        const settlement = record.executor.settlement;
        if (
          settlement.kind !== "fulfilled" ||
          settlement.value.publication !== "released" ||
          settlement.value.output.type !== "response" ||
          settlement.value.output.response !== response ||
          record.response !== response
        ) {
          throw new Error("MAIN_AUTH_HTTP_RELEASE_LINEAGE_MISMATCH");
        }
      } else if (record.responseSource === "local-rejection") {
        if (
          (record.selection?.kind !== "method-not-allowed" && record.selection?.kind !== "provider-disabled") ||
          record.executor.settlement.kind !== "skipped"
        ) {
          throw new Error("MAIN_AUTH_HTTP_LOCAL_LINEAGE_MISMATCH");
        }
      } else if (record.responseSource === "held-response") {
        if (
          record.executor.settlement.kind !== "fulfilled" ||
          record.executor.settlement.value.publication !== "held"
        ) {
          throw new Error("MAIN_AUTH_HTTP_HELD_LINEAGE_MISMATCH");
        }
      } else if (record.failure.kind !== "failed") {
        throw new Error("MAIN_AUTH_HTTP_FAILURE_LINEAGE_MISMATCH");
      }
      return { record, reservation: record.reservation };
    };

    const controller: AuthHttpController = Object.freeze({
      handle(context: RequestContext): Promise<FetchOutcome> {
        if (closing || state.kind !== "ready" || lifetime.signal.aborted || authHttpContexts.has(context))
          return Promise.reject(new Error("MAIN_AUTH_HTTP_REQUEST_UNAVAILABLE"));
        const record: AuthHttpRecord = {
          controller,
          context,
          handler: createAuthHttpTask<FetchOutcome>(),
          preflight: createAuthHttpTask<void>(),
          executor: createAuthHttpTask<IssuerPublicationOutcome>(),
          cancellations: new Map(),
          selection: undefined,
          capture: undefined,
          bounds: undefined,
          reservation: undefined,
          responseSource: "unselected",
          response: undefined,
          mapped: undefined,
          failure: { kind: "none" },
          reservationFailure: { kind: "none" },
          publication: "pending",
          retired: false,
        };
        authHttpContexts.set(context, record);
        authHttpRecords.set(record.handler.completion.promise, record);
        authHttpRecords.set(record.preflight.completion.promise, record);
        authHttpRecords.set(record.executor.completion.promise, record);
        authHttpTasks.add(record.handler.completion.promise);
        const execute = async (): Promise<FetchOutcome> => {
          try {
            assertOwnerCurrent();
            const request = context.request;
            const selection = selectAuthHttpRequest(request, requestConfiguration.providers);
            record.selection = selection;
            if (selection.kind === "pass") {
              record.mapped = { kind: "pass" };
              assertOwnerCurrent();
              record.publication = "handed-off";
              return record.mapped;
            }
            record.capture = Object.freeze({
              request,
              requestId: context.requestId,
              signal: context.signal,
              principal: context.principal,
              onDispose: context.onDispose,
            });
            const bounds = requests.getHttpRequestBounds(context);
            record.bounds = bounds;
            context.onDispose(() => {
              record.retired = true;
            });
            const assertPublicationCurrent = () => {
              assertOwnerCurrent();
              if (record.retired || authHttpContexts.get(context) !== record || context.request !== request)
                throw new Error("MAIN_AUTH_HTTP_REQUEST_RETIRED");
              requests.assertHttpRequestCurrent(context);
            };
            assertPublicationCurrent();
            let response: Response;
            if (selection.kind === "method-not-allowed") {
              response = new Response(null, { status: 405, headers: { allow: selection.allow } });
              record.responseSource = "local-rejection";
            } else if (selection.kind === "provider-disabled") {
              response = new Response(null, { status: 404 });
              record.responseSource = "local-rejection";
            } else {
              await runAuthHttpTask(record.preflight, () => requests.admitHttpRequestAsync(context));
              assertPublicationCurrent();
              const outcome = await runAuthHttpTask(record.executor, () =>
                issuer.executeHttpAsync(request, selection.action, bounds, maximumResponseBytes),
              );
              if (outcome.publication === "released" && outcome.output.type === "response")
                record.response = outcome.output.response;
              const output = classifyLegacyAuthHttpOutcome(selection.action, outcome);
              if (output.kind === "contract-mismatch") throw new Error("MAIN_AUTH_HTTP_PRODUCER_CONTRACT_MISMATCH");
              if (output.kind === "released") {
                response = output.response;
                record.responseSource = "issuer-released-response";
                if (response.bodyUsed || response.body?.locked) throw new Error("MAIN_AUTH_HTTP_OUTPUT_NOT_OWNED");
              } else {
                response = new Response(null, { status: 503 });
                record.responseSource = "held-response";
              }
            }
            record.mapped = { kind: "response", response };
            assertPublicationCurrent();
            return record.mapped;
          } catch (error) {
            record.failure = { kind: "failed", error };
            record.publication = "withheld";
            await cancelOutputAsync(record);
            if (!record.bounds) throw error;
            record.mapped = { kind: "response", response: new Response(null, { status: 503 }) };
            record.responseSource = "failure-response";
            return record.mapped;
          } finally {
            for (const task of [record.preflight, record.executor]) {
              if (task.settlement.kind === "registered") {
                task.settlement = { kind: "skipped" };
                task.completion.reject(new Error("MAIN_AUTH_HTTP_TASK_NOT_FORWARDED"));
              }
            }
          }
        };
        const finalizeHandler = async (): Promise<FetchOutcome> => {
          const mapped = await execute();
          if (mapped.kind === "pass") return mapped;
          const response = mapped.response;
          try {
            const bounds = record.bounds;
            if (!bounds || record.mapped !== mapped || record.reservation || authHttpResponses.has(response)) {
              throw new Error("MAIN_AUTH_HTTP_RESERVATION_UNAVAILABLE");
            }
            const publicationLifetime = AbortSignal.any([lifetime.signal, bounds.lifetime, bounds.signal]);
            const completion = Promise.withResolvers<AuthHttpPublicationTerminal>();
            const reservation: AuthHttpPublicationReservation = {
              context,
              response,
              bounds,
              lifetime: publicationLifetime,
              completion,
              phase: { kind: "reserved" },
            };
            record.reservation = reservation;
            authHttpResponses.set(response, record);
            authHttpReservations.add(completion.promise);
            record.publication = "handed-off";
            return mapped;
          } catch (error) {
            record.reservationFailure = { kind: "failed", error };
            if (record.failure.kind === "none") record.failure = { kind: "failed", error };
            record.publication = "withheld";
            const cancellation = await cancelOutputAsync(record, response);
            let terminal: AuthHttpPublicationAbandonment = { kind: "abandoned", cause: { kind: "error", error } };
            if (cancellation.kind === "failed") {
              terminal = {
                kind: "cancel-failed",
                cause: { kind: "error", error },
                cancellationError: cancellation.error,
                otherFailures: [],
              };
            }
            if (record.reservation) finishAuthHttpReservation(record, record.reservation, terminal);
            if (cancellation.kind === "failed") {
              throw new AggregateError([error, cancellation.error], "MAIN_AUTH_HTTP_RESERVATION_SETTLEMENT_FAILED");
            }
            throw error;
          }
        };
        void runAuthHttpTask(record.handler, () => Promise.resolve().then(finalizeHandler));
        void record.handler.completion.promise.then(
          () => authHttpTasks.delete(record.handler.completion.promise),
          () => authHttpTasks.delete(record.handler.completion.promise),
        );
        return record.handler.completion.promise;
      },
      claimResponsePublication(
        this: AuthHttpController,
        context: RequestContext,
        response: Response,
      ): AuthHttpPublicationHandle {
        if (this !== controller || !authHttpControllers.has(controller)) {
          throw new Error("MAIN_AUTH_HTTP_CONTROLLER_NOT_OWNED");
        }
        const { record, reservation } = publicationRecordFor(context, response);
        if (reservation.phase.kind !== "reserved") throw new Error("MAIN_AUTH_HTTP_PUBLICATION_ALREADY_CLAIMED");
        try {
          const handle: AuthHttpPublicationHandle = Object.freeze({
            lifetime: reservation.lifetime,
            assertCurrent(this: AuthHttpPublicationHandle): void {
              if (
                this !== handle ||
                authHttpHandles.get(handle) !== reservation ||
                record.reservation !== reservation ||
                (reservation.phase.kind !== "awaiting-first-check" && reservation.phase.kind !== "checking") ||
                reservation.phase.handle !== handle
              ) {
                throw new Error("MAIN_AUTH_HTTP_PUBLICATION_NOT_OWNED");
              }
              reservation.phase = { kind: "checking", handle };
              const capture = record.capture;
              if (
                !capture ||
                record.retired ||
                context.request !== capture.request ||
                context.requestId !== capture.requestId ||
                context.signal !== capture.signal ||
                context.principal !== capture.principal ||
                context.onDispose !== capture.onDispose ||
                authHttpContexts.get(context) !== record ||
                record.bounds !== reservation.bounds
              ) {
                throw new Error("MAIN_AUTH_HTTP_REQUEST_RETIRED");
              }
              reservation.lifetime.throwIfAborted();
              assertOwnerCurrent();
              requests.assertHttpRequestCurrent(context);
              if (
                !Number.isSafeInteger(reservation.bounds.deadlineAt) ||
                Date.now() >= reservation.bounds.deadlineAt ||
                requestConfiguration.now() >= reservation.bounds.deadlineAt
              ) {
                throw new Error("MAIN_AUTH_HTTP_PUBLICATION_DEADLINE");
              }
              reservation.lifetime.throwIfAborted();
            },
            finish(this: AuthHttpPublicationHandle, terminal: AuthHttpPublicationTerminal): void {
              if (this !== handle || authHttpHandles.get(handle) !== reservation) {
                throw new Error("MAIN_AUTH_HTTP_PUBLICATION_NOT_OWNED");
              }
              finishAuthHttpReservation(record, reservation, terminal);
            },
          });
          authHttpHandles.set(handle, reservation);
          reservation.phase = { kind: "awaiting-first-check", handle };
          return handle;
        } catch (error) {
          reservation.phase = { kind: "claim-unwind", error };
          throw error;
        }
      },
      finishUnclaimedResponsePublication(
        this: AuthHttpController,
        context: RequestContext,
        response: Response,
        terminal: AuthHttpPublicationAbandonment,
      ): void {
        if (this !== controller || !authHttpControllers.has(controller)) {
          throw new Error("MAIN_AUTH_HTTP_CONTROLLER_NOT_OWNED");
        }
        const { record, reservation } = publicationRecordFor(context, response);
        if (
          reservation.phase.kind !== "reserved" &&
          reservation.phase.kind !== "claim-unwind" &&
          reservation.phase.kind !== "awaiting-first-check"
        ) {
          if (reservation.phase.kind === "terminal" && reservation.phase.terminal === terminal) return;
          throw new Error("MAIN_AUTH_HTTP_PUBLICATION_ALREADY_DELIVERED");
        }
        finishAuthHttpReservation(record, reservation, terminal);
      },
    });
    authHttpControllers.set(controller, assertOwnerCurrent);
    return controller;
  }

  try {
    const { engine, path, mode, migrationsFolder, epochInitializationTimeoutMs: timeoutMs } = configuration;
    if (
      engine !== "sqlite" ||
      typeof path !== "string" ||
      path.length === 0 ||
      path.includes("\0") ||
      (mode !== "fresh" && mode !== "existing") ||
      typeof migrationsFolder !== "string" ||
      migrationsFolder.length === 0 ||
      migrationsFolder.includes("\0") ||
      !Number.isSafeInteger(timeoutMs) ||
      timeoutMs < 1 ||
      timeoutMs > 2147483647
    )
      throw new Error("MAIN_PERSISTENCE_CONSTRUCTION_FAILED");
    const pinned = Object.freeze({ engine, path, mode, migrationsFolder, epochInitializationTimeoutMs: timeoutMs });
    epochInitializationTimeoutMs = pinned.epochInitializationTimeoutMs;
    const nativeConfiguration: PersistenceConfig = Object.freeze({
      engine,
      path,
      mode,
      migrationsFolder,
      logger: undefined,
    });
    helper = createMainPersistenceResources<NativeDatabase, NativeSchema>({
      configuration: pinned,
      factories: {
        createPersistenceRuntime() {
          if (runtime) throw new Error("MAIN_PERSISTENCE_CONSTRUCTION_FAILED");
          runtime = createPersistenceRuntime(nativeConfiguration);
          return runtime;
        },
        createProxySettingsReader(candidate) {
          if (!runtime || candidate !== runtime || proxyReader) throw new Error("MAIN_PERSISTENCE_CONSTRUCTION_FAILED");
          proxyReader = createProxySettingsReader(runtime);
          return proxyReader;
        },
        seedDataAsync,
      },
    });
    const contribution: RuntimeContribution = Object.freeze({ id: "main-persistence", ready, dispose });
    const guardedProxy = Object.freeze({
      getOnboardingStepAsync: () =>
        registerOperation(() => {
          if (!proxyReader) throw new Error("MAIN_PERSISTENCE_UNAVAILABLE");
          return proxyReader.getOnboardingStepAsync();
        }),
      getDefaultLocaleAsync: () =>
        registerOperation(() => {
          if (!proxyReader) throw new Error("MAIN_PERSISTENCE_UNAVAILABLE");
          return proxyReader.getDefaultLocaleAsync();
        }),
    });
    const guardedRuntime = Object.freeze({
      get engine() {
        if (!runtime) throw new Error("MAIN_PERSISTENCE_UNAVAILABLE");
        return runtime.engine;
      },
      get phase() {
        if (!runtime) throw new Error("MAIN_PERSISTENCE_UNAVAILABLE");
        return runtime.phase;
      },
      runAsync,
      checkReadinessAsync: () =>
        registerOperation(() => {
          if (!runtime) throw new Error("MAIN_PERSISTENCE_UNAVAILABLE");
          return runtime.checkReadinessAsync();
        }),
    });
    const result = Object.freeze({
      contribution,
      ready,
      dispose,
      assertCurrent,
      runAsync,
      runtime: guardedRuntime,
      createAuthenticatedReadResourcesAsync,
      createFixedWriteRpc,
      createOnboardingWire,
      assertOnboardingWireController,
      createAuthHttpController,
      assertAuthHttpController,
      proxyReader: guardedProxy,
      get epoch(): string {
        assertCurrent();
        if (epoch === undefined) throw new Error("MAIN_PERSISTENCE_UNAVAILABLE");
        return epoch;
      },
      get status() {
        return Object.freeze({
          phase: state.kind,
          runtimeAcquired: runtime !== undefined,
          didClose: state.kind === "closed",
          primaryFailure: failures.primaryStage,
          operationFailed: failures.operation.kind === "failed",
          cleanupFailed: state.kind === "close-failed",
        });
      },
    });
    state = { kind: "configured" };
    return result;
  } catch (error) {
    retainPrimary("construction", error);
    await dispose().catch(() => undefined);
    throw sanitizedFailure("MAIN_PERSISTENCE_CONSTRUCTION_FAILED");
  }
}
