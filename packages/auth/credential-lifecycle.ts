import { createId } from "@homarr/common";
import type { Database } from "@homarr/db";
import { and, eq, gt, handleTransactionsAsync, sql } from "@homarr/db";
import { groupMembers, groups, invites, sessions, users } from "@homarr/db/schema";
import { everyoneGroup } from "@homarr/definitions";

import { comparePasswordsAsync, hashPasswordAsync } from "./security";

export class CredentialLifecycleError extends Error {
  constructor(readonly code: "INVALID_INVITATION" | "USERNAME_TAKEN" | "INVALID_CREDENTIALS" | "STALE_PASSWORD") {
    super(code);
    this.name = "CredentialLifecycleError";
  }
}

// A verified credential is an in-process capability. Its password version never leaves this module.
declare const verifiedCredential: unique symbol;
export interface VerifiedCredential {
  readonly userId: string;
  readonly [verifiedCredential]: true;
}
const passwordVersions = new WeakMap<VerifiedCredential, { database: Database; passwordHash: string }>();
function verified(database: Database, userId: string, passwordHash: string): VerifiedCredential {
  const credential = Object.freeze({ userId }) as VerifiedCredential;
  passwordVersions.set(credential, { database, passwordHash });
  return credential;
}

interface Enrollment {
  username: string;
  password: string;
  invitation: { id: string; token: string };
  memberships?: { groupIds: readonly string[]; includeEveryone: boolean };
}

/** Callers own eligibility, normalization, invitation scope and public error mapping. */
export async function enrollCredentialUserAsync(database: Database, input: Enrollment): Promise<VerifiedCredential> {
  const invitationWhere = () =>
    and(
      eq(invites.id, input.invitation.id),
      eq(invites.token, input.invitation.token),
      gt(invites.expirationDate, new Date()),
    );
  const usernameWhere = and(eq(users.name, input.username), eq(users.provider, "credentials"));
  if (!(await database.query.invites.findFirst({ where: invitationWhere(), columns: { id: true } })))
    throw new CredentialLifecycleError("INVALID_INVITATION");
  if (await database.query.users.findFirst({ where: usernameWhere, columns: { id: true } }))
    throw new CredentialLifecycleError("USERNAME_TAKEN");
  const user = {
    id: createId(),
    name: input.username,
    password: await hashPasswordAsync(input.password),
    provider: "credentials" as const,
  };
  const requiredGroupIds = [...new Set(input.memberships?.groupIds)];
  await handleTransactionsAsync(database, {
    async handleAsync(db, schema) {
      await db.transaction(async (transaction) => {
        // Serialize credential enrollment for this name, including callers using different invitations.
        await transaction.execute(sql`select pg_advisory_xact_lock(hashtext(${input.username}))`);
        const taken = await transaction.query.users.findFirst({
          where: and(eq(schema.users.name, input.username), eq(schema.users.provider, "credentials")),
          columns: { id: true },
        });
        if (taken) throw new CredentialLifecycleError("USERNAME_TAKEN");
        const consumed = await transaction.delete(schema.invites).where(invitationWhere());
        if (consumed.rowCount !== 1) throw new CredentialLifecycleError("INVALID_INVITATION");
        await transaction.insert(schema.users).values(user);
        const membershipIds = new Set(requiredGroupIds);
        if (input.memberships?.includeEveryone) {
          const everyone = await transaction.query.groups.findFirst({
            where: eq(schema.groups.name, everyoneGroup),
            columns: { id: true },
          });
          if (everyone) membershipIds.add(everyone.id);
        }
        for (const groupId of membershipIds)
          await transaction.insert(schema.groupMembers).values({ groupId, userId: user.id });
      });
    },
    handleSync(db) {
      db.transaction((transaction) => {
        if (transaction.delete(invites).where(invitationWhere()).run().changes !== 1)
          throw new CredentialLifecycleError("INVALID_INVITATION");
        if (transaction.select({ id: users.id }).from(users).where(usernameWhere).get())
          throw new CredentialLifecycleError("USERNAME_TAKEN");
        transaction.insert(users).values(user).run();
        const membershipIds = new Set(requiredGroupIds);
        if (input.memberships?.includeEveryone) {
          const everyone = transaction
            .select({ id: groups.id })
            .from(groups)
            .where(eq(groups.name, everyoneGroup))
            .get();
          if (everyone) membershipIds.add(everyone.id);
        }
        for (const groupId of membershipIds)
          transaction.insert(groupMembers).values({ groupId, userId: user.id }).run();
      });
    },
  });
  return verified(database, user.id, user.password);
}

export async function verifyCredentialUserAsync(
  database: Database,
  input: { username: string; password: string },
): Promise<VerifiedCredential> {
  const user = await database.query.users.findFirst({
    where: and(eq(users.name, input.username), eq(users.provider, "credentials")),
    columns: { id: true, password: true },
  });
  const passwordHash = user?.password ?? "$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy";
  const matches = await comparePasswordsAsync(input.password, passwordHash);
  if (!user || !user.password || !matches) throw new CredentialLifecycleError("INVALID_CREDENTIALS");
  return verified(database, user.id, user.password);
}

/** Insert only while the verified password version remains current, serialized with password reset. */
export async function recordCredentialSessionAsync(
  database: Database,
  credential: VerifiedCredential,
  input: { sessionToken: string; expires: Date },
): Promise<void> {
  const version = passwordVersions.get(credential);
  if (!version || version.database !== database) throw new CredentialLifecycleError("STALE_PASSWORD");
  const session = { ...input, userId: credential.userId };
  await handleTransactionsAsync(database, {
    async handleAsync(db, schema) {
      await db.transaction(async (transaction) => {
        const [user] = await transaction
          .select({ password: schema.users.password })
          .from(schema.users)
          .where(eq(schema.users.id, session.userId))
          .for("update");
        if (user?.password !== version.passwordHash) throw new CredentialLifecycleError("STALE_PASSWORD");
        await transaction.insert(schema.sessions).values(session);
      });
    },
    handleSync(db) {
      db.transaction((transaction) => {
        const user = transaction
          .select({ password: users.password })
          .from(users)
          .where(eq(users.id, session.userId))
          .get();
        if (user?.password !== version.passwordHash) throw new CredentialLifecycleError("STALE_PASSWORD");
        transaction.insert(sessions).values(session).run();
      });
    },
  });
}
