import type tls from "node:tls";
import type { AxiosInstance } from "axios";
import type { Dispatcher } from "undici";
import { fetch as undiciFetch } from "undici";

import { createAxiosCertificateInstanceAsync, createCertificateAgentAsync } from "@homarr/certificates/server";
import { removeTrailingSlash } from "@homarr/common";
import type { IntegrationSecretKind } from "@homarr/definitions";

import { HandleIntegrationErrors } from "./errors/decorator";
import { integrationFetchHttpErrorHandler } from "./errors/http";
import { integrationJsonParseErrorHandler, integrationZodParseErrorHandler } from "./errors/parse";
import { TestConnectionError } from "./test-connection/test-connection-error";
import type { TestingResult } from "./test-connection/test-connection-service";
import { TestConnectionService } from "./test-connection/test-connection-service";
import type { IntegrationSecret } from "./types";

export interface IntegrationInput {
  id: string;
  name: string;
  url: string;
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

@HandleIntegrationErrors([
  integrationZodParseErrorHandler,
  integrationJsonParseErrorHandler,
  integrationFetchHttpErrorHandler,
])
export abstract class Integration {
  constructor(protected integration: IntegrationInput) {}

  public get publicIntegration() {
    return {
      id: this.integration.id,
      name: this.integration.name,
      url: this.integration.url,
    };
  }

  protected getSecretValue(kind: IntegrationSecretKind) {
    const secret = this.integration.decryptedSecrets.find((secret) => secret.kind === kind);
    if (!secret) {
      throw new Error(`No secret of kind ${kind} was found`);
    }
    return secret.value;
  }

  protected hasSecretValue(kind: IntegrationSecretKind) {
    return this.integration.decryptedSecrets.some((secret) => secret.kind === kind);
  }

  protected url(path: `/${string}`, queryParams?: Record<string, string | Date | number | boolean>) {
    const baseUrl = removeTrailingSlash(this.integration.url);
    const url = new URL(`${baseUrl}${path}`);

    if (queryParams) {
      for (const [key, value] of Object.entries(queryParams)) {
        url.searchParams.set(key, value instanceof Date ? value.toISOString() : value.toString());
      }
    }

    return url;
  }

  public async testConnectionAsync(): Promise<TestingResult> {
    try {
      const url = new URL(this.integration.url);
      return await new TestConnectionService(url).handleAsync(async ({ ca, checkServerIdentity }) => {
        const fetchDispatcher = await createCertificateAgentAsync({
          ca,
          checkServerIdentity,
        });

        const axiosInstance = await createAxiosCertificateInstanceAsync({
          ca,
          checkServerIdentity,
        });

        const testingAsync: typeof this.testingAsync = this.testingAsync.bind(this);
        return await testingAsync({
          dispatcher: fetchDispatcher,
          fetchAsync: async (url, options) => await undiciFetch(url, { ...options, dispatcher: fetchDispatcher }),
          axiosInstance,
          options: {
            ca,
            checkServerIdentity,
          },
        });
      });
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
