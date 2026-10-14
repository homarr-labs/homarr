import { integrationKinds } from "@homarr/definitions";
import type { IntegrationKind } from "@homarr/definitions";

import { createIntegrationAsync } from "../base/creator";
import type { IntegrationInstanceOfKind } from "../base/creator";
import type { IIntegrationErrorHandler } from "../base/errors/handler";
import type { IntegrationInput } from "../base/integration";
import type { TestingResult } from "../base/test-connection/test-connection-service";
import { requireIntegrationRuntimeResources, withIntegrationRuntimeAsync } from "../runtime/context";
import type {
  IntegrationAuthority,
  IntegrationConfiguration,
  IntegrationExecutionContext,
  IntegrationRuntimeLog,
  IntegrationRuntimeResources,
} from "../runtime/contracts";
import { createIntegrationRuntime } from "../runtime/executor";
import type { IntegrationConnectionResult, IntegrationRuntimeRequest } from "../runtime/executor";
import { statsProviders } from "../stats/providers";
import { StatsIntegration } from "../stats/stats-integration";
import type { StatsProvider } from "../stats/types";
import { createSavedIntegrationBindings } from "./configuration";
import type { SavedIntegrationResources } from "./configuration";
import { createIntegrationCacheBindings } from "./caches";
import type { IntegrationCacheBindingResources } from "./caches";
import { IntegrationBindingError, requireIntegrationProducer } from "./errors";
import type { IntegrationProducer } from "./errors";
import { createIntegrationBindingLifetime } from "./lifetime";
import type { IntegrationBindingLifetime } from "./lifetime";
import { createIntegrationSessionBindings } from "./sessions";
import type { IntegrationSessionResources } from "./sessions";
import { createIntegrationTransportBindings } from "./transport";
import type { IntegrationTransportBindingResources } from "./transport";

type NativeStatsKind = keyof typeof statsProviders;

const isNativeStatsKind = (kind: IntegrationKind): kind is NativeStatsKind => Object.hasOwn(statsProviders, kind);

const assertClassResources = (kind: IntegrationKind) => {
  if (!isNativeStatsKind(kind)) throw new IntegrationBindingError("native-class-resources", kind);
};

const getStatsTransport = (kind: NativeStatsKind) => {
  const provider: StatsProvider = statsProviders[kind];
  return provider.transport ?? "fetch";
};

export const getIntegrationBindingCoverage = () =>
  integrationKinds.map((kind) => ({
    kind,
    factory: "source-89-kind" as const,
    configuration: "saved-sql-candidate" as const,
    classResources: isNativeStatsKind(kind)
      ? { kind: "candidate" as const, transport: getStatsTransport(kind) }
      : { kind: "held" as const, resource: "native-class-resources" as const },
  }));

export interface IntegrationBindingResources<TPrincipal> {
  readonly saved: SavedIntegrationResources<TPrincipal>;
  readonly sessions: Omit<IntegrationSessionResources, "codec">;
  readonly transport: Omit<IntegrationTransportBindingResources, "trust" | "assertCurrentAsync">;
  readonly errorHandlers: readonly IIntegrationErrorHandler[];
  readonly log?: IntegrationRuntimeLog;
  readonly clock: { now(): number };
  readonly executionTimeoutMs: number;
  readonly caches: IntegrationCacheBindingResources;
  readonly connectionTestAuthority: IntegrationProducer<{
    authorizeAsync(
      input: IntegrationInput & { kind: IntegrationKind },
      scope: IntegrationConnectionTestScope<TPrincipal>,
      signal: AbortSignal,
    ): Promise<void>;
  }>;
}

export type IntegrationConnectionTestScope<TPrincipal> =
  | { readonly kind: "snapshot"; readonly principal: TPrincipal; assertCurrentAsync(): Promise<void> }
  | { readonly kind: "management"; assertCurrentAsync(): Promise<void> };

export interface SavedIntegrationOperation<TPrincipal, TKind extends IntegrationKind = IntegrationKind> {
  readonly principal: TPrincipal;
  readonly integration: IntegrationConfiguration & { readonly kind: TKind };
  readonly authority: IntegrationAuthority;
  readonly signal: AbortSignal;
  readonly deadlineAt: number;
  assertCurrentAsync(): Promise<void>;
}

export interface SavedIntegrationLease<TKind extends IntegrationKind> {
  readonly input: IntegrationInput & { readonly kind: TKind };
  readonly runtime: IntegrationRuntimeResources;
  readonly authority: IntegrationAuthority;
  readonly createIntegrationAsync: typeof createIntegrationAsync;
  runAsync<T>(operation: () => Promise<T>): Promise<T>;
  assertCurrentAsync(): Promise<void>;
  releaseAsync(): Promise<void>;
}

const connectionResult = (result: TestingResult): IntegrationConnectionResult => {
  if (result.success) return { success: true };
  const error = result.error;
  switch (error.type) {
    case "unknown":
    case "parse":
      return { success: false, error: { type: error.type } };
    case "authorization":
    case "statusCode":
      return { success: false, error: { type: error.type, statusCode: error.data.statusCode } };
    case "request":
      return {
        success: false,
        error: {
          type: "request",
          requestType: error.data.requestError.type,
          requestReason: error.data.requestError.reason,
          requestCode: error.data.requestError.code,
        },
      };
    case "certificate":
      return {
        success: false,
        error: {
          type: "certificate",
          certificatePem: error.data.certificate.toString(),
          fingerprint256: error.data.certificate.fingerprint256,
          requestReason: error.data.requestError.reason,
          requestCode: error.data.requestError.code,
        },
      };
  }
};

export const createOwnedIntegrationBindings = <TPrincipal>(resources: IntegrationBindingResources<TPrincipal>) => {
  if (
    !Number.isSafeInteger(resources.executionTimeoutMs) ||
    resources.executionTimeoutMs <= 0 ||
    resources.executionTimeoutMs > 2_147_483_647
  ) {
    throw new RangeError("Integration execution timeout must be a positive bounded integer");
  }
  const saved = createSavedIntegrationBindings(resources.saved);
  const lifetime = createIntegrationBindingLifetime();
  const caches = createIntegrationCacheBindings(resources.caches, lifetime);
  const testingInputs = new WeakMap<IntegrationRuntimeResources, string>();
  const serializeTestingInput = (input: IntegrationInput & { kind: IntegrationKind }) =>
    JSON.stringify({
      id: input.id,
      kind: input.kind,
      name: input.name,
      url: input.url,
      externalUrl: input.externalUrl,
      secrets: input.decryptedSecrets.map(({ kind, value }) => ({ kind, value })),
    });
  const configurationFor = (
    input: IntegrationInput,
    context: IntegrationExecutionContext,
  ): IntegrationConfiguration => {
    if (!input.kind) throw new IntegrationBindingError("native-class-resources");
    return {
      id: input.id,
      kind: input.kind,
      name: input.name,
      url: input.url,
      externalUrl: input.externalUrl,
      configurationIdentity: context.configurationIdentity,
      trustIdentity: context.trustIdentity,
    };
  };

  const createResources = (
    input: IntegrationInput,
    context: IntegrationExecutionContext,
    owner: IntegrationBindingLifetime,
    assertCurrentAsync: (context: IntegrationExecutionContext) => Promise<void>,
  ): IntegrationRuntimeResources => {
    owner.assertOpen();
    if (!input.kind) throw new IntegrationBindingError("native-class-resources");
    assertClassResources(input.kind);
    return {
      context,
      sessions: createIntegrationSessionBindings(
        { ...resources.sessions, codec: resources.saved.codec },
        context,
        owner,
      ),
      transport: createIntegrationTransportBindings(
        {
          ...resources.transport,
          trust: resources.saved.trust,
          assertCurrentAsync,
        },
        owner,
      ),
      errorHandlers: resources.errorHandlers,
      log: resources.log,
    };
  };

  const native = createIntegrationRuntime<TPrincipal>({
    policy: saved.policy,
    createResourcesAsync: async (input, context) =>
      createResources(input, context, lifetime, (operationContext) =>
        saved.assertCurrentAsync(configurationFor(input, operationContext), operationContext.signal),
      ),
    fetchStatsAsync: async (input, signal) => {
      if (!isNativeStatsKind(input.kind)) throw new IntegrationBindingError("native-stats-projection", input.kind);
      return await new StatsIntegration(input, statsProviders[input.kind]).getStatsAsync(signal);
    },
    now: () => resources.clock.now(),
  });

  const assertNativeResources = (kind: IntegrationKind) => {
    lifetime.assertOpen();
    assertClassResources(kind);
    requireIntegrationProducer(resources.saved.sql, "saved-sql-snapshot");
    requireIntegrationProducer(resources.saved.codec, "credential-codec");
    requireIntegrationProducer(resources.saved.trust, "trusted-material");
    requireIntegrationProducer(resources.saved.authority, "native-authority");
  };

  const acquireSavedOperationAsync = <TKind extends IntegrationKind>(
    operation: SavedIntegrationOperation<TPrincipal, TKind>,
  ): Promise<SavedIntegrationLease<TKind>> => {
    const principal = operation.principal;
    const integration = Object.freeze({ ...operation.integration });
    const authority = operation.authority;
    const callerSignal = operation.signal;
    const assertOperationCurrentAsync = operation.assertCurrentAsync.bind(operation);
    const requestedDeadlineAt = operation.deadlineAt;
    return lifetime.trackAsync(async () => {
      const now = resources.clock.now();
      const requestedTimeoutMs = requestedDeadlineAt - now;
      if (
        !Number.isSafeInteger(now) ||
        !Number.isSafeInteger(requestedDeadlineAt) ||
        requestedTimeoutMs <= 0 ||
        requestedTimeoutMs > 2_147_483_647
      ) {
        throw new RangeError("Saved integration deadline must be a future bounded integer");
      }
      if (authority !== "query" && authority !== "interact" && authority !== "full") {
        throw new IntegrationBindingError("native-authority", integration.kind);
      }
      const deadlineAt = Math.min(requestedDeadlineAt, now + resources.executionTimeoutMs);
      if (!Number.isSafeInteger(deadlineAt)) throw new RangeError("Saved integration deadline is out of range");
      const owner = createIntegrationBindingLifetime();
      const controller = new AbortController();
      const signal = controller.signal;
      const listeners: { readonly source: AbortSignal; readonly abort: () => void }[] = [];
      const scopes = new WeakMap<IntegrationRuntimeResources, { open: boolean }>();
      let timer: ReturnType<typeof setTimeout> | undefined;
      let released = false;
      let running = false;
      const cleanup = () => {
        if (timer !== undefined) {
          clearTimeout(timer);
          timer = undefined;
        }
        for (const { source, abort } of listeners) source.removeEventListener("abort", abort);
        listeners.length = 0;
      };
      const closeChildAsync = lifetime.own(async () => {
        released = true;
        controller.abort(new IntegrationBindingError("closed", integration.kind));
        try {
          await owner.closeAsync();
        } finally {
          cleanup();
        }
      });
      const releaseAsync = () => {
        released = true;
        controller.abort(new IntegrationBindingError("closed", integration.kind));
        return closeChildAsync();
      };
      const releaseAfterFailureAsync = async (error: unknown): Promise<never> => {
        try {
          await releaseAsync();
        } catch (cleanupError) {
          throw new AggregateError([error, cleanupError], "Saved integration operation and release failed", {
            cause: error,
          });
        }
        throw error;
      };
      const assertAvailable = () => {
        lifetime.assertOpen();
        owner.assertOpen();
        signal.throwIfAborted();
        if (released) throw new IntegrationBindingError("closed", integration.kind);
        const currentNow = resources.clock.now();
        if (!Number.isSafeInteger(currentNow) || currentNow >= deadlineAt) {
          controller.abort(new DOMException("Saved integration operation timed out", "TimeoutError"));
          signal.throwIfAborted();
        }
        if (!Object.is(operation.principal, principal) || operation.authority !== authority) {
          throw new IntegrationBindingError("native-authority", integration.kind);
        }
      };
      const assertCurrentAsync = async () => {
        assertAvailable();
        await assertOperationCurrentAsync();
        assertAvailable();
        await saved.policy.authorizeAsync(principal, integration, authority, signal);
        assertAvailable();
        await saved.assertCurrentAsync(integration, signal);
        assertAvailable();
        await assertOperationCurrentAsync();
        assertAvailable();
        await saved.policy.authorizeAsync(principal, integration, authority, signal);
        assertAvailable();
      };
      const requireScope = () => {
        assertAvailable();
        const scoped = requireIntegrationRuntimeResources();
        const scope = scopes.get(scoped);
        if (!scope?.open) throw new IntegrationBindingError("native-class-resources", integration.kind);
        return { scoped, scope };
      };
      try {
        for (const source of [callerSignal, lifetime.signal, owner.signal]) {
          if (source.aborted) {
            controller.abort(source.reason);
            break;
          }
          const abort = () => controller.abort(source.reason);
          listeners.push({ source, abort });
          source.addEventListener("abort", abort, { once: true });
        }
        assertAvailable();
        timer = setTimeout(
          () => controller.abort(new DOMException("Saved integration operation timed out", "TimeoutError")),
          deadlineAt - resources.clock.now(),
        );
        timer.unref?.();
        assertNativeResources(integration.kind);
        const lease = await owner.trackAsync(async (): Promise<SavedIntegrationLease<TKind>> => {
          await assertCurrentAsync();
          const secrets = await saved.resolveSecretsAsync(integration, signal, { assertCurrentAsync });
          await assertCurrentAsync();
          const decryptedSecrets = secrets.map((secret) => Object.freeze({ ...secret }));
          Object.freeze(decryptedSecrets);
          const input = Object.freeze({ ...integration, decryptedSecrets });
          const codec = requireIntegrationProducer(resources.saved.codec, "credential-codec");
          const fingerprint = codec.fingerprint(serializeTestingInput(input));
          const context = Object.freeze({
            signal,
            deadlineAt,
            configurationIdentity: integration.configurationIdentity,
            trustIdentity: integration.trustIdentity,
          });
          const captureInput = <TInput extends IntegrationInput>(candidate: TInput) => {
            const capturedSecrets = candidate.decryptedSecrets.map((secret) => Object.freeze({ ...secret }));
            Object.freeze(capturedSecrets);
            return Object.freeze({ ...candidate, decryptedSecrets: capturedSecrets });
          };
          const assertInput = (candidate: IntegrationInput) => {
            if (
              !candidate.kind ||
              !codec.verifyFingerprint(serializeTestingInput({ ...candidate, kind: candidate.kind }), fingerprint)
            ) {
              throw new IntegrationBindingError("stale", integration.kind);
            }
          };
          const assertScopedCurrentAsync = async (operationContext: IntegrationExecutionContext) => {
            const { scoped, scope } = requireScope();
            if (
              operationContext.configurationIdentity !== integration.configurationIdentity ||
              operationContext.trustIdentity !== integration.trustIdentity ||
              operationContext.deadlineAt > deadlineAt ||
              !Number.isSafeInteger(operationContext.deadlineAt) ||
              operationContext.deadlineAt <= resources.clock.now()
            ) {
              throw new IntegrationBindingError("stale", integration.kind);
            }
            operationContext.signal.throwIfAborted();
            scoped.context.signal.throwIfAborted();
            assertInput(input);
            await assertCurrentAsync();
            if (!scope.open || scopes.get(scoped) !== scope) {
              throw new IntegrationBindingError("closed", integration.kind);
            }
            operationContext.signal.throwIfAborted();
            scoped.context.signal.throwIfAborted();
            assertInput(input);
          };
          const providerResources = createResources(input, context, owner, assertScopedCurrentAsync);
          const transport: IntegrationRuntimeResources["transport"] = {
            runAsync: providerResources.transport.runAsync,
            acquireTestingAsync(candidate, operationContext) {
              const capturedInput = captureInput(candidate);
              assertInput(capturedInput);
              return providerResources.transport.acquireTestingAsync(capturedInput, operationContext);
            },
            testConnectionAsync(candidate, operationContext, callback) {
              if (authority !== "full") throw new IntegrationBindingError("native-authority", integration.kind);
              const capturedInput = captureInput(candidate);
              assertInput(capturedInput);
              return providerResources.transport.testConnectionAsync(capturedInput, operationContext, callback);
            },
          };
          const runtime = Object.freeze({
            ...providerResources,
            transport: Object.freeze(transport),
            sessions: Object.freeze(providerResources.sessions),
          });
          const createSavedIntegrationAsync = <TClientKind extends IntegrationKind>(
            candidate: IntegrationInput & { kind: TClientKind },
          ): Promise<IntegrationInstanceOfKind<TClientKind>> =>
            owner.trackAsync(async (): Promise<IntegrationInstanceOfKind<TClientKind>> => {
              const { scoped } = requireScope();
              assertClassResources(candidate.kind);
              const capturedInput: IntegrationInput & { kind: TClientKind } = captureInput(candidate);
              assertInput(capturedInput);
              await assertScopedCurrentAsync(scoped.context);
              const client = await createIntegrationAsync<TClientKind>(capturedInput);
              await assertScopedCurrentAsync(scoped.context);
              assertInput(capturedInput);
              return new Proxy(client, {
                get(target, property, receiver) {
                  const member: unknown = Reflect.get(target, property, receiver);
                  if (typeof member !== "function") return member;
                  return (...args: unknown[]) =>
                    owner.trackAsync(async () => {
                      const active = requireScope();
                      if (property === "getStatsAsync") {
                        if (authority !== "query") throw new IntegrationBindingError("native-authority", input.kind);
                      } else if (property === "testConnectionAsync" || property === "getHttpAuthenticationAsync") {
                        if (authority !== "full") throw new IntegrationBindingError("native-authority", input.kind);
                      } else {
                        throw new IntegrationBindingError("native-class-resources", input.kind);
                      }
                      await assertScopedCurrentAsync(active.scoped.context);
                      assertInput(capturedInput);
                      const result: unknown = await Reflect.apply(member, target, args);
                      await assertScopedCurrentAsync(active.scoped.context);
                      assertInput(capturedInput);
                      return result;
                    });
                },
              });
            });
          const runAsync = <T>(callback: () => Promise<T>): Promise<T> => {
            if (running) {
              return Promise.reject(new IntegrationBindingError("native-class-resources", integration.kind));
            }
            running = true;
            let work: Promise<T>;
            try {
              work = owner.trackAsync(async () => {
                try {
                  await assertCurrentAsync();
                  const scoped = Object.freeze({ ...runtime, context });
                  const scope = { open: true };
                  scopes.set(scoped, scope);
                  try {
                    const result = await withIntegrationRuntimeAsync(scoped, async () => {
                      await assertScopedCurrentAsync(context);
                      const value = await callback();
                      await assertScopedCurrentAsync(context);
                      return value;
                    });
                    await assertCurrentAsync();
                    if (!scope.open || scopes.get(scoped) !== scope) {
                      throw new IntegrationBindingError("closed", integration.kind);
                    }
                    assertInput(input);
                    return result;
                  } finally {
                    scope.open = false;
                    scopes.delete(scoped);
                  }
                } finally {
                  running = false;
                }
              });
            } catch (error) {
              running = false;
              return releaseAfterFailureAsync(error);
            }
            return work.catch(releaseAfterFailureAsync);
          };
          await assertCurrentAsync();
          return Object.freeze({
            input,
            runtime,
            authority,
            createIntegrationAsync: createSavedIntegrationAsync,
            runAsync,
            assertCurrentAsync,
            releaseAsync,
          });
        });
        await assertCurrentAsync();
        return lease;
      } catch (error) {
        return await releaseAfterFailureAsync(error);
      }
    });
  };

  const guardedNative = {
    executeNativeAsync<TKind extends IntegrationKind, TValue>(
      request: IntegrationRuntimeRequest<TPrincipal, TKind>,
      authority: "query" | "interact",
      operation: (client: IntegrationInstanceOfKind<TKind>, context: IntegrationExecutionContext) => Promise<TValue>,
    ) {
      assertNativeResources(request.integration.kind);
      return native.executeNativeAsync(request, authority, operation);
    },
    fetchStatsAsync(request: IntegrationRuntimeRequest<TPrincipal>) {
      assertNativeResources(request.integration.kind);
      return native.fetchStatsAsync(request);
    },
    getHttpAuthenticationAsync(request: IntegrationRuntimeRequest<TPrincipal>) {
      assertNativeResources(request.integration.kind);
      return native.getHttpAuthenticationAsync(request);
    },
    testConnectionAsync(request: IntegrationRuntimeRequest<TPrincipal>) {
      assertNativeResources(request.integration.kind);
      return native.testConnectionAsync(request);
    },
    get pendingCount() {
      return native.pendingCount;
    },
    closeAsync: () => native.closeAsync(),
  };

  const createBoundIntegrationAsync = async <TKind extends IntegrationKind>(
    input: IntegrationInput & { kind: TKind },
  ): Promise<IntegrationInstanceOfKind<TKind>> => {
    assertClassResources(input.kind);
    const scoped = requireIntegrationRuntimeResources();
    scoped.context.signal.throwIfAborted();
    const fingerprint = testingInputs.get(scoped);
    if (
      !fingerprint ||
      !requireIntegrationProducer(resources.saved.codec, "credential-codec").verifyFingerprint(
        serializeTestingInput(input),
        fingerprint,
      )
    ) {
      throw new IntegrationBindingError("native-class-resources", input.kind);
    }
    const client = await createIntegrationAsync(input);
    scoped.context.signal.throwIfAborted();
    return client;
  };

  const acquireResourcesAsync = (
    snapshot: IntegrationConnectionTestScope<TPrincipal>,
    input: IntegrationInput & { kind: IntegrationKind },
    signal: AbortSignal,
  ) =>
    lifetime.trackAsync(async () => {
      const deadlineAt = resources.clock.now() + resources.executionTimeoutMs;
      const owner = createIntegrationBindingLifetime();
      const controller = new AbortController();
      const operationSignal = controller.signal;
      const listeners: { readonly source: AbortSignal; readonly abort: () => void }[] = [];
      let timer: ReturnType<typeof setTimeout> | undefined;
      const cleanup = () => {
        if (timer !== undefined) {
          clearTimeout(timer);
          timer = undefined;
        }
        for (const { source, abort } of listeners) source.removeEventListener("abort", abort);
        listeners.length = 0;
        operationSignal.removeEventListener("abort", cleanup);
      };
      const releaseAsync = lifetime.own(async () => {
        try {
          await owner.closeAsync();
        } finally {
          cleanup();
        }
      });
      try {
        operationSignal.addEventListener("abort", cleanup, { once: true });
        for (const source of [signal, lifetime.signal, owner.signal]) {
          if (source.aborted) {
            controller.abort(source.reason);
            break;
          }
          const abort = () => controller.abort(source.reason);
          listeners.push({ source, abort });
          source.addEventListener("abort", abort, { once: true });
        }
        if (!operationSignal.aborted) {
          timer = setTimeout(
            () => controller.abort(new DOMException("Integration connection test timed out", "TimeoutError")),
            resources.executionTimeoutMs,
          );
          timer.unref?.();
        }
        lifetime.assertOpen();
        operationSignal.throwIfAborted();
        assertClassResources(input.kind);
        await snapshot.assertCurrentAsync();
        lifetime.assertOpen();
        operationSignal.throwIfAborted();
        const authority = requireIntegrationProducer(resources.connectionTestAuthority, "native-authority");
        await authority.authorizeAsync(input, snapshot, operationSignal);
        lifetime.assertOpen();
        operationSignal.throwIfAborted();
        const codec = requireIntegrationProducer(resources.saved.codec, "credential-codec");
        const testingIdentity = codec.fingerprint(serializeTestingInput(input));
        const material = await requireIntegrationProducer(
          resources.saved.trust,
          "trusted-material",
        ).readTrustMaterialAsync(operationSignal);
        const context: IntegrationExecutionContext = {
          signal: operationSignal,
          deadlineAt,
          configurationIdentity: testingIdentity,
          trustIdentity: material.version,
        };
        const assertCurrentAsync = async (operationContext: IntegrationExecutionContext) => {
          operationContext.signal.throwIfAborted();
          await snapshot.assertCurrentAsync();
          await authority.authorizeAsync(input, snapshot, operationContext.signal);
          const current = await requireIntegrationProducer(
            resources.saved.trust,
            "trusted-material",
          ).readTrustMaterialAsync(operationContext.signal);
          if (
            current.version !== context.trustIdentity ||
            operationContext.configurationIdentity !== testingIdentity ||
            !codec.verifyFingerprint(serializeTestingInput(input), testingIdentity)
          ) {
            throw new IntegrationBindingError("stale", input.kind);
          }
          operationContext.signal.throwIfAborted();
        };
        await assertCurrentAsync(context);
        const runtime = createResources(input, context, owner, assertCurrentAsync);
        testingInputs.set(runtime, testingIdentity);
        return { runtime, releaseAsync };
      } catch (error) {
        await releaseAsync();
        throw error;
      }
    });

  const testing = {
    createIntegrationAsync: createBoundIntegrationAsync,
    acquireResourcesAsync(
      snapshot: { readonly principal: TPrincipal; assertCurrentAsync(): Promise<void> },
      input: IntegrationInput & { kind: IntegrationKind },
      signal: AbortSignal,
    ) {
      return acquireResourcesAsync(
        {
          kind: "snapshot",
          principal: snapshot.principal,
          assertCurrentAsync: () => snapshot.assertCurrentAsync(),
        },
        input,
        signal,
      );
    },
  };

  return {
    ...caches,
    acquireSavedOperationAsync,
    native: guardedNative,
    policy: saved.policy,
    captureConfigurationAsync(
      snapshot: { assertCurrentAsync(): Promise<void> },
      integration: { readonly id: string; readonly name: string; readonly kind: IntegrationKind; readonly url: string },
      externalUrl: string | null,
    ) {
      return lifetime.trackAsync(() =>
        saved.captureConfigurationAsync(
          snapshot,
          integration,
          externalUrl,
          AbortSignal.any([lifetime.signal, AbortSignal.timeout(resources.executionTimeoutMs)]),
        ),
      );
    },
    testing,
    acquireNativeClientAsync(
      input: IntegrationInput & { kind: IntegrationKind },
      scope: { readonly signal: AbortSignal; assertCurrentAsync(): Promise<void> },
    ) {
      return lifetime.trackAsync(async () => {
        const lease = await acquireResourcesAsync(
          {
            kind: "management",
            assertCurrentAsync: () => scope.assertCurrentAsync(),
          },
          input,
          scope.signal,
        );
        try {
          const client = await withIntegrationRuntimeAsync(lease.runtime, () => createBoundIntegrationAsync(input));
          await scope.assertCurrentAsync();
          scope.signal.throwIfAborted();
          return {
            client: {
              testConnectionAsync: () =>
                withIntegrationRuntimeAsync(lease.runtime, async () => {
                  await scope.assertCurrentAsync();
                  scope.signal.throwIfAborted();
                  const result = await client.testConnectionAsync();
                  await scope.assertCurrentAsync();
                  scope.signal.throwIfAborted();
                  return connectionResult(result);
                }),
            },
            releaseAsync: lease.releaseAsync,
          };
        } catch (error) {
          await lease.releaseAsync();
          throw error;
        }
      });
    },
    get pendingCount() {
      return native.pendingCount + lifetime.pendingCount;
    },
    async closeAsync() {
      const results = await Promise.allSettled([native.closeAsync(), lifetime.closeAsync()]);
      const failures = results.flatMap((result) => (result.status === "rejected" ? [result.reason] : []));
      if (failures.length) throw new AggregateError(failures, "Owned integration bindings could not close");
    },
  };
};
