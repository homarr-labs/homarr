import { command, run, string } from "@drizzle-team/brocli";

import { hashPasswordAsync } from "@homarr/auth/security";
import { and, db, eq } from "@homarr/db";
import { sessions, users } from "@homarr/db/schema/sqlite";

const resetPassword = command({
  name: "reset-password",
  desc: "Reset password for a user",
  options: {
    username: string("username").required().alias("u").desc("Name of the user"),
  },
  // eslint-disable-next-line no-restricted-syntax
  handler: async (options) => {
    if (!process.env.AUTH_PROVIDERS?.toLowerCase().includes("credentials")) {
      console.error("Credentials provider is not enabled");
      process.exit(1);
    }

    const user = await db.query.users.findFirst({
      where: and(eq(users.name, options.username), eq(users.provider, "credentials")),
    });

    if (!user?.salt) {
      console.error(`User ${options.username} not found`);
      process.exit(1);
    }

    const newPassword = crypto.randomUUID();

    await db
      .update(users)
      .set({
        password: await hashPasswordAsync(newPassword, user.salt),
      })
      .where(eq(users.id, user.id));

    await db.delete(sessions).where(eq(sessions.userId, user.id));
    console.log(`All sessions for user ${options.username} have been deleted`);

    console.log("You can now login with the new password");
    console.log(`New password for user ${options.username}: ${newPassword}`);
  },
});

const commands = [resetPassword];

await run(commands, {
  cliName: "homarr-cli",
  version: "1.0.0",
});
