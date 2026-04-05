import { command, string } from "@drizzle-team/brocli";

import { createSaltAsync, hashPasswordAsync } from "@homarr/auth";
import { db, eq } from "@homarr/db";
import { sessions, users } from "@homarr/db/schema";

export const usersUpdatePassword = command({
  name: "update-password",
  desc: "Update the password for a user (credentials provider only)",
  options: {
    id: string("id").alias("i").desc("ID of the user"),
    username: string("username").alias("u").desc("Name of the user"),
    password: string("password").alias("p").required().desc("New password"),
  },
  // eslint-disable-next-line no-restricted-syntax
  handler: async (options) => {
    if (!process.env.AUTH_PROVIDERS?.toLowerCase().includes("credentials")) {
      console.error("Credentials provider is not enabled");
      return;
    }

    if (!options.id && !options.username) {
      console.error("Either --id or --username must be provided");
      return;
    }

    const user = await db.query.users.findFirst({
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      where: options.id ? eq(users.id, options.id) : eq(users.name, options.username!),
    });

    if (!user?.password) {
      console.error("User not found or has no credentials record");
      return;
    }

    const salt = await createSaltAsync();

    await db
      .update(users)
      .set({
        password: await hashPasswordAsync(options.password, salt),
      })
      .where(eq(users.id, user.id));

    // invalidate existing sessions
    await db.delete(sessions).where(eq(sessions.userId, user.id));
    console.log(`All sessions for user ${user.name ?? user.id} have been deleted`);

    console.log("Password updated successfully");
  },
});
