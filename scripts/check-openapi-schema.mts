import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import type { OpenApiMeta } from "trpc-to-openapi";

import { openApiDocument } from "../packages/api/src/open-api";
import { restRouter } from "../packages/api/src/rest/router";
import { widgetDiscoverySources } from "../packages/api/src/rest/widget-catalog";

const baseUrl = "http://localhost:3000";
const schemaPath = "apps/docs/public/api/open-api-schema.json";
const writeMode = process.argv.slice(2).includes("--write");
const discoveryPath = "packages/api/src/rest/discovery-routes.json";
const discoveryNames = [
  ...new Set(Object.values(widgetDiscoverySources).flatMap((entries) => entries.map(([name]) => name))),
].toSorted();
const discovery = Object.fromEntries(
  discoveryNames.map((name) => {
    const metadata = restRouter["_def"].procedures[name.replaceAll(".", "_")]?.["_def"].meta as OpenApiMeta | undefined;
    const route = metadata?.openapi;
    assert.ok(route, `Missing widget discovery procedure ${name}`);
    return [name, { method: route.method, path: route.path }];
  }),
);
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

function assertLocalReferences(value: unknown): void {
  if (Array.isArray(value)) {
    value.forEach(assertLocalReferences);
    return;
  }
  if (value === null || typeof value !== "object") return;
  for (const [key, entry] of Object.entries(value)) {
    if (key === "$ref" && typeof entry === "string" && entry.startsWith("#/")) {
      let target: unknown = generated;
      for (const token of entry.slice(2).split("/")) {
        assert.ok(target !== null && typeof target === "object", `Unresolved OpenAPI reference ${entry}`);
        target = Reflect.get(target, token.replaceAll("~1", "/").replaceAll("~0", "~"));
      }
      assert.notEqual(target, undefined, `Unresolved OpenAPI reference ${entry}`);
    }
    assertLocalReferences(entry);
  }
}

assertLocalReferences(generated);

if (writeMode) {
  await writeFile(schemaPath, serialized, "utf8");
  await writeFile(discoveryPath, `${JSON.stringify(discovery, null, 2)}\n`, "utf8");
  console.log(`OpenAPI schema updated (${Object.keys(generated.paths).length} paths)`);
}

const checkedIn = JSON.parse(await readFile(schemaPath, "utf8")) as unknown;
assertOpenApiDocument(checkedIn);

try {
  assert.deepStrictEqual(checkedIn, generated);
  assert.deepStrictEqual(JSON.parse(await readFile(discoveryPath, "utf8")), discovery);
} catch {
  console.error(
    "The checked-in OpenAPI schema is stale. Regenerate it from openApiDocument and update apps/docs/public/api/open-api-schema.json.",
  );
  process.exit(1);
}

// The API import graph owns background handles that are irrelevant to this one-shot script.
process.exit(0);
