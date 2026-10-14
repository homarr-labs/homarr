import { constants } from "node:buffer";

import type { IssuerOperationBounds } from "./persistence";

export interface IssuerBodyBudget {
  readonly maximumBytes: number;
}

export class IssuerBodyRejectedError extends Error {
  readonly code = "ISSUER_BODY_REJECTED";

  constructor(
    readonly reason:
      | "budget"
      | "used"
      | "method"
      | "interrupted"
      | "oversize"
      | "stream"
      | "settlement"
      | "json"
      | "request",
  ) {
    super("Authentication request body rejected");
    this.name = "IssuerBodyRejectedError";
  }
}

export function createBoundedIssuerBodyReader(input: IssuerBodyBudget, now: () => number) {
  const maximumBytes = input.maximumBytes;
  if (!Number.isSafeInteger(maximumBytes) || maximumBytes <= 0 || maximumBytes > constants.MAX_LENGTH) {
    throw new IssuerBodyRejectedError("budget");
  }
  const assertCurrent = (request: Request, bounds: IssuerOperationBounds) => {
    const clock = now();
    if (
      request.signal.aborted ||
      bounds.signal.aborted ||
      bounds.lifetime.aborted ||
      !Number.isFinite(clock) ||
      !Number.isFinite(bounds.deadlineAt) ||
      bounds.deadlineAt <= clock
    ) {
      throw new IssuerBodyRejectedError("interrupted");
    }
  };
  const readBytes = async (
    request: Request,
    inputBounds: IssuerOperationBounds,
  ): Promise<Uint8Array<ArrayBuffer> | null> => {
    const bounds = Object.freeze({ ...inputBounds });
    if (request.bodyUsed || request.body?.locked) throw new IssuerBodyRejectedError("used");
    if (request.method !== "POST" && request.body !== null) throw new IssuerBodyRejectedError("method");
    if (!request.body) {
      assertCurrent(request, bounds);
      return null;
    }
    const reader = request.body.getReader();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let cancellation: Promise<void> | undefined;
    let pendingRead: ReturnType<typeof reader.read> | undefined;
    let interrupted = false;
    let complete = false;
    let settlementFailed = false;
    let rejection: IssuerBodyRejectedError | undefined;
    let storage = new Uint8Array(0);
    let size = 0;
    const closed = reader.closed.then(
      () => undefined,
      () => undefined,
    );
    const cancel = () => {
      if (!cancellation) {
        try {
          cancellation = reader.cancel(new IssuerBodyRejectedError("interrupted")).then(
            () => undefined,
            () => {
              settlementFailed = true;
            },
          );
        } catch {
          settlementFailed = true;
          cancellation = Promise.resolve();
        }
      }
    };
    const interrupt = () => {
      interrupted = true;
      cancel();
    };
    const signals = [...new Set([request.signal, bounds.signal, bounds.lifetime])];
    const scheduleDeadline = () => {
      const remaining = bounds.deadlineAt - now();
      if (!Number.isFinite(remaining) || remaining <= 0) {
        interrupt();
        return;
      }
      timer = setTimeout(scheduleDeadline, Math.min(Math.ceil(remaining), 2_147_483_647));
    };
    try {
      for (const signal of signals) signal.addEventListener("abort", interrupt, { once: true });
      scheduleDeadline();
      assertCurrent(request, bounds);
      while (!complete) {
        if (interrupted) throw new IssuerBodyRejectedError("interrupted");
        assertCurrent(request, bounds);
        const currentRead = reader.read();
        pendingRead = currentRead;
        const chunk = await currentRead;
        pendingRead = undefined;
        if (interrupted) throw new IssuerBodyRejectedError("interrupted");
        assertCurrent(request, bounds);
        if (chunk.done) {
          complete = true;
          break;
        }
        if (!(chunk.value instanceof Uint8Array)) throw new IssuerBodyRejectedError("stream");
        if (chunk.value.byteLength > maximumBytes - size) throw new IssuerBodyRejectedError("oversize");
        const nextSize = size + chunk.value.byteLength;
        if (nextSize > storage.byteLength) {
          const capacity = Math.min(maximumBytes, Math.max(nextSize, storage.byteLength * 2));
          const expanded = new Uint8Array(capacity);
          expanded.set(storage.subarray(0, size));
          storage = expanded;
        }
        storage.set(chunk.value, size);
        size = nextSize;
      }
    } catch (error: unknown) {
      if (error instanceof IssuerBodyRejectedError) rejection = error;
      else rejection = new IssuerBodyRejectedError("stream");
    } finally {
      if (!complete) cancel();
      try {
        if (pendingRead) await pendingRead.catch(() => undefined);
        if (cancellation) await cancellation;
        await closed;
        reader.releaseLock();
      } catch {
        settlementFailed = true;
      } finally {
        if (timer !== undefined) clearTimeout(timer);
        for (const signal of signals) signal.removeEventListener("abort", interrupt);
      }
    }
    if (settlementFailed) throw new IssuerBodyRejectedError("settlement");
    if (rejection) throw rejection;
    assertCurrent(request, bounds);
    return storage.subarray(0, size);
  };
  return Object.freeze({
    maximumBytes,
    readBytes,
    async readJson(request: Request, bounds: IssuerOperationBounds): Promise<unknown> {
      bounds = Object.freeze({ ...bounds });
      const bytes = await readBytes(request, bounds);
      if (bytes === null) throw new IssuerBodyRejectedError("json");
      try {
        const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
        const value: unknown = JSON.parse(text);
        assertCurrent(request, bounds);
        return value;
      } catch (error: unknown) {
        if (error instanceof IssuerBodyRejectedError) throw error;
        throw new IssuerBodyRejectedError("json");
      }
    },
    async reconstructRequest(
      request: Request,
      bounds: IssuerOperationBounds,
      headers: Headers = request.headers,
    ): Promise<Request> {
      bounds = Object.freeze({ ...bounds });
      const copiedHeaders = new Headers(headers);
      const body = await readBytes(request, bounds);
      assertCurrent(request, bounds);
      try {
        const signal = AbortSignal.any([request.signal, bounds.signal, bounds.lifetime]);
        const init: RequestInit = {
          method: request.method,
          headers: copiedHeaders,
          referrer: request.referrer,
          referrerPolicy: request.referrerPolicy,
          signal,
        };
        if (request.method !== "GET" && request.method !== "HEAD") init.body = body;
        return new Request(request, init);
      } catch {
        throw new IssuerBodyRejectedError("request");
      }
    },
  });
}

export type BoundedIssuerBodyReader = ReturnType<typeof createBoundedIssuerBodyReader>;
