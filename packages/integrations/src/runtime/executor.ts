import type { IntegrationKind } from "@homarr/definitions";
import type {
  AnyRequestErrorReason,
  RequestErrorCode,
  RequestErrorReason,
  RequestErrorType,
} from "@homarr/common/server";

import { createIntegrationAsync } from "../base/creator";
import type { IntegrationInstanceOfKind } from "../base/creator";
import type { IntegrationInput } from "../base/integration";
import type { TestingResult } from "../base/test-connection/test-connection-service";
import type { IntegrationHttpAuthentication } from "../http-auth";
import type { StatsValue } from "../stats/types";
import type {
  IntegrationAuthority,
  IntegrationConfiguration,
  IntegrationExecutionContext,
  IntegrationRuntimePolicy,
  IntegrationRuntimeResources,
} from "./contracts";
import { withIntegrationRuntimeAsync } from "./context";

export type IntegrationRuntimeFailure = "aborted" | "stale" | "unavailable" | "failed";

export type IntegrationConnectionResult =
  | { success: true }
  | {
      success: false;
      error:
        | { type: "unknown" | "parse" }
        | { type: "authorization" | "statusCode"; statusCode: number }
        | {
            type: "request";
            requestType: RequestErrorType;
            requestReason: AnyRequestErrorReason;
            requestCode: RequestErrorCode;
          }
        | {
            type: "certificate";
            certificatePem: string;
            fingerprint256: string;
            requestReason: RequestErrorReason<"certificate">;
            requestCode: RequestErrorCode;
          };
    };

const safeConnectionResult = (result: TestingResult): IntegrationConnectionResult => {
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

export class IntegrationRuntimeError extends Error {
  constructor(public readonly code: IntegrationRuntimeFailure) {
    super(`Integration execution ${code}`);
    this.name = "IntegrationRuntimeError";
  }
}

export interface IntegrationRuntimeDependencies<TPrincipal> {
  policy: IntegrationRuntimePolicy<TPrincipal>;
  createResourcesAsync: (
    integration: IntegrationInput,
    context: IntegrationExecutionContext,
  ) => Promise<IntegrationRuntimeResources>;
  fetchStatsAsync: (
    integration: IntegrationInput & { kind: IntegrationKind },
    signal: AbortSignal,
  ) => Promise<Record<string, StatsValue>>;
  now: () => number;
}

export interface IntegrationRuntimeRequest<TPrincipal, TKind extends IntegrationKind = IntegrationKind> {
  principal: TPrincipal;
  integration: IntegrationConfiguration & { kind: TKind };
  signal: AbortSignal;
  deadlineAt: number;
}

export const createIntegrationRuntime = <TPrincipal>(dependencies: IntegrationRuntimeDependencies<TPrincipal>) => {
  const pending = new Set<Promise<unknown>>();
  const controllers = new Set<AbortController>();
  let closed = false;

  const executeAsync = async <TKind extends IntegrationKind, TValue>(
    request: IntegrationRuntimeRequest<TPrincipal, TKind>,
    authority: IntegrationAuthority,
    operation: (
      input: IntegrationInput & { kind: TKind },
      context: IntegrationExecutionContext,
      assertExecutionAllowedAsync: () => Promise<void>,
    ) => Promise<TValue>,
  ): Promise<TValue> => {
    if (closed) throw new IntegrationRuntimeError("unavailable");
    const integration = Object.freeze({ ...request.integration });
    const controller = new AbortController();
    const timeoutMs = request.deadlineAt - dependencies.now();
    if (!Number.isFinite(timeoutMs) || timeoutMs <= 0 || timeoutMs > 2_147_483_647)
      throw new IntegrationRuntimeError("aborted");
    const deadline = setTimeout(() => controller.abort(), timeoutMs);
    deadline.unref?.();
    const signal = AbortSignal.any([request.signal, controller.signal]);
    const context: IntegrationExecutionContext = {
      signal,
      deadlineAt: request.deadlineAt,
      configurationIdentity: integration.configurationIdentity,
      trustIdentity: integration.trustIdentity,
    };
    const assertExecutionAllowedAsync = async () => {
      signal.throwIfAborted();
      await dependencies.policy.authorizeAsync(request.principal, integration, authority, signal);
      signal.throwIfAborted();
      if (!(await dependencies.policy.isCurrentAsync(integration, signal))) throw new IntegrationRuntimeError("stale");
      signal.throwIfAborted();
    };
    controllers.add(controller);
    let onAbort: (() => void) | undefined;
    const aborted = new Promise<never>((_resolve, reject) => {
      onAbort = () => reject(new IntegrationRuntimeError("aborted"));
      signal.addEventListener("abort", onAbort, { once: true });
    });
    const work = (async () => {
      signal.throwIfAborted();
      await dependencies.policy.authorizeAsync(request.principal, integration, authority, signal);
      signal.throwIfAborted();
      if (!(await dependencies.policy.isCurrentAsync(integration, signal))) throw new IntegrationRuntimeError("stale");
      signal.throwIfAborted();
      const resolvedSecrets = await dependencies.policy.resolveSecretsAsync(integration, signal);
      signal.throwIfAborted();
      if (!(await dependencies.policy.isCurrentAsync(integration, signal))) throw new IntegrationRuntimeError("stale");
      const input = { ...integration, decryptedSecrets: resolvedSecrets.map((secret) => Object.freeze({ ...secret })) };
      const resources = await dependencies.createResourcesAsync(input, context);
      await assertExecutionAllowedAsync();
      const result = await withIntegrationRuntimeAsync({ ...resources, context }, async () => {
        await assertExecutionAllowedAsync();
        signal.throwIfAborted();
        return operation(input, context, assertExecutionAllowedAsync);
      });
      signal.throwIfAborted();
      if (!(await dependencies.policy.isCurrentAsync(integration, signal))) throw new IntegrationRuntimeError("stale");
      signal.throwIfAborted();
      return result;
    })()
      .catch((error: unknown) => {
        if (signal.aborted) throw new IntegrationRuntimeError("aborted");
        if (error instanceof IntegrationRuntimeError) throw new IntegrationRuntimeError(error.code);
        throw new IntegrationRuntimeError("failed");
      })
      .finally(() => {
        clearTimeout(deadline);
        if (onAbort) signal.removeEventListener("abort", onAbort);
        controllers.delete(controller);
        pending.delete(work);
      });
    pending.add(work);
    try {
      return await Promise.race([work, aborted]);
    } finally {
      if (onAbort) signal.removeEventListener("abort", onAbort);
    }
  };

  return {
    executeNativeAsync<TKind extends IntegrationKind, TValue>(
      request: IntegrationRuntimeRequest<TPrincipal, TKind>,
      authority: "query" | "interact",
      operation: (client: IntegrationInstanceOfKind<TKind>, context: IntegrationExecutionContext) => Promise<TValue>,
    ) {
      return executeAsync(request, authority, async (input, context, assertExecutionAllowedAsync) => {
        const client = await createIntegrationAsync(input);
        await assertExecutionAllowedAsync();
        context.signal.throwIfAborted();
        return operation(client, context);
      });
    },
    fetchStatsAsync(request: IntegrationRuntimeRequest<TPrincipal>) {
      return executeAsync(request, "query", (input, context) => dependencies.fetchStatsAsync(input, context.signal));
    },
    getHttpAuthenticationAsync(request: IntegrationRuntimeRequest<TPrincipal>): Promise<IntegrationHttpAuthentication> {
      return executeAsync(request, "full", async (input, context, assertExecutionAllowedAsync) => {
        const client = await createIntegrationAsync(input);
        await assertExecutionAllowedAsync();
        context.signal.throwIfAborted();
        return client.getHttpAuthenticationAsync();
      });
    },
    testConnectionAsync(request: IntegrationRuntimeRequest<TPrincipal>) {
      return executeAsync(request, "full", async (input, context, assertExecutionAllowedAsync) => {
        const client = await createIntegrationAsync(input);
        await assertExecutionAllowedAsync();
        context.signal.throwIfAborted();
        return safeConnectionResult(await client.testConnectionAsync());
      });
    },
    get pendingCount() {
      return pending.size;
    },
    async closeAsync() {
      closed = true;
      for (const controller of controllers) controller.abort();
      await Promise.allSettled(pending);
    },
  };
};
