import type { IntegrationKind, IntegrationSecretKind } from "@homarr/definitions";
import { getIntegrationHttpAuthDefinition } from "@homarr/definitions";
import type { RequestInit, Response } from "undici";

import type { IntegrationInstanceOfKind } from "../../base/creator";
import type { IntegrationInput, IntegrationTestingInput } from "../../base/integration";
import { TestConnectionError } from "../../base/test-connection/test-connection-error";
import type { TestingResult } from "../../base/test-connection/test-connection-service";
import type { IntegrationHttpAuthentication } from "../../http-auth";
import { resolveDeclaredHttpAuthentication } from "../../http-auth";
import type { IntegrationExecutionContext, IntegrationRuntimeResources } from "../../runtime/contracts";
import { withIntegrationTestingAsync } from "../../runtime/testing";
import { sanitizeIntegrationTransportError } from "../../runtime/transport-errors";

export type MediaPublic<TKind extends IntegrationKind> = Pick<
  IntegrationInstanceOfKind<TKind>,
  keyof IntegrationInstanceOfKind<TKind>
>;

type Query = Record<string, string | Date | number | boolean | null | undefined>;

export class MediaClientHoldError extends Error {
  constructor(
    public readonly dependency:
      | "interact-authority"
      | "image-registration"
      | "sdk-fetch-compatibility"
      | "parse-error-normalization",
  ) {
    super(`Media client operation is held: ${dependency}`);
    this.name = "MediaClientHoldError";
  }
}

export class MediaHttpOperation {
  constructor(
    readonly input: IntegrationTestingInput,
    readonly context: IntegrationExecutionContext,
  ) {}

  async responseAsync<T>(url: URL, init: RequestInit, consume: (response: Response) => Promise<T>): Promise<T> {
    this.context.signal.throwIfAborted();
    const signal = init.signal ? AbortSignal.any([this.context.signal, init.signal]) : this.context.signal;
    const response = await this.input.fetchAsync(url, { ...init, signal, redirect: "error" });
    try {
      const value = await consume(response);
      signal.throwIfAborted();
      return value;
    } finally {
      if (!response.bodyUsed) await response.body?.cancel();
    }
  }
}

export abstract class MediaHttpClient {
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

  async testConnectionAsync(): Promise<TestingResult> {
    try {
      return await this.resources.transport.testConnectionAsync(this.integration, this.resources.context, (input) =>
        this.testingAsync(new MediaHttpOperation(input, this.resources.context)),
      );
    } catch (error) {
      this.resources.context.signal.throwIfAborted();
      if (error instanceof MediaClientHoldError) throw error;
      return error instanceof TestConnectionError
        ? error.toResult()
        : TestConnectionError.UnknownResult(sanitizeIntegrationTransportError(error));
    }
  }

  protected abstract testingAsync(operation: MediaHttpOperation): Promise<TestingResult>;

  protected runAsync<T>(operation: (http: MediaHttpOperation) => Promise<T>): Promise<T> {
    return this.resources.transport.runAsync(this.resources.context, () =>
      withIntegrationTestingAsync(this.integration, this.resources.context, this.resources.transport, (input) =>
        operation(new MediaHttpOperation(input, this.resources.context)),
      ),
    );
  }

  protected secret(kind: IntegrationSecretKind) {
    this.resources.context.signal.throwIfAborted();
    const secret = this.integration.decryptedSecrets.find((entry) => entry.kind === kind);
    if (!secret) throw new Error(`No secret of kind ${kind} was found`);
    return secret.value;
  }

  protected hasSecret(kind: IntegrationSecretKind) {
    this.resources.context.signal.throwIfAborted();
    return this.integration.decryptedSecrets.some((entry) => entry.kind === kind);
  }

  protected url(path: `/${string}`, query?: Query) {
    return this.createUrl(this.integration.url, path, query);
  }

  protected externalUrl(path: `/${string}`, query?: Query) {
    return this.createUrl(this.integration.externalUrl ?? this.integration.url, path, query);
  }

  private createUrl(base: string, path: `/${string}`, query?: Query) {
    const url = new URL(`${base.replace(/\/+$/, "")}${path}`);
    for (const [key, value] of Object.entries(query ?? {})) {
      if (value !== null && value !== undefined)
        url.searchParams.set(key, value instanceof Date ? value.toISOString() : value.toString());
    }
    return url;
  }
}

export async function settleMediaAsync<T>(pending: readonly Promise<T>[]): Promise<T[]> {
  const results = await Promise.allSettled(pending);
  const values: T[] = [];
  for (const result of results) {
    if (result.status === "rejected") throw result.reason;
    values.push(result.value);
  }
  return values;
}

export async function settleMediaPairAsync<T, U>(first: Promise<T>, second: Promise<U>): Promise<[T, U]> {
  const [left, right] = await Promise.allSettled([first, second]);
  if (left.status === "rejected") throw left.reason;
  if (right.status === "rejected") throw right.reason;
  return [left.value, right.value];
}
