import assert from "node:assert/strict";
import { test } from "node:test";
import { resolve } from "node:path";

import { createFeatureCheckPlan, executeFeatureCheckPlan, formatFeatureCheckPlan } from "./check-feature.mts";

const root = resolve(import.meta.dirname, "../..");

test("plans a focused standalone widget check deterministically", () => {
  const plan = createFeatureCheckPlan(root, "clock");

  assert.deepEqual(plan, createFeatureCheckPlan(root, "clock"));
  assert.deepEqual(plan.types, ["widget"]);
  assert.ok(plan.files.includes("packages/widgets/src/clock/index.ts"));
  assert.ok(plan.files.includes("apps/docs/docs/widgets/clock/index.mdx"));
  assert.ok(plan.files.includes("packages/translation/src/lang/en.json"));
  assert.ok(plan.commands.some((command) => command.args.includes("packages/widgets/src/manifest.spec.ts")));
  assert.match(formatFeatureCheckPlan(plan), /LIVE SERVICE \(optional, not run\)/);
  assert.match(formatFeatureCheckPlan(plan), /VISUAL \(optional, not run\)/);
});

test("combines integration and widget checks for a shared kind", () => {
  const plan = createFeatureCheckPlan(root, "wud");

  assert.deepEqual(plan.types, ["integration", "widget"]);
  assert.ok(plan.files.includes("packages/integrations/src/wud/wud-integration.ts"));
  assert.ok(plan.files.includes("packages/widgets/src/wud/index.ts"));
  assert.ok(plan.files.includes("apps/docs/docs/integrations/whats-up-docker/index.mdx"));
  assert.ok(plan.files.includes("apps/docs/docs/widgets/whats-up-docker/index.mdx"));
  assert.ok(
    plan.commands.some((command) =>
      command.args.includes("packages/integrations/src/wud/test/wud-integration.spec.ts"),
    ),
  );
});

test("rejects unknown kinds before creating a command plan", () => {
  assert.throws(() => createFeatureCheckPlan(root, "notAFeature"), /Unknown feature kind/);
});

test("executes commands in order and stops on the first failure", () => {
  const plan = createFeatureCheckPlan(root, "clock");
  const visited: string[] = [];
  const status = executeFeatureCheckPlan(plan, (command) => {
    visited.push(command.label);
    return visited.length === 3 ? 7 : 0;
  });

  assert.equal(status, 7);
  assert.deepEqual(
    visited,
    plan.commands.slice(0, 3).map((command) => command.label),
  );
});
