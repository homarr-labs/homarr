import { parseArgs } from "node:util";

import { eq } from "drizzle-orm";

import type { CliDatabase } from "../cli-db";
import { getCliDb } from "../cli-db";
import { CliError } from "../errors";
import { users } from "@homarr/db/schema";

const userLookup: Record<"id" | "username", (db: CliDatabase, value: string) => Promise<{ id: string; name: string | null } | undefined>> = {
  id: (db, value) =>
    db.query.users.findFirst({
      where: eq(users.id, value),
    }),
  username: (db, value) =>
    db.query.users.findFirst({
      where: eq(users.name, value),
    }),
};

export async function usersDeleteHandler(args: string[]): Promise<number> {
  const { values } = parseArgs({
    args,
    options: {
      id: { type: "string", short: "i" },
      username: { type: "string", short: "u" },
    },
  });

  const lookupKey = values.id ? "id" : values.username ? "username" : null;
  const lookupValue = values.id ?? values.username;

  if (!lookupKey || !lookupValue) {
    throw new CliError("Either --id or --username must be provided", 2);
  }

  const db = getCliDb();
  const user = await userLookup[lookupKey](db, lookupValue);

  if (!user) {
    throw new CliError("User not found");
  }

  await db.delete(users).where(eq(users.id, user.id));
  console.log(`User ${user.name ?? user.id} (${user.id}) deleted`);
  return 0;
}
