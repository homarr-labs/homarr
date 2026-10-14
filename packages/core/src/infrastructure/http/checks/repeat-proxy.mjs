import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";

const bun = "/Users/ajnart/.local/share/mise/installs/bun/1.4.2/bin/bun";
const node = "/Users/ajnart/.local/share/mise/installs/node/24.18.0/bin/node";
const loader = fileURLToPath(new URL("node-resolve.mjs", import.meta.url));
const check = fileURLToPath(new URL("proxy.check.ts", import.meta.url));
const managedCandidate = process.argv[2] === "managed-candidate";
const rows = [];
for (const [runtime, executable, prefix] of [
  ["bun-1.4.2", bun, ["--no-env-file", "run"]],
  ["node-24.18.0", node, ["--experimental-transform-types", "--import", loader]],
]) {
  if (managedCandidate && runtime !== "bun-1.4.2") continue;
  for (let attempt = 1; attempt <= 3; attempt++) {
    const result = spawnSync(executable, [...prefix, check, ...(managedCandidate ? ["managed-candidate"] : [])], {
      env: {},
      encoding: "utf8",
      timeout: managedCandidate ? 20000 : 10000,
    });
    assert.equal(result.signal, null);
    const output = JSON.parse(result.stdout);
    const holds = output.results.filter((row) => row.status === "hold").map((row) => row.check);
    const row = {
      runtime,
      attempt,
      status: result.status,
      holds,
      ...(managedCandidate
        ? { sourceEvidence: output.sourceEvidence, fixture: output.fixture, cleanup: output.cleanup }
        : {}),
      results: output.results,
    };
    rows.push(row);
    console.log(JSON.stringify({ ...row, results: undefined }));
  }
}
await fs.writeFile(
  new URL(managedCandidate ? "proxy-managed-repeat-results.json" : "proxy-r3-repeat-results.json", import.meta.url),
  JSON.stringify(rows, null, 2) + "\n",
);
if (managedCandidate) {
  assert.equal(rows.length, 3);
  assert.ok(
    rows.every(
      (row) =>
        row.sourceEvidence &&
        row.fixture?.noFactoryOverrides &&
        row.fixture?.actualManagedRuntime &&
        row.cleanup?.nativeSettledBeforeFixtureCleanup &&
        row.cleanup?.remainingSockets === 0,
    ),
  );
  const held = rows.some((row) => row.status !== 0 || row.holds.length > 0);
  console.log(
    JSON.stringify({
      managedRepetitions: rows.length,
      guardDisposition: held
        ? "HELD: current production guard unchanged"
        : "Candidate evidence eligible for independent review only; current guard unchanged",
    }),
  );
  if (held) process.exitCode = 1;
} else {
  assert.ok(
    rows.every((row) => row.status === 0 && row.holds.length === 0),
    "Native ownership regressions must await physical socket close without fixture intervention",
  );
  console.log("Recorded six passing r3 native ownership checks; Bun public native proxy guard remains held for review");
}
