import { parseArgs } from "node:util";

import { hashPasswordAsync } from "@homarr/auth/security";
import { eq } from "drizzle-orm";

import type { CliDatabase } from "../cli-db";
import { getCliDb } from "../cli-db";
import { CliError, requireCredentialsProvider } from "../errors";
import { sessions, users } from "@homarr/db/schema";

const userLookup: Record<
  "id" | "username",
  (db: CliDatabase, value: string) => Promise<{ id: string; name: string | null; password: string | null } | undefined>
> = {
  id: (db, value) =>
    db.query.users.findFirst({
      where: eq(users.id, value),
    }),
  username: (db, value) =>
    db.query.users.findFirst({
      where: eq(users.name, value),
    }),
};

export async function usersUpdatePasswordHandler(args: string[]): Promise<number> {
  requireCredentialsProvider();

  const { values } = parseArgs({
    args,
    options: {
      id: { type: "string", short: "i" },
      username: { type: "string", short: "u" },
      password: { type: "string", short: "p" },
    },
  });

  const lookupKey = values.id ? "id" : values.username ? "username" : null;
  const lookupValue = values.id ?? values.username;

  if (!lookupKey || !lookupValue) {
    throw new CliError("Either --id or --username must be provided", 2);
  }

  if (!values.password) {
    throw new CliError("Missing required option: --password / -p", 2);
  }

  const db = getCliDb();
  const user = await userLookup[lookupKey](db, lookupValue);

  if (!user?.password) {
    throw new CliError("User not found or has no credentials record");
  }

  await db
    .update(users)
    .set({
      password: await hashPasswordAsync(values.password),
    })
    .where(eq(users.id, user.id));

  await db.delete(sessions).where(eq(sessions.userId, user.id));
  console.log(`All sessions for user ${user.name ?? user.id} have been deleted`);
  console.log("Password updated successfully");
  return 0;
}
