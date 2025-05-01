import { Agent as HttpsAgent } from "node:https";
import type { AxiosInstance } from "axios";
import axios from "axios";
import type { Dispatcher, Response } from "undici";
import { fetch as undiciFetch } from "undici";
import { z } from "zod";

import { createCertificateAgentAsync } from "@homarr/certificates/server";
import { extractErrorMessage, removeTrailingSlash } from "@homarr/common";
import { LoggingAgent } from "@homarr/common/server";
import type { IntegrationSecretKind } from "@homarr/definitions";
import { logger } from "@homarr/log";

import { ResponseError } from "./error";
import { HandleIntegrationErrors } from "./errors/decorator";
import { integrationFetchHttpErrorHandler } from "./errors/http";
import { integrationJsonParseErrorHandler, integrationZodParseErrorHandler } from "./errors/parse";
import { IntegrationTestConnectionError } from "./test-connection-error";
import { TestConnectionError } from "./test-connection/test-connection-error";
import type { TestingResult } from "./test-connection/test-connection-service";
import { TestConnectionService } from "./test-connection/test-connection-service";
import type { IntegrationSecret } from "./types";

const causeSchema = z.object({
  code: z.string(),
});

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

  protected async fetchAsync(...[input, options]: Parameters<typeof undiciFetch>) {
    return await undiciFetch(input, {
      ...options,
      dispatcher: await this.createTrustedDispatcherAsync(),
    });
  }

  protected async createTrustedDispatcherAsync() {
    return await createCertificateAgentAsync();
  }

  public async testConnectionAsync(): Promise<TestingResult> {
    try {
      const url = new URL(this.integration.url);
      return await new TestConnectionService(url).handleAsync(async ({ ca }) => {
        const fetchDispatcher = new LoggingAgent({
          connect: {
            ca,
          },
        });

        const axiosInstance = axios.create({
          httpsAgent: new HttpsAgent({
            ca,
          }),
        });

        const callback: typeof this.testingAsync = this.testingAsync.bind(this);
        return await callback({
          dispatcher: fetchDispatcher,
          fetchAsync: async (url, options) => await undiciFetch(url, { ...options, dispatcher: fetchDispatcher }),
          axiosInstance,
        });
      });
    } catch (error) {
      if (error instanceof ResponseError) {
        return TestConnectionError.StatusResult({
          status: error.statusCode,
          url: error.url,
        });
      }

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
  public abstract testingAsync(input: IntegrationTestingInput): Promise<TestingResult>;

  protected async handleTestConnectionResponseAsync({
    queryFunctionAsync,
    handleResponseAsync,
  }: {
    queryFunctionAsync: () => Promise<Response>;
    handleResponseAsync?: (response: Response) => Promise<void>;
  }): Promise<void> {
    const response = await queryFunctionAsync().catch((error) => {
      if (error instanceof Error) {
        const cause = causeSchema.safeParse(error.cause);
        if (!cause.success) {
          logger.error("Failed to test connection", error);
          throw new IntegrationTestConnectionError("commonError", extractErrorMessage(error));
        }

        if (cause.data.code === "ENOTFOUND") {
          logger.error("Failed to test connection: Domain not found");
          throw new IntegrationTestConnectionError("domainNotFound");
        }

        if (cause.data.code === "ECONNREFUSED") {
          logger.error("Failed to test connection: Connection refused");
          throw new IntegrationTestConnectionError("connectionRefused");
        }

        if (cause.data.code === "ECONNABORTED") {
          logger.error("Failed to test connection: Connection aborted");
          throw new IntegrationTestConnectionError("connectionAborted");
        }
      }

      logger.error("Failed to test connection", error);

      throw new IntegrationTestConnectionError("commonError", extractErrorMessage(error));
    });

    if (response.status >= 400) {
      const body = await response.text();
      logger.error(`Failed to test connection with status code ${response.status}. Body: '${body}'`);

      throwErrorByStatusCode(response.status);
    }

    await handleResponseAsync?.(response);
  }
}
/*
export interface TestConnectionError {
  key: Exclude<keyof TranslationObject["integration"]["testConnection"]["notification"], "success">;
  message?: string;
}
export type TestConnectionResult =
  | {
      success: false;
      error: TestConnectionError;
    }
  | {
      success: true;
    };*/

export const throwErrorByStatusCode = (statusCode: number) => {
  switch (statusCode) {
    case 400:
      throw new IntegrationTestConnectionError("badRequest");
    case 401:
      throw new IntegrationTestConnectionError("unauthorized");
    case 403:
      throw new IntegrationTestConnectionError("forbidden");
    case 404:
      throw new IntegrationTestConnectionError("notFound");
    case 429:
      throw new IntegrationTestConnectionError("tooManyRequests");
    case 500:
      throw new IntegrationTestConnectionError("internalServerError");
    case 503:
      throw new IntegrationTestConnectionError("serviceUnavailable");
    default:
      throw new IntegrationTestConnectionError("commonError");
  }
};
