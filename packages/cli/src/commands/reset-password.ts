import { parseArgs } from "node:util";

import { hashPasswordAsync } from "@homarr/auth/security";
import { generateSecureRandomToken } from "../utils";
import { and, eq } from "drizzle-orm";

import { getCliDb } from "../cli-db";
import { CliError, requireCredentialsProvider } from "../errors";
import { sessions, users } from "@homarr/db/schema";

export async function resetPasswordHandler(args: string[]): Promise<number> {
  requireCredentialsProvider();

  const { values } = parseArgs({
    args,
    options: {
      username: { type: "string", short: "u" },
    },
  });

  if (!values.username) {
    throw new CliError("Missing required option: --username / -u", 2);
  }

  const db = getCliDb();
  const user = await db.query.users.findFirst({
    where: and(eq(users.name, values.username), eq(users.provider, "credentials")),
  });

  if (!user?.password) {
    throw new CliError(`User ${values.username} not found`);
  }

  const newPassword = generateSecureRandomToken(24);

  await db
    .update(users)
    .set({
      password: await hashPasswordAsync(newPassword),
    })
    .where(eq(users.id, user.id));

  await db.delete(sessions).where(eq(sessions.userId, user.id));
  console.log(`All sessions for user ${values.username} have been deleted`);
  console.log("You can now login with the new password");
  console.log(`New password for user ${values.username}: ${newPassword}`);
  return 0;
}
