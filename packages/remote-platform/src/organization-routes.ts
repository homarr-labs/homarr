import { Hono } from "hono";
import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";

import { connectionUrl, hashToken, idField, numberField, onlyFields, randomToken, record, textField } from "./security";
import type { PlatformStore } from "./store";
import type {
  Organization,
  OrganizationInvite,
  OrganizationWorkerConnection,
  OrganizationWorkerPurpose,
  PlatformUser,
  WorkerRole,
} from "./types";

interface OrganizationEnv {
  Variables: { user: PlatformUser | null };
}

function userOf(c: Context<OrganizationEnv>): PlatformUser {
  const user = c.get("user");
  if (!user) throw new HTTPException(401, { message: "Sign in required" });
  return user;
}

function purposeField(value: unknown): OrganizationWorkerPurpose {
  if (value !== "primary" && value !== "integrations")
    throw new HTTPException(400, { message: "Invalid worker purpose" });
  return value;
}

export function organizationRoutes(store: PlatformStore, now: () => number) {
  const app = new Hono<OrganizationEnv>();
  function organizationFor(c: Context<OrganizationEnv>, minimum: WorkerRole = "member"): Organization {
    const organizationId = idField(c.req.param("organizationId"), "organization ID");
    const organization = store.organizations.get(organizationId, userOf(c).id);
    if (!organization) throw new HTTPException(404, { message: "Organization not found" });
    if (minimum === "owner" && organization.role !== "owner")
      throw new HTTPException(403, { message: "Organization owner required" });
    if (minimum === "admin" && organization.role === "member")
      throw new HTTPException(403, { message: "Organization administrator required" });
    return organization;
  }
  function workerFor(c: Context<OrganizationEnv>, minimum: WorkerRole = "member"): OrganizationWorkerConnection {
    const organization = organizationFor(c, minimum);
    const workerId = idField(c.req.param("workerId"), "worker ID");
    const worker = store.organizations.worker(organization.organizationId, workerId, userOf(c).id);
    if (!worker) throw new HTTPException(404, { message: "Worker not found" });
    return worker;
  }

  app.get("/api/organizations", (c) => c.json({ organizations: store.organizations.list(userOf(c).id) }));
  app.post("/api/organizations", async (c) => {
    const body = record(await c.req.json());
    onlyFields(body, ["name"]);
    const organization = store.organizations.create(
      randomToken(),
      textField(body.name, "organization name", 100),
      userOf(c).id,
      now(),
    );
    return c.json({ organization }, 201);
  });
  app.get("/api/organizations/:organizationId", (c) => c.json({ organization: organizationFor(c) }));
  app.patch("/api/organizations/:organizationId", async (c) => {
    const body = record(await c.req.json());
    onlyFields(body, ["name"]);
    const name = textField(body.name, "organization name", 100);
    const organization = organizationFor(c, "admin");
    store.organizations.rename(organization.organizationId, name);
    return c.json({ organization: store.organizations.get(organization.organizationId, userOf(c).id) });
  });
  app.delete("/api/organizations/:organizationId", (c) => {
    const organization = organizationFor(c, "owner");
    store.organizations.delete(organization.organizationId);
    return c.json({ ok: true, workerAccessRevoked: false });
  });
  app.get("/api/organizations/:organizationId/members", (c) =>
    c.json({ members: store.organizations.members(organizationFor(c).organizationId) }),
  );
  app.patch("/api/organizations/:organizationId/members/:userId", async (c) => {
    const body = record(await c.req.json());
    onlyFields(body, ["role"]);
    if (body.role !== "admin" && body.role !== "member")
      throw new HTTPException(400, { message: "Invalid membership role" });
    const organization = organizationFor(c, "owner");
    const targetId = idField(c.req.param("userId"), "user ID");
    const target = store.organizations
      .members(organization.organizationId)
      .find((member) => member.user.id === targetId);
    if (!target) throw new HTTPException(404, { message: "Member not found" });
    if (target.role === "owner") throw new HTTPException(403, { message: "The organization owner cannot be changed" });
    store.organizations.updateMember(organization.organizationId, targetId, body.role, now());
    return c.json({ members: store.organizations.members(organization.organizationId), workerAccessRevoked: false });
  });
  app.delete("/api/organizations/:organizationId/members/:userId", (c) => {
    const organization = organizationFor(c);
    const targetId = idField(c.req.param("userId"), "user ID");
    const target = store.organizations
      .members(organization.organizationId)
      .find((member) => member.user.id === targetId);
    if (!target) throw new HTTPException(404, { message: "Member not found" });
    if (target.role === "owner") throw new HTTPException(403, { message: "The organization owner cannot be removed" });
    if (
      targetId !== userOf(c).id &&
      (organization.role === "member" || (organization.role === "admin" && target.role === "admin"))
    )
      throw new HTTPException(403, { message: "Permission denied" });
    store.organizations.removeMember(organization.organizationId, targetId, now());
    return c.json({ ok: true, workerAccessRevoked: false });
  });
  app.get("/api/organizations/:organizationId/invites", (c) =>
    c.json({ invites: store.organizations.invites(organizationFor(c, "admin").organizationId) }),
  );
  app.post("/api/organizations/:organizationId/invites", async (c) => {
    const body = record(await c.req.json());
    onlyFields(body, ["role", "expiresInSeconds", "maxUses"]);
    if (body.role !== "admin" && body.role !== "member")
      throw new HTTPException(400, { message: "Invalid membership role" });
    const expiresInSeconds = numberField(body.expiresInSeconds ?? 86_400, "invitation lifetime", 60, 30 * 86_400);
    const maxUses = numberField(body.maxUses ?? 1, "maximum uses", 1, 100);
    const code = randomToken();
    const codeHash = await hashToken(code);
    const organization = organizationFor(c, "admin");
    if (body.role === "admin" && organization.role !== "owner")
      throw new HTTPException(403, { message: "Only the owner may invite administrators" });
    const invite: OrganizationInvite = {
      inviteId: randomToken(),
      organizationId: organization.organizationId,
      role: body.role,
      expiresAt: now() + expiresInSeconds * 1000,
      maxUses,
      uses: 0,
      revokedAt: null,
    };
    store.organizations.createInvite(invite, userOf(c).id, codeHash);
    return c.json({ ...invite, code }, 201);
  });
  app.delete("/api/organizations/:organizationId/invites/:inviteId", (c) => {
    const organization = organizationFor(c, "admin");
    const inviteId = idField(c.req.param("inviteId"), "invitation ID");
    const invite = store.organizations
      .invites(organization.organizationId)
      .find((entry) => entry.inviteId === inviteId);
    if (!invite) throw new HTTPException(404, { message: "Invitation not found" });
    if (invite.role === "admin" && organization.role !== "owner")
      throw new HTTPException(403, { message: "Only the owner may revoke administrator invitations" });
    store.organizations.revokeInvite(organization.organizationId, inviteId, now());
    return c.json({ ok: true });
  });
  app.post("/api/organization-invites/redeem", async (c) => {
    const body = record(await c.req.json());
    onlyFields(body, ["code"]);
    const codeHash = await hashToken(idField(body.code, "invitation code"));
    return c.json({ organization: store.organizations.redeemInvite(codeHash, userOf(c).id, now()) });
  });
  app.get("/api/organizations/:organizationId/workers", (c) => {
    const organization = organizationFor(c);
    return c.json({ workers: store.workersForPrincipal(userOf(c).id, organization.organizationId) });
  });
  app.post("/api/organizations/:organizationId/workers", async (c) => {
    const body = record(await c.req.json());
    onlyFields(body, ["workerId", "purpose"]);
    const workerId = idField(body.workerId, "worker ID");
    let purpose: OrganizationWorkerPurpose | undefined;
    if (body.purpose !== undefined) purpose = purposeField(body.purpose);
    const organization = organizationFor(c, "admin");
    const worker = store.worker(workerId, userOf(c).id);
    if (!worker || worker.role !== "owner")
      throw new HTTPException(403, { message: "Signed worker directory ownership required" });
    store.organizations.attachWorker(organization.organizationId, worker, purpose, now());
    return c.json({ worker: store.organizations.worker(organization.organizationId, workerId, userOf(c).id) }, 201);
  });
  app.patch("/api/organizations/:organizationId/workers/:workerId", async (c) => {
    const body = record(await c.req.json());
    onlyFields(body, ["name", "purpose"]);
    const input: Partial<Pick<OrganizationWorkerConnection, "name" | "purpose">> = {};
    if (body.name !== undefined) input.name = textField(body.name, "worker name", 100);
    if (body.purpose !== undefined) input.purpose = purposeField(body.purpose);
    const worker = workerFor(c, "admin");
    store.organizations.updateWorker(worker.organizationId, worker.workerId, input);
    return c.json({ worker: store.organizations.worker(worker.organizationId, worker.workerId, userOf(c).id) });
  });
  app.delete("/api/organizations/:organizationId/workers/:workerId", (c) => {
    const worker = workerFor(c, "admin");
    store.organizations.detachWorker(worker.organizationId, worker.workerId);
    return c.json({ ok: true, workerAccessRevoked: false });
  });
  app.patch("/api/organizations/:organizationId/workers/:workerId/connection", async (c) => {
    const body = record(await c.req.json());
    onlyFields(body, ["mode", "relayUrl", "directUrl"]);
    const worker = workerFor(c);
    const next = { mode: worker.mode, directUrl: worker.directUrl, relayUrl: worker.relayUrl };
    if (body.mode !== undefined) {
      if (body.mode !== "direct" && body.mode !== "relay")
        throw new HTTPException(400, { message: "Invalid connection mode" });
      next.mode = body.mode;
    }
    if (body.directUrl !== undefined) next.directUrl = connectionUrl(body.directUrl, "direct");
    if (body.relayUrl !== undefined) next.relayUrl = connectionUrl(body.relayUrl, "relay");
    if (next.mode === "direct" && !next.directUrl)
      throw new HTTPException(400, { message: "A direct worker URL is required" });
    if (next.mode === "relay" && !next.relayUrl) throw new HTTPException(400, { message: "A relay URL is required" });
    store.organizations.updateConnection(worker.organizationId, worker.workerId, userOf(c).id, next);
    return c.json({ worker: store.organizations.worker(worker.organizationId, worker.workerId, userOf(c).id) });
  });
  return app;
}
