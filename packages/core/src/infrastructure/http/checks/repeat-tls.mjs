import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";

const bun = "/Users/ajnart/.local/share/mise/installs/bun/1.4.2/bin/bun";
const node = "/Users/ajnart/.local/share/mise/installs/node/24.18.0/bin/node";
const loader = fileURLToPath(new URL("node-resolve.mjs", import.meta.url));
const check = fileURLToPath(new URL("../../certificates/checks/trust.check.ts", import.meta.url));
const rows = [];
for (const [runtime, executable, prefix] of [
  ["bun", bun, ["--no-env-file", "run"]],
  ["node", node, ["--experimental-transform-types", "--import", loader]],
]) {
  const version = spawnSync(executable, runtime === "bun" ? ["--no-env-file", "--version"] : ["--version"], {
    env: {},
    encoding: "utf8",
  });
  assert.equal(version.status, 0);
  for (const variant of ["sparse-pki", "standard-pki"]) {
    for (let attempt = 1; attempt <= (variant === "sparse-pki" ? 8 : 4); attempt++) {
      const result = spawnSync(executable, [...prefix, check, variant], { env: {}, encoding: "utf8", timeout: 30000 });
      const text = result.stdout + result.stderr;
      const codes = [
        ...new Set(
          text.match(
            /CERT_SIGNATURE_FAILURE|ERR_TLS_CERT_ALTNAME_INVALID|ERR_MODULE_NOT_FOUND|UNABLE_TO_VERIFY_LEAF_SIGNATURE|CERT_HAS_EXPIRED/g,
          ) ?? [],
        ),
      ];
      const row = {
        runtime,
        version: version.stdout.trim(),
        variant,
        attempt,
        status: result.status,
        signal: result.signal,
        codes,
        output: text,
      };
      rows.push(row);
      console.log(JSON.stringify({ ...row, output: undefined }));
    }
  }
}
await fs.writeFile(new URL("tls-repeat-results.json", import.meta.url), JSON.stringify(rows, null, 2) + "\n");
console.log(`Recorded ${rows.length} bounded isolated TLS runs`);
