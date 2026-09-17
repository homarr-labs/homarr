import { spawn } from "node:child_process";
import { readFile, writeFile, access } from "node:fs/promises";
import { randomUUID } from "node:crypto";

const origin = process.argv[2] ?? "http://localhost:3001";
const output = process.argv[3] ?? "tools/widget-ui-report/public";
const selectedFamilies = process.argv
  .find((arg) => arg.startsWith("--families="))
  ?.slice("--families=".length)
  .split(",");
function run(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, { stdio: "inherit" });
    child.once("error", reject);
    child.once("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${args[0]} exited with ${code}`));
    });
  });
}
await run(["scripts/widget-ui-audit/assemble-report.mjs", output]);
try {
  await writeFile(
    `${output}/run-info.json`,
    JSON.stringify({ runId: randomUUID(), startedAt: new Date().toISOString() }),
    { flag: "wx" },
  );
} catch (error) {
  if (error.code !== "EEXIST") throw error;
}
const manifest = JSON.parse(await readFile(`${output}/manifest.json`, "utf8"));
const runInfo = JSON.parse(await readFile(`${output}/run-info.json`, "utf8"));
const sessionPrefix = `widget-ui-${runInfo.runId.slice(0, 8)}`;
async function captureFamily(board) {
  if (process.argv.includes("--resume")) {
    try {
      await access(`${output}/manifest-${board.id}.json`);
      console.log(`Keeping completed family: ${board.id}`);
      return;
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }
  await run([
    "tools/widget-ui-audit/capture.mjs",
    "--base-url",
    origin,
    "--board",
    `widget-ui-audit-${board.id}`,
    "--family",
    board.id,
    "--session",
    `${sessionPrefix}-${board.id}`,
    "--out",
    output,
    "--expected-count",
    String(board.widgets.length * manifest.sizes.length),
  ]);
}
// Two independent browser sessions keep the matrix practical without overwhelming the demo server.
const selectedBoards = manifest.boards.filter((board) => !selectedFamilies || selectedFamilies.includes(board.id));
for (let index = 0; index < selectedBoards.length; index += 2) {
  const results = await Promise.allSettled(selectedBoards.slice(index, index + 2).map(captureFamily));
  const failures = results.filter((result) => result.status === "rejected");
  if (failures.length)
    throw new AggregateError(
      failures.map((result) => result.reason),
      "Family capture failed",
    );
}
if (!selectedFamilies || selectedFamilies.includes("assistant-isolated"))
  await run([
    "tools/widget-ui-audit/capture.mjs",
    "--base-url",
    origin,
    "--family",
    "assistant-isolated",
    "--session",
    `${sessionPrefix}-assistant-isolated`,
    "--out",
    output,
    "--expected-count",
    "1",
    ...manifest.sizes.flatMap((size) => ["--board", `widget-ui-audit-assistant-${size}`]),
  ]);
await run(["scripts/widget-ui-audit/assemble-report.mjs", output]);
if (!selectedFamilies) {
  await run(["scripts/widget-ui-audit/verify-report.mjs", `${output}/manifest.json`]);
  const completed = JSON.parse(await readFile(`${output}/manifest.json`, "utf8"));
  if (completed.captureOutcome !== "ready") {
    throw new Error("Capture run contains failures; inspect the manifest and retained diagnostic images");
  }
}
