import { eq } from "drizzle-orm";

import { getCliDb } from "../cli-db";
import { requireCredentialsProvider } from "../errors";
import { users } from "@homarr/db/schema";

export async function fixUsernamesHandler(): Promise<number> {
  requireCredentialsProvider();

  const db = getCliDb();
  const credentialUsers = await db.query.users.findMany({
    where: eq(users.provider, "credentials"),
  });

  for (const user of credentialUsers) {
    if (!user.name) {
      continue;
    }
    if (user.name === user.name.toLowerCase()) {
      continue;
    }

    await db
      .update(users)
      .set({
        name: user.name.toLowerCase(),
      })
      .where(eq(users.id, user.id));

    console.log(`Changed username from ${user.name} to ${user.name.toLowerCase()}`);
  }

  console.log("All usernames have been fixed");
  return 0;
}
