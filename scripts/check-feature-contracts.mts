import { resolve } from "node:path";

import { checkFeatureContracts } from "./feature-platform/contracts.mts";

const root = resolve(import.meta.dirname, "..");
const problems = checkFeatureContracts(root);

if (problems.length > 0) {
  console.error("Feature contract check failed:");
  for (const problem of problems) console.error(`\n- ${problem.message}\n  Repair: ${problem.repair}`);
  process.exitCode = 1;
} else {
  console.log("Feature contracts are consistent.");
}
