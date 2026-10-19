import { randomBytes } from "node:crypto";

import type { VerifiedCredential } from "@homarr/auth/credential-lifecycle";
import {
  CredentialLifecycleError,
  enrollCredentialUserAsync,
  recordCredentialSessionAsync,
  verifyCredentialUserAsync,
} from "@homarr/auth/credential-lifecycle";
import { createId } from "@homarr/common";
import { and, db, eq, gt, inArray, or, sql } from "@homarr/db";
import { groupMembers, groups, invites, sessions } from "@homarr/db/schema";
import { WorkerAccessError } from "@homarr/worker-access";
import type { AccessPrincipal, AuthenticatedEnvelope, LocalAccountCredential } from "@homarr/worker-access";

import { getOwnerSession } from "./api";
import type { WorkerState } from "./state";

const groupId = (state: WorkerState) => `worker-local:${state.workerId}`;
// Keep invitation IDs within the native varchar(64) limit; worker IDs are cryptographic fingerprints.
const invitePrefix = (state: WorkerState) => `local:${state.workerId.slice(0, 24)}:`;
const legacyInvitePrefix = (state: WorkerState) => `local:${state.workerId}:`;
const isLocalInvitation = (state: WorkerState, id: string) =>
  id.startsWith(invitePrefix(state)) || id.startsWith(legacyInvitePrefix(state));
const invalid = () => new WorkerAccessError("UNAUTHORIZED", "Invalid account credentials or invitation");
const limits = new WeakMap<WorkerState, { started: number; attempts: number; active: number }>();
// Worker-wide: new device keys and invented usernames cannot bypass this limit.
function beginAuthentication(state: WorkerState) {
  let limit = limits.get(state);
  if (!limit) {
    limit = { started: Date.now(), attempts: 0, active: 0 };
    limits.set(state, limit);
  }
  if (Date.now() - limit.started > 60_000) {
    limit.started = Date.now();
    limit.attempts = 0;
  }
  if (limit.attempts >= 30 || limit.active >= 2)
    throw new WorkerAccessError("RATE_LIMITED", "Account sign-in temporarily limited. Try again shortly.");
  limit.attempts += 1;
  limit.active += 1;
  return () => {
    limit.active -= 1;
  };
}
function accountFields(input: { username: unknown; password: unknown }) {
  if (typeof input.username !== "string" || typeof input.password !== "string") throw invalid();
  const username = input.username.trim().toLowerCase();
  if (
    username.length < 3 ||
    username.length > 255 ||
    input.password.length < 8 ||
    Buffer.byteLength(input.password) > 72
  )
    throw new WorkerAccessError("INVALID_INPUT", "Use a username of 3–255 characters and a password of 8–72 bytes.");
  return { username, password: input.password };
}
async function requireOrganization(state: WorkerState) {
  const organization = await db.query.groups.findFirst({ where: eq(groups.id, groupId(state)) });
  if (!organization) throw new WorkerAccessError("NOT_FOUND", "Create a local organization first");
  return organization;
}
export async function authenticateLocalAccount(state: WorkerState, input: LocalAccountCredential) {
  if (!state.access.claimed) throw invalid();
  const finish = beginAuthentication(state);
  try {
    const fields = accountFields(input);
    const organization = await requireOrganization(state);
    if (input.kind === "local-register") {
      if (
        typeof input.inviteId !== "string" ||
        !isLocalInvitation(state, input.inviteId) ||
        typeof input.token !== "string" ||
        input.token.length > 128
      )
        throw invalid();
      return await enrollCredentialUserAsync(db, {
        ...fields,
        invitation: { id: input.inviteId, token: input.token },
        memberships: { groupIds: [organization.id], includeEveryone: true },
      });
    }
    const credential = await verifyCredentialUserAsync(db, fields);
    const member = await db.query.groupMembers.findFirst({
      where: and(eq(groupMembers.groupId, organization.id), eq(groupMembers.userId, credential.userId)),
    });
    if (!member) throw invalid();
    return credential;
  } catch (error) {
    if (error instanceof CredentialLifecycleError) {
      if (error.code === "USERNAME_TAKEN") throw new WorkerAccessError("INVALID_INPUT", "Username is already in use");
      throw invalid();
    }
    throw error;
  } finally {
    finish();
  }
}
export async function recordLocalSession({ grant }: AuthenticatedEnvelope, credential: VerifiedCredential) {
  if (!grant.userId || !grant.expiresAt || grant.userId !== credential.userId) throw invalid();
  try {
    await recordCredentialSessionAsync(db, credential, { sessionToken: grant.id, expires: new Date(grant.expiresAt) });
  } catch (error) {
    if (error instanceof CredentialLifecycleError) throw invalid();
    throw error;
  }
}
export async function localAccountsRequest(
  state: WorkerState,
  principal: AccessPrincipal,
  request: Request,
  body: Record<string, unknown>,
) {
  state.access.requireOwner(principal);
  const path = new URL(request.url).pathname.slice("/remote/local-accounts".length);
  if (!path && request.method === "POST") {
    if (typeof body.name !== "string" || !body.name.trim() || body.name.length > 64)
      throw new WorkerAccessError("INVALID_INPUT", "Enter an organization name of 1–64 characters");
    const owner = await getOwnerSession(state);
    const existing = await db.query.groups.findFirst({
      where: eq(groups.name, body.name.trim()),
      columns: { id: true },
    });
    if (existing && existing.id !== groupId(state))
      throw new WorkerAccessError("INVALID_INPUT", "An existing group already uses this organization name");
    state.access.requireOwner(principal);
    await db
      .insert(groups)
      .values({ id: groupId(state), name: body.name.trim(), ownerId: owner.user.id, position: 0 })
      .onConflictDoNothing();
    await requireOrganization(state);
    return Response.json({ created: true });
  }
  if (!path && request.method === "GET") {
    const organization = await db.query.groups.findFirst({
      where: eq(groups.id, groupId(state)),
      columns: { id: true, name: true },
    });
    if (!organization) return Response.json({ organization: null, members: [], invitations: [] });
    const [members, invitations] = await Promise.all([
      db.query.groupMembers.findMany({
        where: eq(groupMembers.groupId, organization.id),
        with: { user: { columns: { id: true, name: true, provider: true } } },
      }),
      db.query.invites.findMany({
        where: or(
          sql`substr(${invites.id}, 1, ${invitePrefix(state).length}) = ${invitePrefix(state)}`,
          sql`substr(${invites.id}, 1, ${legacyInvitePrefix(state).length}) = ${legacyInvitePrefix(state)}`,
        ),
        columns: { id: true, expirationDate: true },
      }),
    ]);
    const grants = state.access
      .listGrants(principal)
      .filter((grant) => grant.localAccount && !grant.revoked && (!grant.expiresAt || grant.expiresAt > Date.now()));
    const activeSessions = new Set<string>();
    if (grants.length) {
      const current = await db.query.sessions.findMany({
        where: and(
          inArray(
            sessions.sessionToken,
            grants.map((grant) => grant.id),
          ),
          gt(sessions.expires, new Date()),
        ),
        columns: { sessionToken: true },
      });
      for (const session of current) activeSessions.add(session.sessionToken);
    }
    return Response.json({
      organization,
      members: members.map(({ user }) => ({
        ...user,
        sessions: grants.filter((grant) => grant.userId === user.id && activeSessions.has(grant.id)).length,
      })),
      invitations,
    });
  }
  const organization = await requireOrganization(state);
  if (path === "/members" && request.method === "POST") {
    const fields = accountFields(body as { username: unknown; password: unknown });
    const owner = await getOwnerSession(state);
    const invitation = {
      id: `${invitePrefix(state)}${createId()}`,
      token: randomBytes(32).toString("base64url"),
      expirationDate: new Date(Date.now() + 60_000),
      creatorId: owner.user.id,
    };
    state.access.requireOwner(principal);
    await db.insert(invites).values(invitation);
    try {
      const { userId: id } = await authenticateLocalAccount(state, {
        kind: "local-register",
        inviteId: invitation.id,
        token: invitation.token,
        ...fields,
      });
      return Response.json({ id }, { status: 201 });
    } finally {
      await db.delete(invites).where(eq(invites.id, invitation.id));
    }
  }
  if (path === "/invitations" && request.method === "POST") {
    const owner = await getOwnerSession(state);
    const invitation = {
      id: `${invitePrefix(state)}${createId()}`,
      token: randomBytes(32).toString("base64url"),
      expirationDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
      creatorId: owner.user.id,
    };
    state.access.requireOwner(principal);
    await db.insert(invites).values(invitation);
    return Response.json({ invitation }, { status: 201 });
  }
  const [, resource, encodedId] = path.split("/");
  const id = decodeURIComponent(encodedId ?? "");
  if (resource === "invitations" && request.method === "DELETE" && isLocalInvitation(state, id)) {
    await db.delete(invites).where(eq(invites.id, id));
    return Response.json({ revoked: true });
  }
  if ((resource === "members" || resource === "sessions") && id) {
    const member = await db.query.groupMembers.findFirst({
      where: and(eq(groupMembers.groupId, organization.id), eq(groupMembers.userId, id)),
    });
    if (!member) throw new WorkerAccessError("NOT_FOUND", "Member not found");
    if (
      (resource === "members" && request.method === "DELETE") ||
      (resource === "sessions" && request.method === "POST")
    ) {
      const sessionIds = state.access
        .listGrants(principal)
        .filter((grant) => grant.localAccount && grant.userId === id)
        .map((grant) => grant.id);
      state.access.revokeUserSessions(principal, id);
      if (sessionIds.length)
        await db.delete(sessions).where(and(eq(sessions.userId, id), inArray(sessions.sessionToken, sessionIds)));
      if (resource === "members")
        await db
          .delete(groupMembers)
          .where(and(eq(groupMembers.groupId, organization.id), eq(groupMembers.userId, id)));
      return Response.json({ revoked: true });
    }
  }
  return Response.json({ error: "Not found" }, { status: 404 });
}
