import { command, string } from "@drizzle-team/brocli";

import { randomBytes } from "crypto";

import { hashPasswordAsync } from "@homarr/auth";
import { generateSecureRandomToken } from "@homarr/common/server";
import { db, eq } from "@homarr/db";
import { apiKeys, users } from "@homarr/db/schema";

export const apiKeysCreate = command({
  name: "create",
  desc: "Create an API key for a user, this allows automating Homarr without opening the web interface",
  options: {
    id: string("id").alias("i").desc("ID of the user the key belongs to"),
    username: string("username").alias("u").desc("Name of the user the key belongs to"),
  },
  // eslint-disable-next-line no-restricted-syntax
  handler: async (options) => {
    if (!options.id && !options.username) {
      console.error("Either --id or --username must be provided");
      return;
    }

    const user = options.id
      ? await db.query.users.findFirst({ where: eq(users.id, options.id) })
      : await db.query.users.findFirst({ where: eq(users.name, options.username ?? "") });

    if (!user) {
      console.error("User not found");
      return;
    }

    const id = randomBytes(4).toString("hex");
    const token = generateSecureRandomToken(24);

    await db.insert(apiKeys).values({
      id,
      apiKey: await hashPasswordAsync(token),
      userId: user.id,
    });

    console.log("The API key is only shown once, store it in a safe place.");
    console.log(`\tUser: ${user.name ?? user.id}`);
    console.log(`\tApiKey: ${id}.${token}`);
    console.log(""); // Empty line for better readability
  },
});
