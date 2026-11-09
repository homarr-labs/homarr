import { execFileSync } from "node:child_process";
import { REPO_ROOT } from "./runtime";

export const gitShow = (ref: string, path: string): string | null => {
  try {
    return execFileSync("git", ["show", `${ref}:${path}`], {
      cwd: REPO_ROOT,
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
      stdio: ["ignore", "pipe", "ignore"],
    });
  } catch {
    return null;
  }
};

export const refExists = (ref: string) => {
  try {
    execFileSync("git", ["rev-parse", "--verify", "--quiet", `${ref}^{commit}`], {
      cwd: REPO_ROOT,
      stdio: ["ignore", "ignore", "ignore"],
    });
    return true;
  } catch {
    return false;
  }
};
