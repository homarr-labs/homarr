import { command } from "@drizzle-team/brocli";

import { db } from "@homarr/db";

export const integrationsList = command({
  name: "list",
  desc: "List all integrations (id and name)",
  // eslint-disable-next-line no-restricted-syntax
  handler: async () => {
    const all = await db.query.integrations.findMany();
    if (all.length === 0) {
      console.log("No integrations found");
      return;
    }

    console.log("ID\t\t\t\tName");
    for (const i of all) {
      console.log(`${i.id}\t${i.name}`);
    }
  },
});
