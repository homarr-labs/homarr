import { command } from "@drizzle-team/brocli";

import { db } from "@homarr/db";

export const usersList = command({
  name: "list",
  desc: "List all users (id, username, email)",
  // eslint-disable-next-line no-restricted-syntax
  handler: async () => {
    const allUsers = await db.query.users.findMany();

    if (allUsers.length === 0) {
      console.log("No users found");
      return;
    }

    console.log("ID\t\t\t\tUsername\tEmail");
    for (const user of allUsers) {
      console.log(`${user.id}\t${user.name ?? ""}\t${user.email ?? ""}`);
    }
  },
});
