import { describe, expect, test } from "bun:test";
import {
  acceptBrowserHandshake,
  createBrowserConnection,
  createBrowserHandshake,
  createClientConfirmation,
  createRelayTransport,
  createWorkerConnection,
  exportWorkerIdentity,
  generateDeviceIdentity,
  generateWorkerIdentity,
  getWorkerId,
  importWorkerIdentity,
  randomSecret,
  signIdentity,
  verifyClientConfirmation,
  verifyIdentity,
} from "../index";
import type { RemoteTransport, WorkerIdentity } from "../index";

function omitRequestBodyApi() {
  const OriginalRequest = globalThis.Request;
  const nativeBody = Object.getOwnPropertyDescriptor(OriginalRequest.prototype, "body")?.get;
  class LegacyRequest extends OriginalRequest {
    constructor(input: RequestInfo | URL, init?: RequestInit) {
      // Firefox copies an opaque Request's internal body even though its body getter is absent.
      if (input instanceof OriginalRequest) {
        const metadata: RequestInit & { duplex: string } = {
          method: input.method,
          headers: input.headers,
          signal: input.signal,
          duplex: "half",
          ...init,
        };
        if (init?.body === undefined || init.body === null)
          metadata.body = nativeBody?.call(input) as ReadableStream<Uint8Array> | null;
        super(input.url, metadata);
      } else super(input, init);
    }
  }
  Object.defineProperty(LegacyRequest.prototype, "body", { get: () => undefined });
  globalThis.Request = LegacyRequest;
  return () => {
    globalThis.Request = OriginalRequest;
  };
}

function bodyOf(message: Request | Response): ReadableStream<Uint8Array> {
  if (!message.body) throw new Error("Expected a streaming body");
  return message.body;
}

function transportPair(capture = true) {
  const frames: string[] = [];
  const leftListeners = new Set<(frame: string) => void>();
  const rightListeners = new Set<(frame: string) => void>();
  const closers = new Set<() => void>();
  let closed = false;
  function side(outgoing: Set<(frame: string) => void>, incoming: Set<(frame: string) => void>): RemoteTransport {
    return {
      send(frame) {
        if (closed) throw new Error("Transport closed");
        if (capture) frames.push(frame);
        queueMicrotask(() => {
          if (!closed) for (const listener of outgoing) listener(frame);
        });
      },
      subscribe(listener) {
        incoming.add(listener);
        return () => {
          incoming.delete(listener);
        };
      },
      onClose(listener) {
        closers.add(listener);
        return () => {
          closers.delete(listener);
        };
      },
      close() {
        if (closed) return;
        closed = true;
        for (const close of Array.from(closers)) close();
      },
    };
  }
  return { browser: side(rightListeners, leftListeners), worker: side(leftListeners, rightListeners), frames };
}
async function channels(identity?: WorkerIdentity) {
  identity ??= await generateWorkerIdentity();
  const browser = await createBrowserHandshake({ pinnedIdentity: identity.publicJwk });
  const worker = await acceptBrowserHandshake(browser.hello, identity);
  return { browser: await browser.accept(worker.hello), worker: worker.channel, identity };
}
async function connections(
  onRequest: (request: Request) => Promise<Response>,
  credential: unknown = { token: "PRIVATE-PAIRING-TOKEN" },
) {
  const identity = await generateWorkerIdentity();
  const pair = transportPair();
  const workerReady = createWorkerConnection({
    transport: pair.worker,
    identity,
    authorize: async (value, device) => {
      expect(value).toEqual(credential);
      expect(device.deviceId).toBe(await getWorkerId(device.devicePublicJwk));
      return { role: "owner" };
    },
    onRequest,
  });
  void workerReady.catch(() => {});
  const browser = await createBrowserConnection({
    transport: pair.browser,
    pinnedIdentity: identity.publicJwk,
    credential,
  });
  const worker = await workerReady;
  return { browser, worker, pair };
}

describe("pinned identity and transcript authentication", () => {
  test("durable identity preserves fingerprint and verifies signatures after import", async () => {
    const original = await generateWorkerIdentity();
    const restored = await importWorkerIdentity(await exportWorkerIdentity(original));
    expect(await getWorkerId(original.publicJwk)).toBe(await getWorkerId(restored.publicJwk));
    const signed = await signIdentity(restored, "enrollment");
    expect(await verifyIdentity(original.publicJwk, "enrollment", signed)).toBe(true);
    expect(await verifyIdentity(original.publicJwk, "different", signed)).toBe(false);
    const device = await generateDeviceIdentity();
    expect(device.privateKey.extractable).toBe(false);
    await expect(exportWorkerIdentity(device)).rejects.toThrow();
  });
  test("a relay substituting its own signing identity cannot satisfy the worker pin", async () => {
    const honest = await generateWorkerIdentity();
    const attacker = await generateWorkerIdentity();
    const browser = await createBrowserHandshake({ pinnedIdentity: honest.publicJwk });
    const fakeClient = { ...JSON.parse(browser.hello), workerId: await getWorkerId(attacker.publicJwk) };
    const fakeServer = await acceptBrowserHandshake(JSON.stringify(fakeClient), attacker);
    await expect(browser.accept(fakeServer.hello)).rejects.toThrow("pin");
  });
  test("modifying either peer's nonce or ephemeral key invalidates the signed transcript", async () => {
    const identity = await generateWorkerIdentity();
    const browser = await createBrowserHandshake({ pinnedIdentity: identity.publicJwk });
    const rewritten = { ...JSON.parse(browser.hello), nonce: randomSecret() };
    const worker = await acceptBrowserHandshake(JSON.stringify(rewritten), identity);
    await expect(browser.accept(worker.hello)).rejects.toThrow("signature");
  });
  test("invalid P-256 points and oversized or malformed handshake frames fail closed", async () => {
    const identity = await generateWorkerIdentity();
    const browser = await createBrowserHandshake({ pinnedIdentity: identity.publicJwk });
    const malformed = JSON.parse(browser.hello);
    malformed.ephemeral.x = "A".repeat(43);
    malformed.ephemeral.y = "A".repeat(43);
    await expect(acceptBrowserHandshake(JSON.stringify(malformed), identity)).rejects.toThrow();
    await expect(acceptBrowserHandshake("x".repeat(20_000), identity)).rejects.toThrow("size");
    await expect(acceptBrowserHandshake("[]", identity)).rejects.toThrow();
  });
  test("device signature proves possession and cannot be replayed into a fresh handshake", async () => {
    const first = await channels();
    const second = await channels(first.identity);
    const device = await generateDeviceIdentity();
    const proof = await createClientConfirmation(first.browser, { type: "pair", secret: randomSecret() }, device);
    const verified = await verifyClientConfirmation(first.worker, proof);
    expect(verified.device.deviceId).toBe(await getWorkerId(device.publicJwk));
    await expect(verifyClientConfirmation(second.worker, proof)).rejects.toThrow();
  });
});

describe("encryption, replay and reconnection", () => {
  test("directions use distinct keys; replay or changed sequence permanently closes a channel", async () => {
    const pair = await channels();
    const frame = await pair.browser.encrypt({ secret: "PRIVATE-DATA" });
    expect(frame).not.toContain("PRIVATE-DATA");
    expect(await pair.worker.decrypt(frame)).toEqual({ secret: "PRIVATE-DATA" });
    await expect(pair.worker.decrypt(frame)).rejects.toThrow("replayed");
    await expect(pair.worker.decrypt(await pair.browser.encrypt({ next: true }))).rejects.toThrow("closed");
    const reflected = await channels();
    await expect(reflected.browser.decrypt(await reflected.browser.encrypt({ reflection: true }))).rejects.toThrow();
  });
  test("ciphertext, session ID and associated sequence tampering all fail authentication", async () => {
    for (const field of ["ciphertext", "sessionId", "sequence"]) {
      const pair = await channels();
      const value = JSON.parse(await pair.browser.encrypt({ hello: true }));
      if (field === "ciphertext") {
        let replacement = "A";
        if (value.ciphertext.startsWith("A")) replacement = "B";
        value.ciphertext = replacement + value.ciphertext.slice(1);
      }
      if (field === "sessionId") value.sessionId = randomSecret();
      if (field === "sequence") value.sequence = 1;
      await expect(pair.worker.decrypt(JSON.stringify(value))).rejects.toThrow();
    }
  });
  test("fresh connections have distinct sessions and reject old encrypted frames", async () => {
    const first = await channels();
    const second = await channels(first.identity);
    expect(first.worker.sessionId).not.toBe(second.worker.sessionId);
    expect(first.worker.transcriptHash).not.toBe(second.worker.transcriptHash);
    await expect(second.worker.decrypt(await first.browser.encrypt({ replay: true }))).rejects.toThrow();
  });
  test("simultaneous encrypt/decrypt calls preserve strict nonce ordering", async () => {
    const pair = await channels();
    const frames = await Promise.all(Array.from({ length: 32 }, (_, n) => pair.browser.encrypt({ n })));
    const values = await Promise.all(frames.map((frame) => pair.worker.decrypt(frame)));
    expect(values).toEqual(Array.from({ length: 32 }, (_, n) => ({ n })));
  });
});

describe("encrypted HTTP streaming and authorization", () => {
  test("browsers without Request.body send GET and JSON POST without losing or inventing a body", async () => {
    const restore = omitRequestBodyApi();
    try {
      const { browser } = await connections(async (request) =>
        Response.json({
          method: request.method,
          body: await request.text(),
          contentType: request.headers.get("Content-Type"),
        }),
      );
      const get = await browser.fetch("/remote/boards");
      expect(await get.json()).toEqual({ method: "GET", body: "", contentType: null });
      const post = await browser.fetch("/control", {
        method: "POST",
        body: JSON.stringify({ name: "Firefox" }),
        headers: { "Content-Type": "application/json" },
      });
      expect(await post.json()).toEqual({
        method: "POST",
        body: '{"name":"Firefox"}',
        contentType: "application/json",
      });
      browser.close();
    } finally {
      restore();
    }
  });

  test("browsers without Request.body preserve multipart boundaries, binary files and explicit content types", async () => {
    const restore = omitRequestBodyApi();
    try {
      const { browser } = await connections(async (request) => {
        if (new URL(request.url).pathname === "/form") {
          const form = await request.formData();
          const upload = form.get("upload");
          if (!(upload instanceof Blob)) throw new Error("Expected multipart file");
          return Response.json({ name: form.get("name"), upload: [...new Uint8Array(await upload.arrayBuffer())] });
        }
        return Response.json({
          bytes: [...new Uint8Array(await request.arrayBuffer())],
          contentType: request.headers.get("Content-Type"),
        });
      });
      const form = new FormData();
      form.set("name", "Firefox");
      form.set("upload", new Blob([new Uint8Array([0, 128, 255])]), "fixture.bin");
      expect(await (await browser.fetch("/form", { method: "POST", body: form })).json()).toEqual({
        name: "Firefox",
        upload: [0, 128, 255],
      });
      expect(
        await (
          await browser.fetch("/bytes", {
            method: "POST",
            body: new Blob([new Uint8Array([0, 128, 255])]),
            headers: { "Content-Type": "application/custom" },
          })
        ).json(),
      ).toEqual({ bytes: [0, 128, 255], contentType: "application/custom" });
      browser.close();
    } finally {
      restore();
    }
  });

  test("browsers without Request.body stream large original bodies and preserve opaque Request inputs", async () => {
    const nativeBody = Object.getOwnPropertyDescriptor(Request.prototype, "body")?.get;
    if (!nativeBody) throw new Error("Expected native worker Request.body API");
    const restore = omitRequestBodyApi();
    try {
      const { browser } = await connections(async (request) => {
        const stream = nativeBody.call(request) as ReadableStream<Uint8Array> | null;
        let bytes = 0;
        if (stream) {
          const reader = stream.getReader();
          while (true) {
            const next = await reader.read();
            if (next.done) break;
            bytes += next.value.length;
          }
        }
        return Response.json({ bytes, contentType: request.headers.get("Content-Type") });
      });
      let remaining = 32 * 1024 * 1024;
      const chunk = new Uint8Array(65_536);
      const body = new ReadableStream<Uint8Array>({
        pull(controller) {
          if (remaining <= 0) {
            controller.close();
            return;
          }
          remaining -= chunk.length;
          controller.enqueue(chunk);
        },
      });
      const streamed = await browser.fetch("/upload", { method: "POST", body, duplex: "half" } as RequestInit);
      expect(await streamed.json()).toEqual({ bytes: 32 * 1024 * 1024, contentType: null });
      const opaque = new Request("https://worker.invalid/upload", {
        method: "POST",
        body: new Blob([new Uint8Array([0, 128, 255])], { type: "application/octet-stream" }),
      });
      expect(await (await browser.fetch(opaque)).json()).toEqual({ bytes: 3, contentType: "application/octet-stream" });
      browser.close();
    } finally {
      restore();
    }
  }, 30_000);

  test("concurrent request preparation preserves the 16-request bound and leaves the channel healthy", async () => {
    const release = Promise.withResolvers<void>();
    const allEntered = Promise.withResolvers<void>();
    let entered = 0;
    const { browser } = await connections(async () => {
      entered++;
      if (entered === 16) allEntered.resolve();
      await release.promise;
      return new Response("ok");
    });
    const pending = Array.from({ length: 16 }, () => browser.fetch("/pending"));
    for (const request of pending) void request.catch(() => {});
    await expect(browser.fetch("/overflow")).rejects.toThrow("Too many remote requests");
    await allEntered.promise;
    release.resolve();
    expect(await Promise.all(pending.map(async (request) => (await request).text()))).toEqual(
      Array.from({ length: 16 }, () => "ok"),
    );
    expect(await (await browser.fetch("/after")).text()).toBe("ok");
    browser.close();
  });

  test("bounds pending input before expensive handshake or authorization processing", async () => {
    const identity = await generateWorkerIdentity();
    const pair = transportPair(false);
    let calls = 0;
    const worker = createWorkerConnection({
      identity,
      transport: pair.worker,
      authorize: async () => {
        calls++;
      },
      onRequest: async () => {
        calls++;
        return new Response();
      },
    });
    void worker.catch(() => {});
    for (let index = 0; index < 5; index++) pair.browser.send("x".repeat(1_048_576));
    await expect(worker).rejects.toThrow("queue exceeded");
    expect(calls).toBe(0);
  });

  test("caps the browser WebSocket outbound buffer before adding another frame", () => {
    const socket = {
      readyState: WebSocket.OPEN,
      bufferedAmount: 4 * 1_048_576,
      send() {
        throw new Error("should not write");
      },
      addEventListener() {},
      removeEventListener() {},
      close() {},
    };
    const transport = createRelayTransport(socket as unknown as WebSocket);
    expect(() => transport.send("frame")).toThrow("buffer exceeded");
    transport.close?.();
  });

  test("an early rejected upload cancels its source and leaves the channel reusable", async () => {
    let produced = 0;
    const stopped = Promise.withResolvers<void>();
    const { browser } = await connections(async (request) => {
      if (request.method === "POST") return new Response("denied", { status: 403 });
      return new Response("still connected");
    });
    const body = new ReadableStream<Uint8Array>({
      pull(controller) {
        produced++;
        controller.enqueue(new Uint8Array(48 * 1024));
      },
      cancel() {
        stopped.resolve();
      },
    });
    const response = await browser.fetch("/denied", { method: "POST", body, duplex: "half" } as RequestInit);
    expect(response.status).toBe(403);
    expect(await response.text()).toBe("denied");
    await stopped.promise;
    expect(produced).toBeLessThanOrEqual(4);
    expect(await (await browser.fetch("/after")).text()).toBe("still connected");
    browser.close();
  });

  test("streams a 256 MiB upload with bounded chunks without materializing the upload", async () => {
    const identity = await generateWorkerIdentity();
    const pair = transportPair(false);
    const count = 4096;
    const chunk = new Uint8Array(65_536);
    chunk.fill(123);
    let produced = 0;
    let received = 0;
    let maximumChunk = 0;
    const workerReady = createWorkerConnection({
      identity,
      transport: pair.worker,
      authorize: async () => ({ private: true }),
      publicAuthorization: () => ({ grant: "PUBLIC-GRANT" }),
      onRequest: async (request, context) => {
        expect(context.authorization).toEqual({ private: true });
        const reader = bodyOf(request).getReader();
        while (true) {
          const next = await reader.read();
          if (next.done) break;
          received += next.value.length;
          maximumChunk = Math.max(maximumChunk, next.value.length);
          expect(next.value[0]).toBe(123);
        }
        return Response.json({ received });
      },
    });
    void workerReady.catch(() => {});
    const browser = await createBrowserConnection({
      transport: pair.browser,
      pinnedIdentity: identity.publicJwk,
      credential: {},
    });
    await workerReady;
    expect(browser.authorization).toEqual({ grant: "PUBLIC-GRANT" });
    const body = new ReadableStream<Uint8Array>({
      pull(controller) {
        if (produced === count) {
          controller.close();
          return;
        }
        produced++;
        controller.enqueue(chunk);
      },
    });
    const response = await browser.fetch("/api/backup/import", { method: "POST", body, duplex: "half" } as RequestInit);
    expect(await response.json()).toEqual({ received: 256 * 1024 * 1024 });
    expect(maximumChunk).toBeLessThanOrEqual(48 * 1024);
    browser.close();
  }, 120_000);

  test("upload backpressure stops producing source data while the worker is not reading", async () => {
    const identity = await generateWorkerIdentity();
    const pair = transportPair(false);
    const read = Promise.withResolvers<void>();
    let produced = 0;
    const workerReady = createWorkerConnection({
      identity,
      transport: pair.worker,
      authorize: async () => ({}),
      onRequest: async (request) => {
        await read.promise;
        await request.arrayBuffer();
        return new Response("ok");
      },
    });
    void workerReady.catch(() => {});
    const browser = await createBrowserConnection({
      transport: pair.browser,
      pinnedIdentity: identity.publicJwk,
      credential: {},
    });
    await workerReady;
    const body = new ReadableStream<Uint8Array>({
      pull(controller) {
        if (produced === 16) {
          controller.close();
          return;
        }
        produced++;
        controller.enqueue(new Uint8Array(48 * 1024));
      },
    });
    const result = browser.fetch("/upload", { method: "POST", body, duplex: "half" } as RequestInit);
    await Bun.sleep(30);
    expect(produced).toBeLessThanOrEqual(4);
    read.resolve();
    expect(await (await result).text()).toBe("ok");
    browser.close();
  });

  test("multiplexes binary POST requests and streams response status/headers without plaintext relay data", async () => {
    const bytes = crypto.getRandomValues(new Uint8Array(65_536));
    const { browser, pair } = await connections(async (request) => {
      if (request.method === "POST")
        return new Response(await request.arrayBuffer(), { status: 201, headers: { "x-private": "PRIVATE-HEADER" } });
      return new Response(request.url);
    });
    const [echo, parallel] = await Promise.all([
      browser.fetch("/rpc/example", { method: "POST", body: bytes }),
      browser.fetch("/health?private=PRIVATE-QUERY"),
    ]);
    expect(echo.status).toBe(201);
    expect(echo.headers.get("x-private")).toBe("PRIVATE-HEADER");
    expect(new Uint8Array(await echo.arrayBuffer())).toEqual(bytes);
    expect(await parallel.text()).toContain("PRIVATE-QUERY");
    expect(pair.frames.join("\n")).not.toContain("PRIVATE-");
    browser.close();
  });
  test("response cancellation aborts the worker request and cancels the source stream", async () => {
    const cancelled = Promise.withResolvers<void>();
    let workerSignal: AbortSignal | undefined;
    const { browser } = await connections(async (request) => {
      workerSignal = request.signal;
      return new Response(
        new ReadableStream({
          pull(controller) {
            controller.enqueue(new Uint8Array([1, 2, 3]));
          },
          cancel() {
            cancelled.resolve();
          },
        }),
      );
    });
    const response = await browser.fetch("/stream");
    const reader = bodyOf(response).getReader();
    expect((await reader.read()).value).toEqual(new Uint8Array([1, 2, 3]));
    await reader.cancel();
    await cancelled.promise;
    expect(workerSignal?.aborted).toBe(true);
    browser.close();
  });
  test("AbortSignal cancels before response headers without retrying the mutation", async () => {
    const reached = Promise.withResolvers<void>();
    const aborted = Promise.withResolvers<void>();
    let calls = 0;
    const { browser } = await connections(async (request) => {
      calls++;
      reached.resolve();
      await new Promise<void>((resolve) =>
        request.signal.addEventListener(
          "abort",
          () => {
            aborted.resolve();
            resolve();
          },
          { once: true },
        ),
      );
      return new Response("finished");
    });
    const controller = new AbortController();
    const response = browser.fetch("/mutation", { method: "POST", body: "change", signal: controller.signal });
    await reached.promise;
    controller.abort();
    await expect(response).rejects.toThrow("aborted");
    await aborted.promise;
    expect(calls).toBe(1);
    browser.close();
  });
  test("authorization failure closes the channel and never invokes HTTP handlers", async () => {
    const identity = await generateWorkerIdentity();
    const pair = transportPair();
    let calls = 0;
    const worker = createWorkerConnection({
      transport: pair.worker,
      identity,
      authorize: async () => {
        throw new Error("Unauthorized");
      },
      onRequest: async () => {
        calls++;
        return new Response();
      },
    });
    void worker.catch(() => {});
    const browser = createBrowserConnection({
      transport: pair.browser,
      pinnedIdentity: identity.publicJwk,
      credential: { stolen: true },
    });
    void browser.catch(() => {});
    await expect(worker).rejects.toThrow("Unauthorized");
    await expect(browser).rejects.toThrow("closed");
    expect(calls).toBe(0);
    expect(pair.frames.join("")).not.toContain("Unauthorized");
  });
  test("worker does not accept an HTTP request before encrypted device key confirmation", async () => {
    const identity = await generateWorkerIdentity();
    const pair = transportPair();
    let calls = 0;
    const worker = createWorkerConnection({
      transport: pair.worker,
      identity,
      authorize: async () => {
        calls++;
      },
      onRequest: async () => {
        calls++;
        return new Response();
      },
    });
    void worker.catch(() => {});
    const browser = await createBrowserHandshake({ pinnedIdentity: identity.publicJwk });
    const response = Promise.withResolvers<string>();
    pair.browser.subscribe((frame) => response.resolve(frame));
    pair.browser.send(browser.hello);
    const channel = await browser.accept(await response.promise);
    pair.browser.send(
      await channel.encrypt({
        type: "request-start",
        id: randomSecret(),
        path: "/",
        method: "GET",
        headers: [],
        hasBody: false,
      }),
    );
    await expect(worker).rejects.toThrow("confirmation");
    expect(calls).toBe(0);
  });
  test("idle response consumption applies backpressure rather than buffering an unbounded source", async () => {
    let pulls = 0;
    const { browser } = await connections(
      async () =>
        new Response(
          new ReadableStream({
            pull(controller) {
              pulls++;
              controller.enqueue(new Uint8Array(48 * 1024));
            },
          }),
        ),
    );
    const response = await browser.fetch("/unbounded-stream");
    await Bun.sleep(30);
    expect(pulls).toBeLessThanOrEqual(3);
    await bodyOf(response).cancel();
    browser.close();
  });
});
