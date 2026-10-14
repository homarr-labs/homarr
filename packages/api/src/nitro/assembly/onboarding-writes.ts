import { ORPCError, os } from "@orpc/server";
import type { RouterClient } from "@orpc/server";
import { FetchHandler } from "@orpc/server/fetch";
import { RPCHandlerCodec, StandardHandler } from "@orpc/server/standard";
import type { StandardHandlerCodec } from "@orpc/server/standard";
import { z } from "zod/v4";

import {
  assertProductionOnboardingRpcFrame,
  dispatchProductionInitialExternalGroupAsync,
  dispatchProductionOnboardingInitUserAsync,
  dispatchProductionOnboardNextStepAsync,
  disposeProductionOnboardingRequestAsync,
  getProductionOnboardingRequestBounds,
  prepareProductionInitialExternalGroupFromCodecAsync,
  prepareProductionOnboardingInitUserFromCodecAsync,
  prepareProductionOnboardNextStepFromCodecAsync,
  readProductionOnboardingPublication,
  recordProductionOnboardingResponseAsync,
  resolveProductionOnboardingRpcPacketAsync,
  settleProductionOnboardingPublicationAsync,
} from "@homarr/auth/nitro/production-sessions";
import type {
  ProductionOnboardingInputTicket,
  ProductionOnboardingPublication,
  ProductionOnboardingRequest,
  ProductionOnboardingResponseOutcome,
  ProductionOnboardingRpcContext,
  ProductionOnboardingRpcFrame,
  ProductionOnboardingRpcInputSource,
  ProductionOnboardingRpcPacket,
  ProductionSqlSessionIssuer,
} from "@homarr/auth/nitro/production-sessions";
import { groupCreateSchema } from "@homarr/validation/group";
import { userInitSchema } from "@homarr/validation/user";

import { backendContractRevision } from "../context";
import type { BackendContext } from "../context";
import { defineBackendContribution } from "../contribution";
import { toBackendError } from "../errors";
import type { SourceLeafPath } from "../port-map";
import { assertSourceProcedureAccess, sourceProcedureMeta } from "../procedure";
import type { SourceProcedureDescriptor } from "../procedure";

type Codec = StandardHandlerCodec<BackendContext>;
type StandardRequest = Parameters<Codec["resolveProcedure"]>[0];
type Procedure = Parameters<Codec["encodeOutput"]>[1];
type InputSchema = typeof userInitSchema | typeof groupCreateSchema | typeof voidSchema;

const voidSchema = z.void();
const nextStepDescriptor = Object.freeze<SourceProcedureDescriptor>({
  path: "onboard.nextStep",
  kind: "mutation",
  access: { kind: "onboardingClaimed" },
  demo: "guarded",
});
const initUserDescriptor = Object.freeze<SourceProcedureDescriptor>({
  path: "user.initUser",
  kind: "mutation",
  access: { kind: "onboardingStep", step: "user" },
  demo: "guarded",
});
const groupDescriptor = Object.freeze<SourceProcedureDescriptor>({
  path: "group.createInitialExternalGroup",
  kind: "mutation",
  access: { kind: "onboardingStep", step: "group" },
  demo: "guarded",
});
const leaves = Object.freeze<readonly SourceLeafPath[]>([
  "onboard.nextStep",
  "user.initUser",
  "group.createInitialExternalGroup",
]);
const ownedBundles = new WeakSet<object>();

export interface OwnedOnboardingRpcRequestBinding {
  readonly issuer: ProductionSqlSessionIssuer;
  readonly original: ProductionOnboardingRequest;
  readonly request: Request;
  readonly frame: ProductionOnboardingRpcFrame;
  readonly ticket: ProductionOnboardingInputTicket;
  readonly packet: ProductionOnboardingRpcPacket;
  readonly context: BackendContext;
  readonly basePath: "";
}

export interface OnboardingRpcRequestResult {
  readonly response: Response;
  readonly outcome: ProductionOnboardingResponseOutcome;
  readonly publication: ProductionOnboardingPublication;
  readonly finite: ReturnType<typeof readProductionOnboardingPublication>;
  readonly cleanup: { readonly kind: "none" } | { readonly kind: "failed"; readonly error: unknown };
}

export interface OwnedOnboardingRpcRequestController {
  executeAsync(): Promise<OnboardingRpcRequestResult>;
  closeAsync(): Promise<void>;
}

interface OwnedRequest {
  binding: OwnedOnboardingRpcRequestBinding | undefined;
  handler: FetchHandler<BackendContext> | undefined;
  expected: { readonly procedure: Procedure; readonly path: string; readonly schema: InputSchema } | undefined;
  phase: "constructed" | "running" | "settled" | "closing" | "closed";
  stage: "created" | "matched" | "decoding" | "decoded" | "calling" | "receipt" | "consumed" | "returned" | "encoded";
  decision:
    | { readonly kind: "none" }
    | { readonly kind: "output" }
    | { readonly kind: "error"; readonly error: unknown };
  primary: { readonly kind: "none" } | { readonly kind: "failed"; readonly error: unknown };
  authPrimary: { readonly kind: "none" } | { readonly kind: "failed"; readonly error: unknown };
  cleanup: OnboardingRpcRequestResult["cleanup"];
  translated: ORPCError<string, unknown> | undefined;
  retirement: Promise<void> | undefined;
  execution: Promise<OnboardingRpcRequestResult> | undefined;
  closing: Promise<void> | undefined;
  readonly stop: AbortController;
  readonly signal: AbortSignal;
  readonly tasks: Set<Promise<unknown>>;
}

type Receipt = {
  readonly owner: OwnedRequest;
  readonly packet: ProductionOnboardingRpcPacket;
  readonly context: ProductionOnboardingRpcContext;
  readonly procedure: Procedure;
} & (
  | { readonly kind: "nextStep"; readonly schema: typeof voidSchema; readonly input: void }
  | {
      readonly kind: "initUser";
      readonly schema: typeof userInitSchema;
      readonly input: ReturnType<typeof userInitSchema.parse>;
    }
  | {
      readonly kind: "initialExternalGroup";
      readonly schema: typeof groupCreateSchema;
      readonly input: ReturnType<typeof groupCreateSchema.parse>;
    }
);

function rejectWire(): never {
  throw new ORPCError("FORBIDDEN", { message: "Onboarding wire request is unavailable" });
}

function bindingFor(record: OwnedRequest): OwnedOnboardingRpcRequestBinding {
  if (!record.binding) return rejectWire();
  return record.binding;
}

function stageOf(record: OwnedRequest): OwnedRequest["stage"] {
  return record.stage;
}

function track<Value>(record: OwnedRequest, operation: () => Promise<Value>): Promise<Value> {
  const completion = Promise.withResolvers<Value>();
  record.tasks.add(completion.promise);
  const run = async () => {
    try {
      completion.resolve(await operation());
    } catch (error: unknown) {
      completion.reject(error);
    } finally {
      record.tasks.delete(completion.promise);
    }
  };
  void Promise.resolve().then(run);
  return completion.promise;
}

function rememberPrimary(record: OwnedRequest, error: unknown): void {
  if (record.primary.kind === "none") record.primary = { kind: "failed", error };
}

function trackAuth<Value>(record: OwnedRequest, operation: () => Promise<Value>): Promise<Value> {
  return track(record, async () => {
    try {
      return await operation();
    } catch (error: unknown) {
      if (record.authPrimary.kind === "none") record.authPrimary = { kind: "failed", error };
      throw error;
    }
  });
}

function retire(record: OwnedRequest): Promise<void> {
  if (record.retirement) return record.retirement;
  const binding = bindingFor(record);
  record.retirement = track(record, () =>
    disposeProductionOnboardingRequestAsync(binding.issuer, binding.original, binding.request),
  );
  void record.retirement.catch(() => undefined);
  return record.retirement;
}

async function retireBeforeError(record: OwnedRequest, error: unknown): Promise<void> {
  rememberPrimary(record, error);
  try {
    await retire(record);
  } catch (retirementError: unknown) {
    const samePrimary = record.primary.kind === "failed" && Object.is(retirementError, record.primary.error);
    const sameAuthPrimary =
      record.authPrimary.kind === "failed" && Object.is(retirementError, record.authPrimary.error);
    if (!samePrimary && !sameAuthPrimary) record.cleanup = { kind: "failed", error: retirementError };
  }
}

function checkWorking(record: OwnedRequest): void {
  if (record.phase !== "running" || record.retirement) return rejectWire();
  record.signal.throwIfAborted();
  const binding = bindingFor(record);
  getProductionOnboardingRequestBounds(binding.issuer, binding.original, binding.request);
}

function checkProcedure(
  record: OwnedRequest,
  procedure: Procedure,
  path: readonly string[],
  context: BackendContext,
): void {
  const binding = bindingFor(record);
  const expected = record.expected;
  if (!expected || procedure !== expected.procedure || path.join(".") !== expected.path || context !== binding.context)
    return rejectWire();
  const expectedPath = expected.path.split(".");
  if (path.length !== expectedPath.length || path.some((segment, index) => segment !== expectedPath[index]))
    return rejectWire();
  const definition = procedure["~orpc"];
  if (
    definition.orderedMiddlewares.length !== 0 ||
    definition.disableInputValidation ||
    definition.disableOutputValidation
  )
    return rejectWire();
  const schemas = definition.inputSchemas;
  if (Array.isArray(schemas)) {
    if (schemas.length !== 1 || schemas[0] !== expected.schema) return rejectWire();
  } else if (schemas !== expected.schema) return rejectWire();
  const outputs = definition.outputSchemas;
  if (Array.isArray(outputs)) {
    if (outputs.length !== 1 || outputs[0] !== voidSchema) return rejectWire();
  } else if (outputs !== voidSchema) return rejectWire();
}

function checkOrigin(binding: OwnedOnboardingRpcRequestBinding): void {
  const url = new URL(binding.request.url);
  const origin = binding.issuer.requestConfiguration.externalOrigin;
  const host = binding.request.headers.get("host");
  if (
    binding.basePath !== "" ||
    binding.request.method !== "POST" ||
    url.origin !== origin ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    (host !== null && host !== url.host) ||
    binding.request.headers.get("origin") !== origin ||
    binding.request.headers.get("sec-fetch-site") === "cross-site"
  )
    return rejectWire();
  let path: string;
  if (binding.ticket.kind === "nextStep") path = "/rpc/onboard/nextStep";
  else if (binding.ticket.kind === "initUser") path = "/rpc/user/initUser";
  else path = "/rpc/group/createInitialExternalGroup";
  if (url.pathname !== path) return rejectWire();
}

function bodyInterpretation(request: Request): "json" | "none" {
  const hint = request.headers.get("standard-server");
  const contentType = request.headers.get("content-type");
  const length = request.headers.get("content-length");
  if (hint === "none") return "none";
  if (hint !== null && hint !== "json") return rejectWire();
  if (hint === null && contentType === null && (length === null || length === "0")) return "none";
  if (!/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(contentType ?? "")) return rejectWire();
  return "json";
}

export function createOwnedOnboardingWritesProducer() {
  const receipts = new WeakMap<ProductionOnboardingInputTicket, Receipt>();
  const active = new Set<OwnedRequest>();
  const claimedFrames = new WeakSet<ProductionOnboardingRpcFrame>();

  function consumeReceipt(
    ticket: ProductionOnboardingInputTicket,
    packet: ProductionOnboardingRpcPacket,
    context: ProductionOnboardingRpcContext,
  ): Receipt {
    const receipt = receipts.get(ticket);
    if (
      !receipt ||
      !active.has(receipt.owner) ||
      receipt.owner.phase !== "running" ||
      receipt.owner.stage !== "receipt"
    )
      return rejectWire();
    const binding = bindingFor(receipt.owner);
    const expected = receipt.owner.expected;
    if (
      !expected ||
      receipt.kind !== ticket.kind ||
      receipt.packet !== packet ||
      receipt.context !== context ||
      binding.ticket !== ticket ||
      binding.packet !== packet ||
      binding.context !== context ||
      expected.procedure !== receipt.procedure ||
      expected.schema !== receipt.schema
    )
      return rejectWire();
    receipt.owner.signal.throwIfAborted();
    receipts.delete(ticket);
    receipt.owner.stage = "consumed";
    return receipt;
  }

  const source = Object.freeze<ProductionOnboardingRpcInputSource>({
    consumeNextStepInput(ticket, packet, context) {
      const receipt = consumeReceipt(ticket, packet, context);
      if (receipt.kind !== "nextStep" || receipt.schema !== voidSchema || receipt.input !== undefined)
        return rejectWire();
    },
    consumeInitUserInput(ticket, packet, context) {
      const receipt = consumeReceipt(ticket, packet, context);
      if (receipt.kind !== "initUser" || receipt.schema !== userInitSchema) return rejectWire();
      return receipt.input;
    },
    consumeInitialExternalGroupInput(ticket, packet, context) {
      const receipt = consumeReceipt(ticket, packet, context);
      if (receipt.kind !== "initialExternalGroup" || receipt.schema !== groupCreateSchema) return rejectWire();
      return receipt.input;
    },
  });

  function verifyFrame(record: OwnedRequest): void {
    if (!active.has(record)) return rejectWire();
    const binding = bindingFor(record);
    assertProductionOnboardingRpcFrame(
      binding.issuer,
      binding.request,
      binding.frame,
      binding.ticket,
      binding.packet,
      binding.context,
      source,
    );
  }

  async function handlerFailure(record: OwnedRequest, error: unknown): Promise<never> {
    await retireBeforeError(record, error);
    record.translated = toBackendError(error, bindingFor(record).context);
    throw record.translated;
  }

  function createContribution(record: OwnedRequest) {
    return defineBackendContribution({
      revision: backendContractRevision,
      id: "onboarding-fixed-writes",
      leaves,
      router: {
        onboard: {
          nextStep: os
            .$context<BackendContext>()
            .meta(sourceProcedureMeta(nextStepDescriptor))
            .input(voidSchema)
            .output(voidSchema)
            .handler(({ context, input, procedure, path, signal }) =>
              track(record, async () => {
                try {
                  checkWorking(record);
                  checkProcedure(record, procedure, path, context);
                  if (record.stage !== "calling" || signal !== record.signal) return rejectWire();
                  await track(record, async () => assertSourceProcedureAccess(context, nextStepDescriptor));
                  const binding = bindingFor(record);
                  const ticket = binding.ticket;
                  if (ticket.kind !== "nextStep") return rejectWire();
                  verifyFrame(record);
                  receipts.set(ticket, {
                    kind: "nextStep",
                    owner: record,
                    packet: binding.packet,
                    context,
                    procedure,
                    schema: voidSchema,
                    input,
                  });
                  record.stage = "receipt";
                  const prepared = await trackAuth(record, () =>
                    prepareProductionOnboardNextStepFromCodecAsync(binding.issuer, binding.frame, ticket),
                  );
                  await trackAuth(record, () =>
                    dispatchProductionOnboardNextStepAsync(binding.issuer, prepared, binding.request),
                  );
                  if (stageOf(record) !== "consumed") return rejectWire();
                  record.stage = "returned";
                } catch (error: unknown) {
                  return handlerFailure(record, error);
                }
              }),
            ),
        },
        user: {
          initUser: os
            .$context<BackendContext>()
            .meta(sourceProcedureMeta(initUserDescriptor))
            .input(userInitSchema)
            .output(voidSchema)
            .handler(({ context, input, procedure, path, signal }) =>
              track(record, async () => {
                try {
                  checkWorking(record);
                  checkProcedure(record, procedure, path, context);
                  if (record.stage !== "calling" || signal !== record.signal) return rejectWire();
                  await track(record, async () => assertSourceProcedureAccess(context, initUserDescriptor));
                  const binding = bindingFor(record);
                  const ticket = binding.ticket;
                  if (ticket.kind !== "initUser") return rejectWire();
                  verifyFrame(record);
                  receipts.set(ticket, {
                    kind: "initUser",
                    owner: record,
                    packet: binding.packet,
                    context,
                    procedure,
                    schema: userInitSchema,
                    input,
                  });
                  record.stage = "receipt";
                  const prepared = await trackAuth(record, () =>
                    prepareProductionOnboardingInitUserFromCodecAsync(binding.issuer, binding.frame, ticket),
                  );
                  await trackAuth(record, () =>
                    dispatchProductionOnboardingInitUserAsync(binding.issuer, prepared, binding.request),
                  );
                  if (stageOf(record) !== "consumed") return rejectWire();
                  record.stage = "returned";
                } catch (error: unknown) {
                  return handlerFailure(record, error);
                }
              }),
            ),
        },
        group: {
          createInitialExternalGroup: os
            .$context<BackendContext>()
            .meta(sourceProcedureMeta(groupDescriptor))
            .input(groupCreateSchema)
            .output(voidSchema)
            .handler(({ context, input, procedure, path, signal }) =>
              track(record, async () => {
                try {
                  checkWorking(record);
                  checkProcedure(record, procedure, path, context);
                  if (record.stage !== "calling" || signal !== record.signal) return rejectWire();
                  await track(record, async () => assertSourceProcedureAccess(context, groupDescriptor));
                  const binding = bindingFor(record);
                  const ticket = binding.ticket;
                  if (ticket.kind !== "initialExternalGroup") return rejectWire();
                  verifyFrame(record);
                  receipts.set(ticket, {
                    kind: "initialExternalGroup",
                    owner: record,
                    packet: binding.packet,
                    context,
                    procedure,
                    schema: groupCreateSchema,
                    input,
                  });
                  record.stage = "receipt";
                  const prepared = await trackAuth(record, () =>
                    prepareProductionInitialExternalGroupFromCodecAsync(binding.issuer, binding.frame, ticket),
                  );
                  await trackAuth(record, () =>
                    dispatchProductionInitialExternalGroupAsync(binding.issuer, prepared, binding.request),
                  );
                  if (stageOf(record) !== "consumed") return rejectWire();
                  record.stage = "returned";
                } catch (error: unknown) {
                  return handlerFailure(record, error);
                }
              }),
            ),
        },
      },
    });
  }

  function createController(input: OwnedOnboardingRpcRequestBinding): OwnedOnboardingRpcRequestController {
    const binding = Object.freeze<OwnedOnboardingRpcRequestBinding>({
      issuer: input.issuer,
      original: input.original,
      request: input.request,
      frame: input.frame,
      ticket: input.ticket,
      packet: input.packet,
      context: input.context,
      basePath: input.basePath,
    });
    checkOrigin(binding);
    const interpretation = bodyInterpretation(binding.request);
    const bounds = getProductionOnboardingRequestBounds(binding.issuer, binding.original, binding.request);
    assertProductionOnboardingRpcFrame(
      binding.issuer,
      binding.request,
      binding.frame,
      binding.ticket,
      binding.packet,
      binding.context,
      source,
    );
    if (claimedFrames.has(binding.frame) || binding.context.signal !== bounds.signal) return rejectWire();
    const stop = new AbortController();
    const record: OwnedRequest = {
      binding,
      handler: undefined,
      expected: undefined,
      phase: "constructed",
      stage: "created",
      decision: { kind: "none" },
      primary: { kind: "none" },
      authPrimary: { kind: "none" },
      cleanup: { kind: "none" },
      translated: undefined,
      retirement: undefined,
      execution: undefined,
      closing: undefined,
      stop,
      signal: AbortSignal.any([bounds.signal, bounds.lifetime, stop.signal]),
      tasks: new Set(),
    };
    const contribution = createContribution(record);
    if (binding.ticket.kind === "nextStep")
      record.expected = {
        procedure: contribution.router.onboard.nextStep,
        path: "onboard.nextStep",
        schema: voidSchema,
      };
    else if (binding.ticket.kind === "initUser")
      record.expected = { procedure: contribution.router.user.initUser, path: "user.initUser", schema: userInitSchema };
    else
      record.expected = {
        procedure: contribution.router.group.createInitialExternalGroup,
        path: "group.createInitialExternalGroup",
        schema: groupCreateSchema,
      };
    const realCodec = new RPCHandlerCodec<BackendContext>(contribution.router, { allowMethods: ["POST"] });
    let standardRequest: StandardRequest | undefined;
    const codec: Codec = {
      resolveProcedure(request, options) {
        return track(record, async () => {
          checkWorking(record);
          if (record.stage !== "created" || standardRequest !== request) return rejectWire();
          const matched = await realCodec.resolveProcedure(request, options);
          if (!matched) return rejectWire();
          checkProcedure(record, matched.procedure, matched.path, options.context);
          verifyFrame(record);
          record.stage = "matched";
          return {
            procedure: matched.procedure,
            path: matched.path,
            decodeInput: () =>
              track(record, async () => {
                try {
                  checkWorking(record);
                  if (record.stage !== "matched") return rejectWire();
                  record.stage = "decoding";
                  const decoded = await matched.decodeInput();
                  checkWorking(record);
                  record.stage = "decoded";
                  return decoded;
                } catch (error: unknown) {
                  rememberPrimary(record, error);
                  throw error;
                }
              }),
          };
        });
      },
      encodeOutput(output, procedure, path, options) {
        return track(record, async () => {
          try {
            checkWorking(record);
            checkProcedure(record, procedure, path, options.context);
            if (record.stage !== "returned" || output !== undefined || record.decision.kind !== "none")
              return rejectWire();
            const response = await realCodec.encodeOutput(output, procedure, path, options);
            checkWorking(record);
            record.stage = "encoded";
            record.decision = { kind: "output" };
            return response;
          } catch (error: unknown) {
            rememberPrimary(record, error);
            throw error;
          }
        });
      },
      encodeError(error, procedure, path, options) {
        return track(record, async () => {
          checkProcedure(record, procedure, path, options.context);
          await retireBeforeError(record, error);
          let translated = error;
          if (error !== record.translated) translated = toBackendError(error, options.context);
          const response = await realCodec.encodeError(translated, procedure, path, options);
          if (record.primary.kind !== "failed") return rejectWire();
          record.decision = { kind: "error", error: record.primary.error };
          record.stage = "encoded";
          return response;
        });
      },
    };
    record.handler = new FetchHandler(
      new StandardHandler(codec, {
        routingInterceptors: [
          async ({ request, context, prefix, next }) => {
            checkWorking(record);
            const current = bindingFor(record);
            if (
              standardRequest ||
              context !== current.context ||
              prefix !== "/rpc" ||
              request.method !== "POST" ||
              request.url !== new URL(current.request.url).pathname
            )
              return rejectWire();
            const headers = { ...request.headers };
            for (const name of ["forwarded", "x-forwarded-host", "x-forwarded-proto", "x-forwarded-port"])
              delete headers[name];
            request.headers = headers;
            request.signal = record.signal;
            request.resolveBody = (hint) =>
              track(record, async () => {
                checkWorking(record);
                if (stageOf(record) !== "decoding") return rejectWire();
                if (hint !== undefined && hint !== interpretation) return rejectWire();
                verifyFrame(record);
                const owned = bindingFor(record);
                return trackAuth(record, () =>
                  resolveProductionOnboardingRpcPacketAsync(owned.issuer, owned.packet, owned.request),
                );
              });
            standardRequest = request;
            return next();
          },
        ],
        clientInterceptors: [
          ({ context, procedure, path, signal, next }) =>
            track(record, async () => {
              try {
                checkWorking(record);
                checkProcedure(record, procedure, path, context);
                if (record.stage !== "decoded" || signal !== record.signal) return rejectWire();
                record.stage = "calling";
                const output = await next();
                if (stageOf(record) !== "returned") return rejectWire();
                return output;
              } catch (error: unknown) {
                await retireBeforeError(record, error);
                throw error;
              }
            }),
        ],
      }),
    );
    claimedFrames.add(binding.frame);
    active.add(record);

    const controller = Object.freeze<OwnedOnboardingRpcRequestController>({
      executeAsync() {
        if (record.phase !== "constructed" || record.execution) return rejectWire();
        record.phase = "running";
        record.execution = track(record, async () => {
          const owned = bindingFor(record);
          let response: Response | undefined;
          let publication: ProductionOnboardingPublication | undefined;
          let responseOwner: "sdk" | "auth" | "delivered" = "sdk";
          try {
            checkWorking(record);
            verifyFrame(record);
            const handler = record.handler;
            if (!handler) return rejectWire();
            const completed = await handler.handle(owned.request, { prefix: "/rpc", context: owned.context });
            if (!completed.matched || record.decision.kind === "none" || record.stage !== "encoded")
              return rejectWire();
            response = completed.response;
            let outcome: ProductionOnboardingResponseOutcome;
            if (record.decision.kind === "output") {
              checkWorking(record);
              await retire(record);
              outcome = { kind: "output", response };
            } else outcome = { kind: "error", response, error: record.decision.error };
            publication = await track(record, () => {
              const pending = recordProductionOnboardingResponseAsync(
                owned.issuer,
                owned.original,
                owned.request,
                outcome,
              );
              responseOwner = "auth";
              return pending;
            });
            const finite = readProductionOnboardingPublication(owned.issuer, publication, owned.request, response);
            record.stop.signal.throwIfAborted();
            if (record.phase !== "running") return rejectWire();
            responseOwner = "delivered";
            return Object.freeze({ response, outcome, publication, finite, cleanup: record.cleanup });
          } catch (error: unknown) {
            await retireBeforeError(record, error);
            if (publication && response && responseOwner !== "delivered") {
              const ownedPublication = publication;
              const ownedResponse = response;
              try {
                await track(record, () =>
                  settleProductionOnboardingPublicationAsync(
                    owned.issuer,
                    ownedPublication,
                    owned.request,
                    ownedResponse,
                    {
                      kind: "abandoned",
                      cause: error,
                    },
                  ),
                );
              } catch (cleanupError: unknown) {
                record.cleanup = { kind: "failed", error: cleanupError };
              }
            } else if (response && responseOwner === "sdk" && response.body) {
              try {
                const body = response.body;
                await track(record, () => body.cancel(error));
              } catch (cleanupError: unknown) {
                record.cleanup = { kind: "failed", error: cleanupError };
              }
            }
            throw error;
          } finally {
            receipts.delete(owned.ticket);
            active.delete(record);
            record.handler = undefined;
            record.expected = undefined;
            record.binding = undefined;
            standardRequest = undefined;
            if (record.phase === "running") record.phase = "settled";
          }
        });
        void record.execution.catch(() => undefined);
        return record.execution;
      },
      closeAsync() {
        if (record.closing) return record.closing;
        const completion = Promise.withResolvers<void>();
        record.closing = completion.promise;
        record.phase = "closing";
        record.stop.abort(new ORPCError("FORBIDDEN", { message: "Onboarding request controller closed" }));
        const close = async () => {
          if (record.binding) await retireBeforeError(record, record.stop.signal.reason);
          while (record.tasks.size > 0) await Promise.allSettled([...record.tasks]);
          if (record.binding) receipts.delete(record.binding.ticket);
          active.delete(record);
          record.handler = undefined;
          record.expected = undefined;
          record.binding = undefined;
          standardRequest = undefined;
          record.phase = "closed";
          if (record.cleanup.kind === "failed") completion.reject(record.cleanup.error);
          else completion.resolve();
        };
        void Promise.resolve().then(close).catch(completion.reject);
        void completion.promise.catch(() => undefined);
        return completion.promise;
      },
    });
    try {
      binding.context.onDispose(controller.closeAsync);
      verifyFrame(record);
      return controller;
    } catch (error: unknown) {
      rememberPrimary(record, error);
      void controller.closeAsync().catch(() => undefined);
      throw error;
    }
  }

  const bundle = Object.freeze({ source, createController, createContribution });
  ownedBundles.add(bundle);
  return bundle;
}

export function assertOwnedOnboardingWritesProducer(
  bundle: ReturnType<typeof createOwnedOnboardingWritesProducer>,
): void {
  if (!ownedBundles.has(bundle)) return rejectWire();
}

export type OnboardingWriteContribution = ReturnType<
  ReturnType<typeof createOwnedOnboardingWritesProducer>["createContribution"]
>;

export type OnboardingWriteClient = RouterClient<OnboardingWriteContribution["router"]>;
