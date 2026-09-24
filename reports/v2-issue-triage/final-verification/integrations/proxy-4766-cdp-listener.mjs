import { writeFile } from "node:fs/promises";

const port = Number(process.env.CDP_PORT);
const targetUrl = process.env.TARGET_URL ?? "https://other.test:47640/";
const outputPath = process.env.OUTPUT_PATH ?? "/tmp/proxy4766-cdp.json";
const durationMs = Number(process.env.DURATION_MS ?? 120_000);
const startedAt = new Date().toISOString();
const events = [];

const targets = await fetch(`http://127.0.0.1:${port}/json/list`).then((response) => response.json());
const target = targets.find((entry) => entry.type === "page" && entry.url.startsWith(targetUrl)) ??
  targets.find((entry) => entry.type === "page" && entry.url.startsWith("https://other.test:47640/"));
if (!target) throw new Error(`CDP page target not found for ${targetUrl}; targets=${JSON.stringify(targets)}`);

const socket = new WebSocket(target.webSocketDebuggerUrl);
let nextId = 1;
const command = (method, params = {}) => {
  const id = nextId++;
  socket.send(JSON.stringify({ id, method, params }));
};

const record = (message) => {
  if (!message.method) return;
  const params = message.params ?? {};
  if ([
    "Network.requestWillBeSent",
    "Network.requestWillBeSentExtraInfo",
    "Network.responseReceived",
    "Network.responseReceivedExtraInfo",
    "Network.webSocketCreated",
    "Network.webSocketWillSendHandshakeRequest",
    "Network.webSocketHandshakeResponseReceived",
    "Network.webSocketFrameError",
    "Network.webSocketClosed",
    "Network.loadingFailed",
  ].includes(message.method)) {
    events.push({ at: new Date().toISOString(), method: message.method, params });
  }
};

const finished = async (reason) => {
  const result = {
    startedAt,
    finishedAt: new Date().toISOString(),
    reason,
    target: { id: target.id, url: target.url, title: target.title },
    events,
  };
  await writeFile(outputPath, JSON.stringify(result, null, 2));
  socket.close();
};

socket.addEventListener("open", () => {
  command("Network.enable");
  command("Page.enable");
  events.push({ at: new Date().toISOString(), method: "listener.ready", target: target.url });
  setTimeout(() => void finished("duration"), durationMs);
});
socket.addEventListener("message", (event) => {
  try {
    record(JSON.parse(String(event.data)));
  } catch (error) {
    events.push({ at: new Date().toISOString(), method: "listener.parseError", error: String(error) });
  }
});
socket.addEventListener("error", (error) => void finished(`socket-error:${String(error)}`));
