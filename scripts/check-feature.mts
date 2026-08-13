import { resolve } from "node:path";

import {
  createFeatureCheckPlan,
  executeFeatureCheckPlan,
  formatFeatureCheckPlan,
} from "./feature-platform/check-feature.mts";

const args = process.argv.slice(2);
const planOnly = args.includes("--plan") || args.includes("--dry-run");
const kind = args.find((arg) => !arg.startsWith("--"));

if (!kind) {
  console.error("Usage: pnpm check:feature <integration-or-widget-kind> [--plan]");
  process.exitCode = 1;
} else {
  try {
    const plan = createFeatureCheckPlan(resolve(import.meta.dirname, ".."), kind);
    console.log(formatFeatureCheckPlan(plan));
    if (!planOnly) process.exitCode = executeFeatureCheckPlan(plan);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
