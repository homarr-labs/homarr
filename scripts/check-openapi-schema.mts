import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { openApiDocument } from "@homarr/api/open-api";

const baseUrl = "http://localhost:3000";
const generated = JSON.parse(JSON.stringify(openApiDocument(baseUrl))) as unknown;
const checkedIn = JSON.parse(await readFile("apps/docs/static/api/open-api-schema.json", "utf8")) as unknown;

try {
  assert.deepStrictEqual(checkedIn, generated);
} catch {
  console.error(
    "The checked-in OpenAPI schema is stale. Regenerate it from openApiDocument and update apps/docs/static/api/open-api-schema.json.",
  );
  process.exitCode = 1;
}
