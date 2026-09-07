import { command, string } from "@drizzle-team/brocli";

import { hashPasswordAsync } from "@homarr/auth";
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
      throw new Error("Credentials provider is not enabled");
    }

    if (!options.id && !options.username) {
      throw new Error("Either --id or --username must be provided");
    }

    if (options.id && options.username) {
      throw new Error("Use either --id or --username, not both");
    }

    const user = await db.query.users.findFirst({
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      where: options.id ? eq(users.id, options.id) : eq(users.name, options.username!),
    });

    if (!user?.password) {
      throw new Error("User not found or has no credentials record");
    }

    await db
      .update(users)
      .set({
        password: await hashPasswordAsync(options.password),
      })
      .where(eq(users.id, user.id));

    // invalidate existing sessions
    await db.delete(sessions).where(eq(sessions.userId, user.id));
    console.log(`All sessions for user ${user.name ?? user.id} have been deleted`);

    console.log("Password updated successfully");
  },
});
