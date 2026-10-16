import { afterAll, beforeAll, expect, test } from "bun:test";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { fetch } from "undici/index.js";

import { executeCustomWidgetRequest } from "@homarr/custom-widgets/server";
import { createPinnedAgent } from "../../../../packages/custom-widgets/src/server/network-policy";

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
    networkScope: "loopback",
    kind: "query",
  });
  expect(result).toMatchObject({ status: 200, data: { method: "GET", body: "" } });
});

test("Bun executes Custom Widget actions with their body", async () => {
  const result = await executeCustomWidgetRequest({
    baseUrl: origin,
    method: "POST",
    body: '{"enabled":true}',
    networkScope: "loopback",
    kind: "action",
  });
  expect(result).toMatchObject({ status: 200, data: { method: "POST", body: '{"enabled":true}' } });
});

test("Bun cancels an active Custom Widget upstream request", async () => {
  const controller = new AbortController();
  const pending = executeCustomWidgetRequest({
    baseUrl: `${origin}/cancel`,
    method: "GET",
    networkScope: "loopback",
    kind: "query",
    signal: controller.signal,
  });
  await cancellationReady;
  controller.abort();
  await expect(pending).rejects.toMatchObject({ code: "BAD_GATEWAY" });
});

test("Bun honors validated DNS pinning for dispatcher requests and fetch", async () => {
  const target = new URL(origin);
  target.hostname = "homarr-dispatcher-test.invalid";
  const agent = createPinnedAgent([{ address: "127.0.0.1", family: 4 }], 1000);
  try {
    const direct = await agent.request({ origin: target.origin, path: "/", method: "GET" });
    expect(await direct.body.json()).toMatchObject({ host: target.host });
    const response = await fetch(target, { dispatcher: agent });
    expect(await response.json()).toMatchObject({ host: target.host });
  } finally {
    await agent.close();
  }
});

test("Bun retains the Custom Widget loopback scope boundary", async () => {
  await expect(
    executeCustomWidgetRequest({ baseUrl: origin, method: "GET", networkScope: "public", kind: "query" }),
  ).rejects.toMatchObject({ code: "FORBIDDEN" });
});
