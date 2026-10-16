import { randomBytes } from "node:crypto";

import { comparePasswordsAsync, hashPasswordAsync } from "@homarr/auth/security";
import { createId } from "@homarr/common";
import { and, db, eq, gt, handleTransactionsAsync, inArray, sql } from "@homarr/db";
import { groupMembers, groups, invites, sessions, users } from "@homarr/db/schema";
import { everyoneGroup } from "@homarr/definitions";
import { WorkerAccessError } from "@homarr/worker-access";
import type { AccessPrincipal, AuthenticatedEnvelope, LocalAccountCredential } from "@homarr/worker-access";

import { getOwnerSession } from "./api";
import type { WorkerState } from "./state";

const groupId = (state: WorkerState) => `worker-local:${state.workerId}`;
const invitePrefix = (state: WorkerState) => `local:${state.workerId}:`;
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
        !input.inviteId.startsWith(invitePrefix(state)) ||
        typeof input.token !== "string" ||
        input.token.length > 128
      )
        throw invalid();
      const inviteWhere = and(
        eq(invites.id, input.inviteId),
        eq(invites.token, input.token),
        gt(invites.expirationDate, new Date()),
      );
      if (!(await db.query.invites.findFirst({ where: inviteWhere, columns: { id: true } }))) throw invalid();
      const existing = await db.query.users.findFirst({
        where: and(eq(users.name, fields.username), eq(users.provider, "credentials")),
        columns: { id: true },
      });
      if (existing) throw new WorkerAccessError("INVALID_INPUT", "Username is already in use");
      const user = {
        id: createId(),
        name: fields.username,
        password: await hashPasswordAsync(fields.password),
        provider: "credentials" as const,
      };
      // Consume the native invitation and create membership in the same native transaction.
      await handleTransactionsAsync(db, {
        async handleAsync(database, schema) {
          await database.transaction(async (trx) => {
            await trx.execute(sql`select pg_advisory_xact_lock(hashtext(${fields.username}))`);
            const taken = await trx.query.users.findFirst({
              where: and(eq(schema.users.name, fields.username), eq(schema.users.provider, "credentials")),
              columns: { id: true },
            });
            if (taken) throw new WorkerAccessError("INVALID_INPUT", "Username is already in use");
            const consumed = await trx.delete(schema.invites).where(inviteWhere);
            if (consumed.rowCount !== 1) throw invalid();
            await trx.insert(schema.users).values(user);
            await trx.insert(schema.groupMembers).values({ groupId: organization.id, userId: user.id });
            const everyone = await trx.query.groups.findFirst({
              where: eq(schema.groups.name, everyoneGroup),
              columns: { id: true },
            });
            if (everyone && everyone.id !== organization.id)
              await trx.insert(schema.groupMembers).values({ groupId: everyone.id, userId: user.id });
          });
        },
        handleSync(database) {
          database.transaction((trx) => {
            if (trx.delete(invites).where(inviteWhere).run().changes !== 1) throw invalid();
            if (
              trx
                .select({ id: users.id })
                .from(users)
                .where(and(eq(users.name, fields.username), eq(users.provider, "credentials")))
                .get()
            )
              throw new WorkerAccessError("INVALID_INPUT", "Username is already in use");
            trx.insert(users).values(user).run();
            trx.insert(groupMembers).values({ groupId: organization.id, userId: user.id }).run();
            const everyone = trx.select({ id: groups.id }).from(groups).where(eq(groups.name, everyoneGroup)).get();
            if (everyone && everyone.id !== organization.id)
              trx.insert(groupMembers).values({ groupId: everyone.id, userId: user.id }).run();
          });
        },
      });
      return { userId: user.id, passwordHash: user.password };
    }
    const user = await db.query.users.findFirst({
      where: and(eq(users.name, fields.username), eq(users.provider, "credentials")),
    });
    const passwordHash = user?.password ?? "$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy";
    const matches = await comparePasswordsAsync(fields.password, passwordHash);
    if (!user || !matches) throw invalid();
    const member = await db.query.groupMembers.findFirst({
      where: and(eq(groupMembers.groupId, organization.id), eq(groupMembers.userId, user.id)),
    });
    if (!member) throw invalid();
    return { userId: user.id, passwordHash };
  } finally {
    finish();
  }
}
export async function recordLocalSession({ grant }: AuthenticatedEnvelope, passwordHash: string) {
  if (!grant.userId || !grant.expiresAt) throw invalid();
  const session = { sessionToken: grant.id, userId: grant.userId, expires: new Date(grant.expiresAt) };
  // Password resets must not race a verification that was already in progress.
  await handleTransactionsAsync(db, {
    async handleAsync(database, schema) {
      await database.transaction(async (trx) => {
        const [user] = await trx
          .select({ password: schema.users.password })
          .from(schema.users)
          .where(eq(schema.users.id, session.userId))
          .for("update");
        if (user?.password !== passwordHash) throw invalid();
        await trx.insert(schema.sessions).values(session);
      });
    },
    handleSync(database) {
      database.transaction((trx) => {
        const user = trx.select({ password: users.password }).from(users).where(eq(users.id, session.userId)).get();
        if (user?.password !== passwordHash) throw invalid();
        trx.insert(sessions).values(session).run();
      });
    },
  });
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
    if (typeof body.name !== "string" || !body.name.trim() || body.name.length > 100)
      throw new WorkerAccessError("INVALID_INPUT", "Enter an organization name of 1–100 characters");
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
        where: sql`substr(${invites.id}, 1, ${invitePrefix(state).length}) = ${invitePrefix(state)}`,
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
  if (resource === "invitations" && request.method === "DELETE" && id.startsWith(invitePrefix(state))) {
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
