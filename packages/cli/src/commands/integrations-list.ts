import { parseArgs } from "node:util";

import { getCliDb } from "../cli-db";
import { printTable } from "../utils";

export async function integrationsListHandler(args: string[] = []): Promise<number> {
  const { values } = parseArgs({
    args,
    options: {
      json: { type: "boolean", default: false },
    },
    strict: false,
  });

  const db = getCliDb();
  const all = await db.query.integrations.findMany();

  if (values.json) {
    const output = all.map((i) => ({ id: i.id, name: i.name, kind: i.kind, url: i.url }));
    console.log(JSON.stringify(output, null, 2));
    return 0;
  }

  if (all.length === 0) {
    console.log("No integrations found");
    return 0;
  }

  printTable(
    ["ID", "Name", "Kind", "URL"],
    all.map((i) => [i.id, i.name, i.kind, i.url]),
  );
  console.log(`\n${all.length} integration(s) total`);
  return 0;
}
