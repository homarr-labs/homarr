import type { Response as UndiciResponse } from "undici";
import type { z } from "zod";

import type { IntegrationInput } from "./integration";

export class ParseError extends Error {
  public readonly zodError: z.ZodError;
  public readonly input: unknown;

  constructor(dataName: string, zodError: z.ZodError, input?: unknown) {
    super(`Failed to parse ${dataName}`);
    this.zodError = zodError;
    this.input = input;
  }
}

export class ResponseError extends Error {
  public readonly statusCode: number;
  public readonly url: string;
  public readonly content?: string;

  constructor(response: Response | UndiciResponse, content: unknown) {
    super("Response failed");

    this.statusCode = response.status;
    this.url = response.url;

    try {
      this.content = JSON.stringify(content);
    } catch {
      this.content = content as string;
    }
  }
}

export class IntegrationResponseError extends ResponseError {
  public readonly integration: Pick<IntegrationInput, "id" | "name" | "url">;

  constructor(integration: IntegrationInput, response: Response | UndiciResponse, content: unknown) {
    super(response, content);
    this.integration = {
      id: integration.id,
      name: integration.name,
      url: integration.url,
    };
  }
}
