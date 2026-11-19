import { afterAll, beforeAll, expect, test } from "bun:test";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { fetch } from "undici/index.js";

import { UndiciHttpAgent } from "@homarr/core/infrastructure/http";
import { executeCustomWidgetRequest } from "@homarr/custom-widgets/server";

let origin: string;
let cancellationStarted: () => void;
const cancellationReady = new Promise<void>((resolve) => {
  cancellationStarted = resolve;
});
const server = createServer(async (request, response) => {
  if (request.url === "/cancel") {
    cancellationStarted();
    return;
  }
  let body = "";
  for await (const chunk of request) body += chunk;
  response.writeHead(200, { "content-type": "application/json" });
  response.end(JSON.stringify({ method: request.method, body, host: request.headers.host }));
});

beforeAll(async () => {
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  server.closeIdleConnections();
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) reject(error);
      else resolve();
    });
  });
});

test("Bun executes Custom Widget GET through the installed dispatcher", async () => {
  const result = await executeCustomWidgetRequest({
    baseUrl: origin,
    method: "GET",
    kind: "query",
  });
  expect(result).toMatchObject({ status: 200, data: { method: "GET", body: "" } });
});

test("Bun executes Custom Widget actions with their body", async () => {
  const result = await executeCustomWidgetRequest({
    baseUrl: origin,
    method: "POST",
    body: '{"enabled":true}',
    kind: "action",
  });
  expect(result).toMatchObject({ status: 200, data: { method: "POST", body: '{"enabled":true}' } });
});

test("Bun cancels an active Custom Widget upstream request", async () => {
  const controller = new AbortController();
  const pending = executeCustomWidgetRequest({
    baseUrl: `${origin}/cancel`,
    method: "GET",
    kind: "query",
    signal: controller.signal,
  });
  await cancellationReady;
  controller.abort();
  await expect(pending).rejects.toBe(controller.signal.reason);
});

test("Bun honors explicit DNS pinning for dispatcher requests and fetch", async () => {
  const target = new URL(origin);
  target.hostname = "homarr-dispatcher-test.invalid";
  // Core guarded requests still pin their checked DNS answers; Custom Widgets
  // deliberately use normal DNS resolution after upstream removed network scopes.
  const agent = new UndiciHttpAgent({
    connect: {
      lookup: (_hostname, options, callback) => {
        if (options.all) callback(null, [{ address: "127.0.0.1", family: 4 }]);
        else callback(null, "127.0.0.1", 4);
      },
    },
    httpProxy: "",
    httpsProxy: "",
    noProxy: "*",
  });
  try {
    const direct = await agent.request({ origin: target.origin, path: "/", method: "GET" });
    expect(await direct.body.json()).toMatchObject({ host: target.host });
    const response = await fetch(target, { dispatcher: agent });
    expect(await response.json()).toMatchObject({ host: target.host });
  } finally {
    await agent.close();
  }
});

test("Bun allows Custom Widget loopback requests without a network scope", async () => {
  const result = await executeCustomWidgetRequest({ baseUrl: origin, method: "GET", kind: "query" });
  expect(result).toMatchObject({ status: 200, data: { method: "GET", host: new URL(origin).host } });
});
