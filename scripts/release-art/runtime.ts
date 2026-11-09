import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = join(SCRIPT_DIR, "../..");

export const warn = (message: string) => {
  process.stderr.write(`${message}\n`);
};
