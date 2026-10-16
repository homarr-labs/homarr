import { generateWorkerIdentity, getWorkerId, randomSecret, signIdentity, toBase64Url } from "@homarr/remote-protocol";

const endpoint = process.argv[2];
if (!endpoint) throw new Error("Usage: bun apps/relay/scripts/smoke.ts http://127.0.0.1:PORT");
const health = await fetch(new URL("/health/ready", endpoint));
if (!health.ok || (await health.json()).protocol !== "homarr-relay-v1") throw new Error("Relay is not ready");

const identity = await generateWorkerIdentity();
const workerId = await getWorkerId(identity.publicJwk);
const capability = randomSecret();
const sockets: WebSocket[] = [];

function open(path: string, origin?: string) {
  const url = new URL(path, endpoint);
  url.protocol = url.protocol.replace("http", "ws");
  const headers: Record<string, string> = {};
  if (origin) headers.Origin = origin;
  const BunWebSocket = WebSocket as unknown as new (url: string, options: Bun.WebSocketOptions) => WebSocket;
  const ws = new BunWebSocket(url.toString(), { headers });
  sockets.push(ws);
  const queue: string[] = [];
  const waiters: ((message: string) => void)[] = [];
  ws.addEventListener("message", (event) => {
    const waiter = waiters.shift();
    if (waiter) waiter(String(event.data));
    else queue.push(String(event.data));
  });
  return {
    ws,
    opened: new Promise<void>((resolve, reject) => {
      ws.addEventListener("open", () => resolve(), { once: true });
      ws.addEventListener("error", () => reject(new Error("WebSocket rejected")), { once: true });
    }),
    async next() {
      const buffered = queue.shift();
      if (buffered !== undefined) return buffered;
      return new Promise<string>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error("Relay smoke timed out")), 3000);
        waiters.push((message) => {
          clearTimeout(timer);
          resolve(message);
        });
      });
    },
  };
}

try {
  const worker = open(`/workers/${workerId}`);
  await worker.opened;
  const challenge = JSON.parse(await worker.next());
  worker.ws.send(
    JSON.stringify({
      type: "register",
      publicKey: identity.publicJwk,
      signature: await signIdentity(identity, JSON.stringify(["homarr-relay-register-v1", workerId, challenge.nonce])),
      capabilityHash: toBase64Url(
        new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(capability))),
      ),
    }),
  );
  if (JSON.parse(await worker.next()).type !== "registered") throw new Error("Worker registration failed");
  const browser = open(`/connect/${workerId}`, "https://remote.homarr.test");
  await browser.opened;
  browser.ws.send(JSON.stringify({ type: "connect", capability }));
  const connected = JSON.parse(await browser.next());
  if (connected.type !== "connected") throw new Error("Browser connection failed");
  if (JSON.parse(await worker.next()).channelId !== connected.channelId) throw new Error("Channel mismatch");
  const opaque = randomSecret();
  browser.ws.send(opaque);
  const forwarded = JSON.parse(await worker.next());
  if (forwarded.type !== "channel.message" || forwarded.payload !== opaque) throw new Error("Forwarding failed");
  worker.ws.send(JSON.stringify({ type: "channel.message", channelId: connected.channelId, payload: opaque }));
  if ((await browser.next()) !== opaque) throw new Error("Reverse forwarding failed");
  console.info(
    "Relay container smoke passed: health, worker proof, routing capability, bidirectional opaque WebSockets",
  );
} finally {
  for (const ws of sockets) ws.close();
}
