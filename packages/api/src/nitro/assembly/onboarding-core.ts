import { ORPCError } from "@orpc/server";
import { FetchHandler } from "@orpc/server/fetch";
import { RPCHandlerCodec, StandardHandler } from "@orpc/server/standard";
import type { StandardHandlerCodec } from "@orpc/server/standard";

import type { CoreCurrentStepRequest, CoreReadResult } from "@homarr/auth/nitro/production-sessions";

import type { BackendContext } from "../context";
import { defineBackendContribution } from "../contribution";
import { toBackendError } from "../errors";
import { assertPublicQuerySourceAccess, getSourceProcedureMeta } from "../procedure";
import { normalizeOnboardingPair } from "../routers/-settings-setup/steps";
import {
  createOnboardingCoreCurrentStepBuilder,
  onboardingCoreInputSchema,
  onboardingCoreOutputSchema,
  onboardingCurrentStepDescriptor,
} from "../routers/onboard-current-step";

export type OnboardingCoreSourceResources = Pick<
  BackendContext,
  "request" | "signal" | "principal" | "demo" | "reportError" | "flattenDomainError"
>;

export type OnboardingCoreContext = OnboardingCoreSourceResources;

export type OnboardingCoreFailure = { readonly kind: "none" } | { readonly kind: "failed"; readonly error: unknown };

export type OnboardingCoreCleanup =
  | { readonly kind: "clean" }
  | { readonly kind: "failed"; readonly errors: readonly unknown[] };

export interface OnboardingCorePreparedResponse {
  readonly response: Response;
  readonly readResult: Extract<CoreReadResult, { selection: "current-step" }> | undefined;
  readonly primary: OnboardingCoreFailure;
  readonly cleanup: OnboardingCoreCleanup;
}

type Codec = StandardHandlerCodec<OnboardingCoreContext>;
type StandardRequest = Parameters<Codec["resolveProcedure"]>[0];
type Procedure = Parameters<Codec["encodeOutput"]>[1];
type CodecOptions = Parameters<Codec["resolveProcedure"]>[1];
type Phase = "created" | "executing" | "prepared" | "retiring" | "retired" | "closing" | "closed" | "failed";
type Stage =
  | "created"
  | "routing"
  | "matching"
  | "matched"
  | "decoding"
  | "decoded"
  | "reading"
  | "read"
  | "encoding"
  | "encoded";

function unavailable(): never {
  throw new ORPCError("FORBIDDEN", { message: "Onboarding CORE request is unavailable" });
}

export function createOnboardingCoreProducer() {
  const captured = new WeakSet<CoreCurrentStepRequest>();

  function createRequest(original: CoreCurrentStepRequest, resources: OnboardingCoreSourceResources) {
    if (captured.has(original)) return unavailable();
    const url = new URL(resources.request.url);
    if (
      resources.request.method !== "POST" ||
      url.pathname !== "/rpc/onboard/currentStep" ||
      url.search !== "" ||
      url.hash !== ""
    ) {
      return unavailable();
    }
    resources.signal.throwIfAborted();
    resources.request.signal.throwIfAborted();
    captured.add(original);

    const context: OnboardingCoreContext = Object.freeze({
      request: resources.request,
      signal: resources.signal,
      principal: resources.principal,
      demo: Object.freeze({ enabled: resources.demo.enabled, readOnly: resources.demo.readOnly }),
      reportError: resources.reportError,
      flattenDomainError: resources.flattenDomainError,
    });
    const stop = new AbortController();
    const tasks = new Set<Promise<unknown>>();
    const forwardings: Promise<void>[] = [];
    const controlForwardings: Promise<void>[] = [];
    let handle: CoreCurrentStepRequest | undefined = original;
    let boundRead: CoreCurrentStepRequest["readOnceAsync"] | undefined = original.readOnceAsync;
    let phase: Phase = "created";
    let stage: Stage = "created";
    let primary: OnboardingCoreFailure = { kind: "none" };
    const cleanupErrors: unknown[] = [];
    let cleanupStatus: "clean" | "failed" = "clean";
    let translated: ORPCError<string, unknown> | undefined;
    let translationFailure: OnboardingCoreFailure = { kind: "none" };
    let standardRequest: StandardRequest | undefined;
    let matchedPath: string[] | undefined;
    let body: Promise<unknown> | undefined;
    let read: Promise<Extract<CoreReadResult, { selection: "current-step" }>> | undefined;
    let readResult: Extract<CoreReadResult, { selection: "current-step" }> | undefined;
    let response: Response | undefined;
    let cancellation: Promise<void> | undefined;
    let execution: Promise<OnboardingCorePreparedResponse> | undefined;
    let authRetirement: Promise<void> | undefined;
    let authClosing: Promise<void> | undefined;
    let retirement: Promise<void> | undefined;
    let closing: Promise<void> | undefined;

    function rememberPrimary(error: unknown): void {
      if (cleanupErrors.some((known) => Object.is(known, error))) return;
      if (primary.kind === "none") primary = { kind: "failed", error };
    }

    function rememberCleanup(error: unknown): void {
      cleanupStatus = "failed";
      if (primary.kind === "failed" && Object.is(primary.error, error)) return;
      if (!cleanupErrors.some((known) => Object.is(known, error))) cleanupErrors.push(error);
    }

    function publish<Value>(
      operation: () => Promise<Value>,
      disposition: "primary" | "cleanup" | "outcome",
      tracked: boolean,
    ): Promise<Value> {
      const completion = Promise.withResolvers<Value>();
      if (tracked) tasks.add(completion.promise);
      let observations = controlForwardings;
      if (tracked) observations = forwardings;
      const forwarding = Promise.resolve().then(async () => {
        try {
          const value = await operation();
          if (tracked && disposition === "outcome") {
            try {
              checkPrepared();
            } catch (error: unknown) {
              rememberPrimary(error);
              try {
                await cancelResponse();
              } catch (cleanupError: unknown) {
                rememberCleanup(cleanupError);
              }
              throwOutcome(error);
            }
          }
          completion.resolve(value);
        } catch (error: unknown) {
          if (disposition === "cleanup") rememberCleanup(error);
          if (disposition === "primary") rememberPrimary(error);
          completion.reject(error);
        } finally {
          tasks.delete(completion.promise);
        }
      });
      observations.push(
        forwarding.then(
          () => undefined,
          (error: unknown) => {
            if (disposition === "cleanup") rememberCleanup(error);
            if (disposition === "primary") rememberPrimary(error);
            completion.reject(error);
            tasks.delete(completion.promise);
          },
        ),
      );
      observations.push(
        completion.promise.then(
          () => undefined,
          () => undefined,
        ),
      );
      return completion.promise;
    }

    function track<Value>(operation: () => Promise<Value>): Promise<Value> {
      return publish(operation, "primary", true);
    }

    function ownedHandle(): CoreCurrentStepRequest {
      if (!handle) return unavailable();
      return handle;
    }

    function checkExecuting(): void {
      if (phase !== "executing") return unavailable();
      stop.signal.throwIfAborted();
      context.signal.throwIfAborted();
      context.request.signal.throwIfAborted();
    }

    function checkPrepared(): void {
      if (phase !== "prepared") return unavailable();
      stop.signal.throwIfAborted();
      context.signal.throwIfAborted();
      context.request.signal.throwIfAborted();
    }

    function checkProcedure(procedure: Procedure, path: string[], incoming: OnboardingCoreContext): void {
      checkExecuting();
      const definition = currentStep["~orpc"];
      if (
        incoming !== context ||
        procedure !== currentStep ||
        path !== matchedPath ||
        path.length !== 2 ||
        path[0] !== "onboard" ||
        path[1] !== "currentStep" ||
        getSourceProcedureMeta(procedure) !== onboardingCurrentStepDescriptor ||
        definition.orderedMiddlewares.length !== 0 ||
        definition.disableInputValidation ||
        definition.disableOutputValidation ||
        !Array.isArray(definition.inputSchemas) ||
        definition.inputSchemas.length !== 1 ||
        definition.inputSchemas[0] !== onboardingCoreInputSchema ||
        !Array.isArray(definition.outputSchemas) ||
        definition.outputSchemas.length !== 1 ||
        definition.outputSchemas[0] !== onboardingCoreOutputSchema
      ) {
        return unavailable();
      }
    }

    function checkOptions(options: CodecOptions): void {
      checkExecuting();
      if (options.context !== context || options.prefix !== "/rpc") return unavailable();
    }

    function translate(error: unknown): ORPCError<string, unknown> {
      rememberPrimary(error);
      if (translated) return translated;
      if (translationFailure.kind === "failed") throw translationFailure.error;
      try {
        translated = toBackendError(error, context);
      } catch (translationError: unknown) {
        translationFailure = { kind: "failed", error: translationError };
        throw translationError;
      }
      return translated;
    }

    function retireAuthWork(): Promise<void> {
      if (authRetirement) return authRetirement;
      authRetirement = publish(() => ownedHandle().retireWorkAsync(), "cleanup", true);
      return authRetirement;
    }

    function closeAuth(): Promise<void> {
      if (authClosing) return authClosing;
      authClosing = publish(() => ownedHandle().closeAsync(), "cleanup", true);
      return authClosing;
    }

    function cancelResponse(): Promise<void> {
      if (cancellation) return cancellation;
      cancellation = publish(
        async () => {
          const retained = response;
          if (retained?.body) await retained.body.cancel();
          response = undefined;
        },
        "cleanup",
        true,
      );
      return cancellation;
    }

    function throwOutcome(fallback: unknown): never {
      if (primary.kind === "failed") {
        if (cleanupErrors.length > 0) {
          throw new AggregateError([primary.error, ...cleanupErrors], "CORE API work and cleanup failed", {
            cause: primary.error,
          });
        }
        throw primary.error;
      }
      if (cleanupErrors.length === 1) throw cleanupErrors[0];
      if (cleanupErrors.length > 1) throw new AggregateError(cleanupErrors, "CORE API cleanup failed");
      throw fallback;
    }

    const currentStep = createOnboardingCoreCurrentStepBuilder().handler(
      async ({ context: incoming, input, path, procedure, signal }) => {
        try {
          checkProcedure(procedure, path, incoming);
          if (stage !== "decoded" || input !== undefined || signal !== context.request.signal || read) {
            return unavailable();
          }
          assertPublicQuerySourceAccess(context, onboardingCurrentStepDescriptor);
          stage = "reading";
          read = track(async () => {
            checkExecuting();
            const readOnce = boundRead;
            if (!readOnce) return unavailable();
            const result = await readOnce();
            readResult = result;
            checkExecuting();
            return result;
          });
          const result = await read;
          checkProcedure(procedure, path, incoming);
          stage = "read";
          return normalizeOnboardingPair(result.current);
        } catch (error: unknown) {
          throw translate(error);
        }
      },
    );
    const contribution = defineBackendContribution({
      revision: "homarr.backend.source-port.v2",
      id: "onboarding-core",
      router: Object.freeze({ onboard: Object.freeze({ currentStep }) }),
      leaves: ["onboard.currentStep"],
    });
    const realCodec = new RPCHandlerCodec<OnboardingCoreContext>(contribution.router, { allowMethods: ["POST"] });
    const codec: Codec = {
      resolveProcedure(request, options) {
        return track(async () => {
          checkOptions(options);
          if (stage !== "routing" || request !== standardRequest) return unavailable();
          stage = "matching";
          const matched = await realCodec.resolveProcedure(request, options);
          if (!matched) return unavailable();
          matchedPath = matched.path;
          checkProcedure(matched.procedure, matched.path, options.context);
          stage = "matched";
          return {
            procedure: matched.procedure,
            path: matched.path,
            decodeInput() {
              return track(async () => {
                checkOptions(options);
                checkProcedure(matched.procedure, matched.path, options.context);
                if (stage !== "matched") return unavailable();
                stage = "decoding";
                const input: unknown = await matched.decodeInput();
                checkOptions(options);
                stage = "decoded";
                return input;
              });
            },
          };
        });
      },
      encodeOutput(output, procedure, path, options) {
        return track(async () => {
          checkOptions(options);
          checkProcedure(procedure, path, options.context);
          if (stage !== "read" || !readResult || primary.kind !== "none") return unavailable();
          stage = "encoding";
          const encoded = await realCodec.encodeOutput(output, procedure, path, options);
          checkOptions(options);
          stage = "encoded";
          return encoded;
        });
      },
      encodeError(error, procedure, path, options) {
        return track(async () => {
          checkOptions(options);
          checkProcedure(procedure, path, options.context);
          const mapped = translate(error);
          try {
            await retireAuthWork();
          } catch (cleanupError: unknown) {
            rememberCleanup(cleanupError);
            throw cleanupError;
          }
          checkOptions(options);
          stage = "encoding";
          const encoded = await realCodec.encodeError(mapped, procedure, path, options);
          checkOptions(options);
          stage = "encoded";
          return encoded;
        });
      },
    };
    const fetchHandler = new FetchHandler(
      new StandardHandler(codec, {
        routingInterceptors: [
          ({ request, context: incoming, prefix, next }) =>
            track(async () => {
              checkExecuting();
              if (
                stage !== "created" ||
                standardRequest ||
                incoming !== context ||
                prefix !== "/rpc" ||
                request.method !== "POST" ||
                request.url !== "/rpc/onboard/currentStep" ||
                request.signal !== context.request.signal
              ) {
                return unavailable();
              }
              standardRequest = request;
              stage = "routing";
              request.resolveBody = (hint) => {
                checkExecuting();
                if (stage !== "decoding" || (hint !== undefined && hint !== "json")) return unavailable();
                if (body) return body;
                body = track(async () => {
                  checkExecuting();
                  const packet = await ownedHandle().resolveRpcBodyAsync();
                  checkExecuting();
                  return packet;
                });
                return body;
              };
              return next();
            }),
        ],
      }),
    );

    async function drain(): Promise<void> {
      let observed = -1;
      while (tasks.size > 0 || observed !== forwardings.length) {
        observed = forwardings.length;
        await Promise.allSettled([...tasks]);
        await Promise.allSettled(forwardings.slice(0, observed));
      }
    }

    function executeAsync(): Promise<OnboardingCorePreparedResponse> {
      if (execution) return execution;
      if (phase !== "created") {
        execution = publish(async () => unavailable(), "outcome", false);
        return execution;
      }
      phase = "executing";
      execution = publish(
        async () => {
          try {
            checkExecuting();
            const result = await fetchHandler.handle(context.request, { prefix: "/rpc", context });
            if (!result.matched) return unavailable();
            response = result.response;
            checkExecuting();
            if (stage !== "encoded") return unavailable();
            await retireAuthWork();
            await track(async () => {
              checkExecuting();
              await ownedHandle().assertCurrentAsync();
              checkExecuting();
            });
            checkExecuting();
            if (cleanupStatus === "failed") throwOutcome(cleanupErrors[0]);
            const prepared: OnboardingCorePreparedResponse = Object.freeze({
              response: result.response,
              readResult,
              primary: Object.freeze(primary),
              cleanup: Object.freeze({ kind: "clean" }),
            });
            checkExecuting();
            phase = "prepared";
            return prepared;
          } catch (error: unknown) {
            rememberPrimary(error);
            try {
              await retireAuthWork();
            } catch (cleanupError: unknown) {
              rememberCleanup(cleanupError);
            }
            try {
              await cancelResponse();
            } catch (cleanupError: unknown) {
              rememberCleanup(cleanupError);
            }
            if (phase === "executing") phase = "failed";
            throwOutcome(error);
          }
        },
        "outcome",
        true,
      );
      return execution;
    }

    function retireWorkAsync(): Promise<void> {
      if (retirement) return retirement;
      if (closing) return closing;
      phase = "retiring";
      stop.abort();
      retirement = publish(
        async () => {
          try {
            await retireAuthWork();
          } catch (error: unknown) {
            rememberCleanup(error);
          }
          await drain();
          if (cleanupStatus === "failed") {
            if (phase === "retiring") phase = "failed";
            throwOutcome(cleanupErrors[0]);
          }
          if (phase === "retiring") phase = "retired";
        },
        "outcome",
        false,
      );
      return retirement;
    }

    function closeAsync(): Promise<void> {
      if (closing) return closing;
      phase = "closing";
      stop.abort();
      closing = publish(
        async () => {
          try {
            await retireAuthWork();
          } catch (error: unknown) {
            rememberCleanup(error);
          }
          await drain();
          try {
            await cancelResponse();
          } catch (error: unknown) {
            rememberCleanup(error);
          }
          try {
            await closeAuth();
          } catch (error: unknown) {
            rememberCleanup(error);
          }
          await drain();
          standardRequest = undefined;
          matchedPath = undefined;
          body = undefined;
          read = undefined;
          readResult = undefined;
          if (cleanupStatus === "failed") {
            phase = "failed";
            throwOutcome(cleanupErrors[0]);
          }
          handle = undefined;
          boundRead = undefined;
          forwardings.length = 0;
          phase = "closed";
        },
        "outcome",
        false,
      );
      return closing;
    }

    return Object.freeze({ context, contribution, executeAsync, retireWorkAsync, closeAsync });
  }

  return Object.freeze({ createRequest });
}
