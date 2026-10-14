import { walkProcedureContractsSync } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";

import { getSourceProcedureMeta } from "@homarr/api/nitro";
import { createFixedWriteAssembly } from "@homarr/api/nitro/assembly/fixed-writes";
import { createSetupBackedContext } from "@homarr/api/nitro/resources/setup-read";
import type { FetchContribution } from "@homarr/contracts/contribution";
import type { RequestContext } from "@homarr/contracts/request";
import { eq } from "@homarr/db";

import {
  prepareAuthenticatedRpcRequestAsync,
  prepareFiniteRpcRequestAsync,
  readFiniteRpcResponseAsync,
} from "./authenticated-rpc";
import type { FixedWriteLeaf, FixedWriteRpcResources } from "./contracts";

type TaskSettlement<Value> =
  | { kind: "registered" }
  | { kind: "not-invoked"; error: unknown }
  | { kind: "pending" }
  | { kind: "fulfilled"; value: Value }
  | { kind: "rejected"; error: unknown };

interface TransportTask<Value> {
  readonly completion: PromiseWithResolvers<Value>;
  underlying: Promise<Value> | undefined;
  settlement: TaskSettlement<Value>;
}

type Fault = { kind: "none" } | { kind: "failed"; error: unknown };

interface FixedRpcRecord {
  readonly selectedLeaf: FixedWriteLeaf;
  readonly scope: TransportTask<Response>;
  readonly handler: TransportTask<Response>;
  readonly output: TransportTask<Response>;
  readonly diagnostics: unknown[];
  readonly cleanupFailures: unknown[];
  readonly cancellations: Map<Response, TransportTask<void>>;
  primary: Fault;
  reportedFault: Fault;
  fence: Fault;
  publication: "not-returned" | "delegated-to-outer-guard" | "withheld";
  matched: Response | undefined;
  finite: Response | undefined;
  retired: boolean;
}

const fixedLeaves = Object.freeze([
  "app.create",
  "board.saveUserBoardPermissions",
  "board.saveGroupBoardPermissions",
] satisfies readonly FixedWriteLeaf[]);

function createTransportTask<Value>(): TransportTask<Value> {
  const completion = Promise.withResolvers<Value>();
  void completion.promise.catch(() => undefined);
  return { completion, underlying: undefined, settlement: { kind: "registered" } };
}

function runTransportTask<Value>(entry: TransportTask<Value>, invoke: () => Promise<Value>): Promise<Value> {
  if (entry.settlement.kind !== "registered") throw new Error("FIXED_WRITE_RPC_TASK_ALREADY_CLAIMED");
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

function validateAssembly(contribution: ReturnType<typeof createFixedWriteAssembly>): void {
  if (
    contribution.revision !== "homarr.backend.source-port.v2" ||
    contribution.id !== "homarr.fixed-writes.source-port.v2" ||
    contribution.leaves.length !== fixedLeaves.length ||
    new Set(contribution.leaves).size !== fixedLeaves.length ||
    fixedLeaves.some((leaf) => !contribution.leaves.includes(leaf))
  )
    throw new Error("FIXED_WRITE_RPC_REGISTRY_UNAVAILABLE");
  const registered = new Set<string>();
  const lazy = walkProcedureContractsSync(contribution.router, (procedure, path) => {
    const descriptor = getSourceProcedureMeta(procedure);
    const leaf = fixedLeaves.find((candidate) => candidate === path.join("."));
    if (
      !descriptor ||
      !leaf ||
      descriptor.path !== leaf ||
      descriptor.kind !== "mutation" ||
      descriptor.demo !== "guarded" ||
      registered.has(leaf) ||
      (leaf === "app.create" &&
        (descriptor.access.kind !== "permission" || descriptor.access.permission !== "app-create")) ||
      (leaf !== "app.create" && descriptor.access.kind !== "protected")
    )
      throw new Error("FIXED_WRITE_RPC_POLICY_UNAVAILABLE");
    registered.add(leaf);
  });
  if (lazy.length > 0 || registered.size !== fixedLeaves.length)
    throw new Error("FIXED_WRITE_RPC_REGISTRY_UNAVAILABLE");
}

async function cancelOutputsAsync(record: FixedRpcRecord, reason: unknown): Promise<void> {
  const responses = new Set<Response>();
  if (record.matched) responses.add(record.matched);
  if (record.finite) responses.add(record.finite);
  for (const response of responses) {
    const body = response.body;
    if (!body) continue;
    let cancellation = record.cancellations.get(response);
    if (!cancellation) {
      cancellation = createTransportTask<void>();
      record.cancellations.set(response, cancellation);
      void runTransportTask(cancellation, () => body.cancel(reason)).then(
        () => undefined,
        (error: unknown) => record.cleanupFailures.push(error),
      );
    }
    try {
      await cancellation.completion.promise;
    } catch {}
  }
}

function retainFailure(record: FixedRpcRecord, error: unknown): void {
  if (record.primary.kind === "none") record.primary = { kind: "failed", error };
  record.publication = "withheld";
  for (const entry of [record.scope, record.handler, record.output]) {
    if (entry.settlement.kind === "registered") {
      entry.settlement = { kind: "not-invoked", error };
      entry.completion.reject(error);
    }
  }
}

function assertNoReportedFault(record: FixedRpcRecord): void {
  if (record.reportedFault.kind === "failed") throw record.reportedFault.error;
}

export function createAdmittedFixedWriteRpc(options: FixedWriteRpcResources): readonly FetchContribution[] {
  const requests = options.requests;
  const path = options.path;
  const baseUrl = options.baseUrl;
  const createId = options.createId;
  const maximumRequestBytes = options.maximumRequestBytes;
  const maximumResponseBytes = options.maximumResponseBytes;
  const assertMainCurrent = options.assertCurrent;
  const runRequestAsync = options.runRequestAsync;
  const runSetupScopeAsync = options.runSetupScopeAsync;
  const origin = new URL(baseUrl);
  const pathUrl = new URL(path, baseUrl);
  if (
    (origin.protocol !== "http:" && origin.protocol !== "https:") ||
    origin.origin !== baseUrl ||
    baseUrl !== requests.configuration.externalOrigin ||
    !path.startsWith("/") ||
    path.startsWith("//") ||
    !path.endsWith("/rpc") ||
    pathUrl.pathname !== path ||
    pathUrl.origin !== baseUrl ||
    path.includes("//") ||
    typeof createId !== "function" ||
    !Number.isSafeInteger(maximumRequestBytes) ||
    maximumRequestBytes < 1 ||
    !Number.isSafeInteger(maximumResponseBytes) ||
    maximumResponseBytes < 1
  )
    throw new Error("FIXED_WRITE_RPC_CONSTRUCTION_UNAVAILABLE");
  assertMainCurrent();
  const records = new WeakMap<RequestContext, FixedRpcRecord>();
  return Object.freeze(
    fixedLeaves.map((selectedLeaf): FetchContribution =>
      Object.freeze({
        phase: "rpc",
        path: `${path}/${selectedLeaf.replaceAll(".", "/")}`,
        descendants: false,
        access: { kind: "protected", action: "write", resource: selectedLeaf },
        async handle(context: RequestContext) {
          if (context.request.method !== "POST")
            return { kind: "response", response: new Response(null, { status: 405, headers: { allow: "POST" } }) };
          if (records.has(context)) throw new Error("FIXED_WRITE_RPC_REQUEST_ALREADY_CLAIMED");
          const record: FixedRpcRecord = {
            selectedLeaf,
            scope: createTransportTask<Response>(),
            handler: createTransportTask<Response>(),
            output: createTransportTask<Response>(),
            diagnostics: [],
            cleanupFailures: [],
            cancellations: new Map(),
            primary: { kind: "none" },
            reportedFault: { kind: "none" },
            fence: { kind: "none" },
            publication: "not-returned",
            matched: undefined,
            finite: undefined,
            retired: false,
          };
          records.set(context, record);
          try {
            const response = await runRequestAsync(async () => {
              try {
                const preparation = await prepareAuthenticatedRpcRequestAsync(context, requests, assertMainCurrent);
                const observeAbort = () => {
                  if (!record.retired && record.fence.kind === "none")
                    record.fence = { kind: "failed", error: preparation.signal.reason };
                };
                preparation.signal.addEventListener("abort", observeAbort, { once: true });
                context.onDispose(() => {
                  record.retired = true;
                  preparation.signal.removeEventListener("abort", observeAbort);
                });
                if (preparation.signal.aborted) observeAbort();
                preparation.assertCurrent();
                const response = await runTransportTask(record.scope, () =>
                  runSetupScopeAsync(preparation.signal, async (admission) => {
                    const assertScopeCurrent = () => {
                      admission.assertCurrent();
                      preparation.assertCurrent();
                    };
                    try {
                      assertScopeCurrent();
                      if (admission.signal !== preparation.signal) throw new Error("FIXED_WRITE_RPC_SCOPE_UNAVAILABLE");
                      const backend = createSetupBackedContext(
                        {
                          request: context.request,
                          signal: preparation.signal,
                          principal: preparation.principal,
                          deviceType: undefined,
                          baseUrl,
                          demo: requests.configuration.demo,
                          effect(effect) {
                            assertScopeCurrent();
                            context.effect(effect);
                          },
                          onDispose(dispose) {
                            assertScopeCurrent();
                            context.onDispose(dispose);
                          },
                          reportError(error) {
                            record.diagnostics.push(error);
                            if (record.reportedFault.kind === "none") record.reportedFault = { kind: "failed", error };
                          },
                        },
                        { ...admission, assertCurrent: assertScopeCurrent },
                        { operators: { eq }, now: requests.configuration.now },
                      );
                      const binding = await requests.bindFixedWriteBackendAsync(
                        context,
                        backend,
                        preparation,
                        selectedLeaf,
                      );
                      assertScopeCurrent();
                      const resources: Parameters<typeof createFixedWriteAssembly>[1] = {
                        createId,
                        saveBoardPermissionsAsync: binding.saveBoardPermissionsAsync,
                        createAppAsync: binding.createAppAsync,
                      };
                      const contribution = createFixedWriteAssembly(backend, resources);
                      validateAssembly(contribution);
                      const handler = new RPCHandler(contribution.router, { allowMethods: ["POST"] });
                      return await runTransportTask(record.handler, () =>
                        binding.runHandlerAsync(async () => {
                          try {
                            const boundedRequest = await prepareFiniteRpcRequestAsync(
                              context.request,
                              preparation.signal,
                              maximumRequestBytes,
                            );
                            assertScopeCurrent();
                            if (new URL(boundedRequest.url).pathname !== `${path}/${selectedLeaf.replaceAll(".", "/")}`)
                              throw new Error("FIXED_WRITE_RPC_SELECTION_UNAVAILABLE");
                            const result = await handler.handle(boundedRequest, { prefix: path, context: backend });
                            if (result.matched) record.matched = result.response;
                            if (!result.matched) throw new Error("FIXED_WRITE_RPC_SELECTION_UNAVAILABLE");
                            assertScopeCurrent();
                            assertNoReportedFault(record);
                            const finite = await runTransportTask(record.output, () =>
                              readFiniteRpcResponseAsync(result.response, preparation.signal, maximumResponseBytes),
                            );
                            record.finite = finite;
                            assertNoReportedFault(record);
                            assertScopeCurrent();
                            await preparation.assertCurrentAsync();
                            assertScopeCurrent();
                            return finite;
                          } catch (error) {
                            if (record.primary.kind === "none") record.primary = { kind: "failed", error };
                            await cancelOutputsAsync(record, error);
                            throw new Error("FIXED_WRITE_RPC_UNAVAILABLE");
                          }
                        }),
                      );
                    } catch (error) {
                      if (record.primary.kind === "none") record.primary = { kind: "failed", error };
                      await cancelOutputsAsync(record, error);
                      throw new Error("FIXED_WRITE_RPC_UNAVAILABLE");
                    }
                  }),
                );
                try {
                  await preparation.assertCurrentAsync();
                  preparation.assertCurrent();
                } catch (error) {
                  if (record.fence.kind === "none") record.fence = { kind: "failed", error };
                  throw error;
                }
                record.publication = "delegated-to-outer-guard";
                return response;
              } catch (error) {
                retainFailure(record, error);
                await cancelOutputsAsync(record, error);
                throw new Error("FIXED_WRITE_RPC_UNAVAILABLE");
              }
            });
            return { kind: "response", response };
          } catch (error) {
            retainFailure(record, error);
            throw new Error("FIXED_WRITE_RPC_UNAVAILABLE");
          }
        },
      } satisfies FetchContribution),
    ),
  );
}
