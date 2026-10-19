import { afterEach, expect, test, setDefaultTimeout } from "bun:test";
import { mkdtempSync, rmSync, readFileSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { generateWorkerIdentity, getWorkerId, signIdentity } from "@homarr/remote-protocol";
import { enrollmentMessage } from "../enrollment";
import type { GlobalMcpOptions } from "./types";

import { PlatformStore } from "../store";
import { createGlobalMcpApp } from "./app";
import { McpServiceStore } from "./store";

setDefaultTimeout(15_000);
function required<T>(value: T | null | undefined): T {
  if (value === null || value === undefined) throw new Error("Expected fixture value");
  return value;
}
const cleanups: (() => void)[] = [];
afterEach(() => {
  for (const cleanup of cleanups.splice(0)) cleanup();
});
const origin = "https://homarr.test";
const publicUrl = `${origin}/platform`;
function fixture(connect?: GlobalMcpOptions["connect"], now?: () => number) {
  const directory = mkdtempSync(join(tmpdir(), "homarr-global-mcp-"));
  const store = new PlatformStore(join(directory, "platform.sqlite"));
  const secrets = new McpServiceStore({
    path: join(directory, "mcp.sqlite"),
    keyFile: join(directory, "secrets/broker.key"),
  });
  const app = createGlobalMcpApp({
    store,
    secrets,
    publicUrl,
    connect,
    now,
    browserSession: async (request) => {
      const userId = request.headers.get("X-Test-User");
      if (!userId) return null;
      return {
        userId,
        sessionId: request.headers.get("X-Test-Session") ?? "session-a",
        csrfToken: "csrf-a",
        expiresAt: Date.now() + 3600000,
      };
    },
  });
  cleanups.push(() => {
    secrets.close();
    store.close();
    rmSync(directory, { recursive: true, force: true });
  });
  return { directory, store, secrets, app };
}
test("global MCP advertises canonical account OAuth and rejects unauthenticated requests", async () => {
  const f = fixture();
  const metadata = await f.app.request(`${publicUrl}/.well-known/oauth-authorization-server`);
  expect(metadata.status).toBe(200);
  expect(await metadata.json()).toMatchObject({
    issuer: `${publicUrl}/mcp`,
    authorization_endpoint: `${publicUrl}/mcp/oauth/authorize`,
    code_challenge_methods_supported: ["S256"],
  });
  const response = await f.app.request(`${publicUrl}/mcp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
  });
  expect(response.status).toBe(401);
  expect(response.headers.get("WWW-Authenticate")).toContain(`${publicUrl}/.well-known/oauth-protected-resource/mcp`);
});

async function authorize(
  f: ReturnType<typeof fixture>,
  extra: Record<string, string> = {},
  userId = "alice0000000000",
) {
  f.store.upsertUser({ workshopId: userId, login: "test-account", name: "Test account", avatarUrl: null }, Date.now());
  const registration = await f.app.request(`${publicUrl}/mcp/oauth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ client_name: "Test AI", redirect_uris: ["https://ai.test/callback"] }),
  });
  expect(registration.status).toBe(201);
  const client = (await registration.json()) as { client_id: string };
  const verifier = "test-verifier-for-public-ai-client-00000000000000000000";
  const params = new URLSearchParams({
    client_id: client.client_id,
    redirect_uri: "https://ai.test/callback",
    response_type: "code",
    code_challenge_method: "S256",
    code_challenge: createHash("sha256").update(verifier).digest("base64url"),
    resource: `${publicUrl}/mcp`,
    scope: "mcp:tools",
    state: "original-state",
    ...extra,
  });
  const response = await f.app.request(`${publicUrl}/mcp/oauth/authorize?${params}`, {
    headers: { "X-Test-User": userId },
  });
  expect(response.status).toBe(200);
  const html = await response.text();
  const cookie = response.headers.getSetCookie()[0]?.split(";")[0] ?? "";
  const fields: Record<string, string> = {};
  for (const match of html.matchAll(/name="([a-zA-Z_]+)" value="([^"]*)"/g))
    fields[required(match[1])] = required(match[2]);
  const decision = await f.app.request(`${publicUrl}/mcp/oauth/authorize`, {
    method: "POST",
    headers: {
      "X-Test-User": userId,
      Origin: origin,
      Cookie: cookie,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ ...fields, decision: "approve" }),
  });
  expect(decision.status).toBe(302);
  const redirect = new URL(required(decision.headers.get("Location")));
  expect(redirect.origin).toBe("https://ai.test");
  expect(redirect.searchParams.get("state")).toBe("original-state");
  return { client, verifier, code: required(redirect.searchParams.get("code")) };
}
test("account OAuth requires explicit bound consent and S256 PKCE, with single-use code and hashed expiring token", async () => {
  const f = fixture();
  const flow = await authorize(f);
  const tokenRequest = (verifier: string) =>
    f.app.request(`${publicUrl}/mcp/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: flow.client.client_id,
        code: flow.code,
        code_verifier: verifier,
        redirect_uri: "https://ai.test/callback",
        resource: `${publicUrl}/mcp`,
      }),
    });
  const response = await tokenRequest(flow.verifier);
  expect(response.status).toBe(200);
  const token = (await response.json()) as { access_token: string; expires_in: number };
  expect(token.expires_in).toBe(3600);
  expect(f.secrets.token(token.access_token, Date.now())?.userId).toBe("alice0000000000");
  expect(f.secrets.token(token.access_token, Date.now() + 3600001)).toBeNull();
  expect((await tokenRequest(flow.verifier)).status).toBe(400);
  const wrong = await authorize(f);
  const denied = await f.app.request(`${publicUrl}/mcp/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: wrong.client.client_id,
      code: wrong.code,
      code_verifier: "x".repeat(50),
      resource: `${publicUrl}/mcp`,
    }),
  });
  expect(denied.status).toBe(400);
});

const sessionHeaders = {
  "X-Test-User": "alice0000000000",
  Origin: origin,
  "X-CSRF-Token": "csrf-a",
  "Content-Type": "application/json",
};
async function workerFixture(f: ReturnType<typeof fixture>, name: string) {
  const userId = "alice0000000000";
  f.store.upsertUser({ workshopId: userId, login: "alice", name: "Alice", avatarUrl: null }, Date.now());
  const identity = await generateWorkerIdentity();
  const workerId = await getWorkerId(identity.publicJwk);
  const challenge = {
    version: 1 as const,
    type: "homarr-platform-enrollment" as const,
    challengeId: crypto.randomUUID(),
    nonce: crypto.randomUUID(),
    userId,
    audience: origin,
    expiresAt: Date.now() + 300000,
  };
  f.store.saveChallenge(challenge);
  const proof = {
    challenge,
    workerId,
    workerPublicKey: identity.publicJwk,
    workerSigningKey: identity.publicJwk,
    name,
    mode: "relay" as const,
    relayUrl: `${origin}/relay`,
    directUrl: "https://private.tailnet.test",
  };
  const worker = f.store.enrollWorker(
    { ...proof, signature: await signIdentity(identity, enrollmentMessage(proof)) },
    userId,
    Date.now(),
  );
  return { identity, worker };
}
async function approve(
  f: ReturnType<typeof fixture>,
  fixtureWorker: Awaited<ReturnType<typeof workerFixture>>,
  organizationId?: string,
  integrationIds = ["same-integration-id"],
  beforeActivation?: (approvalId: string) => Promise<void>,
  expectedStatus = 201,
) {
  const prepare = await f.app.request(`${publicUrl}/api/mcp/approvals/prepare`, {
    method: "POST",
    headers: sessionHeaders,
    body: JSON.stringify({ workerId: fixtureWorker.worker.workerId, organizationId }),
  });
  expect(prepare.status).toBe(201);
  const pending = (await prepare.json()) as {
    approvalId: string;
    deviceId: string;
    audience: string;
    principalId: string;
    expiresAt: number;
  };
  const payload = {
    version: 1,
    id: crypto.randomUUID(),
    workerId: fixtureWorker.worker.workerId,
    subject: pending.deviceId,
    role: "service",
    boardIds: [],
    issuedAt: Date.now(),
    expiresAt: Date.now() + 3600000,
    parentId: null,
    parentGrantId: "root-grant",
    service: {
      purpose: "mcp",
      integrationIds,
      access: "query",
      procedurePaths: ["integration.all"],
      audience: pending.audience,
      principalId: pending.principalId,
      organizationId,
    },
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const grant = { ...payload, token: `${body}.${await signIdentity(fixtureWorker.identity, body)}` };
  await beforeActivation?.(pending.approvalId);
  const response = await f.app.request(`${publicUrl}/api/mcp/approvals`, {
    method: "POST",
    headers: sessionHeaders,
    body: JSON.stringify({ approvalId: pending.approvalId, grant, capability: "c".repeat(43) }),
  });
  expect(response.status).toBe(expectedStatus);
  return { pending, grant };
}
const catalogTool = {
  name: "integration_all",
  description: "List accessible integrations",
  type: "query",
  pathInRouter: ["integration", "all"],
  inputSchema: { type: "object", properties: {}, additionalProperties: false },
  inputMode: "none",
};
async function mcpRequest(
  f: ReturnType<typeof fixture>,
  token: string,
  method: string,
  params: Record<string, unknown> = {},
) {
  const response = await f.app.request(`${publicUrl}/mcp`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      "Mcp-Method": method,
      "Mcp-Name": typeof params.name === "string" ? params.name : "homarr-workers",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method,
      params: {
        ...params,
        _meta: {
          "io.modelcontextprotocol/protocolVersion": "2026-07-28",
          "io.modelcontextprotocol/clientInfo": { name: "test", version: "1" },
          "io.modelcontextprotocol/clientCapabilities": {},
        },
      },
    }),
  });
  expect(response.status).toBe(200);
  const text = await response.text();
  let json = text;
  if (text.startsWith("event:") || text.startsWith("data:"))
    json = required(text.split("\n").find((line) => line.startsWith("data: "))).slice(6);
  return JSON.parse(json) as { result: Record<string, unknown> };
}
async function accessToken(f: ReturnType<typeof fixture>, organizationId?: string, userId = "alice0000000000") {
  const flow = await authorize(f, organizationId ? { organization_id: organizationId } : {}, userId);
  const response = await f.app.request(`${publicUrl}/mcp/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: flow.client.client_id,
      code: flow.code,
      code_verifier: flow.verifier,
      resource: `${publicUrl}/mcp`,
    }),
  });
  expect(response.status).toBe(200);
  return ((await response.json()) as { access_token: string }).access_token;
}
test("dedicated owner-approved credentials route two workers with colliding integration IDs and preserve provenance", async () => {
  const calls: { workerId: string; path: string }[] = [];
  const f = fixture(async ({ worker, identity }) => ({
    deviceIdentity: identity,
    authorization: {},
    close() {},
    async fetch(input, init) {
      const path =
        typeof input === "string" ? input : input instanceof URL ? input.pathname : new URL(input.url).pathname;
      calls.push({ workerId: worker.workerId, path });
      if (path === "/remote/mcp/catalog") return Response.json({ tools: [catalogTool] });
      if (path === "/remote/mcp/integrations")
        return Response.json({
          integrations: [
            {
              id: "same-integration-id",
              name: worker.name,
              kind: "test",
              permissions: { hasUseAccess: true, hasInteractAccess: false, hasFullAccess: false },
            },
          ],
        });
      const body = JSON.parse(required(init).body as string) as { name: string; input: unknown };
      expect(body.name).toBe("integration_all");
      return Response.json({
        content: [{ type: "text", text: JSON.stringify({ name: worker.name, integrationId: "same-integration-id" }) }],
      });
    },
  }));
  const a = await workerFixture(f, "Home");
  const b = await workerFixture(f, "Office");
  await approve(f, a);
  await approve(f, b);
  const token = await accessToken(f);
  const tools = await mcpRequest(f, token, "tools/list");
  expect((tools.result.tools as { name: string }[]).map((tool) => tool.name)).toContain("integration_all");
  const discovery = await mcpRequest(f, token, "tools/call", { name: "homarr_integrations", arguments: {} });
  const integrations = JSON.parse(required((discovery.result.content as { text: string }[])[0]).text).integrations as {
    workerId: string;
    integrationId: string;
  }[];
  expect(new Set(integrations.map((integration) => integration.workerId))).toEqual(
    new Set([a.worker.workerId, b.worker.workerId]),
  );
  expect(integrations.map((integration) => integration.integrationId)).toEqual([
    "same-integration-id",
    "same-integration-id",
  ]);
  const result = await mcpRequest(f, token, "tools/call", {
    name: "integration_all",
    arguments: { workerId: b.worker.workerId, arguments: {} },
  });
  expect(JSON.parse(required((result.result.content as { text: string }[])[0]).text).workerId).toBe(b.worker.workerId);
  expect(JSON.parse(required((result.result.content as { text: string }[])[1]).text).name).toBe("Office");
  expect(calls.filter((call) => call.path === "/remote/mcp/call")).toEqual([
    { workerId: b.worker.workerId, path: "/remote/mcp/call" },
  ]);
  const approvals = (await (
    await f.app.request(`${publicUrl}/api/mcp/approvals`, { headers: sessionHeaders })
  ).json()) as { approvals: Record<string, unknown>[] };
  expect(JSON.stringify(approvals)).not.toContain("privateJwk");
  expect(JSON.stringify(approvals)).not.toContain("capability");
  expect(JSON.stringify(approvals)).not.toContain("token");
  await f.app.request(`${publicUrl}/api/mcp/approvals/${required(approvals.approvals[0]).id}`, {
    method: "DELETE",
    headers: sessionHeaders,
  });
  const remaining = await mcpRequest(f, token, "tools/call", { name: "homarr_workers", arguments: {} });
  const workers = JSON.parse(required((remaining.result.content as { text: string }[])[0]).text).workers as {
    mcpApproved: boolean;
  }[];
  expect(workers.filter((worker) => worker.mcpApproved)).toHaveLength(1);
});

test("replacement retains retiring approvals on reload and routes the last activation despite equal creation times", async () => {
  const routed: string[] = [];
  const now = Date.now();
  const f = fixture(
    async ({ identity, approval }) => {
      routed.push(approval.id);
      return {
        deviceIdentity: identity,
        authorization: {},
        close() {},
        async fetch() {
          return Response.json({ tools: [catalogTool] });
        },
      };
    },
    () => now,
  );
  const worker = await workerFixture(f, "Replacement worker");
  const first = await approve(f, worker);
  let middleId = "";
  const last = await approve(f, worker, undefined, undefined, async () => {
    middleId = (await approve(f, worker)).pending.approvalId;
  });
  const currentId = last.pending.approvalId;
  expect(f.secrets.currentApproval(worker.worker.workerId, "account:alice0000000000", now)?.id).toBe(currentId);
  const reloaded = new McpServiceStore({
    path: join(f.directory, "mcp.sqlite"),
    keyFile: join(f.directory, "secrets/broker.key"),
  });
  try {
    const records = reloaded.approvals(now);
    expect(records).toHaveLength(3);
    expect(new Set(records.map((record) => record.createdAt))).toEqual(new Set([now]));
    expect(records.filter((record) => record.current).map((record) => record.id)).toEqual([currentId]);
    expect(records.every((record) => Boolean(record.grant))).toBe(true);
    expect(reloaded.currentApproval(worker.worker.workerId, "account:alice0000000000", now)?.id).toBe(currentId);
    expect(required(reloaded.approval(currentId, now)).previousApprovalId).toBe(middleId);
    expect(required(reloaded.approval(first.pending.approvalId, now)).current).toBe(false);
  } finally {
    reloaded.close();
  }
  const metadata = (await (
    await f.app.request(`${publicUrl}/api/mcp/approvals`, { headers: sessionHeaders })
  ).json()) as {
    approvals: { id: string; active: boolean; current: boolean }[];
  };
  expect(metadata.approvals.every((approval) => approval.active)).toBe(true);
  expect(metadata.approvals.filter((approval) => approval.current).map((approval) => approval.id)).toEqual([currentId]);
  expect(JSON.stringify(metadata)).not.toContain(first.grant.token);
  expect(readFileSync(join(f.directory, "mcp.sqlite")).includes(Buffer.from(first.grant.token))).toBe(false);
  const token = await accessToken(f);
  routed.length = 0;
  await mcpRequest(f, token, "tools/list");
  expect(routed).toEqual([currentId]);
  const disconnected = await f.app.request(`${publicUrl}/api/mcp/approvals/${currentId}`, {
    method: "DELETE",
    headers: sessionHeaders,
  });
  expect(await disconnected.json()).toMatchObject({ restoredApprovalId: null });
  expect(f.secrets.currentApproval(worker.worker.workerId, "account:alice0000000000", now)).toBeNull();
  expect(f.secrets.approvals(now)).toHaveLength(2);
  routed.length = 0;
  await mcpRequest(f, token, "tools/list");
  expect(routed).toEqual([]);
});

test("explicit rollback restores only its current predecessor and cannot replace another browser activation", async () => {
  const f = fixture(async ({ identity }) => ({
    deviceIdentity: identity,
    authorization: {},
    close() {},
    async fetch() {
      return Response.json({ tools: [catalogTool] });
    },
  }));
  const worker = await workerFixture(f, "Rollback worker");
  const first = await approve(f, worker);
  const failed = await approve(f, worker);
  const remove = (id: string, rollback = false, retain = false) => {
    const address = new URL(`${publicUrl}/api/mcp/approvals/${id}`);
    if (rollback) address.searchParams.set("rollback", "1");
    if (retain) address.searchParams.set("retain", "1");
    return f.app.request(address.href, { method: "DELETE", headers: sessionHeaders });
  };
  const rolledBack = await remove(failed.pending.approvalId, true, true);
  expect(rolledBack.status).toBe(200);
  expect(await rolledBack.json()).toMatchObject({ restoredApprovalId: first.pending.approvalId });
  expect(f.secrets.currentApproval(worker.worker.workerId, "account:alice0000000000", Date.now())?.id).toBe(
    first.pending.approvalId,
  );
  const reloaded = new McpServiceStore({
    path: join(f.directory, "mcp.sqlite"),
    keyFile: join(f.directory, "secrets/broker.key"),
  });
  try {
    const retained = required(reloaded.approval(failed.pending.approvalId, Date.now()));
    expect(retained.current).toBe(false);
    expect(retained.grant?.id).toBe(failed.grant.id);
    expect(reloaded.currentApproval(worker.worker.workerId, "account:alice0000000000", Date.now())?.id).toBe(
      first.pending.approvalId,
    );
  } finally {
    reloaded.close();
  }
  expect((await remove(failed.pending.approvalId)).status).toBe(200);
  expect(f.secrets.approval(failed.pending.approvalId, Date.now())).toBeNull();
  const stale = await approve(f, worker);
  const otherBrowser = await approve(f, worker);
  const staleRollback = await remove(stale.pending.approvalId, true);
  expect(await staleRollback.json()).toMatchObject({ restoredApprovalId: null });
  expect(f.secrets.currentApproval(worker.worker.workerId, "account:alice0000000000", Date.now())?.id).toBe(
    otherBrowser.pending.approvalId,
  );
  const disconnected = await remove(otherBrowser.pending.approvalId, false, true);
  expect(await disconnected.json()).toMatchObject({ restoredApprovalId: null });
  expect(f.secrets.currentApproval(worker.worker.workerId, "account:alice0000000000", Date.now())).toBeNull();
  expect(required(f.secrets.approval(first.pending.approvalId, Date.now())).current).toBe(false);
  expect(required(f.secrets.approval(otherBrowser.pending.approvalId, Date.now())).current).toBe(false);
  expect((await remove(otherBrowser.pending.approvalId)).status).toBe(200);
  expect(f.secrets.approval(otherBrowser.pending.approvalId, Date.now())).toBeNull();
});

test("canceling a pending approval during worker verification cannot resurrect or replace it", async () => {
  const verifying = Promise.withResolvers<void>();
  const release = Promise.withResolvers<void>();
  let block = false;
  const f = fixture(async ({ identity }) => ({
    deviceIdentity: identity,
    authorization: {},
    close() {},
    async fetch() {
      if (block) {
        verifying.resolve();
        await release.promise;
      }
      return Response.json({ tools: [catalogTool] });
    },
  }));
  const worker = await workerFixture(f, "Canceled activation worker");
  const previous = await approve(f, worker);
  let canceledId = "";
  block = true;
  const activation = approve(
    f,
    worker,
    undefined,
    undefined,
    async (id) => {
      canceledId = id;
    },
    403,
  );
  await verifying.promise;
  const canceled = await f.app.request(`${publicUrl}/api/mcp/approvals/${canceledId}?rollback=1&retain=1`, {
    method: "DELETE",
    headers: sessionHeaders,
  });
  expect(canceled.status).toBe(200);
  release.resolve();
  await activation;
  expect(f.secrets.approval(canceledId, Date.now())).toBeNull();
  expect(f.secrets.currentApproval(worker.worker.workerId, "account:alice0000000000", Date.now())?.id).toBe(
    previous.pending.approvalId,
  );
});

test("activating a replacement aborts in-flight work and retains its retiring worker grant", async () => {
  const called = Promise.withResolvers<void>();
  let aborted = false;
  const f = fixture(async ({ identity, signal }) => ({
    deviceIdentity: identity,
    authorization: {},
    close() {},
    async fetch(input) {
      if (input === "/remote/mcp/catalog") return Response.json({ tools: [catalogTool] });
      called.resolve();
      return new Response(
        new ReadableStream({
          start(controller) {
            signal.addEventListener(
              "abort",
              () => {
                aborted = true;
                controller.error(new Error("cancelled"));
              },
              { once: true },
            );
          },
        }),
      );
    },
  }));
  const worker = await workerFixture(f, "In-flight replacement worker");
  const first = await approve(f, worker);
  const token = await accessToken(f);
  const pending = mcpRequest(f, token, "tools/call", {
    name: "integration_all",
    arguments: { workerId: worker.worker.workerId, arguments: {} },
  });
  await called.promise;
  const replacement = await approve(f, worker);
  expect((await pending).result.isError).toBe(true);
  expect(aborted).toBe(true);
  const retiring = required(f.secrets.approval(first.pending.approvalId, Date.now()));
  expect(retiring.current).toBe(false);
  expect(retiring.grant?.id).toBe(first.grant.id);
  expect(f.secrets.currentApproval(worker.worker.workerId, "account:alice0000000000", Date.now())?.id).toBe(
    replacement.pending.approvalId,
  );
});

test("organization member removal rejects an existing OAuth session before any further worker request", async () => {
  let calls = 0;
  const f = fixture(async ({ identity }) => ({
    deviceIdentity: identity,
    authorization: {},
    close() {},
    async fetch(_input) {
      calls++;
      return Response.json({ tools: [catalogTool] });
    },
  }));
  const worker = await workerFixture(f, "Organization worker");
  const bob = f.store.upsertUser(
    { workshopId: "bob000000000000", login: "bob", name: "Bob", avatarUrl: null },
    Date.now(),
  );
  const organization = f.store.organizations.create("organization-one", "Family", "alice0000000000", Date.now());
  f.store.organizations.attachWorker(organization.organizationId, worker.worker, "primary", Date.now());
  f.store.organizations.createInvite(
    {
      inviteId: "invite-bob-123",
      organizationId: organization.organizationId,
      role: "member",
      expiresAt: Date.now() + 60000,
      maxUses: 1,
      uses: 0,
      revokedAt: null,
    },
    "alice0000000000",
    "invite-hash",
  );
  f.store.organizations.redeemInvite("invite-hash", bob.id, Date.now());
  await approve(f, worker, organization.organizationId);
  const token = await accessToken(f, organization.organizationId, bob.id);
  const before = await mcpRequest(f, token, "tools/list");
  expect(before.result.tools).toBeDefined();
  const previousCalls = calls;
  f.store.organizations.removeMember(organization.organizationId, bob.id, Date.now());
  const response = await f.app.request(`${publicUrl}/mcp`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
  });
  expect(response.status).toBe(401);
  expect(response.headers.get("WWW-Authenticate")).toContain("resource_metadata");
  expect(calls).toBe(previousCalls);
});
test("deleting a hosted approval cancels in-flight work and secrets remain encrypted on disk", async () => {
  let activeCall: (() => void) | undefined;
  const called = new Promise<void>((resolve) => {
    activeCall = resolve;
  });
  let aborted = false;
  const f = fixture(async ({ identity, signal }) => ({
    deviceIdentity: identity,
    authorization: {},
    close() {},
    async fetch(input) {
      if (input === "/remote/mcp/catalog") return Response.json({ tools: [catalogTool] });
      required(activeCall)();
      return new Response(
        new ReadableStream({
          start(controller) {
            signal.addEventListener(
              "abort",
              () => {
                aborted = true;
                controller.error(new Error("cancelled"));
              },
              { once: true },
            );
          },
        }),
      );
    },
  }));
  const worker = await workerFixture(f, "Private worker");
  const approval = await approve(f, worker);
  const token = await accessToken(f);
  const bytes = readFileSync(join(f.directory, "mcp.sqlite"));
  expect(bytes.includes(Buffer.from(approval.grant.token))).toBe(false);
  expect(bytes.includes(Buffer.from("privateJwk"))).toBe(false);
  expect(bytes.includes(Buffer.from(token))).toBe(false);
  expect(statSync(join(f.directory, "secrets/broker.key")).mode & 0o777).toBe(0o600);
  const pending = mcpRequest(f, token, "tools/call", {
    name: "integration_all",
    arguments: { workerId: worker.worker.workerId, arguments: {} },
  });
  await called;
  const deleted = await f.app.request(`${publicUrl}/api/mcp/approvals/${approval.pending.approvalId}`, {
    method: "DELETE",
    headers: sessionHeaders,
  });
  expect(deleted.status).toBe(200);
  const result = await pending;
  expect(result.result.isError).toBe(true);
  expect(aborted).toBe(true);
});

test("hosted account routes mount once and reuse platform HttpOnly sessions without weakening browser CSRF", async () => {
  const { createRemotePlatformApp } = await import("../app");
  const { tokenHash } = await import("./store");
  const f = fixture(async ({ identity }) => ({
    deviceIdentity: identity,
    authorization: {},
    close() {},
    async fetch() {
      return Response.json({ tools: [] });
    },
  }));
  const worker = await workerFixture(f, "Shared hosted worker");
  const cookieToken = "s".repeat(43);
  f.store.saveSession(tokenHash(cookieToken), {
    userId: "alice0000000000",
    csrfToken: "hosted-csrf",
    expiresAt: Date.now() + 3600000,
  });
  const app = createRemotePlatformApp({
    store: f.store,
    publicUrl,
    auth: {
      workshopApiUrl: origin,
      async authenticate() {
        throw new Error("No live login");
      },
    },
    mcp: { secrets: f.secrets },
  });
  const cookie = `__Host-homarr_remote_session=${cookieToken}`;
  const prepared = await app.request(`${publicUrl}/api/mcp/approvals/prepare`, {
    method: "POST",
    headers: { Cookie: cookie, Origin: origin, "X-CSRF-Token": "hosted-csrf", "Content-Type": "application/json" },
    body: JSON.stringify({ workerId: worker.worker.workerId }),
  });
  expect(prepared.status).toBe(201);
  expect(((await prepared.json()) as { mcpUrl: string }).mcpUrl).toBe(`${publicUrl}/mcp`);
  const registration = await app.request(`${publicUrl}/mcp/oauth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ client_name: "MCP desktop", redirect_uris: ["http://127.0.0.1:9000/callback"] }),
  });
  expect(registration.status).toBe(201);
  const untrustedBrowser = await app.request(`${publicUrl}/api/organizations`, {
    method: "POST",
    headers: { Cookie: cookie, "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Forged" }),
  });
  expect(untrustedBrowser.status).toBe(403);
  const session = await app.request(`${publicUrl}/api/session`, { headers: { Cookie: cookie } });
  expect(((await session.json()) as { user: { id: string } }).user.id).toBe("alice0000000000");
});

test("integration discovery returns 101 approved integrations with provenance and rejects invalid or oversized responses", async () => {
  const integrationIds = Array.from({ length: 101 }, (_, index) => `integration-${index}`);
  let response: unknown = { integrations: integrationIds.map((id) => ({ id, name: id, kind: "test" })) };
  const f = fixture(async ({ identity }) => ({
    deviceIdentity: identity,
    authorization: {},
    close() {},
    async fetch(input) {
      const path =
        typeof input === "string" ? input : input instanceof URL ? input.pathname : new URL(input.url).pathname;
      if (path === "/remote/mcp/catalog") return Response.json({ tools: [catalogTool] });
      return Response.json(response);
    },
  }));
  const worker = await workerFixture(f, "Large worker");
  await approve(f, worker, undefined, integrationIds);
  const token = await accessToken(f);
  const discover = async () => {
    const result = await mcpRequest(f, token, "tools/call", { name: "homarr_integrations", arguments: {} });
    return JSON.parse(required((result.result.content as { text: string }[])[0]).text);
  };
  const result = await discover();
  expect(result.unavailableWorkers).toEqual([]);
  expect(result.integrations).toHaveLength(101);
  expect(result.integrations.map((integration: { integrationId: string }) => integration.integrationId)).toEqual(
    integrationIds,
  );
  expect(
    result.integrations.every(
      (integration: { workerId: string; organizationId: unknown }) =>
        integration.workerId === worker.worker.workerId && integration.organizationId === null,
    ),
  ).toBe(true);
  for (const invalid of [
    { integrations: "invalid" },
    { integrations: Array.from({ length: 1001 }, () => ({ id: integrationIds[0] })) },
    { integrations: [{ id: integrationIds[0], name: "x".repeat(4 * 1024 * 1024) }] },
  ]) {
    response = invalid;
    expect(await discover()).toEqual({ integrations: [], unavailableWorkers: [worker.worker.workerId] });
  }
});
