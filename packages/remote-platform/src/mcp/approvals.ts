import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { exportWorkerIdentity, generateWorkerIdentity, getWorkerId, verifyIdentity } from "@homarr/remote-protocol";
import { onlyFields, record, textField } from "../security";
import type { AuthorizedWorkerConnection } from "../types";
import type { GlobalMcpOptions, ServiceApproval, ServiceGrant } from "./types";
import { McpApprovalActivationError, opaqueToken } from "./store";
import { approvedRelay, createMcpRelayConnector } from "./relay";
import { importWorkerIdentity } from "@homarr/remote-protocol";
import { sameSecret } from "./oauth";

export function approvalMetadata(approval: ServiceApproval) {
  return {
    id: approval.id,
    workerId: approval.workerId,
    organizationId: approval.organizationId,
    principalId: approval.principalId,
    createdAt: approval.createdAt,
    expiresAt: approval.expiresAt,
    active: Boolean(approval.grant),
    current: approval.current === true,
    grantId: approval.grant?.id ?? null,
    service: approval.grant?.service,
  };
}
export function currentWorker(
  options: GlobalMcpOptions,
  userId: string,
  workerId: string,
  organizationId: string | null,
): AuthorizedWorkerConnection {
  const worker = options.store
    .workersForPrincipal(userId, organizationId ?? undefined)
    .find((entry) => entry.workerId === workerId && entry.organizationId === organizationId);
  if (!worker) throw new HTTPException(403, { message: "Current worker membership required" });
  return worker;
}
export async function signedServiceGrant(
  value: unknown,
  worker: AuthorizedWorkerConnection,
  approval: ServiceApproval,
  now: number,
): Promise<ServiceGrant> {
  const provided = record(value);
  const token = textField(provided.token, "service grant", 8192);
  const [body, signature, extra] = token.split(".");
  if (!body || !signature || extra || !(await verifyIdentity(worker.workerSigningKey, body, signature)))
    throw new HTTPException(403, { message: "Invalid worker service signature" });
  let grant: ServiceGrant;
  try {
    grant = JSON.parse(Buffer.from(body, "base64url").toString()) as ServiceGrant;
  } catch {
    throw new HTTPException(400, { message: "Invalid service grant" });
  }
  const service = grant.service;
  if (
    grant.role !== "service" ||
    grant.workerId !== worker.workerId ||
    grant.subject !== approval.deviceId ||
    typeof grant.id !== "string" ||
    !Number.isSafeInteger(grant.expiresAt) ||
    grant.expiresAt <= now ||
    grant.expiresAt > approval.expiresAt ||
    !service ||
    service.purpose !== "mcp" ||
    service.principalId !== approval.principalId ||
    service.audience !== approval.audience ||
    (service.organizationId ?? null) !== approval.organizationId ||
    !Array.isArray(service.integrationIds) ||
    !service.integrationIds.length ||
    !Array.isArray(service.procedurePaths) ||
    !service.procedurePaths.length ||
    !["query", "interact", "full"].includes(service.access)
  )
    throw new HTTPException(403, { message: "Service grant does not match this dedicated approval" });
  return { ...grant, token };
}
export function globalApprovalRoutes(options: GlobalMcpOptions) {
  const app = new Hono();
  const now = options.now ?? Date.now;
  const base = options.publicUrl.replace(/\/$/, "");
  const origin = new URL(base).origin;
  const mcpUrl = `${base}/mcp`;
  async function browser(request: Request, unsafe = false) {
    const session = await options.browserSession(request);
    if (!session || session.expiresAt <= now() || !options.store.user(session.userId))
      throw new HTTPException(401, { message: "Sign in required" });
    if (
      unsafe &&
      (request.headers.get("Origin") !== origin || !sameSecret(request.headers.get("X-CSRF-Token"), session.csrfToken))
    )
      throw new HTTPException(403, { message: "Invalid account request origin or CSRF token" });
    return session;
  }
  function mayApprove(userId: string, workerId: string, organizationId: string | null, validateRelay = true) {
    const worker = currentWorker(options, userId, workerId, organizationId);
    if (organizationId) {
      const organization = options.store.organizations.get(organizationId, userId);
      if (!organization || organization.role === "member")
        throw new HTTPException(403, { message: "Organization administrator required" });
    } else if (options.store.worker(workerId, userId)?.role !== "owner")
      throw new HTTPException(403, { message: "Worker directory owner required" });
    if (validateRelay) approvedRelay(options, worker.relayUrl);
    return worker;
  }
  app.get("/api/mcp/approvals", async (c) => {
    const session = await browser(c.req.raw);
    const approvals = options.secrets
      .approvals(now())
      .filter((approval) => {
        try {
          mayApprove(session.userId, approval.workerId, approval.organizationId, false);
          return approval.organizationId !== null || approval.userId === session.userId;
        } catch {
          return false;
        }
      })
      .map(approvalMetadata);
    return c.json({ approvals, mcpUrl });
  });
  app.post("/api/mcp/approvals/prepare", async (c) => {
    const session = await browser(c.req.raw, true);
    const body = record(await c.req.json());
    onlyFields(body, ["workerId", "organizationId"]);
    const workerId = textField(body.workerId, "worker ID", 128);
    let organizationId: string | null = null;
    if (body.organizationId !== undefined && body.organizationId !== null)
      organizationId = textField(body.organizationId, "organization ID", 128);
    mayApprove(session.userId, workerId, organizationId);
    const identity = await generateWorkerIdentity(true);
    let principalId = `account:${session.userId}`;
    if (organizationId) principalId = `organization:${organizationId}`;
    const approval: ServiceApproval = {
      id: opaqueToken(),
      workerId,
      userId: session.userId,
      organizationId,
      principalId,
      audience: mcpUrl,
      createdAt: now(),
      expiresAt: now() + 7 * 86_400_000,
      devicePublicJwk: identity.publicJwk,
      deviceId: await getWorkerId(identity.publicJwk),
      privateJwk: await exportWorkerIdentity(identity),
    };
    options.secrets.saveApproval(approval, now());
    return c.json(
      {
        approvalId: approval.id,
        devicePublicJwk: approval.devicePublicJwk,
        deviceId: approval.deviceId,
        audience: mcpUrl,
        principalId,
        organizationId,
        expiresAt: approval.expiresAt,
        mcpUrl,
      },
      201,
    );
  });
  app.post("/api/mcp/approvals", async (c) => {
    const session = await browser(c.req.raw, true);
    const body = record(await c.req.json());
    onlyFields(body, ["approvalId", "grant", "capability"]);
    const approval = options.secrets.approval(textField(body.approvalId, "approval ID", 128), now());
    if (!approval || approval.userId !== session.userId || approval.grant || approval.createdAt + 300_000 <= now())
      throw new HTTPException(403, { message: "Pending MCP approval expired or belongs to another account" });
    const worker = mayApprove(session.userId, approval.workerId, approval.organizationId);
    const grant = await signedServiceGrant(body.grant, worker, approval, now());
    const capability = textField(body.capability, "relay admission capability", 128);
    if (!/^[A-Za-z0-9_-]{43}$/.test(capability))
      throw new HTTPException(400, { message: "Invalid relay admission capability" });
    let next: ServiceApproval = { ...approval, grant, capability, expiresAt: grant.expiresAt };
    const connect = options.connect ?? createMcpRelayConnector(options);
    const connection = await connect({
      worker,
      approval: next,
      identity: await importWorkerIdentity(next.privateJwk),
      signal: AbortSignal.any([c.req.raw.signal, AbortSignal.timeout(15_000)]),
    });
    try {
      const response = await connection.fetch("/remote/mcp/catalog", { signal: c.req.raw.signal });
      if (!response.ok) throw new HTTPException(403, { message: "The worker rejected this MCP approval" });
      // Worker verification happens over a new encrypted session before credential activation.
      await response.body?.cancel();
      mayApprove(session.userId, approval.workerId, approval.organizationId);
      try {
        next = options.secrets.saveApproval(next, now());
      } catch (error) {
        if (error instanceof McpApprovalActivationError) throw new HTTPException(403, { message: error.message });
        throw error;
      }
    } finally {
      connection.close();
    }
    return c.json({ approval: approvalMetadata(next), mcpUrl }, 201);
  });
  app.delete("/api/mcp/approvals/:id", async (c) => {
    const session = await browser(c.req.raw, true);
    const approval = options.secrets.approval(c.req.param("id"), now());
    if (!approval) throw new HTTPException(404, { message: "MCP approval not found" });
    mayApprove(session.userId, approval.workerId, approval.organizationId, false);
    if (!approval.organizationId && approval.userId !== session.userId)
      throw new HTTPException(403, { message: "Account does not own this approval" });
    const { restoredApprovalId } = options.secrets.revokeApproval(approval.id, {
      rollback: c.req.query("rollback") === "1",
      retain: c.req.query("retain") === "1",
      now: now(),
    });
    return c.json({ ok: true, workerAccessRevoked: false, restoredApprovalId });
  });
  app.post("/api/mcp/revoke", async (c) => {
    const session = await browser(c.req.raw, true);
    const body = record(await c.req.json());
    onlyFields(body, ["organizationId"]);
    let organizationId: string | undefined;
    if (body.organizationId !== undefined) organizationId = textField(body.organizationId, "organization ID", 128);
    options.secrets.revokeUserTokens(session.userId, organizationId);
    return c.json({ ok: true });
  });
  return app;
}
