import type { ServerWebSocket } from "bun";
import { Hono } from "hono";

import { getWorkerId, verifyIdentity } from "@homarr/remote-protocol";

const identifier = /^[A-Za-z0-9_-]{43}$/;
const encoder = new TextEncoder();

export interface RelayOptions {
  port?: number;
  hostname?: string;
  allowedOrigins: string[];
  registrationToken?: string;
  maxWorkers?: number;
  maxConnections?: number;
  maxChannelsPerWorker?: number;
  maxPayloadLength?: number;
  maxBufferedBytes?: number;
  maxMessagesPerSecond?: number;
  maxBytesPerSecond?: number;
  handshakeTimeoutMs?: number;
  maxUpgradesPerMinute?: number;
  maxConnectionsPerIp?: number;
}

interface ConnectionData {
  role: "worker" | "client";
  state: "pending" | "verifying" | "ready";
  workerId: string;
  source: string;
  nonce: string;
  closed: boolean;
  timer?: ReturnType<typeof setTimeout>;
  worker?: WorkerConnection;
  channelId?: string;
  windowStart: number;
  windowMessages: number;
  windowBytes: number;
}

type Socket = ServerWebSocket<ConnectionData>;

interface WorkerConnection {
  socket: Socket;
  generation: string;
  capabilityHash: string;
  channels: Map<string, Socket>;
}

interface SourceLimit {
  since: number;
  upgrades: number;
  active: number;
}

function randomId() {
  return Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString("base64url");
}

async function hash(value: string) {
  return Buffer.from(await crypto.subtle.digest("SHA-256", encoder.encode(value))).toString("base64url");
}

function validPublicKey(value: unknown): value is JsonWebKey {
  if (!value || typeof value !== "object") return false;
  const key = value as JsonWebKey;
  return (
    key.kty === "EC" &&
    key.crv === "P-256" &&
    typeof key.x === "string" &&
    identifier.test(key.x) &&
    typeof key.y === "string" &&
    identifier.test(key.y) &&
    key.d === undefined
  );
}

function parseFrame(value: string): Record<string, unknown> | undefined {
  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return;
    return parsed as Record<string, unknown>;
  } catch {
    return;
  }
}

function closeChannel(worker: WorkerConnection, channelId: string, reason = "Channel closed") {
  const socket = worker.channels.get(channelId);
  if (!socket) return;
  worker.channels.delete(channelId);
  socket.close(1000, reason);
}

export function createRelay(options: RelayOptions) {
  const maxWorkers = options.maxWorkers ?? 1000;
  const maxConnections = options.maxConnections ?? 4096;
  const maxChannelsPerWorker = options.maxChannelsPerWorker ?? 64;
  const maxPayloadLength = options.maxPayloadLength ?? 1024 * 1024;
  const maxBufferedBytes = options.maxBufferedBytes ?? 2 * 1024 * 1024;
  const maxMessagesPerSecond = options.maxMessagesPerSecond ?? 256;
  const maxBytesPerSecond = options.maxBytesPerSecond ?? 16 * 1024 * 1024;
  const handshakeTimeoutMs = options.handshakeTimeoutMs ?? 5000;
  const maxUpgradesPerMinute = options.maxUpgradesPerMinute ?? 120;
  const maxConnectionsPerIp = options.maxConnectionsPerIp ?? 128;
  const allowedOrigins = new Set(options.allowedOrigins);
  const workers = new Map<string, WorkerConnection>();
  const sockets = new Set<Socket>();
  const sources = new Map<string, SourceLimit>();
  let stopping = false;
  let activeConnections = 0;

  function send(socket: Socket, frame: string | Record<string, unknown>): boolean {
    if (socket.data.closed || socket.readyState !== 1) return false;
    if (socket.getBufferedAmount() > maxBufferedBytes) {
      socket.close(1013, "Receiver is too slow");
      return false;
    }
    let body = frame;
    if (typeof frame !== "string") body = JSON.stringify(frame);
    const result = socket.send(body as string);
    if (result === 0 || socket.getBufferedAmount() > maxBufferedBytes) {
      socket.close(1013, "Receiver is too slow");
      return false;
    }
    return true;
  }

  function cleanup(socket: Socket) {
    if (socket.data.closed) return;
    socket.data.closed = true;
    clearTimeout(socket.data.timer);
    sockets.delete(socket);
    activeConnections = Math.max(0, activeConnections - 1);
    const source = sources.get(socket.data.source);
    if (source) source.active = Math.max(0, source.active - 1);
    const worker = socket.data.worker;
    if (!worker) return;
    if (socket.data.role === "worker") {
      if (workers.get(socket.data.workerId) === worker) workers.delete(socket.data.workerId);
      for (const channelId of worker.channels.keys()) closeChannel(worker, channelId, "Worker disconnected");
      return;
    }
    const channelId = socket.data.channelId;
    if (channelId && worker.channels.get(channelId) === socket) {
      worker.channels.delete(channelId);
      send(worker.socket, { type: "channel.close", channelId });
    }
  }

  async function register(socket: Socket, frame: Record<string, unknown>) {
    const data = socket.data;
    if (
      frame.type !== "register" ||
      !validPublicKey(frame.publicKey) ||
      typeof frame.signature !== "string" ||
      frame.signature.length !== 86 ||
      typeof frame.capabilityHash !== "string" ||
      !identifier.test(frame.capabilityHash)
    ) {
      socket.close(1008, "Invalid worker registration");
      return;
    }
    data.state = "verifying";
    const workerId = await getWorkerId(frame.publicKey);
    const validSignature = await verifyIdentity(
      frame.publicKey,
      JSON.stringify(["homarr-relay-register-v1", data.workerId, data.nonce]),
      frame.signature,
    );
    if (data.closed) return;
    if (workerId !== data.workerId || !validSignature) {
      socket.close(1008, "Worker proof rejected");
      return;
    }
    if (!workers.has(workerId) && workers.size >= maxWorkers) {
      socket.close(1013, "Relay capacity reached");
      return;
    }
    const previous = workers.get(workerId);
    if (previous) {
      for (const channelId of previous.channels.keys()) closeChannel(previous, channelId, "Worker reconnected");
      previous.socket.close(1012, "Worker reconnected");
    }
    const worker: WorkerConnection = {
      socket,
      generation: randomId(),
      capabilityHash: frame.capabilityHash,
      channels: new Map(),
    };
    clearTimeout(data.timer);
    data.worker = worker;
    data.state = "ready";
    workers.set(workerId, worker);
    send(socket, { type: "registered", workerId, generation: worker.generation });
  }

  async function connect(socket: Socket, frame: Record<string, unknown>) {
    if (frame.type !== "connect" || typeof frame.capability !== "string" || !identifier.test(frame.capability)) {
      socket.close(1008, "Invalid connection capability");
      return;
    }
    socket.data.state = "verifying";
    const digest = await hash(frame.capability);
    if (socket.data.closed) return;
    const worker = workers.get(socket.data.workerId);
    if (!worker || digest !== worker.capabilityHash) {
      socket.close(1008, "Connection rejected");
      return;
    }
    if (worker.channels.size >= maxChannelsPerWorker) {
      socket.close(1013, "Worker channel limit reached");
      return;
    }
    const channelId = randomId();
    socket.data.worker = worker;
    socket.data.channelId = channelId;
    socket.data.state = "ready";
    clearTimeout(socket.data.timer);
    worker.channels.set(channelId, socket);
    if (!send(worker.socket, { type: "channel.open", channelId })) {
      socket.close(1013, "Worker unavailable");
      return;
    }
    send(socket, { type: "connected", channelId, generation: worker.generation, maxPayloadLength });
  }

  async function onMessage(socket: Socket, message: string | Buffer) {
    const data = socket.data;
    if (data.closed) return;
    if (typeof message !== "string") {
      socket.close(1003, "Text frames required");
      return;
    }
    const bytes = Buffer.byteLength(message);
    if (bytes > maxPayloadLength) {
      socket.close(1009, "Frame too large");
      return;
    }
    const now = Date.now();
    if (now - data.windowStart >= 1000) {
      data.windowStart = now;
      data.windowMessages = 0;
      data.windowBytes = 0;
    }
    data.windowMessages += 1;
    data.windowBytes += bytes;
    if (data.windowMessages > maxMessagesPerSecond || data.windowBytes > maxBytesPerSecond) {
      socket.close(1008, "Connection rate limit reached");
      return;
    }
    if (data.state === "verifying") {
      socket.close(1008, "Handshake in progress");
      return;
    }
    if (data.role === "client" && data.state === "ready") {
      const worker = data.worker;
      if (!worker || workers.get(data.workerId) !== worker || !data.channelId) {
        socket.close(1012, "Worker disconnected");
        return;
      }
      if (!send(worker.socket, { type: "channel.message", channelId: data.channelId, payload: message })) {
        socket.close(1013, "Worker unavailable");
      }
      return;
    }
    const frame = parseFrame(message);
    if (!frame) {
      socket.close(1008, "Invalid frame");
      return;
    }
    if (data.state === "pending") {
      if (data.role === "worker") await register(socket, frame);
      else await connect(socket, frame);
      return;
    }
    const worker = data.worker;
    if (!worker || workers.get(data.workerId) !== worker) {
      socket.close(1012, "Worker disconnected");
      return;
    }
    if (frame.type === "ping") {
      send(socket, { type: "pong" });
      return;
    }
    if (typeof frame.channelId !== "string") {
      socket.close(1008, "Invalid channel");
      return;
    }
    if (frame.type === "channel.close") {
      closeChannel(worker, frame.channelId);
      return;
    }
    if (frame.type === "channel.message" && typeof frame.payload === "string") {
      const client = worker.channels.get(frame.channelId);
      if (client) send(client, frame.payload);
      return;
    }
    socket.close(1008, "Invalid worker frame");
  }

  const app = new Hono();
  app.get("/health/live", (context) => context.json({ status: "ok" }));
  app.get("/health/ready", (context) => {
    if (stopping) return context.json({ status: "stopping" }, 503);
    return context.json({ status: "ok", protocol: "homarr-relay-v1" });
  });
  app.notFound((context) => context.json({ error: "Not found" }, 404));
  app.onError((_error, context) => context.json({ error: "Relay request failed" }, 500));

  const server = Bun.serve({
    port: options.port ?? 8787,
    hostname: options.hostname ?? "0.0.0.0",
    fetch(request, bunServer) {
      const url = new URL(request.url);
      const match = /^\/(workers|connect)\/([A-Za-z0-9_-]{43})$/.exec(url.pathname);
      if (!match) return app.fetch(request);
      if (stopping) return new Response("Unavailable", { status: 503 });
      if (request.method !== "GET" || request.headers.get("upgrade")?.toLowerCase() !== "websocket") {
        return new Response("WebSocket upgrade required", { status: 426 });
      }
      // Capabilities belong in the first WebSocket frame, never access-log URLs.
      if (url.search) return new Response("Query parameters are not supported", { status: 400 });
      const role = match[1];
      const workerId = match[2];
      if (!workerId) return new Response("Not found", { status: 404 });
      const origin = request.headers.get("origin");
      if (role === "connect" && (!origin || !allowedOrigins.has(origin))) {
        return new Response("Origin rejected", { status: 403 });
      }
      if (role === "workers" && origin) return new Response("Worker origin rejected", { status: 403 });
      if (
        role === "workers" &&
        options.registrationToken &&
        request.headers.get("authorization") !== `Bearer ${options.registrationToken}`
      ) {
        return new Response("Registration rejected", { status: 401 });
      }
      if (activeConnections >= maxConnections) return new Response("Relay capacity reached", { status: 503 });
      const source = bunServer.requestIP(request)?.address ?? "unknown";
      const now = Date.now();
      let limit = sources.get(source);
      if (!limit) {
        if (sources.size >= 8192) return new Response("Relay capacity reached", { status: 503 });
        limit = { since: now, upgrades: 0, active: 0 };
        sources.set(source, limit);
      }
      if (now - limit.since >= 60_000) {
        limit.since = now;
        limit.upgrades = 0;
      }
      if (limit.upgrades >= maxUpgradesPerMinute || limit.active >= maxConnectionsPerIp) {
        return new Response("Connection rate limit reached", { status: 429 });
      }
      limit.upgrades += 1;
      limit.active += 1;
      activeConnections += 1;
      let connectionRole: ConnectionData["role"] = "client";
      if (role === "workers") connectionRole = "worker";
      const upgraded = bunServer.upgrade(request, {
        data: {
          role: connectionRole,
          state: "pending",
          workerId,
          source,
          nonce: randomId(),
          closed: false,
          windowStart: now,
          windowMessages: 0,
          windowBytes: 0,
        },
      });
      if (upgraded) return;
      limit.active -= 1;
      activeConnections -= 1;
      return new Response("WebSocket upgrade failed", { status: 400 });
    },
    websocket: {
      data: {} as ConnectionData,
      maxPayloadLength,
      backpressureLimit: maxBufferedBytes,
      closeOnBackpressureLimit: true,
      idleTimeout: 120,
      perMessageDeflate: false,
      open(socket) {
        sockets.add(socket);
        socket.data.timer = setTimeout(() => socket.close(1008, "Handshake timed out"), handshakeTimeoutMs);
        if (socket.data.role === "worker") send(socket, { type: "challenge", nonce: socket.data.nonce });
      },
      message(socket, message) {
        void onMessage(socket, message).catch(() => socket.close(1008, "Invalid protocol message"));
      },
      close(socket) {
        cleanup(socket);
      },
    },
  });

  const pruning = setInterval(() => {
    const now = Date.now();
    for (const [source, limit] of sources) {
      if (limit.active === 0 && now - limit.since > 60_000) sources.delete(source);
    }
  }, 60_000);
  pruning.unref();

  return {
    server,
    /** Process-local counters only; no worker list or content is exposed over HTTP. */
    stats: () => ({ workers: workers.size, connections: sockets.size }),
    async stop() {
      stopping = true;
      clearInterval(pruning);
      for (const socket of sockets) {
        cleanup(socket);
        socket.terminate();
      }
      await server.stop(true);
    },
  };
}
