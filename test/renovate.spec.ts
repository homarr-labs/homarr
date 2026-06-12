import fs from "fs/promises";
import { join } from "path";
import json5 from "json5";
import { parse } from "yaml";
import { describe, test } from "vitest";

describe("Renovate configuration tests", () => {
  test("automerge should be disabled for allowBuilds dependencies", async () => {
    const workspaceYaml = await fs.readFile(join(__dirname, "../pnpm-workspace.yaml"), "utf-8").then(parse);
    const renovateConfig = await fs.readFile(join(__dirname, "../.github/renovate.json5"), "utf-8").then(json5.parse);
    if (!workspaceYaml.allowBuilds || typeof workspaceYaml.allowBuilds !== "object") {
      throw new Error("pnpm-workspace.yaml must define allowBuilds as an object");
    }
    const allowedBuilds = Object.entries(workspaceYaml.allowBuilds)
      .filter(([, allowed]) => allowed === true)
      .map(([name]) => name);
    const automergeDisabledDeps = renovateConfig.packageRules
      .filter((rule: any) => rule.automerge === false)
      .flatMap((rule: any) => rule.matchPackageNames || []);

    const missingDeps = allowedBuilds.filter((dep: string) => !automergeDisabledDeps.includes(dep));

    if (missingDeps.length > 0) {
      throw new Error(
        `The following allowBuilds dependencies are missing automerge disable rules in renovate.json5: ${missingDeps.join(", ")}`,
      );
    }
  });
});
