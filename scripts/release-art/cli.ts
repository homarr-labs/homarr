import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { detect } from "./detect";
import { parseItems } from "./items";
import { render } from "./render";

const USAGE = `usage:
  cli.ts detect --from <ref> --to <ref>
  cli.ts render --version <x.y.z> --items <path.json> [--out-dir <dir>]`;

const VERSION_PATTERN = /^v?\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/;
const RELEASES_DIR = join(import.meta.dirname, "../../docs/img/releases");

const required = (value: string | undefined, flag: string) => {
  if (!value) throw new Error(`missing --${flag}\n${USAGE}`);
  return value;
};

const runDetect = (args: string[]) => {
  const { values } = parseArgs({ args, options: { from: { type: "string" }, to: { type: "string" } } });
  const items = detect(required(values.from, "from"), required(values.to, "to"));
  console.log(JSON.stringify({ items }));
};

const runRender = async (args: string[]) => {
  const { values } = parseArgs({
    args,
    options: { version: { type: "string" }, items: { type: "string" }, "out-dir": { type: "string" } },
  });
  const version = required(values.version, "version");
  if (!VERSION_PATTERN.test(version)) throw new Error(`invalid --version: ${version}`);
  const items = parseItems(JSON.parse(readFileSync(resolve(required(values.items, "items")), "utf8")) as unknown);
  const outDir = resolve(values["out-dir"] ?? join(RELEASES_DIR, version.replace(/^v/, "")));
  console.log(JSON.stringify(await render({ version, items, outDir })));
};

const main = async () => {
  const [command, ...args] = process.argv.slice(2);
  if (command === "detect") return runDetect(args);
  if (command === "render") return runRender(args);
  throw new Error(`unknown command: ${command ?? "(none)"}\n${USAGE}`);
};

main().catch((error: unknown) => {
  let message = String(error);
  if (error instanceof Error) message = error.message;
  console.error(`release-art: ${message}`);
  process.exit(1);
});
