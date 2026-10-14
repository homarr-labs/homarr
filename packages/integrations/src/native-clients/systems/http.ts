import type { RequestInit, Response } from "undici";
import { ZodError } from "zod";

import { ResponseError } from "@homarr/common/response-error";
import { getIntegrationHttpAuthDefinition } from "@homarr/definitions";
import type { IntegrationSecretKind } from "@homarr/definitions";

import type { IntegrationInput, IntegrationTestingInput } from "../../base/integration";
import { TestConnectionError } from "../../base/test-connection/test-connection-error";
import type { TestingResult } from "../../base/test-connection/test-connection-service";
import type { IntegrationHttpAuthentication } from "../../http-auth";
import { resolveDeclaredHttpAuthentication } from "../../http-auth";
import type { IntegrationRuntimeResources } from "../../runtime/contracts";
import { IntegrationBindingError } from "../../nitro-bindings/errors";
import { withIntegrationTestingAsync } from "../../runtime/testing";

class SystemsProtectedHttpFailure extends AggregateError {
  constructor(
    public readonly kind: "transport" | "operation" | "redirect-policy" | "response-retirement" | "lease-retirement",
    public readonly failures: readonly unknown[],
  ) {
    super(failures, `Systems HTTP operation is held: ${kind}`);
    this.name = "SystemsProtectedHttpFailure";
  }
}

const isOptionalProviderFailure = (error: unknown) =>
  error instanceof ZodError ||
  (error instanceof ResponseError &&
    Number.isInteger(error.statusCode) &&
    error.statusCode >= 400 &&
    error.statusCode <= 599);

export class SystemsResourceHold extends Error {
  constructor(
    public readonly resource:
      | "dashdot-history"
      | "truenas-socket"
      | "proxmox-sdk-fetch"
      | "beszel-sse"
      | "interaction-authority",
  ) {
    super(`Integration resource is held: ${resource}`);
    this.name = "SystemsResourceHold";
  }
}

export class SystemsHttpOperation {
  private readonly signal: AbortSignal;
  private failure: SystemsProtectedHttpFailure | undefined;

  constructor(
    private readonly input: IntegrationTestingInput,
    resources: IntegrationRuntimeResources,
  ) {
    const remaining = resources.context.deadlineAt - Date.now();
    resources.context.signal.throwIfAborted();
    if (remaining <= 0) throw new DOMException("Integration deadline exceeded", "TimeoutError");
    this.signal = AbortSignal.any([
      resources.context.signal,
      AbortSignal.timeout(Math.min(Math.ceil(remaining), 2_147_483_647)),
    ]);
  }

  assertActive() {
    if (this.failure) throw this.failure;
    this.signal.throwIfAborted();
  }

  rethrowCritical(error: unknown) {
    this.assertActive();
    if (!isOptionalProviderFailure(error)) throw this.protect("operation", [error]);
  }

  private protect(kind: SystemsProtectedHttpFailure["kind"], errors: readonly unknown[]) {
    const failures = this.failure && !errors.includes(this.failure) ? [this.failure, ...errors] : errors;
    const failure = new SystemsProtectedHttpFailure(kind, failures);
    this.failure = failure;
    return failure;
  }

  async readAsync<T>(url: URL, consume: (response: Response) => Promise<T>, init?: RequestInit): Promise<T> {
    this.assertActive();
    const signal = init?.signal ? AbortSignal.any([this.signal, init.signal]) : this.signal;
    let response: Response;
    try {
      response = await this.input.fetchAsync(url, { ...init, signal, redirect: "manual" });
    } catch (error) {
      throw this.protect("transport", signal.aborted ? [error, signal.reason] : [error]);
    }
    let outcome: { kind: "success"; value: T } | { kind: "failure"; error: unknown };
    try {
      this.assertActive();
      if (response.status >= 300 && response.status <= 399) {
        throw this.protect("redirect-policy", [new ResponseError({ status: response.status })]);
      }
      signal.throwIfAborted();
      const result = await consume(response);
      signal.throwIfAborted();
      this.assertActive();
      outcome = { kind: "success", value: result };
    } catch (error) {
      outcome = {
        kind: "failure",
        error:
          error instanceof SystemsProtectedHttpFailure || isOptionalProviderFailure(error)
            ? error
            : this.protect("operation", [error]),
      };
    }
    try {
      await response.body?.cancel();
    } catch (error) {
      throw this.protect("response-retirement", outcome.kind === "failure" ? [outcome.error, error] : [error]);
    }
    if (outcome.kind === "failure") {
      if (outcome.error instanceof SystemsProtectedHttpFailure) throw outcome.error;
      if (!isOptionalProviderFailure(outcome.error)) throw this.protect("operation", [outcome.error]);
      this.assertActive();
      signal.throwIfAborted();
      throw outcome.error;
    }
    this.assertActive();
    signal.throwIfAborted();
    return outcome.value;
  }

  async jsonAsync(url: URL, init?: RequestInit): Promise<unknown> {
    return await this.readAsync(
      url,
      async (response) => {
        if (!response.ok) throw new ResponseError({ status: response.status });
        const data: unknown = await response.json();
        return data;
      },
      init,
    );
  }

  async textAsync(url: URL, init?: RequestInit) {
    return await this.readAsync(
      url,
      async (response) => {
        if (!response.ok) throw new ResponseError({ status: response.status });
        return await response.text();
      },
      init,
    );
  }
}

export abstract class SystemsHttpClient {
  constructor(
    protected readonly integration: IntegrationInput,
    protected readonly resources: IntegrationRuntimeResources,
  ) {}

  get publicIntegration() {
    const { id, name, url } = this.integration;
    return { id, name, url };
  }

  protected secret(kind: IntegrationSecretKind) {
    this.resources.context.signal.throwIfAborted();
    const secret = this.integration.decryptedSecrets.find((entry) => entry.kind === kind);
    if (!secret) throw new Error(`No secret of kind ${kind} was found`);
    return secret.value;
  }

  protected url(path: `/${string}`, params?: Record<string, string>) {
    const url = new URL(`${this.integration.url.replace(/\/+$/, "")}${path}`);
    for (const [key, value] of Object.entries(params ?? {})) url.searchParams.set(key, value);
    return url;
  }

  protected runAsync<T>(operation: (http: SystemsHttpOperation) => Promise<T>): Promise<T> {
    const { context, transport } = this.resources;
    return transport.runAsync(context, async () => {
      let operationFailure: { error: unknown } | undefined;
      try {
        return await withIntegrationTestingAsync(this.integration, context, transport, async (input) => {
          try {
            return await operation(new SystemsHttpOperation(input, this.resources));
          } catch (error) {
            operationFailure = { error };
            throw error;
          }
        });
      } catch (error) {
        if (operationFailure && error !== operationFailure.error) {
          throw new SystemsProtectedHttpFailure("lease-retirement", [operationFailure.error, error]);
        }
        throw error;
      }
    });
  }

  async getHttpAuthenticationAsync(): Promise<IntegrationHttpAuthentication> {
    this.resources.context.signal.throwIfAborted();
    if (!this.integration.kind) throw new Error("This integration does not support arbitrary HTTP requests");
    return resolveDeclaredHttpAuthentication(this.integration, getIntegrationHttpAuthDefinition(this.integration.kind));
  }

  async testConnectionAsync(): Promise<TestingResult> {
    let operationFailure: { error: unknown } | undefined;
    try {
      const result = await this.resources.transport.testConnectionAsync(
        this.integration,
        this.resources.context,
        async (input) => {
          try {
            return await this.testingAsync(new SystemsHttpOperation(input, this.resources));
          } catch (error) {
            operationFailure = { error };
            throw error;
          }
        },
      );
      if (operationFailure?.error instanceof SystemsProtectedHttpFailure) throw operationFailure.error;
      return result;
    } catch (error) {
      if (operationFailure && error !== operationFailure.error) {
        throw new SystemsProtectedHttpFailure("lease-retirement", [operationFailure.error, error]);
      }
      if (error instanceof SystemsProtectedHttpFailure) throw error;
      this.resources.context.signal.throwIfAborted();
      if (error instanceof IntegrationBindingError || error instanceof SystemsResourceHold) throw error;
      return error instanceof TestConnectionError ? error.toResult() : TestConnectionError.UnknownResult(error);
    }
  }

  protected abstract testingAsync(http: SystemsHttpOperation): Promise<TestingResult>;
}

export async function settleAllAsync<T extends readonly unknown[]>(operations: T) {
  try {
    return await Promise.all(operations);
  } finally {
    await Promise.allSettled(operations);
  }
}
