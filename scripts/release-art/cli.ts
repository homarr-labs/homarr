import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseArgs } from "node:util";
import { detect } from "./detect";
import { parseItems } from "./items";
import { render } from "./render";
import { REPO_ROOT } from "./runtime";

const USAGE = `usage:
  cli.ts detect --from <ref> --to <ref>
  cli.ts render --version <x.y.z> --items <path.json> [--out-dir <dir>]`;

const VERSION_PATTERN = /^v?\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/;

const required = (value: string | undefined, flag: string) => {
  if (!value) throw new Error(`missing --${flag}\n${USAGE}`);
  return value;
};

const runDetect = (args: string[]) => {
  const { values } = parseArgs({ args, options: { from: { type: "string" }, to: { type: "string" } } });
  const items = detect(required(values.from, "from"), required(values.to, "to"));
  process.stdout.write(`${JSON.stringify({ items })}\n`);
};

const runRender = async (args: string[]) => {
  const { values } = parseArgs({
    args,
    options: { version: { type: "string" }, items: { type: "string" }, "out-dir": { type: "string" } },
  });
  const version = required(values.version, "version");
  if (!VERSION_PATTERN.test(version)) throw new Error(`invalid --version: ${version}`);
  const itemsPath = resolve(required(values.items, "items"));
  const items = parseItems(JSON.parse(readFileSync(itemsPath, "utf8")) as unknown);
  const outDir = resolve(values["out-dir"] ?? `${REPO_ROOT}/docs/img/releases/${version.replace(/^v/, "")}`);
  const result = await render({ version, items, outDir });
  process.stdout.write(`${JSON.stringify(result)}\n`);
};

const main = async () => {
  const [command, ...args] = process.argv.slice(2);
  if (command === "detect") return runDetect(args);
  if (command === "render") return runRender(args);
  throw new Error(`unknown command: ${command ?? "(none)"}\n${USAGE}`);
};

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`release-art: ${message}\n`);
  process.exit(1);
});
