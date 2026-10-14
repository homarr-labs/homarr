import { Buffer } from "node:buffer";
import type { RequestInit, Response } from "undici";
import { z } from "zod";

import { getIntegrationHttpAuthDefinition } from "@homarr/definitions";
import type { IntegrationSecretKind } from "@homarr/definitions";

import type { IntegrationInput, IntegrationTestingInput } from "../../base/integration";
import { TestConnectionError } from "../../base/test-connection/test-connection-error";
import type { TestingResult } from "../../base/test-connection/test-connection-service";
import type { IntegrationHttpAuthentication } from "../../http-auth";
import { resolveDeclaredHttpAuthentication } from "../../http-auth";
import type { IntegrationRuntimeResources } from "../../runtime/contracts";
import {
  IntegrationTransportParseError,
  IntegrationTransportRequestError,
  IntegrationTransportStatusError,
  normalizeSanitizedIntegrationTransportError,
  sanitizeIntegrationTransportError,
} from "../../runtime/transport-errors";

export class SpecialistBranchHeldError extends Error {
  constructor(public readonly branch: string) {
    super(`Integration branch is held: ${branch}`);
    this.name = "SpecialistBranchHeldError";
  }
}

export class SpecialistReportedError extends Error {}

export class SpecialistNonDegradableError extends AggregateError {
  declare public readonly errors: unknown[];

  constructor(
    public readonly phase:
      | "acquisition"
      | "callback"
      | "body-cleanup"
      | "redirect-policy"
      | "cancellation"
      | "ownership"
      | "optional-provider"
      | "sibling-settlement",
    failures: readonly unknown[],
  ) {
    super(failures, "Specialist transport safety or retirement is unresolved");
    this.name = "SpecialistNonDegradableError";
  }
}

export class SpecialistFetchAcquisitionError extends IntegrationTransportRequestError {
  declare public readonly acquisitionFailure: unknown;

  constructor(
    diagnostic: ConstructorParameters<typeof IntegrationTransportRequestError>[0],
    acquisitionFailure: unknown,
  ) {
    super(diagnostic);
    Object.defineProperty(this, "acquisitionFailure", { value: acquisitionFailure });
  }
}

export class SpecialistBodyParseError extends IntegrationTransportParseError {
  declare public readonly bodyFailure: unknown;

  constructor(bodyFailure: unknown) {
    super();
    Object.defineProperty(this, "bodyFailure", { value: bodyFailure });
  }
}

type SpecialistOutcome<T> = { success: true; value: T } | { success: false; error: unknown };

export const throwSpecialistCriticalFailures = (failures: readonly unknown[]): void => {
  if (failures.some((error) => error instanceof SpecialistNonDegradableError))
    throw new SpecialistNonDegradableError("sibling-settlement", failures);
};

const protectSpecialistFailure = (error: unknown, signal: AbortSignal): unknown => {
  if (signal.aborted) return new SpecialistNonDegradableError("cancellation", [error, signal.reason]);
  if (
    error instanceof SpecialistNonDegradableError ||
    error instanceof SpecialistBranchHeldError ||
    error instanceof SpecialistReportedError ||
    error instanceof IntegrationTransportStatusError ||
    error instanceof IntegrationTransportRequestError ||
    error instanceof IntegrationTransportParseError ||
    error instanceof TestConnectionError
  )
    return error;
  if (error instanceof SyntaxError || error instanceof z.ZodError) return new SpecialistBodyParseError(error);
  return new SpecialistNonDegradableError("callback", [error]);
};

export const specialistParseResult = (message: string) =>
  TestConnectionError.ParseResult(
    Object.assign(new Error(message), { name: "ParseError", cause: new Error("Invalid integration payload") }),
  );

export type SpecialistQuery = Record<string, string | Date | number | boolean | null | undefined>;

export class SpecialistHttp {
  constructor(
    private readonly input: IntegrationTestingInput,
    private readonly resources: IntegrationRuntimeResources,
  ) {}

  async responseAsync<T>(
    target: string | URL,
    init: RequestInit,
    consumeAsync: (response: Response) => Promise<T>,
    timeoutMs?: number,
    recoverAcquisitionAsync?: (error: SpecialistFetchAcquisitionError) => Promise<T>,
  ): Promise<T> {
    const context = this.resources.context;
    if (context.signal.aborted) throw new SpecialistNonDegradableError("cancellation", [context.signal.reason]);
    const remaining = context.deadlineAt - Date.now();
    if (remaining <= 0)
      throw new SpecialistNonDegradableError("cancellation", [new Error("Integration operation deadline exceeded")]);
    const signal = AbortSignal.any([
      context.signal,
      AbortSignal.timeout(Math.ceil(Math.min(timeoutMs ?? remaining, remaining))),
      ...(init.signal ? [init.signal] : []),
    ]);
    let response: Response;
    try {
      response = await this.input.fetchAsync(target, {
        ...init,
        signal,
        dispatcher: this.input.dispatcher,
        redirect: "manual",
      });
    } catch (error) {
      if (error instanceof SpecialistNonDegradableError) throw error;
      if (signal.aborted) throw new SpecialistNonDegradableError("cancellation", [error, signal.reason]);
      const sanitized = sanitizeIntegrationTransportError(error);
      if (
        sanitized instanceof IntegrationTransportRequestError &&
        (sanitized.diagnostic.type === "connection" ||
          sanitized.diagnostic.type === "dns" ||
          (sanitized.diagnostic.type === "timeout" && sanitized.diagnostic.reason !== "aborted"))
      ) {
        const failure = new SpecialistFetchAcquisitionError(sanitized.diagnostic, error);
        if (recoverAcquisitionAsync) {
          const value = await recoverAcquisitionAsync(failure);
          if (signal.aborted) throw new SpecialistNonDegradableError("cancellation", [failure, signal.reason]);
          return value;
        }
        throw failure;
      }
      throw new SpecialistNonDegradableError("acquisition", [error]);
    }
    let outcome: SpecialistOutcome<T>;
    try {
      if (
        response.redirected ||
        response.type === "opaqueredirect" ||
        (response.status >= 300 && response.status < 400)
      )
        throw new SpecialistNonDegradableError("redirect-policy", [new SpecialistBranchHeldError("redirect-policy")]);
      const value = await consumeAsync(response);
      signal.throwIfAborted();
      outcome = { success: true, value };
    } catch (error) {
      outcome = { success: false, error: protectSpecialistFailure(error, signal) };
    }
    try {
      if (response.body && (!response.bodyUsed || (!outcome.success && response.body.locked)))
        await response.body.cancel();
    } catch (error) {
      throw new SpecialistNonDegradableError("body-cleanup", outcome.success ? [error] : [outcome.error, error]);
    }
    if (!outcome.success) throw outcome.error;
    if (signal.aborted) throw new SpecialistNonDegradableError("cancellation", [signal.reason]);
    return outcome.value;
  }

  jsonAsync(target: string | URL, init: RequestInit = {}, timeoutMs?: number): Promise<unknown> {
    return this.responseAsync(
      target,
      init,
      async (response) => {
        if (!response.ok) throw new IntegrationTransportStatusError(response.status);
        return await response.json();
      },
      timeoutMs,
    );
  }

  textAsync(target: string | URL, init: RequestInit = {}, timeoutMs?: number): Promise<string> {
    return this.responseAsync(
      target,
      init,
      async (response) => {
        if (!response.ok) throw new IntegrationTransportStatusError(response.status);
        return await response.text();
      },
      timeoutMs,
    );
  }
}

export abstract class SpecialistProtocol {
  constructor(
    protected readonly integration: IntegrationInput,
    protected readonly resources: IntegrationRuntimeResources,
  ) {}

  get publicIntegration() {
    return { id: this.integration.id, name: this.integration.name, url: this.integration.url };
  }

  async getHttpAuthenticationAsync(): Promise<IntegrationHttpAuthentication> {
    this.resources.context.signal.throwIfAborted();
    if (this.integration.kind) {
      const definition = getIntegrationHttpAuthDefinition(this.integration.kind);
      if (definition.type !== "adapter") return resolveDeclaredHttpAuthentication(this.integration, definition);
    }
    throw new Error("This integration does not support arbitrary HTTP requests");
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

  protected basicHeaders(username: IntegrationSecretKind = "username", password: IntegrationSecretKind = "password") {
    return {
      Authorization: `Basic ${Buffer.from(`${this.secret(username)}:${this.secret(password)}`).toString("base64")}`,
    };
  }

  protected url(path: `/${string}`, query?: SpecialistQuery, base = this.integration.url): URL {
    const target = new URL(`${base.replace(/\/+$/, "")}${path}`);
    for (const [key, value] of Object.entries(query ?? {})) {
      if (value !== null && value !== undefined)
        target.searchParams.set(key, value instanceof Date ? value.toISOString() : String(value));
    }
    return target;
  }

  protected externalUrl(path: `/${string}`, query?: SpecialistQuery): URL {
    return this.url(path, query, this.integration.externalUrl ?? this.integration.url);
  }

  protected async runAsync<T>(operation: (http: SpecialistHttp) => Promise<T>): Promise<T> {
    const { context, transport } = this.resources;
    const delivery: { failure?: { error: unknown } } = {};
    try {
      const result = await transport.runAsync(context, async () => {
        try {
          if (context.signal.aborted) throw new SpecialistNonDegradableError("cancellation", [context.signal.reason]);
          const lease = await transport.acquireTestingAsync(this.integration, context);
          let outcome: SpecialistOutcome<T>;
          try {
            context.signal.throwIfAborted();
            const value = await operation(new SpecialistHttp(lease.input, this.resources));
            context.signal.throwIfAborted();
            if (Date.now() >= context.deadlineAt)
              throw new SpecialistNonDegradableError("cancellation", [
                new Error("Integration operation deadline exceeded"),
              ]);
            outcome = { success: true, value };
          } catch (error) {
            outcome = { success: false, error: protectSpecialistFailure(error, context.signal) };
          }
          try {
            if (lease.ownership === "owned") await lease.releaseAsync();
          } catch (error) {
            throw new SpecialistNonDegradableError("ownership", outcome.success ? [error] : [outcome.error, error]);
          }
          if (context.signal.aborted)
            throw new SpecialistNonDegradableError(
              "cancellation",
              outcome.success ? [context.signal.reason] : [outcome.error, context.signal.reason],
            );
          if (!outcome.success) {
            delivery.failure = { error: outcome.error };
            throw outcome.error;
          }
          return outcome.value;
        } catch (error) {
          const failure =
            error instanceof SpecialistNonDegradableError || (delivery.failure && error === delivery.failure.error)
              ? error
              : new SpecialistNonDegradableError("ownership", [error]);
          delivery.failure = { error: failure };
          throw failure;
        }
      });
      if (delivery.failure) throw delivery.failure.error;
      if (context.signal.aborted) throw new SpecialistNonDegradableError("cancellation", [context.signal.reason]);
      if (Date.now() >= context.deadlineAt)
        throw new SpecialistNonDegradableError("cancellation", [new Error("Integration operation deadline exceeded")]);
      return result;
    } catch (error) {
      if (delivery.failure && error !== delivery.failure.error)
        throw new SpecialistNonDegradableError("ownership", [delivery.failure.error, error]);
      if (error instanceof SpecialistNonDegradableError) throw error;
      if (context.signal.aborted)
        throw new SpecialistNonDegradableError("cancellation", [error, context.signal.reason]);
      if (delivery.failure && error === delivery.failure.error) throw error;
      throw new SpecialistNonDegradableError("ownership", delivery.failure ? [delivery.failure.error, error] : [error]);
    }
  }

  protected async interactAsync<T>(_operation: () => Promise<T>): Promise<T> {
    throw new SpecialistBranchHeldError("interact-authority");
  }

  async testConnectionAsync(): Promise<TestingResult> {
    const { context, transport } = this.resources;
    const delivery: { critical?: SpecialistNonDegradableError; failure?: { error: unknown } } = {};
    try {
      context.signal.throwIfAborted();
      const result = await transport.testConnectionAsync(this.integration, context, async (input) => {
        try {
          return await this.testingAsync(input);
        } catch (error) {
          const protectedError = protectSpecialistFailure(error, context.signal);
          if (protectedError instanceof SpecialistNonDegradableError) {
            delivery.critical = protectedError;
            throw protectedError;
          }
          if (protectedError instanceof TestConnectionError || protectedError instanceof SpecialistBranchHeldError)
            delivery.failure = { error: protectedError };
          else {
            const sanitized = sanitizeIntegrationTransportError(protectedError);
            delivery.failure = {
              error: normalizeSanitizedIntegrationTransportError(sanitized, this.publicIntegration) ?? sanitized,
            };
          }
          throw delivery.failure.error;
        }
      });
      if (delivery.critical) throw delivery.critical;
      if (context.signal.aborted) throw new SpecialistNonDegradableError("cancellation", [context.signal.reason]);
      if (Date.now() >= context.deadlineAt)
        throw new SpecialistNonDegradableError("cancellation", [new Error("Integration operation deadline exceeded")]);
      return result;
    } catch (error) {
      if (delivery.critical)
        throw error === delivery.critical
          ? delivery.critical
          : new SpecialistNonDegradableError("ownership", [delivery.critical, error]);
      if (error instanceof SpecialistNonDegradableError) throw error;
      if (context.signal.aborted)
        throw new SpecialistNonDegradableError("cancellation", [error, context.signal.reason]);
      if (delivery.failure && error === delivery.failure.error) {
        if (error instanceof TestConnectionError) return error.toResult();
        if (error instanceof SpecialistBranchHeldError) return TestConnectionError.UnknownResult(error);
      }
      throw new SpecialistNonDegradableError("ownership", delivery.failure ? [delivery.failure.error, error] : [error]);
    }
  }

  protected abstract testingAsync(input: IntegrationTestingInput): Promise<TestingResult>;

  protected testingHttp(input: IntegrationTestingInput) {
    return new SpecialistHttp(input, this.resources);
  }

  protected statusResult(response: Response) {
    return TestConnectionError.StatusResult({ status: response.status, url: response.url });
  }
}

export async function settleSpecialistTasksAsync<T extends readonly unknown[]>(tasks: {
  [K in keyof T]: Promise<T[K]>;
}): Promise<T> {
  const results = await Promise.allSettled(tasks);
  const failures: unknown[] = results.flatMap((result) => (result.status === "rejected" ? [result.reason] : []));
  throwSpecialistCriticalFailures(failures);
  const failure = results.find((result) => result.status === "rejected");
  if (failure?.status === "rejected") throw failure.reason;
  return await Promise.all(tasks);
}
