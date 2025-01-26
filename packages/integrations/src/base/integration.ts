import type { Response } from "undici";
import { z } from "zod";

import { extractErrorMessage, removeTrailingSlash } from "@homarr/common";
import type { IntegrationSecretKind } from "@homarr/definitions";
import { logger } from "@homarr/log";
import type { TranslationObject } from "@homarr/translation";

import { IntegrationTestConnectionError } from "./test-connection-error";
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

export abstract class Integration {
  constructor(protected integration: IntegrationInput) {}

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

  /**
   * Test the connection to the integration
   * @throws {IntegrationTestConnectionError} if the connection fails
   */
  public abstract testConnectionAsync(): Promise<void>;

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
      logger.error(`Failed to test connection with status code ${response.status}`);

      throwErrorByStatusCode(response.status);
    }

    await handleResponseAsync?.(response);
  }
}

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
    };

const throwErrorByStatusCode = (statusCode: number) => {
  switch (statusCode) {
    case 400:
      throw new IntegrationTestConnectionError("badRequest");
    case 401:
      throw new IntegrationTestConnectionError("unauthorized");
    case 403:
      throw new IntegrationTestConnectionError("forbidden");
    case 404:
      throw new IntegrationTestConnectionError("notFound");
    case 500:
      throw new IntegrationTestConnectionError("internalServerError");
    case 503:
      throw new IntegrationTestConnectionError("serviceUnavailable");
    default:
      throw new IntegrationTestConnectionError("commonError");
  }
};
