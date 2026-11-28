import type { Response } from "undici";

import { fetchWithTrustedCertificatesAsync } from "@homarr/core/infrastructure/http";
import { ErrorWithMetadata } from "@homarr/core/infrastructure/logs/error";

import { RequestHandlerTimeoutError } from "./lib/request-handler";

const timeoutCodes = ["ETIMEDOUT", "UND_ERR_CONNECT_TIMEOUT", "UND_ERR_HEADERS_TIMEOUT", "UND_ERR_BODY_TIMEOUT"];

interface NetworkCause {
  name: string;
  code?: string;
  errno?: number;
  syscall?: string;
  hostname?: string;
  cause?: NetworkCause;
  errors?: NetworkCause[];
}

const sanitizeCause = (error: unknown, depth = 0): NetworkCause | undefined => {
  if (!(error instanceof Error) || depth === 5) return undefined;

  const cause: NetworkCause = { name: "Error" };
  if (/^[A-Za-z][A-Za-z0-9]{0,63}$/.test(error.name)) cause.name = error.name;
  if ("code" in error && typeof error.code === "string" && /^[A-Z][A-Z0-9_]{1,63}$/.test(error.code)) {
    cause.code = error.code;
  }
  if ("errno" in error && typeof error.errno === "number") cause.errno = error.errno;
  if ("syscall" in error && typeof error.syscall === "string" && /^[a-zA-Z][a-zA-Z0-9_]{0,31}$/.test(error.syscall)) {
    cause.syscall = error.syscall;
  }
  if ("hostname" in error && typeof error.hostname === "string" && /^[a-zA-Z0-9.-]{1,253}$/.test(error.hostname)) {
    cause.hostname = error.hostname;
  }
  const inner = sanitizeCause(error.cause, depth + 1);
  if (inner) cause.cause = inner;
  if (error instanceof AggregateError) {
    const errors = error.errors
      .slice(0, 2)
      .map((entry: unknown) => sanitizeCause(entry, depth + 1))
      .filter((entry) => entry !== undefined);
    if (errors.length > 0) cause.errors = errors;
  }
  return cause;
};

const isTimeout = (cause: NetworkCause | undefined): boolean => {
  if (!cause) return false;
  return (
    cause.name === "TimeoutError" ||
    timeoutCodes.includes(cause.code ?? "") ||
    isTimeout(cause.cause) ||
    (cause.errors?.some(isTimeout) ?? false)
  );
};

export const fetchOpenMeteoJsonAsync = async (url: URL, signal: AbortSignal): Promise<unknown> => {
  const started = performance.now();
  const metadata = () => ({ host: url.hostname, elapsedMs: Math.round(performance.now() - started) });
  let response: Response | undefined;
  const describeFailure = (error: unknown, reason: unknown = signal.reason) => {
    const cause = sanitizeCause(error);
    let stage = "response headers";
    if (response) stage = "response body";
    let outcome = "failed";
    if (signal.aborted) outcome = "cancelled";
    if (reason instanceof RequestHandlerTimeoutError || isTimeout(cause) || isTimeout(sanitizeCause(reason))) {
      outcome = "timed out";
    }
    return new ErrorWithMetadata(`Open-Meteo ${stage} ${outcome}`, metadata(), { cause });
  };
  const annotateDeadline = () => {
    const reason: unknown = signal.reason;
    if (!(reason instanceof RequestHandlerTimeoutError)) return;
    // The outer deadline races the body read and throws this same reason immediately after aborting.
    reason.cause = describeFailure(reason);
  };

  signal.addEventListener("abort", annotateDeadline, { once: true });
  try {
    response = await fetchWithTrustedCertificatesAsync(url.toString(), { signal, logOriginOnly: true });
    if (response.ok) return await response.json();
    void response.body?.cancel().catch(() => undefined);
  } catch (error) {
    const reason: unknown = signal.reason;
    if (reason instanceof RequestHandlerTimeoutError && reason.cause) throw reason;
    throw describeFailure(error);
  } finally {
    signal.removeEventListener("abort", annotateDeadline);
  }

  throw new ErrorWithMetadata(`Open-Meteo returned HTTP ${response.status}`, metadata());
};
