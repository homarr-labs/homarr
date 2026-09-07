import { command, string } from "@drizzle-team/brocli";

import { db, eq } from "@homarr/db";
import { integrations } from "@homarr/db/schema";

export const integrationsDelete = command({
  name: "delete",
  desc: "Delete an integration by id or name",
  options: {
    id: string("id").alias("i").desc("ID of the integration"),
    name: string("name").alias("n").desc("Name of the integration"),
  },
  // eslint-disable-next-line no-restricted-syntax
  handler: async (options) => {
    if (!options.id && !options.name) {
      throw new Error("Either --id or --name must be provided");
    }

    if (options.id && options.name) {
      throw new Error("Use either --id or --name, not both");
    }

    let entry;
    if (options.id) {
      entry = await db.query.integrations.findFirst({
        where: eq(integrations.id, options.id),
      });
    } else if (options.name) {
      entry = await db.query.integrations.findFirst({
        where: eq(integrations.name, options.name),
      });
    }

    if (!entry) {
      throw new Error("Integration not found");
    }

    await db.delete(integrations).where(eq(integrations.id, entry.id));
    console.log(`Integration ${entry.name} (${entry.id}) deleted`);
  },
});
