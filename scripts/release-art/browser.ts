import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { chromium } from "playwright-core";
import type { Browser } from "playwright-core";
import { warn } from "./runtime";

const installChromium = () => {
  const require = createRequire(import.meta.url);
  const cli = join(dirname(require.resolve("playwright-core/package.json")), "cli.js");
  warn("release-art: installing Playwright Chromium");
  execFileSync("node", [cli, "install", "chromium"], { stdio: ["ignore", 2, 2] });
};

export const launchBrowser = async (): Promise<Browser> => {
  try {
    return await chromium.launch({ channel: "chrome" });
  } catch {
    warn("release-art: Chrome channel unavailable, falling back to bundled Chromium");
  }
  try {
    return await chromium.launch();
  } catch {
    installChromium();
  }
  return chromium.launch();
};
