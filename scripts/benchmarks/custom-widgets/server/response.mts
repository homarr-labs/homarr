import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { writeFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
const root = process.env.ROOT;
const output = process.env.OUT;
if (!root || !output) throw new Error("ROOT and OUT required");
const require = createRequire(`${root}/package.json`);
const { Headers, Response } = require("undici");
const responseModule = await import(`${root}/packages/custom-widgets/src/server/response.ts`);
const { redactResponseSecrets, assertJsonBudget, decodeResponseBody } = responseModule;
const results = [];
async function measure(name: string, callback: () => unknown, bytes: number, iterations = 200, batch = 5) {
  for (let index = 0; index < 30; index++) await callback();
  const samples = [];
  for (let index = 0; index < iterations; index++) {
    const started = performance.now();
    for (let count = 0; count < batch; count++) await callback();
    samples.push((performance.now() - started) / batch);
  }
  const sorted = [...samples].sort((a, b) => a - b);
  const result = {
    name,
    bytes,
    p50: sorted[Math.floor(sorted.length / 2)],
    p95: sorted[Math.floor(sorted.length * 0.95)],
    samples,
  };
  results.push(result);
  console.log(JSON.stringify({ ...result, samples: undefined }));
}
const rows = Array.from({ length: 4000 }, (_, index) => ({
  id: index,
  label: `Record ${index}`,
  value: index,
  description: "x".repeat(170),
}));
const body = Buffer.from(JSON.stringify(rows));
assert(body.byteLength < 1024 * 1024);
for (const [name, payload, contentType] of [
  ["json", body, "application/json"],
  ["ndjson", Buffer.from(rows.map((row) => JSON.stringify(row)).join("\n")), "application/x-ndjson"],
  ["text", Buffer.from("x".repeat(1_000_000)), "text/plain"],
] as const) {
  const headers = new Headers({ "content-type": contentType });
  const parse = () => {
    if (responseModule.parseBufferedResponseBody)
      return responseModule.parseBufferedResponseBody(payload, headers, true);
    return responseModule.parseResponseBody(new Response(payload, { headers }), true);
  };
  await measure(`buffered-${name}`, parse, payload.byteLength);
}
await measure("json-budget-4000-records", () => assertJsonBudget(rows), body.byteLength);
const secrets = [
  { kind: "username", value: "benchmark" },
  { kind: "password", value: "password-1234567890" },
  { kind: "apiKey", value: "api-key-1234567890" },
  { kind: "authenticationQuery", value: "api_key=api-key-1234567890" },
];
await measure("redact-4000-records-no-match", () => redactResponseSecrets(rows, secrets), body.byteLength, 120, 2);
const echoed = rows.map((row, index) => ({
  ...row,
  description: index % 100 === 0 ? `echo ${secrets[2].value}` : row.description,
}));
await measure(
  "redact-4000-records-sparse-match",
  () => redactResponseSecrets(echoed, secrets),
  body.byteLength,
  120,
  2,
);
assert.throws(() => assertJsonBudget(Array.from({ length: 50_001 }, () => 1)));
assert.throws(() => assertJsonBudget(Array.from({ length: 34 }).reduce((child) => ({ child }), {})));
assert.equal(redactResponseSecrets({ key: `echo ${secrets[2].value}` }, secrets).key, "echo [REDACTED]");
const encoded = gzipSync(Buffer.from("x".repeat(1_100_000)));
assert.throws(() => decodeResponseBody(encoded, "gzip"));
writeFileSync(
  output,
  JSON.stringify(
    { root, results, checks: { nodeLimit: true, depthLimit: true, redaction: true, decompressionLimit: true } },
    null,
    2,
  ),
);
