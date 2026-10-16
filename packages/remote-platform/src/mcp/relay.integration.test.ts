import { afterEach, expect, setDefaultTimeout, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  generateDeviceIdentity,
  generateWorkerIdentity,
  getWorkerId,
  randomSecret,
  signIdentity,
} from "@homarr/remote-protocol";
import { WorkerAccess } from "@homarr/worker-access";
import type { AuthenticatedEnvelope } from "@homarr/worker-access";

import { createRelay } from "../../../../apps/relay/src/relay";
import { createTransport, WorkerChannels } from "../../../../apps/worker/src/transport";
import { enrollmentMessage } from "../enrollment";
import { PlatformStore } from "../store";
import { createGlobalMcpApp } from "./app";
import { McpServiceStore } from "./store";

setDefaultTimeout(15_000);
const origin = "https://homarr.test";
const publicUrl = `${origin}/platform`;
const userId = "alice0000000000";
const integrationId = "selected-private-integration";
const secretInput = "private-query-marker-4af824";
const secretResult = "private-worker-result-32bc18";
const cleanups: (() => void | Promise<void>)[] = [];

afterEach(async () => {
  for (const cleanup of cleanups.splice(0).toReversed()) await cleanup();
});

function required<T>(value: T | undefined | null): T {
  if (value === undefined || value === null) throw new Error("Required fixture value was missing");
  return value;
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

const catalogTool = {
  name: "integration_all",
  description: "Read integrations approved by this worker",
  type: "query",
  pathInRouter: ["integration", "all"],
  inputSchema: { type: "object", properties: { query: { type: "string" } }, additionalProperties: false },
  inputMode: "object",
};

async function fixture() {
  const directory = mkdtempSync(join(tmpdir(), "homarr-mcp-relay-integration-"));
  cleanups.push(() => rmSync(directory, { recursive: true, force: true }));
  const identity = await generateWorkerIdentity();
  const workerId = await getWorkerId(identity.publicJwk);
  const access = await WorkerAccess.open({ directory: join(directory, "worker"), identity });
  cleanups.push(() => access.close());
  const ownerIdentity = await generateDeviceIdentity();
  const owner = await access.authenticateEnvelope(
    { deviceId: await getWorkerId(ownerIdentity.publicJwk), devicePublicJwk: ownerIdentity.publicJwk },
    { kind: "claim", secret: required(access.getBootstrapSecret()) },
  );
  const relay = createRelay({ hostname: "127.0.0.1", port: 0, allowedOrigins: [origin] });
  cleanups.push(() => relay.stop());
  const relayAddress = `ws://127.0.0.1:${relay.server.port}`;
  let directRequests = 0;
  const direct = Bun.serve({
    hostname: "127.0.0.1",
    port: 0,
    fetch() {
      directRequests++;
      return new Response("Direct connection must not be used", { status: 503 });
    },
  });
  cleanups.push(() => direct.stop(true));

  const store = new PlatformStore(join(directory, "platform.sqlite"));
  cleanups.push(() => store.close());
  store.upsertUser({ workshopId: userId, login: "alice", name: "Alice", avatarUrl: null }, Date.now());
  const secrets = new McpServiceStore({
    path: join(directory, "broker.sqlite"),
    keyFile: join(directory, "broker/key"),
  });
  cleanups.push(() => secrets.close());
  const app = createGlobalMcpApp({
    store,
    secrets,
    publicUrl,
    relayConnectUrl: relayAddress,
    browserSession: async (request) => {
      if (request.headers.get("X-Test-User") !== userId) return null;
      return { userId, sessionId: "fixture-session", csrfToken: "fixture-csrf", expiresAt: Date.now() + 3_600_000 };
    },
  });
  const challenge = {
    version: 1 as const,
    type: "homarr-platform-enrollment" as const,
    challengeId: crypto.randomUUID(),
    nonce: crypto.randomUUID(),
    userId,
    audience: origin,
    expiresAt: Date.now() + 300_000,
  };
  store.saveChallenge(challenge);
  const enrollment = {
    challenge,
    workerId,
    workerPublicKey: identity.publicJwk,
    workerSigningKey: identity.publicJwk,
    name: "Encrypted relay worker",
    mode: "direct" as const,
    directUrl: `http://127.0.0.1:${direct.port}`,
    relayUrl: `${origin}/relay`,
  };
  store.enrollWorker(
    { ...enrollment, signature: await signIdentity(identity, enrollmentMessage(enrollment)) },
    userId,
    Date.now(),
  );

  const capability = randomSecret();
  const wireFrames: string[] = [];
  const requests: string[] = [];
  const callStarted = deferred<Request>();
  const callCancelled = deferred<void>();
  let holdCall = false;
  const state = {
    identity,
    workerId,
    access,
    capability,
    directory: join(directory, "worker"),
    platformUrl: publicUrl,
    relayUrl: relayAddress,
    publicUrl: enrollment.directUrl,
  };
  const channels = new WorkerChannels(state, async (request, context) => {
    const principal = (context.authorization as AuthenticatedEnvelope).principal;
    expect(principal.role).toBe("service");
    expect(principal.service?.audience).toBe(`${publicUrl}/mcp`);
    expect(principal.service?.principalId).toBe(`account:${userId}`);
    expect(principal.service?.integrationIds).toEqual([integrationId]);
    const path = new URL(request.url).pathname;
    requests.push(path);
    access.authorizeProcedure(principal, { path: "integration.all", kind: "query" });
    if (path === "/remote/mcp/catalog") return Response.json({ tools: [catalogTool] });
    if (path === "/remote/mcp/integrations")
      return Response.json({ integrations: [{ id: integrationId, name: "Private integration", kind: "test" }] });
    expect(path).toBe("/remote/mcp/call");
    const input = (await request.json()) as { name: string; input: { query: string } };
    expect(input).toEqual({ name: catalogTool.name, input: { query: secretInput } });
    callStarted.resolve(request);
    if (holdCall) {
      await new Promise<void>((resolve) => {
        const cancelled = () => {
          callCancelled.resolve();
          resolve();
        };
        if (request.signal.aborted) cancelled();
        else request.signal.addEventListener("abort", cancelled, { once: true });
      });
    }
    return Response.json({ content: [{ type: "text", text: JSON.stringify({ integrationId, value: secretResult }) }] });
  });
  cleanups.push(() => channels.close());
  const workerSocket = new WebSocket(`${relayAddress}/workers/${workerId}`);
  cleanups.push(() => workerSocket.close());
  const ready = deferred<void>();
  const peers = new Map<string, ReturnType<typeof createTransport>>();
  function send(frame: unknown) {
    const body = JSON.stringify(frame);
    wireFrames.push(body);
    workerSocket.send(body);
  }
  workerSocket.addEventListener("message", (event) => {
    const body = String(event.data);
    wireFrames.push(body);
    const frame = JSON.parse(body) as { type: string; nonce?: string; channelId: string; payload: string };
    if (frame.type === "challenge") {
      void (async () => {
        send({
          type: "register",
          publicKey: identity.publicJwk,
          capabilityHash: Buffer.from(
            await crypto.subtle.digest("SHA-256", new TextEncoder().encode(capability)),
          ).toString("base64url"),
          signature: await signIdentity(identity, JSON.stringify(["homarr-relay-register-v1", workerId, frame.nonce])),
        });
      })().catch(ready.reject);
    } else if (frame.type === "registered") ready.resolve();
    else if (frame.type === "channel.open") {
      const peer = createTransport(
        (payload) => send({ type: "channel.message", channelId: frame.channelId, payload }),
        () => {
          peers.delete(frame.channelId);
          peer.ended();
          if (workerSocket.readyState === WebSocket.OPEN) send({ type: "channel.close", channelId: frame.channelId });
        },
      );
      peers.set(frame.channelId, peer);
      void channels.accept(peer.transport).catch(() => peer.transport.close?.());
    } else if (frame.type === "channel.message") peers.get(frame.channelId)?.message(frame.payload);
    else if (frame.type === "channel.close") {
      const peer = peers.get(frame.channelId);
      peers.delete(frame.channelId);
      peer?.ended();
    }
  });
  workerSocket.addEventListener("error", () => ready.reject(new Error("Fixture worker registration failed")));
  await ready.promise;
  expect(relay.stats().workers).toBe(1);

  const sessionHeaders = {
    "X-Test-User": userId,
    Origin: origin,
    "X-CSRF-Token": "fixture-csrf",
    "Content-Type": "application/json",
  };
  const prepared = await app.request(`${publicUrl}/api/mcp/approvals/prepare`, {
    method: "POST",
    headers: sessionHeaders,
    body: JSON.stringify({ workerId }),
  });
  expect(prepared.status).toBe(201);
  const pending = (await prepared.json()) as {
    approvalId: string;
    devicePublicJwk: JsonWebKey;
    deviceId: string;
    audience: string;
    principalId: string;
  };
  const grant = await access.grantAccess(owner.principal, {
    role: "service",
    devicePublicJwk: pending.devicePublicJwk,
    expiresAt: Date.now() + 3_600_000,
    service: {
      purpose: "mcp",
      integrationIds: [integrationId],
      access: "query",
      procedurePaths: ["integration.all"],
      audience: pending.audience,
      principalId: pending.principalId,
    },
  });
  const approved = await app.request(`${publicUrl}/api/mcp/approvals`, {
    method: "POST",
    headers: sessionHeaders,
    body: JSON.stringify({ approvalId: pending.approvalId, grant, capability }),
  });
  expect(approved.status).toBe(201);
  const token = randomSecret();
  secrets.saveToken(token, {
    id: crypto.randomUUID(),
    userId,
    clientId: "fixture-client",
    audience: `${publicUrl}/mcp`,
    organizationId: null,
    expiresAt: Date.now() + 3_600_000,
  });

  async function mcp(method: string, params: Record<string, unknown> = {}, signal?: AbortSignal) {
    const response = await app.request(`${publicUrl}/mcp`, {
      method: "POST",
      signal,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
        "Mcp-Method": method,
        "Mcp-Name": String(params.name ?? "homarr-workers"),
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method,
        params: {
          ...params,
          _meta: {
            "io.modelcontextprotocol/protocolVersion": "2026-07-28",
            "io.modelcontextprotocol/clientInfo": { name: "fixture", version: "1" },
            "io.modelcontextprotocol/clientCapabilities": {},
          },
        },
      }),
    });
    expect(response.status).toBe(200);
    const body = await response.text();
    let json = body;
    if (body.startsWith("event:") || body.startsWith("data:"))
      json = required(body.split("\n").find((line) => line.startsWith("data: "))).slice(6);
    return JSON.parse(json) as {
      result: { content: { type: string; text: string }[]; tools?: { name: string }[]; isError?: boolean };
    };
  }
  return {
    app,
    access,
    owner,
    channels,
    workerId,
    grant,
    token,
    secrets,
    pending,
    sessionHeaders,
    wireFrames,
    requests,
    mcp,
    callStarted,
    callCancelled,
    holdCalls() {
      holdCall = true;
    },
    directRequests() {
      return directRequests;
    },
  };
}

test("hosted MCP uses the real encrypted relay despite a direct-only browser preference", async () => {
  const f = await fixture();
  const list = await f.mcp("tools/list");
  expect(list.result.tools?.map((tool) => tool.name)).toContain(catalogTool.name);
  const discovery = await f.mcp("tools/call", { name: "homarr_integrations", arguments: {} });
  expect(JSON.parse(required(discovery.result.content[0]).text).integrations).toEqual([
    expect.objectContaining({ workerId: f.workerId, organizationId: null, integrationId }),
  ]);
  const result = await f.mcp("tools/call", {
    name: catalogTool.name,
    arguments: { workerId: f.workerId, arguments: { query: secretInput } },
  });
  expect(result.result.isError).toBeUndefined();
  expect(JSON.parse(required(result.result.content[0]).text)).toEqual({ workerId: f.workerId, organizationId: null });
  expect(JSON.parse(required(result.result.content[1]).text)).toEqual({ integrationId, value: secretResult });
  expect(f.requests.filter((path) => path === "/remote/mcp/call")).toHaveLength(1);
  expect(f.directRequests()).toBe(0);
  const wire = f.wireFrames.join("\n");
  for (const plaintext of [
    secretInput,
    secretResult,
    integrationId,
    catalogTool.name,
    "/remote/mcp/",
    f.grant.token,
    f.token,
  ])
    expect(wire).not.toContain(plaintext);
  const envelopes = f.wireFrames.map((frame) => JSON.parse(frame) as { type: string; payload?: string });
  const encryptedFrames = envelopes
    .filter((frame) => frame.type === "channel.message")
    .map((frame) => JSON.parse(required(frame.payload)) as { type: string });
  expect(encryptedFrames.filter((frame) => frame.type === "encrypted").length).toBeGreaterThan(10);
});

test("revoking hosted approval cancels an active encrypted tool call at the worker", async () => {
  const f = await fixture();
  f.holdCalls();
  const pendingCall = f.mcp("tools/call", {
    name: catalogTool.name,
    arguments: { workerId: f.workerId, arguments: { query: secretInput } },
  });
  await f.callStarted.promise;
  const revoked = await f.app.request(`${publicUrl}/api/mcp/approvals/${f.pending.approvalId}`, {
    method: "DELETE",
    headers: f.sessionHeaders,
  });
  expect(revoked.status).toBe(200);
  await f.callCancelled.promise;
  const result = await pendingCall;
  expect(result.result.isError).toBe(true);
  expect(JSON.stringify(result)).not.toContain(secretResult);
  expect(f.directRequests()).toBe(0);
  const discovery = await f.mcp("tools/call", { name: "homarr_workers", arguments: {} });
  expect(JSON.parse(required(discovery.result.content[0]).text).workers).toEqual([
    expect.objectContaining({ workerId: f.workerId, mcpApproved: false, available: false }),
  ]);
});

test("worker-local service revocation rejects the next relay session without direct fallback", async () => {
  const f = await fixture();
  f.access.revokeGrant(f.owner.principal, f.grant.id);
  f.channels.revalidate();
  const result = await f.mcp("tools/call", { name: "homarr_workers", arguments: {} });
  expect(JSON.parse(required(result.result.content[0]).text).workers).toEqual([
    expect.objectContaining({ workerId: f.workerId, mcpApproved: true, available: false }),
  ]);
  expect(f.requests).toEqual(["/remote/mcp/catalog"]);
  expect(f.directRequests()).toBe(0);
});
