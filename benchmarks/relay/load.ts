import { generateWorkerIdentity, getWorkerId, randomSecret, signIdentity } from "../../packages/remote-protocol";

const config = JSON.parse(await Bun.file(process.argv[2]!).text());
const started = performance.now();
const usageStart = process.resourceUsage();
const sockets: WebSocket[] = [];
const failures: Record<string, number> = {};
const closes: Record<string, number> = {};
const registrationMs: number[] = [];
const connectMs: number[] = [];
const latencyMs: number[] = [];
const schedulingLagMs: number[] = [];
const pending = new Map<string, { sent: number; body: string; client: WebSocket }>();
let sent = 0;
let received = 0;
let mismatches = 0;
let unknownMessages = 0;
let sendErrors = 0;
let deadlineExceededReceived = 0;
let readyWorkers = 0;
let readyClients = 0;
let measuring = false;
let finishing = false;
function failure(reason: string) {
  failures[reason] = (failures[reason] ?? 0) + 1;
}
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
async function batch<T>(items: T[], fn: (item: T, index: number) => Promise<void>) {
  let index = 0;
  await Promise.all(
    Array.from({ length: config.concurrency ?? 8 }, async () => {
      while (index < items.length) {
        const current = index++;
        await fn(items[current]!, current).catch((error) => failure(String(error.message ?? error)));
      }
    }),
  );
}
function connection(
  path: string,
  headers: Record<string, string>,
  handshake: (socket: WebSocket, frame: any) => Promise<boolean> | boolean,
  onOpen?: (socket: WebSocket) => void,
) {
  return new Promise<WebSocket>((resolve, reject) => {
    const socket = new WebSocket(`${config.url}${path}`, { headers });
    sockets.push(socket);
    socket.onopen = () => onOpen?.(socket);
    let complete = false;
    const timer = setTimeout(() => {
      if (complete) return;
      complete = true;
      socket.close();
      reject(new Error("handshake timeout"));
    }, config.handshakeDeadlineMs ?? 7000);
    socket.onmessage = async (event) => {
      try {
        if (await handshake(socket, JSON.parse(String(event.data)))) {
          if (complete) return;
          complete = true;
          clearTimeout(timer);
          resolve(socket);
        }
      } catch (error) {
        if (complete) return;
        complete = true;
        clearTimeout(timer);
        socket.close();
        reject(error);
      }
    };
    socket.onerror = () => {
      if (complete) return;
      complete = true;
      clearTimeout(timer);
      reject(new Error("upgrade/network error"));
    };
    socket.onclose = (event) => {
      if (!finishing) {
        const key = `${event.code}:${event.reason}`;
        closes[key] = (closes[key] ?? 0) + 1;
      }
      if (complete) return;
      complete = true;
      clearTimeout(timer);
      reject(new Error(`handshake closed ${event.code}:${event.reason}`));
    };
  });
}
const workers: {
  identity: Awaited<ReturnType<typeof generateWorkerIdentity>>;
  workerId: string;
  capability: string;
  capabilityHash: string;
  socket?: WebSocket;
}[] = [];
for (let i = 0; i < config.workers; i++) {
  const identity = await generateWorkerIdentity();
  const capability = randomSecret();
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(capability));
  workers.push({
    identity,
    workerId: await getWorkerId(identity.publicJwk),
    capability,
    capabilityHash: Buffer.from(digest).toString("base64url"),
  });
}
const identitiesPreparedMs = performance.now() - started;
async function register(worker: (typeof workers)[number]) {
  const start = performance.now();
  const headers: Record<string, string> = {};
  if (config.registrationToken) headers.authorization = `Bearer ${config.registrationToken}`;
  worker.socket = await connection(`/workers/${worker.workerId}`, headers, async (socket, frame) => {
    if (frame.type === "challenge") {
      socket.send(
        JSON.stringify({
          type: "register",
          publicKey: worker.identity.publicJwk,
          capabilityHash: worker.capabilityHash,
          signature: await signIdentity(
            worker.identity,
            JSON.stringify(["homarr-relay-register-v1", worker.workerId, frame.nonce]),
          ),
        }),
      );
    }
    if (frame.type === "registered") return true;
    if (frame.type === "channel.message") socket.send(JSON.stringify(frame));
    return false;
  });
  registrationMs.push(performance.now() - start);
}
await batch(workers, async (worker) => {
  await register(worker);
  readyWorkers++;
});
const clients: WebSocket[] = [];
await batch(
  workers.flatMap((worker) => Array.from({ length: config.channelsPerWorker ?? 0 }, () => worker)),
  async (worker) => {
    if (!worker.socket || worker.socket.readyState !== 1) {
      failure("worker unavailable before client");
      return;
    }
    const start = performance.now();
    const client = await connection(
      `/connect/${worker.workerId}`,
      { origin: config.origin ?? "https://benchmark.invalid" },
      (_socket, frame) => frame.type === "connected",
      (socket) => socket.send(JSON.stringify({ type: "connect", capability: worker.capability })),
    );
    clients.push(client);
    readyClients++;
    connectMs.push(performance.now() - start);
    client.onmessage = (event) => {
      if (!measuring) return;
      const body = String(event.data);
      const id = body.slice(0, body.indexOf("|"));
      const message = pending.get(id);
      if (!message) {
        unknownMessages++;
        return;
      }
      if (message.client !== client) {
        mismatches++;
        failure("message delivered to wrong client");
        return;
      }
      if (message.body !== body) {
        mismatches++;
        return;
      }
      pending.delete(id);
      received++;
      const latency = performance.now() - message.sent;
      latencyMs.push(latency);
      if (latency > (config.messageDeadlineMs ?? 2000)) deadlineExceededReceived++;
    };
  },
).catch((error) => failure(String(error)));

// A browser sends capability immediately after the WebSocket is established.
// connection() deliberately attaches all handlers before the open callback.
function stats(values: number[]) {
  if (!values.length) return { count: 0, min: null, p50: null, p95: null, p99: null, max: null };
  values.sort((a, b) => a - b);
  const percentile = (p: number) => values[Math.min(values.length - 1, Math.ceil(values.length * p) - 1)];
  return {
    count: values.length,
    min: values[0],
    p50: percentile(0.5),
    p95: percentile(0.95),
    p99: percentile(0.99),
    max: values.at(-1),
  };
}
if (config.reconnect) await batch(workers, register);
const setupMs = performance.now() - started;
const begin = performance.now();
measuring = true;
if ((config.hz ?? 0) > 0) {
  const interval = 1000 / config.hz;
  for (let tick = 0; tick * interval < config.durationMs; tick++) {
    const due = begin + tick * interval;
    await sleep(Math.max(0, due - performance.now()));
    schedulingLagMs.push(Math.max(0, performance.now() - due));
    for (const client of clients) {
      if (client.readyState !== 1) continue;
      const id = String(sent++);
      const body = `${id}|${"x".repeat(Math.max(0, config.payloadBytes - id.length - 1))}`;
      pending.set(id, { sent: performance.now(), body, client });
      try {
        client.send(body);
      } catch {
        sendErrors++;
      }
    }
    if (performance.now() - begin > config.durationMs + 2000 || pending.size > (config.maxPending ?? 100000)) {
      failure("generator safety cutoff");
      break;
    }
  }
} else await sleep(config.durationMs);
await sleep(Math.max(0, config.durationMs - (performance.now() - begin)));
const activeElapsedMs = performance.now() - begin;
const drainStart = performance.now();
while (pending.size && performance.now() - drainStart < (config.messageDeadlineMs ?? 2000)) await sleep(20);
const openClientsAtEnd = clients.filter((socket) => socket.readyState === 1).length;
finishing = true;
for (const socket of sockets) socket.close();
const usage = process.resourceUsage();
const processStatus = await Bun.file("/proc/self/status").text();
const generatorMemoryKiB: Record<string, number> = {};
for (const line of processStatus.split("\n")) {
  const match = /^(VmRSS|VmHWM):\s+(\d+)/.exec(line);
  if (match) generatorMemoryKiB[match[1]!] = Number(match[2]);
}
const result = {
  schemaVersion: 1,
  config,
  startedAt: new Date(performance.timeOrigin + started).toISOString(),
  identitiesPreparedMs,
  setupMs,
  activeElapsedMs,
  measurementBeginUnixMs: performance.timeOrigin + begin,
  measurementEndUnixMs: performance.timeOrigin + begin + activeElapsedMs,
  connections: {
    attemptedWorkers: config.workers,
    readyWorkers,
    attemptedClients: config.workers * (config.channelsPerWorker ?? 0),
    readyClients,
    openClientsAtEnd,
  },
  messages: {
    sent,
    received,
    missing: pending.size,
    mismatches,
    unknownMessages,
    sendErrors,
    deadlineExceededReceived,
    successfulRoundtripsPerSecond: received / (activeElapsedMs / 1000),
    applicationBytesEachDirection: received * (config.payloadBytes ?? 0),
  },
  latencyMs: stats(latencyMs),
  registrationMs: stats(registrationMs),
  connectMs: stats(connectMs),
  schedulingLagMs: stats(schedulingLagMs),
  failures,
  closes,
  generator: {
    userCpuMs: (usage.userCPUTime - usageStart.userCPUTime) / 1000,
    systemCpuMs: (usage.systemCPUTime - usageStart.systemCPUTime) / 1000,
    resourceUsageMaxRssRaw: usage.maxRSS,
    memoryKiB: generatorMemoryKiB,
    elapsedMs: performance.now() - started,
  },
};
console.log(JSON.stringify(result));
process.exit(0);
