import { fromBase64Url, generateDeviceIdentity, MAX_FRAME_BYTES, utf8, randomSecret, toBase64Url } from "./crypto";
import type { WorkerIdentity } from "./crypto";
import {
  acceptBrowserHandshake,
  createBrowserHandshake,
  createClientConfirmation,
  verifyClientConfirmation,
} from "./protocol";
import type { EncryptedChannel, VerifiedDevice } from "./protocol";

export interface RemoteTransport {
  send(frame: string): void;
  subscribe(listener: (frame: string) => void): () => void;
  onClose?(listener: () => void): () => void;
  close?(): void;
}
export interface RemoteConnection {
  fetch(input: string | URL | Request, init?: RequestInit): Promise<Response>;
  close(): void;
  authorization: unknown;
  deviceIdentity: WorkerIdentity;
}
export interface WorkerRequestContext {
  authorization: unknown;
  device: VerifiedDevice;
}
export interface WorkerConnection extends WorkerRequestContext {
  close(): void;
}
const CHUNK_BYTES = 48 * 1024;
const noop = () => {};
const MAX_CONCURRENT_REQUESTS = 16;
const MAX_QUEUED_BYTES = 4 * MAX_FRAME_BYTES;
const MAX_QUEUED_FRAMES = 64;

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid encrypted message");
  return value as Record<string, unknown>;
}
function requestId(value: unknown): string {
  if (typeof value !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(value)) throw new Error("Invalid request ID");
  return value;
}
function headers(value: unknown): [string, string][] {
  if (!Array.isArray(value) || value.length > 128) throw new Error("Invalid HTTP headers");
  return value.map((entry: unknown) => {
    if (
      !Array.isArray(entry) ||
      entry.length !== 2 ||
      typeof entry[0] !== "string" ||
      typeof entry[1] !== "string" ||
      entry[0].length > 256 ||
      entry[1].length > 8192
    )
      throw new Error("Invalid HTTP headers");
    return [entry[0], entry[1]];
  });
}
function abortError(): Error {
  return new DOMException("Remote request aborted", "AbortError");
}

/** Encode the original BodyInit without depending on Request.body (unimplemented in Firefox). */
async function prepareHttpRequest(input: string | URL | Request, init?: RequestInit) {
  let inherited: Request | undefined;
  let address: string | URL;
  if (input instanceof Request) {
    inherited = input;
    address = input.url;
  } else address = new URL(input, "https://worker.invalid");
  if (init?.body !== undefined && init.body !== null) {
    const metadata = { ...init };
    delete metadata.body;
    const requestHeaders = new Headers(init.headers ?? inherited?.headers);
    const source = new Request(address, {
      method: inherited?.method,
      signal: inherited?.signal,
      ...metadata,
      headers: requestHeaders,
    });
    if (source.method === "GET" || source.method === "HEAD")
      throw new TypeError("GET and HEAD requests cannot have a body");
    // Use one encoder for both the multipart boundary and bytes; an explicit caller header wins.
    const encoded = new Response(init.body);
    const contentType = encoded.headers.get("Content-Type");
    if (!source.headers.has("Content-Type") && contentType) source.headers.set("Content-Type", contentType);
    return { source, body: encoded.body };
  }
  let source: Request;
  if (inherited) source = new Request(inherited, init);
  else source = new Request(address, init);
  if (source.method === "GET" || source.method === "HEAD") return { source, body: null };
  if (source.body !== undefined) return { source, body: source.body };
  if (!inherited) return { source, body: null };
  // Firefox's opaque Request input can only be consumed through its Body methods. Blob may
  // materialize client-side data; URL + original BodyInit above keeps large uploads streaming.
  const encoded = new Response(await source.blob());
  return { source, body: encoded.body };
}

/** A new call always creates fresh ephemeral keys; failed mutations are never retried. */
export async function createBrowserConnection(options: {
  transport: RemoteTransport;
  pinnedIdentity: JsonWebKey;
  workerId?: string;
  credential: unknown;
  deviceIdentity?: WorkerIdentity;
  clientIdentity?: WorkerIdentity;
  timeoutMs?: number;
}): Promise<RemoteConnection> {
  const transport = options.transport;
  const identity = options.deviceIdentity ?? options.clientIdentity ?? (await generateDeviceIdentity());
  const handshake = await createBrowserHandshake(options);
  const ready = deferred<RemoteConnection>();
  type Pending = {
    result: ReturnType<typeof deferred<Response>>;
    controller?: ReadableStreamDefaultController<Uint8Array>;
    removeAbort: () => void;
    method: string;
    started: boolean;
    credits: number;
    uploadCredits: number;
    uploadCredit?: ReturnType<typeof deferred<void>>;
    uploadReader?: ReadableStreamDefaultReader<Uint8Array>;
    uploadStopped: boolean;
  };
  const requests = new Map<string, Pending>();
  let channel: EncryptedChannel | undefined;
  let authenticated = false;
  let closed = false;
  let queue = Promise.resolve();
  let queuedBytes = 0;
  let queuedFrames = 0;
  let unsubscribe = noop;
  let unsubscribeClose = noop;
  const timeout = setTimeout(() => fail(new Error("Encrypted handshake timed out")), options.timeoutMs ?? 15_000);

  function fail(error: unknown): void {
    if (closed) return;
    closed = true;
    clearTimeout(timeout);
    unsubscribe();
    unsubscribeClose();
    channel?.close();
    ready.reject(error);
    for (const request of requests.values()) {
      request.removeAbort();
      request.uploadCredit?.reject(error);
      void request.uploadReader?.cancel().catch(() => {});
      request.result.reject(error);
      request.controller?.error(error);
    }
    requests.clear();
    transport.close?.();
  }
  async function send(message: unknown): Promise<void> {
    if (closed || !channel) throw new Error("Encrypted connection closed");
    transport.send(await channel.encrypt(message));
  }
  function sendBackground(message: unknown): void {
    void send(message).catch(fail);
  }

  const connection: RemoteConnection = {
    authorization: undefined,
    deviceIdentity: identity,
    close() {
      fail(new Error("Encrypted connection closed"));
    },
    async fetch(input, init) {
      if (!authenticated || closed) throw new Error("Encrypted connection is not ready");
      if (requests.size >= MAX_CONCURRENT_REQUESTS) throw new Error("Too many remote requests");
      const { source, body } = await prepareHttpRequest(input, init);
      // Body conversion may yield (including Firefox's opaque Request fallback).
      if (!authenticated || closed) throw new Error("Encrypted connection is not ready");
      if (requests.size >= MAX_CONCURRENT_REQUESTS) throw new Error("Too many remote requests");
      if (source.signal.aborted) throw abortError();
      const id = randomSecret();
      const result = deferred<Response>();
      const pending: Pending = {
        result,
        method: source.method,
        started: false,
        credits: 0,
        uploadCredits: 0,
        uploadStopped: false,
        removeAbort: () => source.signal.removeEventListener("abort", cancel),
      };
      function cancel() {
        if (!requests.delete(id)) return;
        pending.removeAbort();
        pending.uploadCredit?.reject(abortError());
        void pending.uploadReader?.cancel().catch(() => {});
        pending.result.reject(abortError());
        pending.controller?.error(abortError());
        sendBackground({ type: "request-cancel", id });
      }
      source.signal.addEventListener("abort", cancel, { once: true });
      requests.set(id, pending);
      const url = new URL(source.url);
      // Start upload separately: failures reject the existing result and cancel the peer.
      void (async () => {
        await send({
          type: "request-start",
          id,
          method: source.method,
          path: url.pathname + url.search,
          headers: [...source.headers],
          hasBody: body !== null,
        });
        if (body) {
          const reader = body.getReader();
          pending.uploadReader = reader;
          try {
            while (true) {
              if (!requests.has(id) || pending.uploadStopped) throw abortError();
              const next = await reader.read();
              if (next.done) break;
              for (let offset = 0; offset < next.value.length; offset += CHUNK_BYTES) {
                if (!requests.has(id) || pending.uploadStopped) throw abortError();
                if (pending.uploadCredits > 0) pending.uploadCredits--;
                else {
                  pending.uploadCredit = deferred<void>();
                  await pending.uploadCredit.promise;
                  pending.uploadCredit = undefined;
                }
                if (!requests.has(id) || pending.uploadStopped) throw abortError();
                await send({
                  type: "request-chunk",
                  id,
                  data: toBase64Url(next.value.subarray(offset, offset + CHUNK_BYTES)),
                });
              }
            }
          } finally {
            await reader.cancel().catch(() => {});
          }
        }
        if (body && requests.has(id) && !pending.uploadStopped) await send({ type: "request-end", id });
      })().catch((error: unknown) => {
        if (pending.uploadStopped) return;
        if (requests.delete(id)) {
          pending.removeAbort();
          result.reject(error);
          pending.controller?.error(error);
          sendBackground({ type: "request-cancel", id });
        }
      });
      return result.promise;
    },
  };

  async function receive(frame: string): Promise<void> {
    if (!channel) {
      channel = await handshake.accept(frame);
      transport.send(await createClientConfirmation(channel, options.credential, identity));
      return;
    }
    const message = object(await channel.decrypt(frame));
    if (!authenticated) {
      if (message.type !== "worker-confirm" || message.transcriptHash !== channel.transcriptHash)
        throw new Error("Worker key confirmation failed");
      authenticated = true;
      clearTimeout(timeout);
      connection.authorization = message.authorization;
      ready.resolve(connection);
      return;
    }
    const id = requestId(message.id);
    const pending = requests.get(id);
    // Cancellation and in-flight replies can cross. Unknown IDs do not revive requests.
    if (!pending) return;
    if (message.type === "request-credit") {
      if (pending.uploadStopped) return;
      if (pending.uploadCredit) {
        const waiting = pending.uploadCredit;
        pending.uploadCredit = undefined;
        waiting.resolve();
      } else {
        pending.uploadCredits++;
        if (pending.uploadCredits > 4) throw new Error("Request credit window exceeded");
      }
      return;
    }
    if (message.type === "request-stop") {
      pending.uploadStopped = true;
      pending.uploadCredit?.reject(abortError());
      void pending.uploadReader?.cancel().catch(() => {});
      return;
    }
    if (message.type === "response-start") {
      if (
        pending.started ||
        !Number.isInteger(message.status) ||
        (message.status as number) < 200 ||
        (message.status as number) > 599
      )
        throw new Error("Invalid response start");
      const status = message.status as number;
      pending.started = true;
      let body: ReadableStream<Uint8Array> | null = null;
      if (pending.method !== "HEAD" && ![204, 205, 304].includes(status)) {
        body = new ReadableStream<Uint8Array>({
          start(controller) {
            pending.controller = controller;
          },
          pull() {
            pending.credits++;
            sendBackground({ type: "response-credit", id });
          },
          cancel() {
            pending.removeAbort();
            requests.delete(id);
            sendBackground({ type: "request-cancel", id });
          },
        });
      }
      pending.result.resolve(new Response(body, { status, headers: headers(message.headers) }));
      if (body === null) sendBackground({ type: "response-credit", id });
    } else if (message.type === "response-chunk") {
      if (!pending.started || !pending.controller || pending.credits <= 0 || typeof message.data !== "string")
        throw new Error("Invalid response chunk");
      pending.credits--;
      pending.controller.enqueue(fromBase64Url(message.data, CHUNK_BYTES));
    } else if (message.type === "response-end") {
      if (!pending.started) throw new Error("Response ended before headers");
      pending.removeAbort();
      requests.delete(id);
      pending.uploadStopped = true;
      pending.uploadCredit?.reject(abortError());
      void pending.uploadReader?.cancel().catch(() => {});
      pending.controller?.close();
    } else if (message.type === "response-error") {
      const error = new Error("Worker request failed");
      pending.removeAbort();
      requests.delete(id);
      pending.uploadStopped = true;
      pending.uploadCredit?.reject(error);
      void pending.uploadReader?.cancel().catch(() => {});
      pending.result.reject(error);
      pending.controller?.error(error);
    } else throw new Error("Unexpected encrypted response");
  }
  unsubscribe = transport.subscribe((frame) => {
    if (closed) return;
    if (typeof frame !== "string" || frame.length > MAX_FRAME_BYTES) {
      fail(new Error("Invalid encrypted frame size"));
      return;
    }
    const bytes = utf8(frame).length;
    if (bytes > MAX_FRAME_BYTES || queuedBytes + bytes > MAX_QUEUED_BYTES || queuedFrames >= MAX_QUEUED_FRAMES) {
      fail(new Error("Encrypted transport queue exceeded"));
      return;
    }
    queuedBytes += bytes;
    queuedFrames++;
    queue = queue
      .then(() => {
        if (!closed) return receive(frame);
      })
      .catch(fail)
      .finally(() => {
        queuedBytes -= bytes;
        queuedFrames--;
      });
  });
  unsubscribeClose = transport.onClose?.(() => fail(new Error("Remote transport closed"))) ?? (() => {});
  try {
    transport.send(handshake.hello);
  } catch (error) {
    fail(error);
  }
  return ready.promise;
}

export function createWorkerConnection(options: {
  transport: RemoteTransport;
  identity: WorkerIdentity;
  authorize(credential: unknown, device: VerifiedDevice): Promise<unknown>;
  onRequest(request: Request, context: WorkerRequestContext): Promise<Response>;
  publicAuthorization?(authorization: unknown): unknown;
  timeoutMs?: number;
}): Promise<WorkerConnection> {
  const ready = deferred<WorkerConnection>();
  const transport = options.transport;
  type Incoming = {
    method: string;
    path: string;
    headers: [string, string][];
    hasBody: boolean;
    uploadBody?: ReadableStream<Uint8Array>;
    uploadController?: ReadableStreamDefaultController<Uint8Array>;
    uploadCredits: number;
    uploadPull?: ReturnType<typeof deferred<void>>;
    uploadEnded: boolean;
    abort: AbortController;
    reader?: ReadableStreamDefaultReader<Uint8Array>;
    credits: number;
    credit?: ReturnType<typeof deferred<void>>;
  };
  const requests = new Map<string, Incoming>();
  const finished = new Set<string>();
  function finish(id: string): void {
    requests.delete(id);
    finished.add(id);
    if (finished.size > 128) {
      const oldest = finished.values().next().value;
      if (oldest) finished.delete(oldest);
    }
  }
  let channel: EncryptedChannel | undefined;
  let context: WorkerRequestContext | undefined;
  let closed = false;
  let queue = Promise.resolve();
  let queuedBytes = 0;
  let queuedFrames = 0;
  let unsubscribe = noop;
  let unsubscribeClose = noop;
  const timeout = setTimeout(() => fail(new Error("Encrypted handshake timed out")), options.timeoutMs ?? 15_000);
  function cancel(request: Incoming): void {
    request.abort.abort();
    if (!request.uploadEnded) {
      request.uploadEnded = true;
      request.uploadController?.error(abortError());
      request.uploadPull?.resolve();
    }
    request.credit?.reject(abortError());
    void request.reader?.cancel().catch(() => {});
  }
  function fail(error: unknown): void {
    if (closed) return;
    closed = true;
    clearTimeout(timeout);
    unsubscribe();
    unsubscribeClose();
    channel?.close();
    ready.reject(error);
    for (const request of requests.values()) cancel(request);
    requests.clear();
    transport.close?.();
  }
  async function send(message: unknown): Promise<void> {
    if (closed || !channel) throw new Error("Encrypted connection closed");
    transport.send(await channel.encrypt(message));
  }
  async function credit(request: Incoming): Promise<void> {
    if (request.abort.signal.aborted) throw abortError();
    if (request.credits > 0) {
      request.credits--;
      return;
    }
    request.credit = deferred<void>();
    await request.credit.promise;
    request.credit = undefined;
  }
  async function dispatch(id: string, incoming: Incoming): Promise<void> {
    if (!context) throw new Error("Worker not authorized");
    const init: RequestInit & { duplex?: string } = {
      method: incoming.method,
      headers: incoming.headers,
      signal: incoming.abort.signal,
    };
    if (incoming.hasBody) {
      init.body = incoming.uploadBody;
      init.duplex = "half";
    }
    try {
      const request = new Request(`https://worker.invalid${incoming.path}`, init);
      const response = await options.onRequest(request, context);
      if (incoming.abort.signal.aborted) {
        await response.body?.cancel();
        return;
      }
      await send({ type: "response-start", id, status: response.status, headers: [...response.headers] });
      if (response.body && incoming.method !== "HEAD" && ![204, 205, 304].includes(response.status)) {
        incoming.reader = response.body.getReader();
        while (true) {
          await credit(incoming);
          const next = await incoming.reader.read();
          if (next.done) break;
          for (let chunkOffset = 0; chunkOffset < next.value.length; chunkOffset += CHUNK_BYTES) {
            if (chunkOffset > 0) await credit(incoming);
            await send({
              type: "response-chunk",
              id,
              data: toBase64Url(next.value.subarray(chunkOffset, chunkOffset + CHUNK_BYTES)),
            });
          }
        }
      }
      if (!incoming.uploadEnded) {
        incoming.uploadEnded = true;
        incoming.uploadController?.error(new Error("Worker stopped reading the request"));
        incoming.uploadPull?.resolve();
        await send({ type: "request-stop", id });
      }
      if (!incoming.abort.signal.aborted) await send({ type: "response-end", id });
    } catch {
      if (!incoming.abort.signal.aborted && !closed) await send({ type: "response-error", id });
    } finally {
      if (!incoming.uploadEnded) {
        incoming.uploadEnded = true;
        incoming.uploadController?.error(new Error("Worker stopped reading the request"));
        incoming.uploadPull?.resolve();
        if (!closed) await send({ type: "request-stop", id });
      }
      finish(id);
      await incoming.reader?.cancel().catch(() => {});
    }
  }
  async function receive(frame: string): Promise<void> {
    if (!channel) {
      const handshake = await acceptBrowserHandshake(frame, options.identity);
      channel = handshake.channel;
      transport.send(handshake.hello);
      return;
    }
    if (!context) {
      const verified = await verifyClientConfirmation(channel, frame);
      const authorization = await options.authorize(verified.credential, verified.device);
      context = { authorization, device: verified.device };
      let publicAuthorization = authorization;
      if (options.publicAuthorization) publicAuthorization = options.publicAuthorization(authorization);
      await send({
        type: "worker-confirm",
        transcriptHash: channel.transcriptHash,
        authorization: publicAuthorization,
      });
      clearTimeout(timeout);
      ready.resolve({
        ...context,
        close() {
          fail(new Error("Encrypted connection closed"));
        },
      });
      return;
    }
    const message = object(await channel.decrypt(frame));
    const id = requestId(message.id);
    if (message.type === "request-start") {
      if (
        requests.has(id) ||
        finished.has(id) ||
        requests.size >= MAX_CONCURRENT_REQUESTS ||
        typeof message.method !== "string" ||
        !/^[A-Z]{1,16}$/.test(message.method) ||
        typeof message.path !== "string" ||
        message.path.length > 16_384 ||
        !message.path.startsWith("/") ||
        message.path.startsWith("//") ||
        /[\\#\r\n]/.test(message.path) ||
        typeof message.hasBody !== "boolean"
      )
        throw new Error("Invalid request start");
      if (["GET", "HEAD"].includes(message.method) && message.hasBody) throw new Error("Invalid request body");
      const incoming: Incoming = {
        method: message.method,
        path: message.path,
        headers: headers(message.headers),
        hasBody: message.hasBody,
        uploadCredits: 0,
        uploadEnded: !message.hasBody,
        abort: new AbortController(),
        credits: 0,
      };
      if (incoming.hasBody) {
        incoming.uploadBody = new ReadableStream<Uint8Array>({
          start(controller) {
            incoming.uploadController = controller;
          },
          pull() {
            if (incoming.uploadEnded || incoming.abort.signal.aborted) return;
            if (incoming.uploadPull) return incoming.uploadPull.promise;
            incoming.uploadCredits++;
            incoming.uploadPull = deferred<void>();
            void send({ type: "request-credit", id }).catch(fail);
            return incoming.uploadPull.promise;
          },
          cancel() {
            if (incoming.uploadEnded) return;
            incoming.uploadEnded = true;
            incoming.uploadPull?.resolve();
            void send({ type: "request-stop", id }).catch(fail);
          },
        });
      }
      requests.set(id, incoming);
      void dispatch(id, incoming).catch(fail);
      return;
    }
    const incoming = requests.get(id);
    if (!incoming) {
      if (
        message.type === "request-cancel" ||
        message.type === "response-credit" ||
        (finished.has(id) && ["request-chunk", "request-end"].includes(message.type as string))
      )
        return;
      throw new Error("Unknown encrypted request");
    }
    if (message.type === "request-chunk") {
      if (incoming.uploadEnded) return;
      if (!incoming.hasBody || incoming.uploadCredits <= 0 || typeof message.data !== "string")
        throw new Error("Invalid request chunk");
      const data = fromBase64Url(message.data, CHUNK_BYTES);
      incoming.uploadCredits--;
      if (!incoming.uploadController) throw new Error("Missing request stream");
      incoming.uploadController.enqueue(data);
      const pulling = incoming.uploadPull;
      incoming.uploadPull = undefined;
      pulling?.resolve();
    } else if (message.type === "request-end") {
      if (incoming.uploadEnded) return;
      incoming.uploadEnded = true;
      if (!incoming.uploadController) throw new Error("Missing request stream");
      incoming.uploadController.close();
      incoming.uploadPull?.resolve();
    } else if (message.type === "request-cancel") {
      finish(id);
      cancel(incoming);
    } else if (message.type === "response-credit") {
      if (incoming.credit) {
        const waiting = incoming.credit;
        incoming.credit = undefined;
        waiting.resolve();
      } else {
        incoming.credits++;
        if (incoming.credits > 4) throw new Error("Response credit window exceeded");
      }
    } else throw new Error("Unexpected encrypted request");
  }
  unsubscribe = transport.subscribe((frame) => {
    if (closed) return;
    if (typeof frame !== "string" || frame.length > MAX_FRAME_BYTES) {
      fail(new Error("Invalid encrypted frame size"));
      return;
    }
    const bytes = utf8(frame).length;
    if (bytes > MAX_FRAME_BYTES || queuedBytes + bytes > MAX_QUEUED_BYTES || queuedFrames >= MAX_QUEUED_FRAMES) {
      fail(new Error("Encrypted transport queue exceeded"));
      return;
    }
    queuedBytes += bytes;
    queuedFrames++;
    queue = queue
      .then(() => {
        if (!closed) return receive(frame);
      })
      .catch(fail)
      .finally(() => {
        queuedBytes -= bytes;
        queuedFrames--;
      });
  });
  unsubscribeClose = transport.onClose?.(() => fail(new Error("Remote transport closed"))) ?? (() => {});
  return ready.promise;
}

/** Wrap an already authenticated relay socket after its `connected` control frame. */
export function createRelayTransport(socket: WebSocket): RemoteTransport {
  const listeners = new Set<(frame: string) => void>();
  const closeListeners = new Set<() => void>();
  const message = (event: MessageEvent) => {
    if (typeof event.data !== "string" || event.data.length > MAX_FRAME_BYTES) {
      socket.close(1008, "Invalid encrypted frame");
      return;
    }
    for (const listener of listeners) listener(event.data);
  };
  const close = () => {
    for (const listener of closeListeners) listener();
  };
  socket.addEventListener("message", message);
  socket.addEventListener("close", close);
  socket.addEventListener("error", close);
  return {
    send(frame) {
      if (socket.readyState !== WebSocket.OPEN) throw new Error("Relay socket is closed");
      if (socket.bufferedAmount + utf8(frame).length > MAX_QUEUED_BYTES)
        throw new Error("Relay socket buffer exceeded");
      socket.send(frame);
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    onClose(listener) {
      closeListeners.add(listener);
      return () => {
        closeListeners.delete(listener);
      };
    },
    close() {
      socket.removeEventListener("message", message);
      socket.removeEventListener("close", close);
      socket.removeEventListener("error", close);
      socket.close();
    },
  };
}
