import { matchErrorCode, ResponseError } from "@homarr/common/server";

import type { WazuhDataSource } from "./wazuh-types";

export type WazuhErrorReason =
  | "unauthorized"
  | "certificate"
  | "unreachable"
  | "timeout"
  | "status"
  | "invalidResponse"
  | "indexerRequired"
  | "unknown";

export interface WazuhPublicError {
  reason: WazuhErrorReason;
  target: WazuhDataSource | null;
  status?: number;
}

/**
 * Error thrown by the Wazuh client with a safe, user-presentable reason.
 * It never carries credentials or upstream payloads.
 */
export class WazuhRequestError extends Error {
  constructor(
    public readonly target: WazuhDataSource | null,
    public readonly reason: WazuhErrorReason,
    public readonly status?: number,
    options?: ErrorOptions,
  ) {
    super(`Wazuh ${target ?? "integration"} request failed: ${reason}${status ? ` (${status})` : ""}`, options);
    this.name = "WazuhRequestError";
  }

  static fromResponse(target: WazuhDataSource, response: { status: number; url?: string }) {
    const reason = response.status === 401 || response.status === 403 ? "unauthorized" : "status";
    return new WazuhRequestError(target, reason, response.status, { cause: new ResponseError(response) });
  }

  static fromFetchError(target: WazuhDataSource, error: unknown) {
    if (error instanceof WazuhRequestError) return error;
    return new WazuhRequestError(target, reasonFromUnknown(error), undefined, { cause: error });
  }
}

const reasonFromCode = (code: string): WazuhErrorReason | null => {
  const match = matchErrorCode(code);
  if (!match) return null;
  if (match.type === "certificate") return "certificate";
  if (match.type === "timeout") return "timeout";
  return "unreachable";
};

const reasonFromUnknown = (error: unknown): WazuhErrorReason => {
  let current: unknown = error;
  for (let depth = 0; depth < 6 && current; depth++) {
    if (current instanceof Error && current.name === "TimeoutError") return "timeout";
    if (current instanceof Error && current.name === "AbortError") return "timeout";
    if (typeof current === "object" && "code" in current && typeof current.code === "string") {
      const reason = reasonFromCode(current.code);
      if (reason) return reason;
      if (current.code === "UND_ERR_CONNECT_TIMEOUT") return "timeout";
      if (current.code.startsWith("ERR_TLS") || current.code.includes("CERT")) return "certificate";
    }
    current = current instanceof Error ? current.cause : undefined;
  }
  return "unknown";
};

/**
 * Maps any error thrown by the Wazuh integration (possibly wrapped by the integration error decorator)
 * to a safe reason that widgets can translate.
 */
export const toWazuhPublicError = (error: unknown): WazuhPublicError => {
  let current: unknown = error;
  for (let depth = 0; depth < 8 && current; depth++) {
    if (current instanceof WazuhRequestError) {
      return { reason: current.reason, target: current.target, status: current.status };
    }
    if (current instanceof ResponseError) {
      return {
        reason: current.statusCode === 401 || current.statusCode === 403 ? "unauthorized" : "status",
        target: null,
        status: current.statusCode,
      };
    }
    current = current instanceof Error ? current.cause : undefined;
  }
  return { reason: reasonFromUnknown(error), target: null };
};
