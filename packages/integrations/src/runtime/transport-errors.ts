import type { AnyRequestErrorInput, RequestErrorCode } from "@homarr/common/server";

import type { IntegrationErrorData } from "../base/errors/integration-error";
import { IntegrationRequestError } from "../base/errors/http/integration-request-error";
import { IntegrationResponseError } from "../base/errors/http/integration-response-error";
import { IntegrationParseError } from "../base/errors/parse/integration-parse-error";

const requestDiagnostics = {
  CERT_HAS_EXPIRED: { type: "certificate", reason: "expired", code: "CERT_HAS_EXPIRED" },
  ERR_TLS_CERT_ALTNAME_INVALID: {
    type: "certificate",
    reason: "hostnameMismatch",
    code: "ERR_TLS_CERT_ALTNAME_INVALID",
  },
  CERT_COMMON_NAME_INVALID: { type: "certificate", reason: "hostnameMismatch", code: "CERT_COMMON_NAME_INVALID" },
  CERT_NOT_YET_VALID: { type: "certificate", reason: "notYetValid", code: "CERT_NOT_YET_VALID" },
  DEPTH_ZERO_SELF_SIGNED_CERT: { type: "certificate", reason: "untrusted", code: "DEPTH_ZERO_SELF_SIGNED_CERT" },
  UNABLE_TO_VERIFY_LEAF_SIGNATURE: {
    type: "certificate",
    reason: "untrusted",
    code: "UNABLE_TO_VERIFY_LEAF_SIGNATURE",
  },
  UNABLE_TO_GET_ISSUER_CERT_LOCALLY: {
    type: "certificate",
    reason: "untrusted",
    code: "UNABLE_TO_GET_ISSUER_CERT_LOCALLY",
  },
  SELF_SIGNED_CERT_IN_CHAIN: { type: "certificate", reason: "untrusted", code: "SELF_SIGNED_CERT_IN_CHAIN" },
  EHOSTUNREACH: { type: "connection", reason: "hostUnreachable", code: "EHOSTUNREACH" },
  ENETUNREACH: { type: "connection", reason: "networkUnreachable", code: "ENETUNREACH" },
  ECONNREFUSED: { type: "connection", reason: "refused", code: "ECONNREFUSED" },
  ECONNRESET: { type: "connection", reason: "reset", code: "ECONNRESET" },
  ENOTFOUND: { type: "dns", reason: "notFound", code: "ENOTFOUND" },
  EAI_AGAIN: { type: "dns", reason: "timeout", code: "EAI_AGAIN" },
  ENODATA: { type: "dns", reason: "noAnswer", code: "ENODATA" },
  ECONNABORTED: { type: "timeout", reason: "aborted", code: "ECONNABORTED" },
  ETIMEDOUT: { type: "timeout", reason: "timeout", code: "ETIMEDOUT" },
} satisfies Record<RequestErrorCode, AnyRequestErrorInput>;

const readField = (value: unknown, field: string): unknown => {
  if (typeof value !== "object" || value === null) return undefined;
  try {
    const result: unknown = Reflect.get(value, field);
    return result;
  } catch {
    return undefined;
  }
};

const isRequestCode = (value: unknown): value is RequestErrorCode =>
  typeof value === "string" && Object.hasOwn(requestDiagnostics, value);
const isStatus = (value: unknown): value is number =>
  typeof value === "number" && Number.isInteger(value) && value >= 100 && value <= 599;

export class IntegrationTransportRequestError extends TypeError {
  constructor(public readonly diagnostic: AnyRequestErrorInput) {
    super("Stats request failed", {
      cause: Object.assign(new Error("Integration transport failed"), { code: diagnostic.code }),
    });
    this.name = "TypeError";
  }
}

export class IntegrationTransportStatusError extends Error {
  public readonly statusCode: number;

  constructor(public readonly status: number) {
    super("Integration request returned an unsuccessful status");
    this.name = "IntegrationTransportStatusError";
    this.statusCode = status;
  }
}

export class IntegrationTransportParseError extends SyntaxError {
  constructor() {
    super("Stats response could not be parsed");
    this.name = "SyntaxError";
  }
}

export const sanitizeIntegrationTransportError = (error: unknown): Error => {
  let current = error;
  for (let depth = 0; depth <= 5; depth += 1) {
    const code = readField(current, "code");
    if (isRequestCode(code)) return new IntegrationTransportRequestError(requestDiagnostics[code]);
    const status = readField(current, "statusCode") ?? readField(readField(current, "response"), "status");
    if (isStatus(status)) return new IntegrationTransportStatusError(status);
    if (current instanceof SyntaxError) return new IntegrationTransportParseError();
    current = readField(current, "cause");
    if (current === undefined) break;
  }
  return new Error("Stats request failed");
};

export const normalizeSanitizedIntegrationTransportError = (error: unknown, integration: IntegrationErrorData) => {
  if (error instanceof IntegrationTransportRequestError) {
    const cause = Object.assign(new Error("Request failed"), error.diagnostic, {
      name: "RequestError",
      cause: undefined,
    });
    return new IntegrationRequestError(integration, { cause });
  }
  if (error instanceof IntegrationTransportStatusError)
    return new IntegrationResponseError(integration, { cause: error });
  if (error instanceof IntegrationTransportParseError) {
    const cause = Object.assign(new Error("Failed to parse data"), {
      name: "ParseError",
      cause: new Error("Invalid Stats payload"),
    });
    return new IntegrationParseError(integration, { cause });
  }
  return undefined;
};
