import { createHash } from "node:crypto";
import { constants } from "node:fs";
import { createServer } from "node:http";
import type { IncomingMessage, ServerResponse } from "node:http";
import { readFile, mkdir, open, rename, rm } from "node:fs/promises";
import path from "node:path";

import { validateLoopbackHost } from "./safety.mts";

const DEFAULT_HOST = "127.0.0.1";
const MAX_BODY_BYTES = 2 * 1024 * 1024;
const MAX_SLOW_MS = 30_000;

const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);

const videoPath = path.resolve(
  import.meta.dirname,
  "../../apps/docs/src/components/pages/home/drag-and-drop/showcase-dark.mp4",
);

const createWav = () => {
  const sampleRate = 8_000;
  const sampleCount = sampleRate / 4;
  const dataLength = sampleCount * 2;
  const buffer = Buffer.alloc(44 + dataLength);
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataLength, 4);
  buffer.write("WAVEfmt ", 8);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataLength, 40);
  for (let index = 0; index < sampleCount; index += 1) {
    const value = Math.sin((2 * Math.PI * 440 * index) / sampleRate) * 0.2;
    buffer.writeInt16LE(Math.round(value * 32_767), 44 + index * 2);
  }
  return buffer;
};

const wav = createWav();

const customWidgetPayload = {
  title: "Release v2 QA fixture",
  status: "ok",
  items: [
    { id: "alpha", label: "Alpha", value: 42 },
    { id: "beta", label: "Beta", value: 7 },
  ],
};

const parseArgs = () => {
  const args = process.argv.slice(2).filter((argument) => argument !== "--");
  let host = DEFAULT_HOST;
  let port = 0;
  let readyFile: string | undefined;

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    const value = args[index + 1];
    if (argument === "--host" && value) {
      host = value;
      index += 1;
      continue;
    }
    if (argument === "--port" && value) {
      port = Number(value);
      index += 1;
      continue;
    }
    if (argument === "--ready-file" && value) {
      readyFile = path.resolve(value);
      index += 1;
      continue;
    }
    throw new Error(`Unknown or incomplete argument: ${argument ?? "<missing>"}`);
  }

  if (!Number.isInteger(port) || port < 0 || port > 65_535) {
    throw new Error("--port must be an integer between 0 and 65535");
  }
  return { host: validateLoopbackHost(host), port, readyFile };
};

const setCommonHeaders = (response: ServerResponse) => {
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type, X-QA-Fixture");
  response.setHeader("Access-Control-Allow-Methods", "GET, HEAD, POST, PUT, OPTIONS");
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("X-QA-Fixture", "release-v2");
};

const send = (response: ServerResponse, status: number, contentType: string, body: string | Buffer) => {
  setCommonHeaders(response);
  response.writeHead(status, { "Content-Type": contentType });
  response.end(body);
};

const sendJson = (response: ServerResponse, status: number, value: unknown) => {
  send(response, status, "application/json; charset=utf-8", `${JSON.stringify(value)}\n`);
};

const readBody = async (request: IncomingMessage) => {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > MAX_BODY_BYTES) throw new Error("UPLOAD_TOO_LARGE");
    chunks.push(buffer);
  }
  return Buffer.concat(chunks);
};

const handleRequest = async (request: IncomingMessage, response: ServerResponse) => {
  const url = new URL(request.url ?? "/", `http://${request.headers.host ?? DEFAULT_HOST}`);
  const method = request.method ?? "GET";

  if (method === "OPTIONS") {
    setCommonHeaders(response);
    response.writeHead(204);
    response.end();
    return;
  }

  if (url.pathname === "/health") {
    sendJson(response, 200, { status: "ok", fixture: "release-v2-qa" });
    return;
  }

  if (url.pathname === "/json") {
    sendJson(response, 200, {
      id: "qa-json-001",
      name: "Release v2 deterministic JSON",
      active: true,
      count: 3,
      tags: ["homarr", "release-v2", "qa"],
      nested: { score: 99, nullable: null },
    });
    return;
  }

  if (url.pathname === "/api/qa/custom-widget") {
    sendJson(response, 200, customWidgetPayload);
    return;
  }

  if (url.pathname === "/rss") {
    send(
      response,
      200,
      "application/rss+xml; charset=utf-8",
      `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel><title>Release v2 QA</title><link>https://example.invalid/qa</link><description>Deterministic feed</description><item><guid>qa-entry-1</guid><title>Alpha release note</title><link>https://example.invalid/qa/alpha</link><pubDate>Thu, 01 Jan 2026 00:00:00 GMT</pubDate><description>Stable fixture entry</description></item><item><guid>qa-entry-2</guid><title>Beta release note</title><link>https://example.invalid/qa/beta</link><pubDate>Fri, 02 Jan 2026 00:00:00 GMT</pubDate><description>Second stable fixture entry</description></item></channel></rss>\n`,
    );
    return;
  }

  if (url.pathname === "/media/image.png") {
    send(response, 200, "image/png", png);
    return;
  }

  if (url.pathname === "/media/image.svg") {
    send(
      response,
      200,
      "image/svg+xml; charset=utf-8",
      '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180" viewBox="0 0 320 180"><rect width="320" height="180" fill="#111827"/><circle cx="72" cy="90" r="40" fill="#38bdf8"/><text x="132" y="98" fill="#f8fafc" font-family="sans-serif" font-size="22">Release v2 QA</text></svg>\n',
    );
    return;
  }

  if (url.pathname === "/media/audio.wav") {
    send(response, 200, "audio/wav", wav);
    return;
  }

  if (url.pathname === "/media/video.mp4") {
    const video = await readFile(videoPath);
    const range = request.headers.range;
    setCommonHeaders(response);
    response.setHeader("Accept-Ranges", "bytes");
    if (!range) {
      response.writeHead(200, { "Content-Type": "video/mp4", "Content-Length": video.length });
      response.end(method === "HEAD" ? undefined : video);
      return;
    }

    const match = /^bytes=(\d+)-(\d*)$/.exec(range);
    if (!match) {
      response.writeHead(416, { "Content-Range": `bytes */${video.length}` });
      response.end();
      return;
    }
    const start = Number(match[1]);
    const requestedEnd = match[2] ? Number(match[2]) : video.length - 1;
    const end = Math.min(requestedEnd, video.length - 1);
    if (start > end || start >= video.length) {
      response.writeHead(416, { "Content-Range": `bytes */${video.length}` });
      response.end();
      return;
    }
    const body = video.subarray(start, end + 1);
    response.writeHead(206, {
      "Content-Type": "video/mp4",
      "Content-Length": body.length,
      "Content-Range": `bytes ${start}-${end}/${video.length}`,
    });
    response.end(method === "HEAD" ? undefined : body);
    return;
  }

  if (url.pathname === "/iframe") {
    send(
      response,
      200,
      "text/html; charset=utf-8",
      '<!doctype html><html><head><meta charset="utf-8"><title>Release v2 QA iframe</title></head><body><main data-qa-fixture="iframe"><h1>Deterministic iframe</h1><p>release-v2-qa</p></main></body></html>\n',
    );
    return;
  }

  if (url.pathname === "/api/qa/download/sample.txt") {
    setCommonHeaders(response);
    response.writeHead(200, {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": 'attachment; filename="release-v2-qa-sample.txt"',
    });
    response.end("Release v2 QA deterministic download\nline=2\n");
    return;
  }

  if (url.pathname === "/upload") {
    if (method !== "POST" && method !== "PUT") {
      sendJson(response, 405, { error: "METHOD_NOT_ALLOWED", allowed: ["POST", "PUT"] });
      return;
    }
    try {
      const body = await readBody(request);
      sendJson(response, 200, {
        uploaded: true,
        method,
        bytes: body.length,
        contentType: request.headers["content-type"] ?? null,
        sha256: createHash("sha256").update(body).digest("hex"),
      });
    } catch (error) {
      if (error instanceof Error && error.message === "UPLOAD_TOO_LARGE") {
        sendJson(response, 413, { error: "UPLOAD_TOO_LARGE", maxBytes: MAX_BODY_BYTES });
        return;
      }
      throw error;
    }
    return;
  }

  if (url.pathname === "/empty") {
    setCommonHeaders(response);
    response.writeHead(204);
    response.end();
    return;
  }

  if (url.pathname === "/malformed" || url.pathname === "/malformed/json") {
    send(response, 200, "application/json; charset=utf-8", '{"status":"broken","items":[1,2,}\n');
    return;
  }

  if (url.pathname === "/slow") {
    const requestedMs = Number(url.searchParams.get("ms") ?? "1500");
    const delayMs = Number.isFinite(requestedMs) ? Math.max(0, Math.min(Math.trunc(requestedMs), MAX_SLOW_MS)) : 1500;
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    sendJson(response, 200, { status: "ok", delayedMs: delayMs });
    return;
  }

  if (url.pathname === "/error" || url.pathname.startsWith("/error/")) {
    const pathStatus = url.pathname.split("/")[2];
    const requestedStatus = Number(url.searchParams.get("status") ?? pathStatus ?? "503");
    const status =
      Number.isInteger(requestedStatus) && requestedStatus >= 400 && requestedStatus <= 599 ? requestedStatus : 503;
    sendJson(response, status, { error: "QA_CONFIGURED_HTTP_ERROR", status });
    return;
  }

  sendJson(response, 404, { error: "NOT_FOUND", path: url.pathname });
};

const writeJsonAtomic = async (filePath: string, value: unknown) => {
  await mkdir(path.dirname(filePath), { recursive: true });
  const temporaryPath = `${filePath}.${process.pid}.tmp`;
  const handle = await open(
    temporaryPath,
    constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY | constants.O_NOFOLLOW,
    0o600,
  );
  try {
    await handle.writeFile(`${JSON.stringify(value, null, 2)}\n`, "utf8");
    await handle.sync();
  } finally {
    await handle.close();
  }
  try {
    await rename(temporaryPath, filePath);
  } catch (error) {
    await rm(temporaryPath, { force: true });
    throw error;
  }
};

const main = async () => {
  const options = parseArgs();
  const server = createServer((request, response) => {
    void handleRequest(request, response).catch((error: unknown) => {
      console.error(error);
      if (!response.headersSent) sendJson(response, 500, { error: "FIXTURE_INTERNAL_ERROR" });
      else response.destroy();
    });
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(options.port, options.host, resolve);
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Fixture server did not expose a TCP address");
  const urlHost = options.host.includes(":") ? `[${options.host}]` : options.host;
  const url = `http://${urlHost}:${address.port}`;
  const ready = { schemaVersion: 1, pid: process.pid, host: options.host, port: address.port, url };
  if (options.readyFile) await writeJsonAtomic(options.readyFile, ready);
  process.stdout.write(`${JSON.stringify(ready)}\n`);

  const shutdown = () => {
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 5_000).unref();
  };
  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
};

await main();
