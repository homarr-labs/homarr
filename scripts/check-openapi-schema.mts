import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";

import { openApiDocument } from "../packages/api/src/open-api";

const baseUrl = "http://localhost:3000";
const schemaPath = "apps/docs/public/api/open-api-schema.json";
const writeMode = process.argv.slice(2).includes("--write");
const serialized = `${JSON.stringify(openApiDocument(baseUrl), null, 2)}\n`;
const generated = JSON.parse(serialized) as unknown;

function assertOpenApiDocument(value: unknown): asserts value is { openapi: string; paths: Record<string, unknown> } {
  assert.ok(typeof value === "object" && value !== null && !Array.isArray(value), "OpenAPI document must be an object");
  assert.equal(typeof Reflect.get(value, "openapi"), "string", "OpenAPI document must declare its version");

  const paths = Reflect.get(value, "paths");
  assert.ok(
    typeof paths === "object" && paths !== null && !Array.isArray(paths),
    "OpenAPI document must contain paths",
  );
}

assertOpenApiDocument(generated);

if (writeMode) {
  await writeFile(schemaPath, serialized, "utf8");
  console.log(`OpenAPI schema updated (${Object.keys(generated.paths).length} paths)`);
}

const checkedIn = JSON.parse(await readFile(schemaPath, "utf8")) as unknown;
assertOpenApiDocument(checkedIn);

try {
  assert.deepStrictEqual(checkedIn, generated);
} catch {
  console.error(
    "The checked-in OpenAPI schema is stale. Regenerate it from openApiDocument and update apps/docs/public/api/open-api-schema.json.",
  );
  process.exit(1);
}

// The API import graph owns background handles that are irrelevant to this one-shot script.
process.exit(0);
