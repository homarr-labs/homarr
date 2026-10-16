import { afterEach, describe, expect, test } from "bun:test";

import { generateWorkerIdentity, getWorkerId, randomSecret, signIdentity } from "@homarr/remote-protocol";
import type { WorkerIdentity } from "@homarr/remote-protocol";

import { createRelay } from "./relay";
import type { RelayOptions } from "./relay";

const origin = "https://remote.homarr.test";
const relays: ReturnType<typeof createRelay>[] = [];
const clients: WebSocket[] = [];

afterEach(async () => {
  for (const client of clients.splice(0)) client.close();
  for (const relay of relays.splice(0)) await relay.stop();
});

function start(options: Partial<RelayOptions> = {}) {
  const relay = createRelay({ hostname: "127.0.0.1", port: 0, allowedOrigins: [origin], ...options });
  relays.push(relay);
  return { relay, url: `ws://127.0.0.1:${relay.server.port}` };
}

function socket(url: string, clientOrigin?: string, registrationToken?: string) {
  const headers: Record<string, string> = {};
  if (clientOrigin) headers.Origin = clientOrigin;
  if (registrationToken) headers.Authorization = `Bearer ${registrationToken}`;
  // lib.dom shadows Bun's additional client-constructor options.
  const BunWebSocket = WebSocket as unknown as new (url: string, options: Bun.WebSocketOptions) => WebSocket;
  const ws = new BunWebSocket(url, { headers });
  clients.push(ws);
  const messages: string[] = [];
  const pending: { resolve: (value: string) => void; reject: (error: Error) => void }[] = [];
  ws.addEventListener("message", (event) => {
    const value = String(event.data);
    const next = pending.shift();
    if (next) next.resolve(value);
    else messages.push(value);
  });
  const closed = new Promise<CloseEvent>((resolve) => ws.addEventListener("close", resolve, { once: true }));
  const opened = new Promise<void>((resolve, reject) => {
    ws.addEventListener("open", () => resolve(), { once: true });
    ws.addEventListener("error", () => reject(new Error("WebSocket rejected")), { once: true });
  });
  return {
    ws,
    opened,
    closed,
    next: async () => {
      const buffered = messages.shift();
      if (buffered !== undefined) return buffered;
      return new Promise<string>((resolve, reject) => {
        const entry = { resolve, reject };
        pending.push(entry);
        const timer = setTimeout(() => {
          const index = pending.indexOf(entry);
          if (index >= 0) pending.splice(index, 1);
          reject(new Error("Relay message timed out"));
        }, 2000);
        entry.resolve = (value) => {
          clearTimeout(timer);
          resolve(value);
        };
      });
    },
  };
}

async function capabilityHash(value: string) {
  return Buffer.from(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value))).toString("base64url");
}

async function register(
  url: string,
  identity?: WorkerIdentity,
  capability = randomSecret(),
  registrationToken?: string,
) {
  identity ??= await generateWorkerIdentity();
  const workerId = await getWorkerId(identity.publicJwk);
  const worker = socket(`${url}/workers/${workerId}`, undefined, registrationToken);
  await worker.opened;
  const challenge = JSON.parse(await worker.next());
  worker.ws.send(
    JSON.stringify({
      type: "register",
      publicKey: identity.publicJwk,
      capabilityHash: await capabilityHash(capability),
      signature: await signIdentity(identity, JSON.stringify(["homarr-relay-register-v1", workerId, challenge.nonce])),
    }),
  );
  const registered = JSON.parse(await worker.next());
  expect(registered.type).toBe("registered");
  return { ...worker, workerId, identity, capability, generation: registered.generation };
}

async function connect(url: string, workerId: string, capability: string) {
  const client = socket(`${url}/connect/${workerId}`, origin);
  await client.opened;
  client.ws.send(JSON.stringify({ type: "connect", capability }));
  const connected = JSON.parse(await client.next());
  expect(connected.type).toBe("connected");
  return { ...client, channelId: connected.channelId, generation: connected.generation };
}

describe("Bun opaque relay", () => {
  test("routes isolated opaque strings in both directions and closes disconnected channels", async () => {
    const { url, relay } = start();
    const worker = await register(url);
    const first = await connect(url, worker.workerId, worker.capability);
    expect(JSON.parse(await worker.next())).toEqual({ type: "channel.open", channelId: first.channelId });
    const second = await connect(url, worker.workerId, worker.capability);
    expect(JSON.parse(await worker.next())).toEqual({ type: "channel.open", channelId: second.channelId });
    const opaque = "AQICAHh2V6uL_CIPHERTEXT==";
    first.ws.send(opaque);
    expect(JSON.parse(await worker.next())).toEqual({
      type: "channel.message",
      channelId: first.channelId,
      payload: opaque,
    });
    worker.ws.send(JSON.stringify({ type: "channel.message", channelId: second.channelId, payload: "opaque-reply" }));
    expect(await second.next()).toBe("opaque-reply");
    first.ws.close();
    expect(JSON.parse(await worker.next())).toEqual({ type: "channel.close", channelId: first.channelId });
    expect(relay.stats()).toEqual({ workers: 1, connections: 2 });
    worker.ws.close();
    expect((await second.closed).reason).toBe("Worker disconnected");
    expect(relay.stats()).toEqual({ workers: 0, connections: 0 });
  });

  test("new authenticated worker generation closes old channels and old worker cannot evict replacement", async () => {
    const { url, relay } = start();
    const first = await register(url);
    const browser = await connect(url, first.workerId, first.capability);
    await first.next();
    const replacement = await register(url, first.identity, first.capability);
    expect(replacement.generation).not.toBe(first.generation);
    expect((await browser.closed).reason).toBe("Worker reconnected");
    await first.closed;
    expect(relay.stats().workers).toBe(1);
    const nextBrowser = await connect(url, replacement.workerId, replacement.capability);
    expect(nextBrowser.generation).toBe(replacement.generation);
    expect(JSON.parse(await replacement.next()).type).toBe("channel.open");
  });

  test("rejects incorrect worker identity proofs and nonce replay", async () => {
    const { url } = start();
    const identity = await generateWorkerIdentity();
    const workerId = await getWorkerId(identity.publicJwk);
    const attacker = await generateWorkerIdentity();
    for (const signer of [attacker, identity]) {
      const worker = socket(`${url}/workers/${workerId}`);
      await worker.opened;
      const challenge = JSON.parse(await worker.next());
      let nonce = challenge.nonce;
      if (signer === identity) nonce = randomSecret();
      worker.ws.send(
        JSON.stringify({
          type: "register",
          publicKey: identity.publicJwk,
          capabilityHash: await capabilityHash(randomSecret()),
          signature: await signIdentity(signer, JSON.stringify(["homarr-relay-register-v1", workerId, nonce])),
        }),
      );
      expect((await worker.closed).code).toBe(1008);
    }
  });

  test("wrong routing capability never opens a worker channel", async () => {
    const { url, relay } = start();
    const worker = await register(url);
    const browser = socket(`${url}/connect/${worker.workerId}`, origin);
    await browser.opened;
    browser.ws.send(JSON.stringify({ type: "connect", capability: randomSecret() }));
    expect((await browser.closed).code).toBe(1008);
    expect(relay.stats()).toEqual({ workers: 1, connections: 1 });
    worker.ws.send(JSON.stringify({ type: "ping" }));
    expect(JSON.parse(await worker.next())).toEqual({ type: "pong" });
  });

  test("origin and registration policy reject before the WebSocket upgrade", async () => {
    const { url } = start({ registrationToken: "self-host-relay-registration-secret" });
    const id = randomSecret();
    for (const [path, headers, status] of [
      [`/connect/${id}`, { origin: "https://attacker.invalid" }, 403],
      [`/connect/${id}`, {}, 403],
      [`/workers/${id}`, { origin }, 403],
      [`/workers/${id}`, {}, 401],
      [`/connect/${id}?token=not-allowed-in-url`, { origin }, 400],
    ] as const) {
      const response = await fetch(`${url.replace("ws:", "http:")}${path}`, {
        headers: { Upgrade: "websocket", ...headers },
      });
      expect(response.status).toBe(status);
    }
    const worker = await register(url, undefined, undefined, "self-host-relay-registration-secret");
    expect(worker.workerId).toHaveLength(43);
  });

  test("malformed handshakes, binary frames and idle pending connections are closed", async () => {
    const { url } = start({ handshakeTimeoutMs: 50 });
    for (const payload of [
      "not-json",
      JSON.stringify({ type: "connect", capability: "short" }),
      new Uint8Array([1, 2, 3]),
    ]) {
      const browser = socket(`${url}/connect/${randomSecret()}`, origin);
      await browser.opened;
      browser.ws.send(payload);
      expect([1008, 1003]).toContain((await browser.closed).code);
    }
    const idle = socket(`${url}/connect/${randomSecret()}`, origin);
    await idle.opened;
    expect((await idle.closed).reason).toBe("Handshake timed out");
  });

  test("enforces worker channel and connection message limits", async () => {
    const { url } = start({ maxChannelsPerWorker: 1, maxMessagesPerSecond: 3 });
    const worker = await register(url);
    await connect(url, worker.workerId, worker.capability);
    await worker.next();
    const excess = socket(`${url}/connect/${worker.workerId}`, origin);
    await excess.opened;
    excess.ws.send(JSON.stringify({ type: "connect", capability: worker.capability }));
    expect((await excess.closed).code).toBe(1013);
    worker.ws.send(JSON.stringify({ type: "ping" }));
    worker.ws.send(JSON.stringify({ type: "ping" }));
    worker.ws.send(JSON.stringify({ type: "ping" }));
    expect((await worker.closed).reason).toBe("Connection rate limit reached");
  });

  test("Bun rejects oversized incoming frames without forwarding", async () => {
    const { url } = start({ maxPayloadLength: 1024 });
    const worker = await register(url);
    const browser = await connect(url, worker.workerId, worker.capability);
    await worker.next();
    browser.ws.send("x".repeat(2048));
    // Bun may terminate oversized frames before delivering a close control frame.
    expect([1006, 1009]).toContain((await browser.closed).code);
    expect(JSON.parse(await worker.next()).type).toBe("channel.close");
  });

  test("one worker cannot deliver messages to another worker's channels", async () => {
    const { url } = start();
    const owner = await register(url);
    const other = await register(url);
    const browser = await connect(url, owner.workerId, owner.capability);
    await owner.next();
    other.ws.send(JSON.stringify({ type: "channel.message", channelId: browser.channelId, payload: "injected" }));
    owner.ws.send(JSON.stringify({ type: "channel.message", channelId: browser.channelId, payload: "authorized" }));
    expect(await browser.next()).toBe("authorized");
  });

  test("global connection and per-source upgrade limits bound unauthenticated peers", async () => {
    const first = start({ maxConnections: 1 });
    const pending = socket(`${first.url}/connect/${randomSecret()}`, origin);
    await pending.opened;
    const full = await fetch(`${first.url.replace("ws:", "http:")}/connect/${randomSecret()}`, {
      headers: { Upgrade: "websocket", Origin: origin },
    });
    expect(full.status).toBe(503);
    const second = start({ maxUpgradesPerMinute: 1 });
    const one = socket(`${second.url}/connect/${randomSecret()}`, origin);
    await one.opened;
    one.ws.close();
    await one.closed;
    const limited = await fetch(`${second.url.replace("ws:", "http:")}/connect/${randomSecret()}`, {
      headers: { Upgrade: "websocket", Origin: origin },
    });
    expect(limited.status).toBe(429);
  });

  test("disconnects a paused receiver when its bounded output buffer fills", async () => {
    const { url } = start({ maxBufferedBytes: 64 * 1024 });
    const worker = await register(url);
    const browser = await connect(url, worker.workerId, worker.capability);
    await worker.next();
    const paused = browser.ws as unknown as { pause(): void; resume(): void };
    paused.pause();
    const message = JSON.stringify({
      type: "channel.message",
      channelId: browser.channelId,
      payload: "x".repeat(96 * 1024),
    });
    for (let index = 0; index < 128; index += 1) worker.ws.send(message);
    try {
      expect(JSON.parse(await worker.next())).toEqual({ type: "channel.close", channelId: browser.channelId });
    } finally {
      paused.resume();
    }
  });
});
