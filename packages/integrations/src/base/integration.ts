import type tls from "node:tls";
import type { AxiosInstance } from "axios";
import type { Dispatcher } from "undici";
import type { fetch as undiciFetch } from "undici";

import { getIntegrationHttpAuthDefinition } from "@homarr/definitions";
import type { IntegrationKind, IntegrationSecretKind } from "@homarr/definitions";

import type { IntegrationHttpAuthentication } from "../http-auth";
import { resolveDeclaredHttpAuthentication } from "../http-auth";
import { HandleIntegrationErrors } from "./errors/decorator";
import { TestConnectionError } from "./test-connection/test-connection-error";
import type { TestingResult } from "./test-connection/test-connection-service";
import { getIntegrationRuntimeResources, requireIntegrationRuntimeResources } from "../runtime/context";
import type { IntegrationSecret } from "./types";

export interface IntegrationInput {
  id: string;
  kind?: IntegrationKind;
  name: string;
  url: string;
  externalUrl: string | null;
  decryptedSecrets: IntegrationSecret[];
}

export interface IntegrationTestingInput {
  fetchAsync: typeof undiciFetch;
  dispatcher: Dispatcher;
  axiosInstance: AxiosInstance;
  options: {
    ca: string[] | string;
    checkServerIdentity: typeof tls.checkServerIdentity;
  };
}

@HandleIntegrationErrors([])
export abstract class Integration {
  constructor(protected integration: IntegrationInput) {}

  public async getHttpAuthenticationAsync(): Promise<IntegrationHttpAuthentication> {
    if (this.integration.kind) {
      const definition = getIntegrationHttpAuthDefinition(this.integration.kind);
      if (definition.type !== "adapter") return resolveDeclaredHttpAuthentication(this.integration, definition);
    }
    throw new Error("This integration does not support arbitrary HTTP requests");
  }

  public get publicIntegration() {
    return {
      id: this.integration.id,
      name: this.integration.name,
      url: this.integration.url,
    };
  }

  protected getSecretValue(kind: IntegrationSecretKind) {
    getIntegrationRuntimeResources()?.context.signal.throwIfAborted();
    const secret = this.integration.decryptedSecrets.find((entry) => entry.kind === kind);
    if (!secret) {
      throw new Error(`No secret of kind ${kind} was found`);
    }
    return secret.value;
  }

  protected hasSecretValue(kind: IntegrationSecretKind) {
    return this.integration.decryptedSecrets.some((secret) => secret.kind === kind);
  }

  private createUrl(
    inputUrl: string,
    path: `/${string}`,
    queryParams?: Record<string, string | Date | number | boolean | null | undefined>,
  ) {
    const baseUrl = inputUrl.replace(/\/+$/, "");
    const url = new URL(`${baseUrl}${path}`);

    if (queryParams) {
      for (const [key, value] of Object.entries(queryParams)) {
        if (value === null || value === undefined) {
          continue;
        }
        url.searchParams.set(key, value instanceof Date ? value.toISOString() : value.toString());
      }
    }

    return url;
  }
  protected url(path: `/${string}`, queryParams?: Record<string, string | Date | number | boolean | null | undefined>) {
    return this.createUrl(this.integration.url, path, queryParams);
  }

  protected externalUrl(
    path: `/${string}`,
    queryParams?: Record<string, string | Date | number | boolean | null | undefined>,
  ) {
    return this.createUrl(this.integration.externalUrl ?? this.integration.url, path, queryParams);
  }

  protected webSocketUrl(
    path: `/${string}`,
    queryParams?: Record<string, string | Date | number | boolean | null | undefined>,
  ) {
    const url = this.url(path, queryParams);
    // http -> ws, https -> wss
    url.protocol = url.protocol.replace("http", "ws");
    return url;
  }

  public async testConnectionAsync(): Promise<TestingResult> {
    const resources = requireIntegrationRuntimeResources();
    try {
      resources.context.signal.throwIfAborted();
      return await resources.transport.testConnectionAsync(this.integration, resources.context, (input) =>
        this.testingAsync(input),
      );
    } catch (error) {
      if (!(error instanceof TestConnectionError)) {
        return TestConnectionError.UnknownResult(error);
      }

      return error.toResult();
    }
  }

  /**
   * Test the connection to the integration
   * @returns {Promise<TestingResult>}
   */
  protected abstract testingAsync(input: IntegrationTestingInput): Promise<TestingResult>;
}
