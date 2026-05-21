import { parseArgs } from "node:util";

import { getCliDb } from "../cli-db";
import { printTable } from "../utils";

export async function usersListHandler(args: string[] = []): Promise<number> {
  const { values } = parseArgs({
    args,
    options: {
      json: { type: "boolean", default: false },
    },
    strict: false,
  });

  const db = getCliDb();
  const allUsers = await db.query.users.findMany();

  if (values.json) {
    const output = allUsers.map((u) => ({ id: u.id, name: u.name, email: u.email, provider: u.provider }));
    console.log(JSON.stringify(output, null, 2));
    return 0;
  }

  if (allUsers.length === 0) {
    console.log("No users found");
    return 0;
  }

  printTable(
    ["ID", "Username", "Email", "Provider"],
    allUsers.map((u) => [u.id, u.name ?? "", u.email ?? "", u.provider]),
  );
  console.log(`\n${allUsers.length} user(s) total`);
  return 0;
}
