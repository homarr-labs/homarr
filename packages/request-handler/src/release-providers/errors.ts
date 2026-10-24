import { RequestError as OctokitRequestError } from "octokit";

import { extractErrorMessage } from "@homarr/common";
import { ResponseError } from "@homarr/common/server";

import type { ReleaseError, ReleaseErrorCode } from "./types";

export class ReleaseLookupError extends Error {
  constructor(
    readonly code: ReleaseErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "ReleaseLookupError";
  }
}

const errorCodeByHttpStatus: Partial<Record<number, ReleaseErrorCode>> = {
  404: "notFound",
  429: "rateLimited",
};

const accessDeniedStatuses = [401, 403];

const getHttpErrorCode = (status: number): ReleaseErrorCode => errorCodeByHttpStatus[status] ?? "unexpected";

const getResponseErrorCode = (status: number): ReleaseErrorCode => {
  if (accessDeniedStatuses.includes(status)) return "notFound";
  return getHttpErrorCode(status);
};

const isGithubRateLimit = (error: OctokitRequestError) =>
  error.status === 403 &&
  (error.response?.headers["x-ratelimit-remaining"] === "0" || /rate limit/i.test(error.message));

const getGithubErrorCode = (error: OctokitRequestError): ReleaseErrorCode => {
  if (isGithubRateLimit(error)) return "rateLimited";
  return getHttpErrorCode(error.status);
};

export const isNotFoundError = (error: unknown) => error instanceof ResponseError && error.statusCode === 404;

export const toReleaseError = (error: unknown): ReleaseError => {
  if (error instanceof ReleaseLookupError) return { code: error.code, message: error.message };
  if (error instanceof OctokitRequestError) return { code: getGithubErrorCode(error), message: error.message };
  if (error instanceof ResponseError) {
    return { code: getResponseErrorCode(error.statusCode), message: `${error.url} responded ${error.statusCode}` };
  }
  return { code: "unexpected", message: extractErrorMessage(error) };
};
