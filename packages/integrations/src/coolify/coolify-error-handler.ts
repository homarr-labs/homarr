import { ResponseError } from "@homarr/common/server";

import type { IIntegrationErrorHandler } from "../base/errors/handler";
import { integrationFetchHttpErrorHandler } from "../base/errors/http";
import { IntegrationResponseError } from "../base/errors/http/integration-response-error";
import type { IntegrationError, IntegrationErrorData } from "../base/errors/integration-error";

export class CoolifyApiErrorHandler implements IIntegrationErrorHandler {
  handleError(error: unknown, integration: IntegrationErrorData): IntegrationError | undefined {
    if (!(error instanceof Error)) return undefined;

    // Handle fetch errors
    if (error.cause && error.cause instanceof TypeError) {
      return integrationFetchHttpErrorHandler.handleError(error.cause, integration);
    }

    // Handle HTTP response errors
    if (error instanceof ResponseError) {
      return new IntegrationResponseError(integration, { cause: error });
    }

    // Handle common Coolify API error patterns
    if (error.message.includes("401") || error.message.includes("Unauthorized")) {
      return new IntegrationResponseError(integration, { cause: new ResponseError({ status: 401 }, { cause: error }) });
    }

    if (error.message.includes("403") || error.message.includes("Forbidden")) {
      return new IntegrationResponseError(integration, { cause: new ResponseError({ status: 403 }, { cause: error }) });
    }

    if (error.message.includes("404") || error.message.includes("Not Found")) {
      return new IntegrationResponseError(integration, { cause: new ResponseError({ status: 404 }, { cause: error }) });
    }

    if (error.message.includes("500") || error.message.includes("Internal Server Error")) {
      return new IntegrationResponseError(integration, { cause: new ResponseError({ status: 500 }, { cause: error }) });
    }

    return undefined;
  }
}
