import fs from "fs/promises";
import { join } from "path";
import json5 from "json5";
import { describe, test } from "vitest";
import { parse as parseYaml } from "yaml";

describe("Renovate configuration tests", () => {
  test("automerge should be disabled for onlyBuiltDependencies", async () => {
    const pnpmConfig = await fs.readFile(join(__dirname, "../pnpm-workspace.yaml"), "utf-8").then(parseYaml);
    const renovateConfig = await fs.readFile(join(__dirname, "../.github/renovate.json5"), "utf-8").then(json5.parse);
    const dependenciesWithBuilt = Object.entries(pnpmConfig.allowBuilds)
      .filter(([_, value]) => value === true)
      .map(([key, _]) => key);
    const automergeDisabledDeps = renovateConfig.packageRules
      .filter((rule: any) => rule.automerge === false)
      .flatMap((rule: any) => rule.matchPackageNames || []);

    const missingDeps = dependenciesWithBuilt.filter((dep: string) => !automergeDisabledDeps.includes(dep));

    if (missingDeps.length > 0) {
      throw new Error(
        `The following onlyBuiltDependencies are missing automerge disable rules in renovate.json5: ${missingDeps.join(", ")}`,
      );
    }
  });
});
