import { ClientResponseError } from "pocketbase";

import { logger } from "@homarr/log";

import type { AnyRequestError } from "../request-error";
import { ResponseError } from "../response-error";
import { FetchHttpErrorHandler } from "./fetch-http-error-handler";
import { HttpErrorHandler } from "./http-error-handler";

export class PocketBaseHttpErrorHandler extends HttpErrorHandler {
  handleRequestError(error: unknown): AnyRequestError | undefined {
    if (!(error instanceof ClientResponseError)) return undefined;
    return new FetchHttpErrorHandler("pocketbase").handleRequestError(error.cause);
  }

  handleResponseError(error: unknown): ResponseError | undefined {
    if (!(error instanceof ClientResponseError)) return undefined;

    let status = error.status;
    if (status === 400 && error.data.message === "Failed to authenticate") {
      status = 401;
    }

    logger.debug("Received pocketbase response error", {
      status,
      url: error.url,
    });

    return new ResponseError({ status: 401, url: error.url }, { cause: error });
  }
}
