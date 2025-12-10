import { FetchError } from "node-fetch";

import { logger } from "@homarr/log";

import { RequestError } from "../request-error";
import type { AnyRequestError } from "../request-error";
import type { ResponseError } from "../response-error";
import { matchErrorCode } from "./fetch-http-error-handler";
import { HttpErrorHandler } from "./http-error-handler";

/**
 * node-fetch was a defacto standard to use fetch in nodejs.
 *
 * It is for example used within the cross-fetch package which is used in tsdav.
 */
export class NodeFetchHttpErrorHandler extends HttpErrorHandler {
  constructor(private type = "node-fetch") {
    super();
  }

  handleRequestError(error: unknown): AnyRequestError | undefined {
    if (!(error instanceof FetchError)) return undefined;
    if (error.code === undefined) return undefined;

    logger.debug(`Received ${this.type} request error`, {
      code: error.code,
      message: error.message,
    });

    const requestErrorInput = matchErrorCode(error.code);
    if (!requestErrorInput) return undefined;

    return new RequestError(requestErrorInput, {
      cause: error,
    });
  }

  /**
   * Response errors do not exist for fetch as it does not throw errors for non successful responses.
   */
  handleResponseError(_: unknown): ResponseError | undefined {
    return undefined;
  }
}
