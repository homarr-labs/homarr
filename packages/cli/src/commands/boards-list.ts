import { command } from "@drizzle-team/brocli";

import { db } from "@homarr/db";

export const boardsList = command({
  name: "list",
  desc: "List all boards (id, name, public)",
  // eslint-disable-next-line no-restricted-syntax
  handler: async () => {
    const all = await db.query.boards.findMany();
    if (all.length === 0) {
      console.log("No boards found");
      return;
    }

    console.log("ID\t\t\t\tName\t\tPublic");
    for (const board of all) {
      console.log(`${board.id}\t${board.name}\t\t${board.isPublic ? "yes" : "no"}`);
    }
  },
});
