import { ResponseError } from "@homarr/common/server";

import type { IIntegrationErrorHandler } from "../base/errors/handler";
import { integrationFetchHttpErrorHandler } from "../base/errors/http";
import { IntegrationResponseError } from "../base/errors/http/integration-response-error";
import type { IntegrationError, IntegrationErrorData } from "../base/errors/integration-error";

export class IncusApiErrorHandler implements IIntegrationErrorHandler {
  handleError(error: unknown, integration: IntegrationErrorData): IntegrationError | undefined {
    if (!(error instanceof Error)) return undefined;

    // Handle fetch errors (network issues, etc.)
    if (error.cause && error.cause instanceof TypeError) {
      return integrationFetchHttpErrorHandler.handleError(error.cause, integration);
    }

    // Handle Incus API error responses
    if (error instanceof ResponseError) {
      return new IntegrationResponseError(integration, { cause: error });
    }

    // Handle error messages containing HTTP status codes
    const statusCodeMatch = /status[_\s]?code[:\s]*(\d{3})/i.exec(error.message);
    if (statusCodeMatch?.[1]) {
      const statusCode = parseInt(statusCodeMatch[1], 10);
      return new IntegrationResponseError(integration, {
        cause: new ResponseError({ status: statusCode }, { cause: error }),
      });
    }

    // Handle common Incus error patterns
    if (error.message.includes("not found")) {
      return new IntegrationResponseError(integration, {
        cause: new ResponseError({ status: 404 }, { cause: error }),
      });
    }

    if (error.message.includes("not authorized") || error.message.includes("authentication")) {
      return new IntegrationResponseError(integration, {
        cause: new ResponseError({ status: 401 }, { cause: error }),
      });
    }

    if (error.message.includes("forbidden") || error.message.includes("permission denied")) {
      return new IntegrationResponseError(integration, {
        cause: new ResponseError({ status: 403 }, { cause: error }),
      });
    }

    return undefined;
  }
}
