import { command } from "@drizzle-team/brocli";

import { db } from "@homarr/db";

export const apiKeysList = command({
  name: "list",
  desc: "List all API keys (id and owner, the key itself is not stored in plain text)",
  handler: async () => {
    const allApiKeys = await db.query.apiKeys.findMany({
      columns: { id: true, apiKey: false },
      with: { user: { columns: { id: true, name: true } } },
    });

    if (allApiKeys.length === 0) {
      console.log("No API keys found");
      return;
    }

    console.log("ID\t\tUser");
    for (const apiKey of allApiKeys) {
      console.log(`${apiKey.id}\t${apiKey.user?.name ?? apiKey.user?.id ?? ""}`);
    }
  },
});
