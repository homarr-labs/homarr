import type { AnyRequestError } from "../request-error";
import type { ResponseError } from "../response-error";

export abstract class HttpErrorHandler {
  abstract handleRequestError(error: unknown): AnyRequestError | undefined;
  abstract handleResponseError(error: unknown): ResponseError | undefined;
}
