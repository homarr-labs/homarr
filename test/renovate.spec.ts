import fs from "fs/promises";
import { join } from "path";
import json5 from "json5";
import { describe, test } from "vitest";

describe("Renovate configuration tests", () => {
  test("automerge should be disabled for trustedDependencies dependencies", async () => {
    const manifest = await fs.readFile(join(__dirname, "../package.json"), "utf-8").then(JSON.parse);
    const renovateConfig = await fs.readFile(join(__dirname, "../.github/renovate.json5"), "utf-8").then(json5.parse);
    const allowedBuilds: string[] = manifest.trustedDependencies;
    const automergeDisabledDeps = renovateConfig.packageRules
      .filter((rule: any) => rule.automerge === false)
      .flatMap((rule: any) => rule.matchPackageNames || []);

    const missingDeps = allowedBuilds.filter((dep: string) => !automergeDisabledDeps.includes(dep));

    if (missingDeps.length > 0) {
      throw new Error(
        `The following trustedDependencies dependencies are missing automerge disable rules in renovate.json5: ${missingDeps.join(", ")}`,
      );
    }
  });
});
