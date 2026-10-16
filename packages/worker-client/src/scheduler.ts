import { getRemoteResponseCompletion } from "@homarr/remote-protocol";
import type { RemoteConnection } from "@homarr/remote-protocol";

type WorkerFetch = RemoteConnection["fetch"];
interface SchedulerOptions {
  maxActive?: number;
  maxQueued?: number;
}
interface PendingRequest {
  input: string | URL | Request;
  init?: RequestInit;
  sourceSignal?: AbortSignal;
  controller: AbortController;
  resolve: (response: Response) => void;
  reject: (error: unknown) => void;
  onAbort: () => void;
  finished: boolean;
  subscription: boolean;
  errorBody?: (reason: unknown) => void;
  cancelBody?: (reason: unknown) => Promise<void>;
}

const abortError = () => new DOMException("Worker request aborted", "AbortError");

/** One queue covers RPC, resources and control calls sharing the encrypted channel. */
export function createWorkerRequestScheduler(transportFetch: WorkerFetch, options: SchedulerOptions = {}) {
  const maxActive = options.maxActive ?? 12;
  const maxQueued = options.maxQueued ?? 256;
  const maxSubscriptions = Math.min(8, Math.max(0, maxActive - 1));
  if (!Number.isInteger(maxActive) || maxActive < 1 || maxActive > 12)
    throw new RangeError("Worker request concurrency must be between 1 and 12");
  if (!Number.isInteger(maxQueued) || maxQueued < 0 || maxQueued > 256)
    throw new RangeError("Worker request queue size must be between 0 and 256");
  const active = new Set<PendingRequest>();
  const queue: PendingRequest[] = [];
  let closed: Error | undefined;
  let activeSubscriptions = 0;

  function finish(request: PendingRequest): void {
    if (request.finished) return;
    request.finished = true;
    request.sourceSignal?.removeEventListener("abort", request.onAbort);
    if (active.delete(request) && request.subscription) activeSubscriptions--;
    const index = queue.indexOf(request);
    if (index !== -1) queue.splice(index, 1);
    drain();
  }

  function cancel(request: PendingRequest, reason: unknown, errorBody = true): void {
    if (request.finished) return;
    request.controller.abort(reason);
    if (errorBody) request.errorBody?.(reason);
    void request.cancelBody?.(reason).catch(() => undefined);
    request.reject(reason);
    finish(request);
  }

  async function start(request: PendingRequest): Promise<void> {
    active.add(request);
    if (request.subscription) activeSubscriptions++;
    try {
      // Leave BodyInit untouched. The canonical protocol owns Firefox-compatible
      // body encoding, multipart boundaries, streaming uploads and cancellation.
      const response = await transportFetch(request.input, { ...request.init, signal: request.controller.signal });
      if (request.finished) {
        await response.body?.cancel().catch(() => undefined);
        return;
      }
      if (!response.body) {
        request.resolve(response);
        const completion = getRemoteResponseCompletion(response);
        if (completion) await completion;
        finish(request);
        return;
      }
      const reader = response.body.getReader();
      request.cancelBody = (reason) => reader.cancel(reason);
      const body = new ReadableStream<Uint8Array>(
        {
          start(controller) {
            request.errorBody = (reason) => controller.error(reason);
          },
          async pull(controller) {
            try {
              const chunk = await reader.read();
              if (request.finished) return;
              if (chunk.done) {
                finish(request);
                controller.close();
              } else controller.enqueue(chunk.value);
            } catch (error) {
              if (request.finished) return;
              finish(request);
              controller.error(error);
            }
          },
          cancel(reason) {
            cancel(request, reason ?? abortError(), false);
          },
        },
        { highWaterMark: 0 },
      );
      request.resolve(
        new Response(body, { status: response.status, statusText: response.statusText, headers: response.headers }),
      );
    } catch (error) {
      if (request.finished) return;
      finish(request);
      request.reject(error);
    }
  }

  function drain(): void {
    if (closed) return;
    while (active.size < maxActive && queue.length) {
      // A pending ninth subscription must not block board reads, bootstrap,
      // settings or sharing calls queued behind it.
      const index = queue.findIndex((request) => !request.subscription || activeSubscriptions < maxSubscriptions);
      if (index === -1) break;
      const request = queue.splice(index, 1)[0];
      if (request && !request.finished) void start(request);
    }
  }

  function enqueue(
    input: string | URL | Request,
    init: RequestInit | undefined,
    subscription: boolean,
  ): Promise<Response> {
    if (closed) return Promise.reject(closed);
    let sourceSignal = init?.signal;
    if (sourceSignal === undefined && input instanceof Request) sourceSignal = input.signal;
    if (sourceSignal?.aborted) return Promise.reject(sourceSignal.reason ?? abortError());
    const canStart = active.size < maxActive && (!subscription || activeSubscriptions < maxSubscriptions);
    if (!canStart && queue.length >= maxQueued)
      return Promise.reject(new Error("The worker request queue is full. Wait for current requests to finish."));
    return new Promise<Response>((resolve, reject) => {
      const request: PendingRequest = {
        input,
        init,
        sourceSignal: sourceSignal ?? undefined,
        controller: new AbortController(),
        resolve,
        reject,
        onAbort: () => cancel(request, sourceSignal?.reason ?? abortError()),
        finished: false,
        subscription,
      };
      sourceSignal?.addEventListener("abort", request.onAbort, { once: true });
      if (canStart) void start(request);
      else queue.push(request);
    });
  }

  const fetch: WorkerFetch = (input, init) => enqueue(input, init, false);
  const fetchSubscription: WorkerFetch = (input, init) => enqueue(input, init, true);

  return {
    fetch,
    fetchSubscription,
    close(reason = new Error("The worker connection closed.")) {
      if (closed) return;
      closed = reason;
      for (const request of [...queue, ...active]) cancel(request, reason);
    },
  };
}
