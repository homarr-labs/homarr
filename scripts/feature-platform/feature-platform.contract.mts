import assert from "node:assert/strict";
import { test } from "node:test";
import { resolve } from "node:path";

import { checkFeatureContracts } from "./contracts.mts";
import { planFeatureGeneration } from "./generate-feature.mts";
import "./check-feature.contract.mts";

const root = resolve(import.meta.dirname, "../..");

test("the checked-in feature contracts are consistent", () => {
  assert.deepEqual(checkFeatureContracts(root), []);
});

test("paired generation plans every contract without writing", () => {
  const changes = planFeatureGeneration(root, {
    integration: {
      kind: "exampleService",
      name: "Example Service",
      slug: "example-service",
      description: "Example native integration.",
      category: "miscellaneous",
      secretKinds: ["apiKey"],
      iconUrl: "https://example.com/icon.svg",
    },
    widget: {
      kind: "exampleStatus",
      name: "Example Status",
      slug: "example-status",
      description: "Example native widget.",
      icon: "IconBox",
      supportedIntegrations: ["exampleService"],
    },
  });

  assert.equal(changes.length, 20);
  assert.equal(new Set(changes.map((change) => change.path)).size, changes.length);
  assert.ok(changes.some((change) => change.path.endsWith("example-service-integration.spec.ts")));
  assert.ok(changes.some((change) => change.path.endsWith("example-status/definition.spec.ts")));
  assert.ok(changes.some((change) => change.path === "apps/docs/docs/integrations/example-service/index.mdx"));
  assert.ok(changes.some((change) => change.path === "apps/docs/docs/widgets/example-status/index.mdx"));
  const integrationTest = changes.find((change) => change.path.endsWith("example-service-integration.spec.ts"));
  assert.match(integrationTest?.content ?? "", /simulateResponseContractAsync/);
  const widgetDefinition = changes.find((change) => change.path.endsWith("example-status/index.ts"));
  assert.match(widgetDefinition?.content ?? "", /nativeFeatureCapabilities\.exampleStatus\.integrations/);
  const capabilityDescriptor = changes.find(
    (change) => change.path === "packages/definitions/src/widget-integration-map.ts",
  );
  assert.match(capabilityDescriptor?.content ?? "", /exampleStatus: \{ integrations: \["exampleService"\] \}/);
  const translations = changes.find((change) => change.path === "packages/translation/src/lang/en.json");
  assert.ok(translations);
  const parsed = JSON.parse(translations.content) as { integration: object; widget: object };
  assert.ok("exampleService" in parsed.integration);
  assert.ok("exampleStatus" in parsed.widget);
});

test("generation stops before overwriting an existing feature", () => {
  assert.throws(
    () =>
      planFeatureGeneration(root, {
        integration: {
          kind: "wud",
          name: "Duplicate",
          slug: "wud",
          description: "Must not overwrite WUD.",
          category: "miscellaneous",
          secretKinds: [],
          iconUrl: "https://example.com/icon.svg",
        },
      }),
    /already exists/,
  );
});
