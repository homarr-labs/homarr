import { command, string } from "@drizzle-team/brocli";

import { db, eq } from "@homarr/db";
import { users } from "@homarr/db/schema";

export const usersDelete = command({
  name: "delete",
  desc: "Delete a user by id or username",
  options: {
    id: string("id").alias("i").desc("ID of the user"),
    username: string("username").alias("u").desc("Name of the user"),
  },
  // eslint-disable-next-line no-restricted-syntax
  handler: async (options) => {
    if (!options.id && !options.username) {
      console.error("Either --id or --username must be provided");
      return;
    }

    let user;
    if (options.id) {
      user = await db.query.users.findFirst({
        where: eq(users.id, options.id),
      });
    } else if (options.username) {
      user = await db.query.users.findFirst({
        where: eq(users.name, options.username),
      });
    }

    if (!user) {
      console.error("User not found");
      return;
    }

    await db.delete(users).where(eq(users.id, user.id));
    console.log(`User ${user.name ?? user.id} (${user.id}) deleted`);
  },
});
