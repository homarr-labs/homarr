import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "@playwright/test";
import type { Browser } from "@playwright/test";
import type { SanityRunExpectation } from "../../packages/boards/src/sanity-report.ts";
import { fixtureHash, fixtureId } from "./fixtures.mts";

/** Read trusted inputs, never identities from a report being accepted. */
export function createSanityRunExpectation(browser: Pick<Browser, "version">): SanityRunExpectation {
  if (process.platform !== "linux") throw new Error("Sanity evidence requires Chromium on Linux");
  return {
    fixture: { id: fixtureId, sha256: fixtureHash },
    browser: { name: "chromium", version: browser.version(), platform: "linux" },
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const index = process.argv.indexOf("--output");
  const output = process.argv[index + 1];
  if (index < 0 || !output) throw new Error("Usage: expected-run.mts --output FILE");
  const browser = await chromium.launch();
  try {
    const expectedRun = createSanityRunExpectation(browser);
    await mkdir(path.dirname(path.resolve(output)), { recursive: true });
    await writeFile(output, `${JSON.stringify(expectedRun, null, 2)}\n`);
  } finally {
    await browser.close();
  }
}
