#!/usr/bin/env node

/**
 * Local-only synthetic services for the six integration reproductions.
 *
 * The server intentionally implements only the upstream contracts used by the
 * release, TrueNAS, Beszel, and OpenMediaVault integrations. It keeps counters
 * so the report can distinguish an exercised request/connection lifecycle from
 * a source-only assertion.
 */

import { createHash } from "node:crypto";
import { createServer } from "node:http";

const requestedPort = Number(process.env.FIXTURE_PORT ?? 47603);
const closeAfterTrueNasMessages = Number(process.env.TRUENAS_CLOSE_AFTER ?? 45);

const state = {
  startedAt: new Date().toISOString(),
  httpRequests: 0,
  githubPages: 0,
  githubCapPages: 0,
  githubCapErrors: 0,
  githubReleaseItems: 1001,
  truenasConnections: 0,
  truenasActive: 0,
  truenasClosed: 0,
  truenasMessages: 0,
  truenasMethods: {},
  truenasByPath: {},
  beszelRequests: 0,
  beszelAuthRequests: 0,
  beszelCollectionRequests: 0,
  beszelMalformedRequests: 0,
  wudRequests: 0,
  omvRequests: 0,
  omvMethods: {},
  parserPayloads: [],
};

const jsonHeaders = { "content-type": "application/json; charset=utf-8" };

const sendJson = (response, status, payload, headers = {}) => {
  const body = JSON.stringify(payload);
  response.writeHead(status, { ...jsonHeaders, ...headers, "content-length": Buffer.byteLength(body) });
  response.end(body);
};

const sendText = (response, status, body, headers = {}) => {
  response.writeHead(status, { "content-type": "text/plain; charset=utf-8", ...headers, "content-length": Buffer.byteLength(body) });
  response.end(body);
};

const collectBody = async (request) => {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
};

const nowIso = () => new Date().toISOString();

const githubReleases = (count = state.githubReleaseItems) =>
  Array.from({ length: count }, (_, index) => ({
    tag_name: `v${count - index}`,
    published_at: "2026-09-18T00:00:00.000Z",
    html_url: `http://fixture.local/release/${count - index}`,
    body: `Synthetic release ${count - index}`,
    prerelease: false,
  }));

const beszelToken = "fixture-beszel-token";
const beszelSystem = {
  id: "fixture-system-1",
  name: "Synthetic Beszel",
  host: "fixture-host",
  port: "8090",
  status: "up",
  info: {
    h: "fixture-host",
    cpu: 8.5,
    mp: 34.2,
    dp: 41.1,
    la: [0.1, 0.2, 0.3],
    u: 123456,
    v: "0.13.2",
    m: "Synthetic CPU",
    c: 4,
    ct: 8,
    bb: 2048,
    sv: [9, 10],
  },
  created: "2026-09-18T00:00:00.000Z",
  updated: "2026-09-18T00:00:00.000Z",
};
const beszelDetails = {
  id: "fixture-system-1",
  system: "fixture-system-1",
  hostname: "fixture-host",
  kernel: "6.1-synthetic",
  cores: 4,
  threads: 8,
  cpu: "Synthetic CPU",
  os: 1,
  os_name: "Synthetic Linux",
  arch: "amd64",
  memory: 16 * 1024 ** 3,
  podman: false,
  updated: "2026-09-18T00:00:00.000Z",
};
const beszelStats = {
  id: "fixture-stats-1",
  system: "fixture-system-1",
  type: "1m",
  created: "2026-09-18T00:00:00.000Z",
  updated: "2026-09-18T00:00:00.000Z",
  stats: {
    cpu: 8.5,
    m: 16,
    mu: 5.5,
    mp: 34.2,
    mb: 1.1,
    s: 2,
    su: 0.1,
    d: 100,
    du: 41,
    dp: 41,
    b: [1024, 2048],
    la: [0.1, 0.2, 0.3],
  },
};
const beszelContainer = {
  id: "fixture-container-1",
  system: "fixture-system-1",
  name: "synthetic-container",
  image: "fixture/image:latest",
  status: "running",
  health: 1,
  cpu: 2,
  memory: 64,
  net: 0,
  updated: Date.now(),
};
const beszelContainerStats = {
  id: "fixture-container-stats-1",
  system: "fixture-system-1",
  type: "1m",
  created: "2026-09-18T00:00:00.000Z",
  updated: "2026-09-18T00:00:00.000Z",
  stats: [{ n: "synthetic-container", c: 2, m: 64, b: [1, 2] }],
};

const wudContainers = [
  {
    id: "container-1",
    name: "synthetic-homeassistant",
    updateAvailable: true,
    image: { tag: { value: "2026.9.0" } },
    result: { tag: "2026.9.1" },
  },
  { id: "container-2", name: "synthetic-traefik", updateAvailable: false },
];

const omvSystem = (version, malformed) => {
  const response = {
    version,
    cpuModelName: null,
    cpuUtilization: 12.5,
    memUsed: "1073741824",
    memAvailable: "3221225472",
    uptime: 123456,
    loadAverage: { "1min": 0.1, "5min": 0.2, "15min": 0.3 },
    rebootRequired: false,
    availablePkgUpdates: 2,
  };
  if (malformed === "cpu") response.cpuUtilization = null;
  if (malformed === "memory") response.memUsed = 1073741824;
  if (malformed === "load") delete response.loadAverage;
  return { response };
};

const omvFilesystem = { response: [{ devicename: "/", used: "100", available: "900", percentage: 10 }] };
const omvSmart = { response: [{ devicename: "sda", temperature: 35, overallstatus: "GOOD" }] };
const omvCpuTemp = { response: { cputemp: 42 } };

const parserPayload = () => {
  // Keep the original issue's reported length and malformed unicode escape,
  // while recording that the actual upstream payload was unavailable.
  const payload = `${" ".repeat(10898)}\\u12`;
  state.parserPayloads.push({ length: payload.length, kind: "malformed-unicode-escape", source: "synthetic" });
  return payload;
};

const parsePathMode = (pathname, prefix) => {
  const match = pathname.match(new RegExp(`^/${prefix}-([^/]+)/`));
  return match?.[1] ?? "valid";
};

const handleHttp = async (request, response) => {
  state.httpRequests += 1;
  const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "fixture.local"}`);
  const body = await collectBody(request);
  const pathname = url.pathname;

  if (pathname === "/__metrics") return sendJson(response, 200, state);

  const githubCap = pathname.startsWith("/github-cap/");
  const githubPath = githubCap ? pathname.slice("/github-cap".length) : pathname;
  const githubReleasePath = githubCap
    ? "/repos/fixture-owner/fixture-repository/releases"
    : "/github/repos/fixture-owner/fixture-repository/releases";
  if (githubPath === githubReleasePath) {
    const page = Number(url.searchParams.get("page") ?? "1");
    const perPage = Math.min(Number(url.searchParams.get("per_page") ?? "30"), 100);
    if (githubCap && page >= 11) {
      state.githubCapPages += 1;
      state.githubCapErrors += 1;
      return sendJson(response, 422, { message: "Only the first 1000 results are available" });
    }
    const releases = githubReleases();
    const start = (page - 1) * perPage;
    const pageItems = releases.slice(start, start + perPage);
    state.githubPages += 1;
    if (githubCap) state.githubCapPages += 1;
    const headers = {};
    if (start + pageItems.length < releases.length) {
      const nextPage = page + 1;
      const prefix = githubCap ? "/github-cap" : "";
      const releasePath = githubCap
        ? "/repos/fixture-owner/fixture-repository/releases"
        : "/github/repos/fixture-owner/fixture-repository/releases";
      headers.link = `<http://${request.headers.host}${prefix}${releasePath}?page=${nextPage}&per_page=${perPage}>; rel="next"`;
    }
    return sendJson(response, 200, pageItems, headers);
  }
  const githubRepositoryPath = githubCap
    ? "/repos/fixture-owner/fixture-repository"
    : "/github/repos/fixture-owner/fixture-repository";
  if (githubPath === githubRepositoryPath) {
    return sendJson(response, 200, {
      html_url: "http://fixture.local/fixture-owner/fixture-repository",
      description: "Synthetic GitHub repository",
      fork: false,
      archived: false,
      created_at: "2026-01-01T00:00:00.000Z",
      stargazers_count: 1,
      open_issues_count: 0,
      forks_count: 0,
    });
  }

  if (pathname === "/wud/api/containers") {
    state.wudRequests += 1;
    return sendJson(response, 200, wudContainers);
  }

  if (pathname === "/beszel/api/collections/users/auth-with-password") {
    state.beszelRequests += 1;
    state.beszelAuthRequests += 1;
    return sendJson(response, 200, {
      token: beszelToken,
      record: { id: "fixture-user", email: "fixture@example.com", username: "fixture", verified: true },
    });
  }
  if (pathname.startsWith("/beszel-parser/api/collections/users/auth-with-password")) {
    state.beszelRequests += 1;
    state.beszelAuthRequests += 1;
    return sendJson(response, 200, {
      token: beszelToken,
      record: { id: "fixture-user", email: "fixture@example.com", username: "fixture", verified: true },
    });
  }
  if (pathname.startsWith("/beszel") && pathname.includes("/api/collections/")) {
    state.beszelRequests += 1;
    state.beszelCollectionRequests += 1;
    if (!request.headers.authorization) return sendJson(response, 401, { message: "missing auth" });
    if (pathname.startsWith("/beszel-parser/")) {
      state.beszelMalformedRequests += 1;
      return sendText(response, 200, parserPayload());
    }
    if (pathname.endsWith("/systems/records")) return sendJson(response, 200, { page: 1, perPage: 500, totalItems: 1, totalPages: 1, items: [beszelSystem] });
    if (pathname.endsWith("/system_details/records/fixture-system-1")) return sendJson(response, 200, beszelDetails);
    if (pathname.endsWith("/system_stats/records")) return sendJson(response, 200, { page: 1, perPage: 60, totalItems: 1, totalPages: 1, items: [beszelStats] });
    if (pathname.endsWith("/container_stats/records")) return sendJson(response, 200, { page: 1, perPage: 60, totalItems: 1, totalPages: 1, items: [beszelContainerStats] });
    if (pathname.endsWith("/containers/records")) return sendJson(response, 200, { page: 1, perPage: 500, totalItems: 1, totalPages: 1, items: [beszelContainer] });
    if (pathname.endsWith("/alerts/records")) return sendJson(response, 200, { page: 1, perPage: 500, totalItems: 0, totalPages: 1, items: [] });
    if (pathname.endsWith("/alerts_history/records")) return sendJson(response, 200, { page: 1, perPage: 50, totalItems: 0, totalPages: 1, items: [] });
    return sendJson(response, 404, { message: "unknown Beszel collection" });
  }

  if (pathname.startsWith("/omv-") && pathname.endsWith("/rpc.php")) {
    state.omvRequests += 1;
    let rpc;
    try {
      rpc = JSON.parse(body || "{}");
    } catch {
      return sendJson(response, 400, { error: "invalid json" });
    }
    const service = String(rpc.service ?? "");
    const method = String(rpc.method ?? "");
    const key = `${service}.${method}`;
    state.omvMethods[key] = (state.omvMethods[key] ?? 0) + 1;
    if (service === "session" && method === "login") return sendJson(response, 200, { response: { sessionid: "fixture-omv-session" } });
    const mode = parsePathMode(pathname, "omv");
    if (service === "system" && method === "getInformation") {
      if (mode === "malformed-cpu" || mode === "malformed-memory" || mode === "malformed-load") {
        return sendJson(response, 200, omvSystem("7.7.17-1", mode.replace("malformed-", "")));
      }
      const version = mode.startsWith("valid-v") ? mode.slice("valid-v".length) : "7.7.17-1";
      return sendJson(response, 200, omvSystem(version, null));
    }
    if (service === "filesystemmgmt" && method === "enumerateMountedFilesystems") return sendJson(response, 200, omvFilesystem);
    if (service === "smart" && method === "enumerateDevices") return sendJson(response, 200, omvSmart);
    if (service === "cputemp" && method === "get") return sendJson(response, 200, omvCpuTemp);
    return sendJson(response, 404, { error: `unknown OMV method ${key}` });
  }

  if (pathname === "/beszel/api/realtime") {
    if (request.method === "POST") return sendJson(response, 200, { ok: true });
    response.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-cache", connection: "keep-alive" });
    response.write(`id: fixture-client\nevent: PB_CONNECT\ndata: {"clientId":"fixture-client"}\n\n`);
    const timer = setInterval(() => {
      response.write(`event: rt_metrics\ndata: ${JSON.stringify({ stats: beszelStats.stats, container: [beszelContainerStats.stats[0]] })}\n\n`);
    }, 250);
    request.on("close", () => clearInterval(timer));
    return;
  }

  return sendJson(response, 404, { error: "fixture route not found", method: request.method, path: pathname });
};

const websocketAccept = (key) => createHash("sha1").update(`${key}258EAFA5-E914-47DA-95CA-C5AB0DC85B11`).digest("base64");

const encodeFrame = (payload) => {
  const data = Buffer.from(payload);
  if (data.length < 126) return Buffer.concat([Buffer.from([0x81, data.length]), data]);
  if (data.length < 65536) {
    const header = Buffer.alloc(4);
    header[0] = 0x81;
    header[1] = 126;
    header.writeUInt16BE(data.length, 2);
    return Buffer.concat([header, data]);
  }
  const header = Buffer.alloc(10);
  header[0] = 0x81;
  header[1] = 127;
  header.writeBigUInt64BE(BigInt(data.length), 2);
  return Buffer.concat([header, data]);
};

const decodeFrames = (connection, chunk) => {
  connection.buffer = Buffer.concat([connection.buffer, chunk]);
  const messages = [];
  while (connection.buffer.length >= 2) {
    const first = connection.buffer[0];
    const second = connection.buffer[1];
    const opcode = first & 0x0f;
    let length = second & 0x7f;
    let offset = 2;
    if (length === 126) {
      if (connection.buffer.length < 4) break;
      length = connection.buffer.readUInt16BE(2);
      offset = 4;
    } else if (length === 127) {
      if (connection.buffer.length < 10) break;
      const largeLength = connection.buffer.readBigUInt64BE(2);
      if (largeLength > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error("fixture frame too large");
      length = Number(largeLength);
      offset = 10;
    }
    const masked = (second & 0x80) !== 0;
    const maskOffset = masked ? offset + 4 : offset;
    const frameEnd = maskOffset + length;
    if (connection.buffer.length < frameEnd) break;
    let payload = connection.buffer.subarray(maskOffset, frameEnd);
    if (masked) {
      const mask = connection.buffer.subarray(offset, offset + 4);
      payload = Buffer.from(payload);
      for (let index = 0; index < payload.length; index += 1) payload[index] ^= mask[index % 4];
    }
    connection.buffer = connection.buffer.subarray(frameEnd);
    if (opcode === 0x8) {
      connection.socket.end();
      break;
    }
    if (opcode === 0x9) {
      const pong = Buffer.from([0x8a, payload.length, ...payload]);
      connection.socket.write(pong);
      continue;
    }
    if (opcode === 0x1) messages.push(payload.toString("utf8"));
  }
  return messages;
};

const truenasResult = (method) => {
  const timestamp = Math.floor(Date.now() / 1000);
  if (method === "auth.login" || method === "auth.login_with_api_key") return true;
  if (method === "system.info") return { version: "25.10.4", hostname: "synthetic-truenas", physmem: 16 * 1024 ** 3, model: "Synthetic TrueNAS CPU", uptime_seconds: 123456 };
  if (method === "pool.query") return [{ name: "tank", status: "ONLINE", healthy: true, free: 900, size: 1000, allocated: 100 }];
  if (method === "pool.dataset.query") return [{ id: "tank", used: { parsed: 100 }, available: { parsed: 900 } }];
  if (method === "interface.query") return [{ id: "eth0", name: "eth0" }];
  if (method === "reporting.get_data") {
    return ["cpu", "memory", "cputemp"].map((name) => ({
      name,
      identifier: name,
      aggregations: { min: {}, mean: {}, max: {} },
      start: timestamp - 300,
      end: timestamp,
      legend: ["time", name === "memory" ? "available" : "value"],
      data: [[timestamp, name === "cpu" ? 12 : name === "memory" ? 12 * 1024 ** 3 : 42]],
    }));
  }
  if (method === "reporting.netdata_get_data") return [{ name: "interface", identifier: "eth0", data: [[timestamp, 100, 200]] }];
  return [];
};

const handleUpgrade = (request, socket) => {
  const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "fixture.local"}`);
  if (!url.pathname.includes("/api/current") && !url.pathname.includes("/websocket")) {
    socket.end("HTTP/1.1 404 Not Found\r\nConnection: close\r\n\r\n");
    return;
  }
  // Force the JSON-RPC probe to fail for the legacy fixture. The integration
  // must then negotiate /websocket and keep the legacy socket alive.
  if (url.pathname.includes("/truenas-legacy/") && url.pathname.endsWith("/api/current")) {
    socket.end("HTTP/1.1 404 Not Found\r\nConnection: close\r\nContent-Length: 0\r\n\r\n");
    return;
  }
  const key = request.headers["sec-websocket-key"];
  if (!key) return socket.end("HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n");
  socket.write([
    "HTTP/1.1 101 Switching Protocols",
    "Upgrade: websocket",
    "Connection: Upgrade",
    `Sec-WebSocket-Accept: ${websocketAccept(key)}`,
    "\r\n",
  ].join("\r\n"));

  const isLegacy = url.pathname.endsWith("/websocket");
  const connection = { socket, path: url.pathname, isLegacy, buffer: Buffer.alloc(0), messageCount: 0 };
  state.truenasConnections += 1;
  state.truenasActive += 1;
  state.truenasByPath[url.pathname] = (state.truenasByPath[url.pathname] ?? 0) + 1;
  const finish = () => {
    if (connection.finished) return;
    connection.finished = true;
    state.truenasActive = Math.max(0, state.truenasActive - 1);
    state.truenasClosed += 1;
  };
  socket.on("close", finish);
  socket.on("error", finish);
  socket.on("data", (chunk) => {
    let messages;
    try {
      messages = decodeFrames(connection, chunk);
    } catch {
      socket.destroy();
      return;
    }
    for (const raw of messages) {
      connection.messageCount += 1;
      state.truenasMessages += 1;
      let message;
      try {
        message = JSON.parse(raw);
      } catch {
        continue;
      }
      if (isLegacy && message.msg === "connect") {
        socket.write(encodeFrame(JSON.stringify({ msg: "connected", session: "fixture" })));
        continue;
      }
      const method = message.method;
      if (typeof method !== "string") continue;
      state.truenasMethods[method] = (state.truenasMethods[method] ?? 0) + 1;
      const result = truenasResult(method);
      const response = isLegacy
        ? { id: message.id, msg: "result", result }
        : { jsonrpc: "2.0", id: message.id, result };
      socket.write(encodeFrame(JSON.stringify(response)));
      if (closeAfterTrueNasMessages > 0 && connection.messageCount >= closeAfterTrueNasMessages) {
        socket.end();
        break;
      }
    }
  });
};

const server = createServer((request, response) => {
  void handleHttp(request, response).catch((error) => {
    sendJson(response, 500, { error: String(error) });
  });
});
server.on("upgrade", handleUpgrade);
server.listen(requestedPort, "0.0.0.0", () => {
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : requestedPort;
  console.log(JSON.stringify({ ready: true, port, pid: process.pid, closeAfterTrueNasMessages }));
});

const shutdown = () => server.close(() => process.exit(0));
process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
