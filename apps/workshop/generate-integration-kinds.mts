import { readFile, writeFile } from "node:fs/promises";

import { httpIntegrationKinds } from "../../packages/definitions/src/integration.ts";

const destination = new URL("./pb_hooks/http-integration-kinds.json", import.meta.url);
const content = `${JSON.stringify(httpIntegrationKinds, null, 2)}\n`;

if (process.argv.includes("--check")) {
  if ((await readFile(destination, "utf8")) !== content) {
    throw new Error("Workshop HTTP integration kinds are stale; run bun apps/workshop/generate-integration-kinds.mts");
  }
} else {
  await writeFile(destination, content);
}

console.log(`Workshop HTTP integration kinds: ${httpIntegrationKinds.length}`);
