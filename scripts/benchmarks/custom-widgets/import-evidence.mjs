import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const source = process.env.EVIDENCE_SOURCE;
if (!source) throw new Error("EVIDENCE_SOURCE must point to the original runtime/server/workbench evidence directory");
const destination = resolve(process.env.OUTPUT ?? join(import.meta.dirname, "evidence"));
const inputs = [];
const sources = [];
const digest = (value) => createHash("sha256").update(value).digest("hex");

for (const path of [
  "runtime/RESULTS.md",
  "runtime/run.mjs",
  "runtime/fixture.tsx",
  "server/RESULTS.md",
  "server/router.mts",
  "server/response.mts",
  "server/management.mts",
  "workbench/RESULTS.md",
  "workbench/build-browser.mjs",
  "workbench/browser-entry.tsx",
  "workbench/run-browser.mjs",
  "workbench/serve.mjs",
]) {
  sources.push({ path, originalSha256: digest(await readFile(join(source, path))) });
}

async function preserve(path, select, selection) {
  const original = await readFile(join(source, path));
  const selected = select(original.toString("utf8"));
  const output = join(destination, path);
  await mkdir(join(output, ".."), { recursive: true });
  await writeFile(output, selected);
  inputs.push({ path, originalSha256: digest(original), packagedSha256: digest(selected), selection });
}

for (const label of ["before", "after"]) {
  for (const run of ["1", "2", "counts"]) {
    await preserve(
      `runtime/${label}-${run}.jsonl`,
      (text) =>
        `${text
          .trim()
          .split("\n")
          .filter((line) => JSON.parse(line).name === "board-20-stable-parent")
          .join("\n")}\n`,
      "Only the original board-20-stable-parent JSONL record; samples and counters unchanged",
    );
  }
  for (const run of [2, 3]) {
    await preserve(
      `server/router-${label}-${run}.json`,
      (text) => {
        const { results, checks } = JSON.parse(text);
        return `${JSON.stringify(
          { results: results.filter((entry) => /^(direct|integration)-20-(cold|warm)$/.test(entry.name)), checks },
          null,
          2,
        )}\n`;
      },
      "Original 20-query direct/integration cold/warm result objects and checks; machine-local root removed",
    );
  }
  for (const run of [1, 2]) {
    await preserve(
      `server/response-${label}-${run}.json`,
      (text) => {
        const { results, checks } = JSON.parse(text);
        return `${JSON.stringify({ results: results.filter((entry) => entry.name.startsWith("redact-")), checks }, null, 2)}\n`;
      },
      "Original redaction result objects and checks; machine-local root removed",
    );
    await preserve(
      `server/management-${label}-${run}.json`,
      (text) => {
        const { results } = JSON.parse(text);
        return `${JSON.stringify({ results }, null, 2)}\n`;
      },
      "All original management result objects, samples, counts and public-output digests; machine-local root removed",
    );
    await preserve(
      `workbench/browser-${label}${run}.json`,
      (text) => {
        const { responseInitial, response } = JSON.parse(text);
        return `${JSON.stringify({ responseInitial, response }, null, 2)}\n`;
      },
      "Original responseInitial and response objects from the 200-field browser fixture; samples and counters unchanged",
    );
  }
}
await preserve("runtime/source-hashes.json", (text) => text, "Original historical AFTER runtime source SHA-256 map");
const jsonInputs = inputs.filter((input) => input.path.endsWith(".json"));
execFileSync("bun", ["x", "oxfmt", ...jsonInputs.map((input) => join(destination, input.path))], {
  cwd: resolve(import.meta.dirname, "../../.."),
  stdio: "inherit",
});
for (const input of jsonInputs) {
  input.packagedSha256 = digest(await readFile(join(destination, input.path)));
  input.selection += "; JSON whitespace normalized with the repository formatter";
}
await writeFile(
  join(destination, "provenance.json"),
  `${JSON.stringify(
    {
      baselineCommit: "929a928be6a176d992c9a80ed839321b29100828",
      portCommit: "99d6e2545c6cbe0013be0e7e33945ce617edca4e",
      screenshotDevCommit: "1a3df6ba395223860057f84893d3b196f886da3f",
      after:
        "Historical uncommitted perf/custom-widgets-audit source, including the port and the retained runtime/server/workbench edits; not the screenshot dev revision",
      source:
        "Local synthetic cw-perf-bench/runtime, server and workbench fixture runs described by their original RESULTS.md reports",
      runtime: "Node 24.22.1; development React/jsdom runtime fixture; production React Chromium workbench fixture",
      limitations:
        "No production or Langfuse data. No full-app end-to-end measurement. Full historical AFTER source hashes were captured only for the seven runtime files, not all transitive server/workbench inputs. Reproduction on a later PR head is a fresh measurement, not an exact replay of the historical source snapshot.",
      sources,
      inputs,
    },
    null,
    2,
  )}\n`,
);
console.log(JSON.stringify({ destination, files: inputs.length + 1 }));
