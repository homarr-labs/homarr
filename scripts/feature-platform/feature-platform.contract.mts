import assert from "node:assert/strict";
import { test } from "node:test";
import { resolve } from "node:path";

import { checkFeatureContracts } from "./contracts.mts";
import { formatFeatureChanges, getIntegrationGeneratorChoices, planFeatureGeneration } from "./generate-feature.mts";
// oxlint-disable-next-line import/no-unassigned-import -- Registers shared contract tests in this suite.
import "./check-feature.contract.mts";

const root = resolve(import.meta.dirname, "../..");

test("the checked-in feature contracts are consistent", () => {
  assert.deepEqual(checkFeatureContracts(root), []);
});

test("reads generator choices from the canonical integration definitions", () => {
  const choices = getIntegrationGeneratorChoices(root);

  assert.ok(choices.categories.includes("miscellaneous"));
  assert.ok(choices.secretKinds.includes("apiKey"));
});

test("adds translations to empty JSON registries without a leading comma", async () => {
  const fs = await import("node:fs");
  const os = await import("node:os");
  const path = await import("node:path");
  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), "homarr-feature-generator-"));
  try {
    for (const sourcePath of [
      "packages/definitions/src/integration.ts",
      "packages/definitions/src/widget.ts",
      "packages/definitions/src/widget-integration-map.ts",
      "packages/definitions/src/docs/widget-doc-slugs.ts",
      "packages/widgets/src/manifest.ts",
      "packages/widgets/src/catalog.ts",
      "packages/widgets/src/index.tsx",
    ]) {
      const target = path.join(temporaryRoot, sourcePath);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.copyFileSync(path.join(root, sourcePath), target);
    }
    const translationPath = path.join(temporaryRoot, "packages/translation/src/lang/en.json");
    fs.mkdirSync(path.dirname(translationPath), { recursive: true });
    fs.writeFileSync(translationPath, '{\n  "integration": {},\n  "widget": {}\n}\n');

    const changes = planFeatureGeneration(temporaryRoot, {
      widget: {
        kind: "exampleEmptyRegistry",
        name: "Example empty registry",
        slug: "example-empty-registry",
        description: "Verifies empty translation registry insertion.",
        icon: "IconBox",
        supportedIntegrations: [],
      },
    });
    const translation = changes.find((change) => change.path === "packages/translation/src/lang/en.json");

    assert.ok(translation);
    assert.doesNotThrow(() => JSON.parse(translation.content));
  } finally {
    fs.rmSync(temporaryRoot, { recursive: true, force: true });
  }
});

test("paired generation plans every formatter-clean contract without writing", async () => {
  const description =
    "A deliberately long feature description that verifies generated source stays formatter-clean when contributor input exceeds the configured print width.";
  const changes = await formatFeatureChanges(
    planFeatureGeneration(root, {
      integration: {
        kind: "exampleService",
        name: 'Example "Home" Service',
        slug: "example-service",
        description,
        category: "miscellaneous",
        secretKinds: ["apiKey"],
        iconUrl: "https://example.com/icon.svg",
      },
      widget: {
        kind: "exampleStatus",
        name: 'Example "Home" Status',
        slug: "example-status",
        description,
        icon: "IconBox",
        supportedIntegrations: ["exampleService"],
      },
    }),
  );

  assert.equal(changes.length, 20);
  assert.equal(new Set(changes.map((change) => change.path)).size, changes.length);
  assert.ok(changes.some((change) => change.path.endsWith("example-service-integration.spec.ts")));
  assert.ok(changes.some((change) => change.path.endsWith("example-status/definition.spec.ts")));
  assert.ok(changes.some((change) => change.path === "apps/docs/docs/integrations/example-service/index.mdx"));
  assert.ok(changes.some((change) => change.path === "apps/docs/docs/widgets/example-status/index.mdx"));
  const integrationTest = changes.find((change) => change.path.endsWith("example-service-integration.spec.ts"));
  assert.match(integrationTest?.content ?? "", /simulateResponseContractAsync/);
  assert.match(
    integrationTest?.content ?? "",
    /expect\(\n      results\.every\(\(result\) => result\.passed\),\n      results,\n    \)\.toBe\(true\)/,
  );
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
  assert.deepEqual(await formatFeatureChanges(changes), changes);
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

test("generation rejects slugs that cannot form TypeScript identifiers", () => {
  for (const slug of ["2fa-status", "example-2fa"]) {
    assert.throws(
      () =>
        planFeatureGeneration(root, {
          widget: {
            kind: "twoFactorStatus",
            name: "2FA Status",
            slug,
            description: "Must not generate an invalid component name.",
            icon: "IconBox",
            supportedIntegrations: [],
          },
        }),
      /must start with a lowercase letter and use kebab-case/,
    );
  }
});
