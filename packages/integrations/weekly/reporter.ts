import type { Reporter, TestModule } from "vitest/node";

import { selectedProfile } from "./profiles";
import { sanitizeProvenance, writeReport } from "./report";

export default class WeeklyReporter implements Reporter {
  async onTestRunEnd(modules: ReadonlyArray<TestModule>, errors: ReadonlyArray<unknown>, reason: string) {
    const profile = selectedProfile();
    const cases = modules.flatMap((module) => [...module.children.allTests()]);
    const matching = cases.filter((entry) => entry.name === profile.id);
    const provenance = sanitizeProvenance(matching[0]?.meta().provenance);
    let status: "pass" | "fail" = "fail";
    if (
      reason === "passed" &&
      errors.length === 0 &&
      cases.length === 1 &&
      matching[0]?.result().state === "passed" &&
      provenance
    )
      status = "pass";
    await writeReport([{ id: profile.id, status, provenance }]);
    if (status === "fail") process.exitCode = 1;
    console.log(`Live profile ${profile.id}: ${status}; sanitized checklist written`);
  }
}
