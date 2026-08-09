import { command, string } from "@drizzle-team/brocli";

import { db, eq } from "@homarr/db";
import { apiKeys } from "@homarr/db/schema";

export const apiKeysDelete = command({
  name: "delete",
  desc: "Delete an API key by id",
  options: {
    id: string("id").required().alias("i").desc("ID of the API key, the part in front of the dot"),
  },
  // eslint-disable-next-line no-restricted-syntax
  handler: async (options) => {
    const apiKey = await db.query.apiKeys.findFirst({
      columns: { id: true, apiKey: false },
      where: eq(apiKeys.id, options.id),
    });

    if (!apiKey) {
      console.error("API key not found");
      return;
    }

    await db.delete(apiKeys).where(eq(apiKeys.id, apiKey.id));
    console.log(`API key ${apiKey.id} deleted`);
  },
});
