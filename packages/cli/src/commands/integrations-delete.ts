import { parseArgs } from "node:util";

import { eq } from "drizzle-orm";

import type { CliDatabase } from "../cli-db";
import { getCliDb } from "../cli-db";
import { CliError } from "../errors";
import { integrations } from "@homarr/db/schema";

const integrationLookup: Record<
  "id" | "name",
  (db: CliDatabase, value: string) => Promise<{ id: string; name: string } | undefined>
> = {
  id: (db, value) =>
    db.query.integrations.findFirst({
      where: eq(integrations.id, value),
    }),
  name: (db, value) =>
    db.query.integrations.findFirst({
      where: eq(integrations.name, value),
    }),
};

export async function integrationsDeleteHandler(args: string[]): Promise<number> {
  const { values } = parseArgs({
    args,
    options: {
      id: { type: "string", short: "i" },
      name: { type: "string", short: "n" },
    },
  });

  const lookupKey = values.id ? "id" : values.name ? "name" : null;
  const lookupValue = values.id ?? values.name;

  if (!lookupKey || !lookupValue) {
    throw new CliError("Either --id or --name must be provided", 2);
  }

  const db = getCliDb();
  const entry = await integrationLookup[lookupKey](db, lookupValue);

  if (!entry) {
    throw new CliError("Integration not found");
  }

  await db.delete(integrations).where(eq(integrations.id, entry.id));
  console.log(`Integration ${entry.name} (${entry.id}) deleted`);
  return 0;
}
