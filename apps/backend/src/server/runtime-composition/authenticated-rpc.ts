import { walkProcedureContractsSync } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";

import { getSourceProcedureMeta } from "@homarr/api/nitro";
import { authenticatedReadLeaves } from "@homarr/api/nitro/assembly/authenticated-read";
import type { createAuthenticatedReadAssembly } from "@homarr/api/nitro/assembly/authenticated-read";
import { createSetupBackedContext } from "@homarr/api/nitro/resources/setup-read";
import type { FetchContribution } from "@homarr/contracts/contribution";
import type { RequestContext } from "@homarr/contracts/request";
import { eq } from "@homarr/db";

import type { AuthenticatedReadAccess, AuthenticatedRequestResources } from "./auth";
import type { createNativeMainPersistenceResourcesAsync } from "./native-main-persistence";

type MainPersistence = Awaited<ReturnType<typeof createNativeMainPersistenceResourcesAsync>>;
type MainOperation = Parameters<MainPersistence["runAsync"]>[0];
type MainSchema = Parameters<MainOperation>[1];

export const authenticatedRpcReadAccess = Object.freeze(
  (
    [
      { action: "read", resource: "info.getInfo", policy: { kind: "authenticated" } },
      { action: "read", resource: "serverSettings.getAll", policy: { kind: "global-permission", permission: "admin" } },
      {
        action: "read",
        resource: "serverSettings.getBoardSettings",
        policy: { kind: "global-permission", permission: "admin" },
      },
      { action: "read", resource: "user.getPreferences", policy: { kind: "authenticated" } },
      { action: "read", resource: "user.getTourStatus", policy: { kind: "authenticated" } },
      { action: "read", resource: "group.getAll", policy: { kind: "global-permission", permission: "admin" } },
      { action: "read", resource: "group.getPaginated", policy: { kind: "global-permission", permission: "admin" } },
      { action: "read", resource: "group.getById", policy: { kind: "global-permission", permission: "admin" } },
      { action: "read", resource: "group.selectable", policy: { kind: "authenticated" } },
      { action: "read", resource: "group.search", policy: { kind: "global-permission", permission: "admin" } },
      { action: "read", resource: "apiKeys.getAll", policy: { kind: "global-permission", permission: "admin" } },
      { action: "read", resource: "invite.getAll", policy: { kind: "global-permission", permission: "admin" } },
    ] satisfies readonly AuthenticatedReadAccess[]
  ).map((rule) => Object.freeze({ ...rule, policy: Object.freeze(rule.policy) })),
);

export async function prepareAuthenticatedRpcRequestAsync(
  context: RequestContext,
  requests: AuthenticatedRequestResources,
  assertMainCurrent: () => void,
) {
  const bounds = requests.getRequestReadBounds(context);
  const lease = await requests.getRequestLeaseAsync(context);
  let deadlineAt = bounds.deadlineAt;
  if (lease.validity.type === "stored-session-expiry") deadlineAt = Math.min(deadlineAt, lease.validity.hostDeadlineAt);
  const deadline = new AbortController();
  const signal = AbortSignal.any([context.signal, bounds.signal, lease.lifetime, deadline.signal]);
  let timer: ReturnType<typeof setTimeout> | undefined;
  let disposed = false;

  const assertCurrent = () => {
    signal.throwIfAborted();
    if (disposed || Date.now() >= deadlineAt || requests.configuration.now() >= deadlineAt)
      throw new Error("Authenticated RPC read is unavailable");
    assertMainCurrent();
  };
  const assertCurrentAsync = async () => {
    assertCurrent();
    const current = await requests.getRequestLeaseAsync(context);
    assertCurrent();
    if (current !== lease) throw new Error("Authenticated RPC authority changed");
  };
  const expire = () => {
    const remaining = deadlineAt - Date.now();
    if (remaining <= 0) {
      deadline.abort(new Error("Authenticated RPC deadline elapsed"));
      return;
    }
    timer = setTimeout(expire, Math.min(remaining, 2147483647));
  };
  try {
    context.onDispose(() => {
      disposed = true;
      if (timer !== undefined) clearTimeout(timer);
      deadline.abort(new Error("Authenticated RPC request released"));
    });
    expire();
    assertCurrent();
    context.onPrivateResponsePublication({ signal, assertCurrentAsync });
    const user = await requests.getCurrentBackendUserAsync(context);
    await assertCurrentAsync();
    if (user.id !== lease.identity.userId) throw new Error("Authenticated RPC principal changed");
    return Object.freeze({
      principal: Object.freeze({ kind: "authenticated" as const, user }),
      signal,
      deadlineAt,
      assertCurrent,
      assertCurrentAsync,
    });
  } catch (error) {
    if (timer !== undefined) clearTimeout(timer);
    deadline.abort(new Error("Authenticated RPC preparation failed"));
    throw error;
  }
}

export async function readFiniteRpcResponseAsync(
  response: Response,
  signal: AbortSignal,
  maximumBytes: number,
): Promise<Response> {
  if (!Number.isSafeInteger(maximumBytes) || maximumBytes < 1) throw new Error("Invalid RPC response budget");
  if (!response.body) {
    signal.throwIfAborted();
    return response;
  }
  const reader = response.body.getReader();
  const closed = reader.closed;
  void closed.catch(() => undefined);
  const chunks: Uint8Array[] = [];
  let size = 0;
  let complete = false;
  let pendingRead: ReturnType<typeof reader.read> | undefined;
  let cancellation: Promise<void> | undefined;
  const failures: unknown[] = [];
  const cancel = () => {
    if (cancellation) return;
    cancellation = Promise.resolve().then(() => reader.cancel(new Error("RPC response cancelled")));
    void cancellation.catch(() => undefined);
  };
  signal.addEventListener("abort", cancel, { once: true });
  try {
    signal.throwIfAborted();
    while (!complete) {
      pendingRead = reader.read();
      const result = await pendingRead;
      pendingRead = undefined;
      signal.throwIfAborted();
      if (result.done) {
        complete = true;
      } else {
        if (!(result.value instanceof Uint8Array) || result.value.byteLength > maximumBytes - size)
          throw new Error("RPC response exceeds its finite budget");
        chunks.push(result.value.slice());
        size += result.value.byteLength;
      }
    }
  } catch (error) {
    failures.push(error);
  } finally {
    if (!complete) cancel();
    const pending: Promise<unknown>[] = [];
    if (pendingRead) pending.push(pendingRead);
    if (cancellation) pending.push(cancellation);
    pending.push(closed);
    const outcomes = await Promise.allSettled(pending);
    for (const outcome of outcomes) if (outcome.status === "rejected") failures.push(outcome.reason);
    try {
      reader.releaseLock();
    } catch (error) {
      failures.push(error);
    }
    signal.removeEventListener("abort", cancel);
  }
  if (failures.length > 0) throw new AggregateError(failures, "RPC response serialization failed");
  signal.throwIfAborted();
  const body = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new Response(body, { status: response.status, statusText: response.statusText, headers: response.headers });
}

export async function prepareFiniteRpcRequestAsync(
  request: Request,
  signal: AbortSignal,
  maximumBytes: number,
): Promise<Request> {
  if (request.bodyUsed || request.body?.locked) throw new Error("RPC request body is unavailable");
  let body: ArrayBuffer | null = null;
  if (request.body) {
    const finite = await readFiniteRpcResponseAsync(new Response(request.body), signal, maximumBytes);
    body = await finite.arrayBuffer();
  }
  signal.throwIfAborted();
  return new Request(request.url, {
    method: request.method,
    headers: request.headers,
    body,
    signal,
  });
}

export function createAdmittedAuthenticatedRpc(options: {
  readonly contribution: ReturnType<typeof createAuthenticatedReadAssembly>;
  readonly runtime: MainPersistence["runtime"];
  readonly schema: MainSchema;
  readonly requests: AuthenticatedRequestResources;
  readonly path: `/${string}`;
  readonly baseUrl: `${string}://${string}`;
  readonly maximumResponseBytes: number;
  readonly maximumRequestBytes: number;
  assertCurrent(): void;
}): readonly FetchContribution[] {
  const contribution = options.contribution;
  const configuredAccess = options.requests.configuration.readAccess;
  if (
    configuredAccess.length !== authenticatedRpcReadAccess.length ||
    authenticatedRpcReadAccess.some(
      (rule) =>
        !configuredAccess.some(
          (candidate) =>
            candidate.action === rule.action &&
            candidate.resource === rule.resource &&
            candidate.policy.kind === rule.policy.kind &&
            (rule.policy.kind !== "global-permission" ||
              (candidate.policy.kind === "global-permission" &&
                candidate.policy.permission === rule.policy.permission)),
        ),
    )
  )
    throw new Error("Authenticated RPC requires the exact owner-bound read policies");
  if (
    contribution.revision !== "homarr.backend.source-port.v2" ||
    contribution.id !== "homarr.authenticated-read.source-port.v2" ||
    contribution.leaves.length !== authenticatedReadLeaves.length ||
    new Set(contribution.leaves).size !== authenticatedReadLeaves.length ||
    authenticatedReadLeaves.some((leaf) => !contribution.leaves.includes(leaf))
  )
    throw new Error("Authenticated RPC registry must contain exactly twelve enrolled reads");
  const registered = new Set<string>();
  const lazy = walkProcedureContractsSync(contribution.router, (procedure, path) => {
    const descriptor = getSourceProcedureMeta(procedure);
    const rule = authenticatedRpcReadAccess.find((candidate) => candidate.resource === path.join("."));
    if (
      !descriptor ||
      !rule ||
      descriptor.path !== rule.resource ||
      descriptor.kind !== "query" ||
      descriptor.demo !== "guarded" ||
      registered.has(descriptor.path) ||
      (rule.policy.kind === "authenticated" && descriptor.access.kind !== "protected") ||
      (rule.policy.kind === "global-permission" &&
        (descriptor.access.kind !== "permission" || descriptor.access.permission !== rule.policy.permission))
    )
      throw new Error("Authenticated RPC registry contains an unaccepted policy");
    registered.add(descriptor.path);
  });
  if (lazy.length > 0 || registered.size !== authenticatedReadLeaves.length)
    throw new Error("Authenticated RPC registry must be explicit and complete");
  const handler = new RPCHandler(contribution.router, { allowMethods: ["POST"] });
  return Object.freeze(
    authenticatedRpcReadAccess.map((rule): FetchContribution => {
      return Object.freeze({
        phase: "rpc",
        path: `${options.path}/${rule.resource.replaceAll(".", "/")}`,
        descendants: false,
        access: { kind: "protected", action: "read", resource: rule.resource },
        async handle(context) {
          if (context.request.method !== "POST")
            return { kind: "response", response: new Response(null, { status: 405, headers: { allow: "POST" } }) };
          const request = await prepareAuthenticatedRpcRequestAsync(context, options.requests, options.assertCurrent);
          request.assertCurrent();
          if (options.runtime.engine !== "sqlite") throw new Error("Authenticated RPC requires main SQLite");
          let response: Response | undefined;
          try {
            response = await options.runtime.runAsync(async (database, schema) => {
              if (schema !== options.schema) throw new Error("Authenticated RPC requires the admitted main schema");
              let active = true;
              const assertCurrent = () => {
                if (!active) throw new Error("Authenticated RPC SQL admission has expired");
                request.assertCurrent();
              };
              try {
                assertCurrent();
                const backend = createSetupBackedContext(
                  {
                    request: context.request,
                    signal: request.signal,
                    principal: request.principal,
                    deviceType: undefined,
                    baseUrl: options.baseUrl,
                    demo: options.requests.configuration.demo,
                    effect(effect) {
                      assertCurrent();
                      context.effect(effect);
                    },
                    onDispose(dispose) {
                      assertCurrent();
                      context.onDispose(dispose);
                    },
                  },
                  { database, schema, signal: request.signal, assertCurrent },
                  {
                    operators: { eq },
                    now: options.requests.configuration.now,
                  },
                );
                const boundedRequest = await prepareFiniteRpcRequestAsync(
                  context.request,
                  request.signal,
                  options.maximumRequestBytes,
                );
                assertCurrent();
                const result = await handler.handle(boundedRequest, { prefix: options.path, context: backend });
                if (result.matched) response = result.response;
                assertCurrent();
                if (!result.matched) throw new Error("Selected authenticated RPC did not match");
                const finite = await readFiniteRpcResponseAsync(
                  result.response,
                  request.signal,
                  options.maximumResponseBytes,
                );
                response = finite;
                assertCurrent();
                await request.assertCurrentAsync();
                assertCurrent();
                return finite;
              } finally {
                active = false;
              }
            });
            await request.assertCurrentAsync();
            request.assertCurrent();
            return { kind: "response", response };
          } catch (error) {
            try {
              await response?.body?.cancel(error);
            } catch (cleanupError) {
              throw new AggregateError([error, cleanupError], "Authenticated RPC output and cleanup failed");
            }
            throw error;
          }
        },
      } satisfies FetchContribution);
    }),
  );
}
