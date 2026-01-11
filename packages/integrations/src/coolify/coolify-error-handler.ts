import { ResponseError } from "@homarr/common/server";

import type { IIntegrationErrorHandler } from "../base/errors/handler";
import { integrationFetchHttpErrorHandler } from "../base/errors/http";
import { IntegrationResponseError } from "../base/errors/http/integration-response-error";
import type { IntegrationError, IntegrationErrorData } from "../base/errors/integration-error";

const statusPatterns = [
  { pattern: /401|Unauthorized/i, status: 401 },
  { pattern: /403|Forbidden/i, status: 403 },
  { pattern: /404|Not Found/i, status: 404 },
  { pattern: /500|Internal Server Error/i, status: 500 },
] as const;

export class CoolifyApiErrorHandler implements IIntegrationErrorHandler {
  handleError(error: unknown, integration: IntegrationErrorData): IntegrationError | undefined {
    if (!(error instanceof Error)) return undefined;

    if (error.cause && error.cause instanceof TypeError) {
      return integrationFetchHttpErrorHandler.handleError(error.cause, integration);
    }

    if (error instanceof ResponseError) {
      return new IntegrationResponseError(integration, { cause: error });
    }

    for (const { pattern, status } of statusPatterns) {
      if (pattern.test(error.message)) {
        return new IntegrationResponseError(integration, {
          cause: new ResponseError({ status }, { cause: error }),
        });
      }
    }

    return undefined;
  }
}
