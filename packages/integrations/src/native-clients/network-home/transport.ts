import type { RequestInit, Response } from "undici";

import type { IntegrationSecretKind } from "@homarr/definitions";

import type { IntegrationInput, IntegrationTestingInput } from "../../base/integration";
import { TestConnectionError } from "../../base/test-connection/test-connection-error";
import type { TestingResult } from "../../base/test-connection/test-connection-service";
import type { IntegrationHttpAuthentication } from "../../http-auth";
import { resolveDeclaredHttpAuthentication } from "../../http-auth";
import { getIntegrationHttpAuthDefinition } from "@homarr/definitions";
import type { IntegrationExecutionContext, IntegrationRuntimeResources } from "../../runtime/contracts";
import { withIntegrationTestingAsync } from "../../runtime/testing";
import { IntegrationTransportRequestError, sanitizeIntegrationTransportError } from "../../runtime/transport-errors";

export type NetworkHomeHold =
  | "interact-authority"
  | "fenced-session"
  | "cookie-agent-sdk"
  | "interface-history"
  | "cpu-stream"
  | "parse-error-constructor"
  | "redirect-policy";

export class NetworkHomeCapabilityHeldError extends Error {
  constructor(public readonly capability: NetworkHomeHold) {
    super(`Network/home integration capability is held: ${capability}`);
    this.name = "NetworkHomeCapabilityHeldError";
  }
}

export type NetworkHomeQuery = Record<string, string | Date | number | boolean | null | undefined>;

export class NetworkHomeHttpOperation {
  constructor(
    private readonly input: IntegrationTestingInput,
    private readonly context: IntegrationExecutionContext,
  ) {}

  async responseAsync<T>(url: URL, init: RequestInit, consumeAsync: (response: Response) => Promise<T>): Promise<T> {
    this.context.signal.throwIfAborted();
    const signal = init.signal ? AbortSignal.any([this.context.signal, init.signal]) : this.context.signal;
    const response = await this.input.fetchAsync(url, {
      ...init,
      dispatcher: this.input.dispatcher,
      signal,
      redirect: "manual",
    });
    let failure: { error: unknown } | undefined;
    try {
      signal.throwIfAborted();
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        throw new NetworkHomeCapabilityHeldError("redirect-policy");
      }
      const value = await consumeAsync(response);
      signal.throwIfAborted();
      return value;
    } catch (error) {
      failure = { error };
      throw error;
    } finally {
      try {
        if (response.body && !response.bodyUsed) await response.body.cancel();
      } catch (error) {
        throw new AggregateError(
          failure ? [failure.error, error] : [error],
          "Network/home response body cleanup failed",
          { cause: failure ? failure.error : error },
        );
      }
    }
  }
}

export const settleNetworkHomeAsync = async <T>(operations: Promise<T>[]): Promise<T[]> => {
  const results = await Promise.allSettled(operations);
  for (const result of results) if (result.status === "rejected") throw result.reason;
  return results.flatMap((result) => (result.status === "fulfilled" ? [result.value] : []));
};

export abstract class NetworkHomeProtocol {
  constructor(
    protected readonly integration: IntegrationInput,
    protected readonly resources: IntegrationRuntimeResources,
  ) {}

  get publicIntegration() {
    return { id: this.integration.id, name: this.integration.name, url: this.integration.url };
  }

  async getHttpAuthenticationAsync(): Promise<IntegrationHttpAuthentication> {
    this.resources.context.signal.throwIfAborted();
    if (!this.integration.kind) throw new Error("This integration does not support arbitrary HTTP requests");
    const definition = getIntegrationHttpAuthDefinition(this.integration.kind);
    if (definition.type === "adapter") throw new Error("This integration does not support arbitrary HTTP requests");
    return resolveDeclaredHttpAuthentication(this.integration, definition);
  }

  async testConnectionAsync(): Promise<TestingResult> {
    try {
      this.resources.context.signal.throwIfAborted();
      const state: { failure?: { error: unknown } } = {};
      const result = await this.resources.transport.testConnectionAsync(
        this.integration,
        this.resources.context,
        async (input) => {
          try {
            return await this.testingAsync(new NetworkHomeHttpOperation(input, this.resources.context));
          } catch (error) {
            state.failure = { error };
            throw error;
          }
        },
      );
      if (state.failure) this.rethrowProtectedFailure(state.failure.error);
      this.resources.context.signal.throwIfAborted();
      return result;
    } catch (error) {
      this.rethrowProtectedFailure(error);
      if (error instanceof NetworkHomeCapabilityHeldError) throw error;
      return error instanceof TestConnectionError ? error.toResult() : TestConnectionError.UnknownResult(error);
    }
  }

  protected abstract testingAsync(http: NetworkHomeHttpOperation): Promise<TestingResult>;

  protected runAsync<T>(operation: (http: NetworkHomeHttpOperation) => Promise<T>): Promise<T> {
    return this.resources.transport.runAsync(this.resources.context, () =>
      withIntegrationTestingAsync(this.integration, this.resources.context, this.resources.transport, (input) =>
        operation(new NetworkHomeHttpOperation(input, this.resources.context)),
      ),
    );
  }

  protected url(path: `/${string}`, query?: NetworkHomeQuery): URL {
    const url = new URL(`${this.integration.url.replace(/\/+$/, "")}${path}`);
    for (const [key, value] of Object.entries(query ?? {})) {
      if (value !== undefined && value !== null)
        url.searchParams.set(key, value instanceof Date ? value.toISOString() : String(value));
    }
    return url;
  }

  protected secret(kind: IntegrationSecretKind): string {
    this.resources.context.signal.throwIfAborted();
    const secret = this.integration.decryptedSecrets.find((entry) => entry.kind === kind);
    if (!secret) throw new Error(`No secret of kind ${kind} was found`);
    return secret.value;
  }

  protected hasSecret(kind: IntegrationSecretKind): boolean {
    return this.integration.decryptedSecrets.some((entry) => entry.kind === kind);
  }

  protected requireInteract(): void {
    throw new NetworkHomeCapabilityHeldError("interact-authority");
  }

  protected rethrowProtectedFailure(error: unknown): void {
    if (error instanceof AggregateError) throw error;
    this.resources.context.signal.throwIfAborted();
    if (error instanceof NetworkHomeCapabilityHeldError) throw error;
    if (
      error instanceof Error &&
      ["AbortError", "TimeoutError", "IntegrationBindingError", "IntegrationRuntimeError"].includes(error.name)
    )
      throw error;
    const diagnostic = sanitizeIntegrationTransportError(error);
    if (diagnostic instanceof IntegrationTransportRequestError && diagnostic.diagnostic.type === "certificate")
      throw error;
  }
}
