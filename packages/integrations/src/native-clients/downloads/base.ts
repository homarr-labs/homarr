import type { RequestInit } from "undici";

import { ResponseError } from "@homarr/common/response-error";
import { getIntegrationHttpAuthDefinition } from "@homarr/definitions/integration";
import type { IntegrationSecretKind } from "@homarr/definitions";

import { IntegrationError } from "../../base/errors/integration-error";
import { IntegrationUnknownError } from "../../base/errors/integration-unknown-error";
import type { IntegrationInput, IntegrationTestingInput } from "../../base/integration";
import { TestConnectionError } from "../../base/test-connection/test-connection-error";
import type { TestingResult } from "../../base/test-connection/test-connection-service";
import type { IntegrationHttpAuthentication } from "../../http-auth";
import { resolveDeclaredHttpAuthentication } from "../../http-auth";
import type { DownloadClientItem } from "../../interfaces/downloads/download-client-items";
import type { IntegrationRuntimeResources } from "../../runtime/contracts";
import { withIntegrationTestingAsync } from "../../runtime/testing";
import {
  normalizeSanitizedIntegrationTransportError,
  sanitizeIntegrationTransportError,
} from "../../runtime/transport-errors";
import { DownloadClientHoldError, DownloadProtocolError } from "./contracts";
import type { DownloadControl, DownloadIntegrationKind } from "./contracts";

export abstract class NativeDownloadClient {
  constructor(
    protected readonly integration: IntegrationInput,
    protected readonly resources: IntegrationRuntimeResources,
    protected readonly kind: DownloadIntegrationKind,
  ) {
    if (integration.kind !== undefined && integration.kind !== kind)
      throw new Error("Download integration kind mismatch");
  }

  public get publicIntegration() {
    return { id: this.integration.id, name: this.integration.name, url: this.integration.url };
  }

  public async getHttpAuthenticationAsync(): Promise<IntegrationHttpAuthentication> {
    return await this.operationAsync<IntegrationHttpAuthentication>("getHttpAuthenticationAsync", async () => {
      if (!this.integration.kind) throw new Error("This integration does not support arbitrary HTTP requests");
      return resolveDeclaredHttpAuthentication(
        this.integration,
        getIntegrationHttpAuthDefinition(this.integration.kind),
      );
    });
  }

  public async testConnectionAsync(): Promise<TestingResult> {
    try {
      return await this.resources.transport.runAsync(this.resources.context, () =>
        this.resources.transport.testConnectionAsync(this.integration, this.resources.context, (input) =>
          this.normalizeAsync("testingAsync", () => this.testingAsync(input)),
        ),
      );
    } catch (error) {
      if (error instanceof TestConnectionError) return error.toResult();
      return TestConnectionError.UnknownResult(error);
    }
  }

  public async pauseQueueAsync(): Promise<void> {
    this.rejectControl();
  }

  public async pauseItemAsync(_item: DownloadClientItem): Promise<void> {
    this.rejectControl();
  }

  public async resumeQueueAsync(): Promise<void> {
    this.rejectControl();
  }

  public async resumeItemAsync(_item: DownloadClientItem): Promise<void> {
    this.rejectControl();
  }

  public async deleteItemAsync(_item: DownloadClientItem, _fromDisk: boolean): Promise<void> {
    this.rejectControl();
  }

  protected abstract testingAsync(input: IntegrationTestingInput): Promise<TestingResult>;
  protected abstract prepareControlAsync(input: IntegrationTestingInput, control: DownloadControl): Promise<void>;

  protected rejectControl(): never {
    throw new DownloadClientHoldError(this.kind, this.kind === "slskd" ? "unsupported-control" : "interact-authority");
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

  protected url(path: `/${string}`, query?: Record<string, string>) {
    const url = new URL(`${this.integration.url.replace(/\/+$/, "")}${path}`);
    for (const [key, value] of Object.entries(query ?? {})) url.searchParams.set(key, value);
    return url;
  }

  protected operationAsync<T>(name: string, operation: () => Promise<T>): Promise<T> {
    return this.resources.transport.runAsync(this.resources.context, () => this.normalizeAsync(name, operation));
  }

  protected queryAsync<T>(name: string, operation: (input: IntegrationTestingInput) => Promise<T>): Promise<T> {
    return this.operationAsync(name, () =>
      withIntegrationTestingAsync(this.integration, this.resources.context, this.resources.transport, operation),
    );
  }

  protected async requestJsonAsync(input: IntegrationTestingInput, url: URL, init?: RequestInit): Promise<unknown> {
    const signal = this.resources.context.signal;
    signal.throwIfAborted();
    const response = await input.fetchAsync(url, { ...init, signal, redirect: "error" });
    try {
      if (!response.ok) throw new ResponseError({ status: response.status });
      const body: unknown = await response.json();
      signal.throwIfAborted();
      return body;
    } finally {
      if (response.body && !response.bodyUsed) await response.body.cancel();
    }
  }

  private async normalizeAsync<T>(name: string, operation: () => Promise<T>): Promise<T> {
    const startedAt = Date.now();
    const metadata = {
      operation: name,
      integrationId: this.integration.id,
      integrationKind: this.kind,
      integrationName: this.integration.name,
    };
    this.resources.log?.write("debug", "Integration operation started", metadata);
    try {
      this.resources.context.signal.throwIfAborted();
      const result = await operation();
      this.resources.context.signal.throwIfAborted();
      this.resources.log?.write("debug", "Integration operation completed", {
        ...metadata,
        durationMs: Date.now() - startedAt,
      });
      return result;
    } catch (error) {
      this.resources.context.signal.throwIfAborted();
      if (
        error instanceof DownloadClientHoldError ||
        error instanceof DownloadProtocolError ||
        error instanceof TestConnectionError
      )
        throw error;
      const normalized =
        error instanceof IntegrationError
          ? error
          : normalizeSanitizedIntegrationTransportError(
              sanitizeIntegrationTransportError(error),
              this.publicIntegration,
            );
      let handled = normalized;
      if (!handled) {
        for (const handler of this.resources.errorHandlers) {
          handled = handler.handleError(error, this.publicIntegration);
          if (handled) break;
        }
      }
      const failure =
        handled ??
        new IntegrationUnknownError(this.publicIntegration, { cause: new Error("Integration operation failed") });
      this.resources.log?.write("warn", "Integration operation failed", {
        ...metadata,
        durationMs: Date.now() - startedAt,
        errorType: failure.name,
      });
      throw failure;
    }
  }
}
