import http from "node:http";
import { WebSocketServer } from "ws";

const port = Number(process.env.PORT ?? 8080);
const startedAt = Date.now();
const metrics = {
  startedAt: new Date(startedAt).toISOString(),
  httpRequests: [],
  upgrades: [],
  wsConnections: 0,
  wsActive: 0,
  wsClosed: 0,
  wsMessages: 0,
  lastUpgrade: null,
  lastOpen: null,
  lastClose: null,
};

const writeJson = (response, value, status = 200) => {
  const body = JSON.stringify(value);
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "content-length": Buffer.byteLength(body),
  });
  response.end(body);
};

const page = `<!doctype html>
<html><head><meta charset="utf-8"><title>Controlled WebSocket peer</title></head>
<body><h1>Controlled WebSocket peer</h1><p id="status">starting</p>
<script>
(() => {
  const events = [];
  const sockets = [];
  const mark = (event, extra = {}) => {
    events.push({ event, at: performance.now(), wall: Date.now(), ...extra });
    const status = document.querySelector('#status');
    if (status) status.textContent = events.at(-1).event;
  };
  window.__wsEvents = events;
  window.__wsSockets = sockets;
  window.__openWs = () => {
    const id = sockets.length + 1;
    const ws = new WebSocket('wss://' + location.host + '/ws');
    sockets.push(ws);
    mark('connecting', { id });
    ws.addEventListener('open', () => mark('open', { id, protocol: ws.protocol }));
    ws.addEventListener('message', (event) => mark('message', { id, data: String(event.data).slice(0, 160) }));
    ws.addEventListener('error', () => mark('error', { id }));
    ws.addEventListener('close', (event) => mark('close', { id, code: event.code, reason: event.reason }));
    return id;
  };
  window.__closeWs = (id) => {
    const ws = sockets[id - 1];
    if (ws) ws.close(1000, 'controlled close');
  };
  window.__protocolEvidence = () => {
    const nav = performance.getEntriesByType('navigation')[0];
    const resources = performance.getEntriesByType('resource').map((entry) => ({
      name: entry.name,
      nextHopProtocol: entry.nextHopProtocol,
      connectionId: entry.connectionId ?? null,
      transferSize: entry.transferSize,
    }));
    return { nextHopProtocol: nav?.nextHopProtocol ?? null, resources };
  };
  mark('loaded');
  window.__openWs();
})();
</script></body></html>`;

const wsServer = new WebSocketServer({ noServer: true });
wsServer.on("connection", (socket, request) => {
  const id = metrics.wsConnections + 1;
  metrics.wsConnections += 1;
  metrics.wsActive += 1;
  metrics.lastOpen = new Date().toISOString();
  socket.__fixtureId = id;
  console.log(JSON.stringify({ event: "ws-open", id, active: metrics.wsActive, url: request.url }));
  socket.send(JSON.stringify({ event: "hello", id }));
  const interval = setInterval(() => {
    if (socket.readyState === socket.OPEN) {
      metrics.wsMessages += 1;
      socket.send(JSON.stringify({ event: "heartbeat", id, at: Date.now() }));
    }
  }, 1000);
  socket.on("message", (value) => {
    metrics.wsMessages += 1;
    console.log(JSON.stringify({ event: "ws-message", id, value: String(value).slice(0, 160) }));
  });
  socket.on("close", (code, reason) => {
    clearInterval(interval);
    metrics.wsActive = Math.max(0, metrics.wsActive - 1);
    metrics.wsClosed += 1;
    metrics.lastClose = new Date().toISOString();
    console.log(JSON.stringify({ event: "ws-close", id, code, reason: String(reason), active: metrics.wsActive }));
  });
  socket.on("error", (error) => {
    console.log(JSON.stringify({ event: "ws-error", id, error: error.message }));
  });
});

const server = http.createServer((request, response) => {
  const entry = {
    at: new Date().toISOString(),
    method: request.method,
    url: request.url,
    httpVersion: request.httpVersion,
    host: request.headers.host,
  };
  metrics.httpRequests.push(entry);
  if (metrics.httpRequests.length > 200) metrics.httpRequests.shift();
  if (request.url === "/healthz") return writeJson(response, { ok: true, httpVersion: request.httpVersion });
  if (request.url === "/__metrics") return writeJson(response, { ...metrics });
  if (request.url === "/") {
    response.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" });
    response.end(page);
    return;
  }
  writeJson(response, { error: "not found" }, 404);
});

server.on("upgrade", (request, socket, head) => {
  const entry = {
    at: new Date().toISOString(),
    url: request.url,
    httpVersion: request.httpVersion,
    host: request.headers.host,
    upgrade: request.headers.upgrade,
    connection: request.headers.connection,
  };
  metrics.upgrades.push(entry);
  metrics.lastUpgrade = entry;
  if (request.url !== "/ws") {
    socket.destroy();
    return;
  }
  wsServer.handleUpgrade(request, socket, head, (client) => wsServer.emit("connection", client, request));
});

server.listen(port, "0.0.0.0", () => {
  console.log(JSON.stringify({ event: "ready", port }));
});
