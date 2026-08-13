import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { mkdirSync } from "node:fs";
import { format } from "oxfmt";

export interface IntegrationFeature {
  kind: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  secretKinds: string[];
  iconUrl: string;
}

export interface WidgetFeature {
  kind: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  supportedIntegrations: string[];
}

export interface FeatureRequest {
  integration?: IntegrationFeature;
  widget?: WidgetFeature;
}

export interface PlannedChange {
  path: string;
  content: string;
  action: "create" | "update";
}

const pascalCase = (value: string) =>
  value.replace(/(^|-)([a-z])/g, (_, _separator, letter: string) => letter.toUpperCase());
const identifier = (value: string) => value.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase());
const key = (value: string) => (/^[A-Za-z_$][\w$]*$/.test(value) ? value : JSON.stringify(value));
const read = (root: string, path: string) => readFileSync(join(root, path), "utf8");

const containerRange = (source: string, marker: string, opener: "{" | "[") => {
  const declaration = source.indexOf(marker);
  if (declaration < 0) throw new Error(`Generator stopped: expected marker ${marker}`);
  const start = source.indexOf(opener, declaration);
  if (start < 0) throw new Error(`Generator stopped: expected ${opener} after ${marker}`);
  const closer = opener === "{" ? "}" : "]";
  let depth = 0;
  let quote = "";
  let escaped = false;
  for (let index = start; index < source.length; index += 1) {
    const character = source[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === quote) quote = "";
      continue;
    }
    if (character === '"' || character === "'" || character === "`") quote = character;
    else if (character === opener) depth += 1;
    else if (character === closer && --depth === 0) return { start, end: index };
  }
  throw new Error(`Generator stopped: could not find closing ${closer} for ${marker}`);
};

const appendToContainer = (source: string, marker: string, opener: "{" | "[", entry: string) => {
  const { end } = containerRange(source, marker, opener);
  return `${source.slice(0, end)}${entry}${source.slice(end)}`;
};

const insertBeforeUnique = (source: string, anchor: string, entry: string, path: string) => {
  const first = source.indexOf(anchor);
  if (first < 0 || source.indexOf(anchor, first + anchor.length) >= 0) {
    throw new Error(
      `Generator stopped: expected exactly one ${JSON.stringify(anchor)} in ${path}; update the generator anchor.`,
    );
  }
  return `${source.slice(0, first)}${entry}${source.slice(first)}`;
};

const addJsonProperty = (source: string, property: "integration" | "widget", name: string, value: unknown) => {
  const marker = `\n  "${property}":`;
  const { start, end } = containerRange(source, marker, "{");
  const body = source.slice(start + 1, end);
  if (new RegExp(`^    ${JSON.stringify(name)}:`, "m").test(body)) {
    throw new Error(`Generator stopped: translation ${property}.${name} already exists.`);
  }
  const serialized = JSON.stringify(value, null, 2)
    .split("\n")
    .map((line, index) => (index === 0 ? line : `    ${line}`))
    .join("\n");
  const beforeClose = source.slice(0, end);
  const trimmed = beforeClose.trimEnd();
  return `${trimmed},\n    ${JSON.stringify(name)}: ${serialized}\n  ${source.slice(end)}`;
};

const addChange = (
  changes: PlannedChange[],
  root: string,
  path: string,
  content: string,
  action: PlannedChange["action"],
) => {
  if (action === "create" && existsSync(join(root, path)))
    throw new Error(`Generator stopped: ${path} already exists.`);
  changes.push({ path, content, action });
};

const validate = (request: FeatureRequest) => {
  if (!request.integration && !request.widget)
    throw new Error("Generator stopped: choose an integration, a widget, or both.");
  for (const feature of [request.integration, request.widget]) {
    if (!feature) continue;
    if (!/^[a-z][A-Za-z0-9]*$/.test(feature.kind))
      throw new Error(`Generator stopped: ${feature.kind} must be lower camel case.`);
    if (!/^[a-z][a-z0-9]*(?:-[a-z][a-z0-9]*)*$/.test(feature.slug))
      throw new Error(`Generator stopped: ${feature.slug} must start with a lowercase letter and use kebab-case.`);
  }
  if (request.widget && !/^Icon[A-Z][A-Za-z0-9]+$/.test(request.widget.icon)) {
    throw new Error(`Generator stopped: ${request.widget.icon} must be a Tabler icon export such as IconBox.`);
  }
};

const planIntegration = (root: string, feature: IntegrationFeature, changes: PlannedChange[]) => {
  const definitionSource = read(root, "packages/definitions/src/integration.ts");
  const categoryRange = containerRange(definitionSource, "const integrationCategories", "[");
  const categories = new Set(
    [...definitionSource.slice(categoryRange.start, categoryRange.end).matchAll(/"([^"]+)"/g)].map((match) => match[1]),
  );
  if (!categories.has(feature.category)) {
    throw new Error(`Generator stopped: ${feature.category} is not a current integration category.`);
  }
  const secretObject = definitionSource.slice(
    definitionSource.indexOf("const integrationSecretKindObject"),
    definitionSource.indexOf("satisfies Record<string", definitionSource.indexOf("const integrationSecretKindObject")),
  );
  const validSecrets = new Set([...secretObject.matchAll(/^  (\w+):/gm)].map((match) => match[1]));
  const unknownSecrets = feature.secretKinds.filter((kind) => !validSecrets.has(kind));
  if (unknownSecrets.length > 0) {
    throw new Error(`Generator stopped: unknown credential kind(s): ${unknownSecrets.join(", ")}.`);
  }
  const className = `${pascalCase(feature.slug)}Integration`;
  const implementationPath = `packages/integrations/src/${feature.slug}/${feature.slug}-integration.ts`;
  const testPath = `packages/integrations/src/${feature.slug}/test/${feature.slug}-integration.spec.ts`;
  const parserName = `parse${pascalCase(feature.slug)}ResponseAsync`;
  const implementation = `import { z } from "zod/v4";

import type { IntegrationTestingInput } from "../base/integration";
import { Integration } from "../base/integration";
import { TestConnectionError } from "../base/test-connection/test-connection-error";
import type { TestingResult } from "../base/test-connection/test-connection-service";

// Replace this minimal shape with the upstream service contract used by the feature.
const responseSchema = z.object({});

export const ${parserName} = async (response: { json: () => Promise<unknown> }) =>
  responseSchema.parse(await response.json());

export class ${className} extends Integration {
  protected async testingAsync(input: IntegrationTestingInput): Promise<TestingResult> {
    const response = await input.fetchAsync(this.url("/"));
    if (!response.ok) return TestConnectionError.StatusResult(response);
    await ${parserName}(response);
    return { success: true };
  }
}
`;
  const test = `import { describe, expect, test } from "vitest";

import { simulateResponseContractAsync } from "../../base/response-contract";
import { ${className}, ${parserName} } from "../${feature.slug}-integration";

describe("${className}", () => {
  test("exposes its public integration data", () => {
    const integration = new ${className}({
      id: "test",
      name: ${JSON.stringify(feature.name)},
      url: "http://localhost",
      externalUrl: null,
      decryptedSecrets: [],
    });
    expect(integration.publicIntegration.name).toBe(${JSON.stringify(feature.name)});
  });

  test("parses documented response fixtures", async () => {
    const results = await simulateResponseContractAsync(${parserName}, [
      { name: "minimal valid response", payload: {}, expected: {} },
      { name: "invalid response", payload: null, rejects: true },
    ]);

    expect(
      results.every((result) => result.passed),
      results,
    ).toBe(true);
  });
});
`;
  addChange(changes, root, implementationPath, implementation, "create");
  addChange(changes, root, testPath, test, "create");

  const definitionPath = "packages/definitions/src/integration.ts";
  let definitions = definitionSource;
  if (new RegExp(`^  ${feature.kind}:`, "m").test(definitions)) {
    throw new Error(`Generator stopped: integration ${feature.kind} already exists.`);
  }
  definitions = appendToContainer(
    definitions,
    "const integrationDefs",
    "{",
    `  ${key(feature.kind)}: {\n    name: ${JSON.stringify(feature.name)},\n    secretKinds: [${JSON.stringify(feature.secretKinds)}],\n    iconUrl: ${JSON.stringify(feature.iconUrl)},\n    category: [${JSON.stringify(feature.category)}],\n    documentationUrl: createDocumentationLink("/docs/integrations/${feature.slug}"),\n  },\n`,
  );
  addChange(changes, root, definitionPath, definitions, "update");

  const creatorPath = "packages/integrations/src/base/creator.ts";
  let creator = read(root, creatorPath);
  creator = insertBeforeUnique(
    creator,
    'import type { Integration, IntegrationInput } from "./integration";',
    `import { ${className} } from "../${feature.slug}/${feature.slug}-integration";\n`,
    creatorPath,
  );
  creator = appendToContainer(creator, "const integrationCreators", "{", `  ${key(feature.kind)}: ${className},\n`);
  addChange(changes, root, creatorPath, creator, "update");

  const indexPath = "packages/integrations/src/index.ts";
  const integrationIndex = insertBeforeUnique(
    read(root, indexPath),
    "// Types",
    `export { ${className} } from "./${feature.slug}/${feature.slug}-integration";\n\n`,
    indexPath,
  );
  addChange(changes, root, indexPath, integrationIndex, "update");

  const slugPath = "packages/definitions/src/docs/integration-doc-slugs.ts";
  addChange(
    changes,
    root,
    slugPath,
    appendToContainer(
      read(root, slugPath),
      "const integrationDocSlugs",
      "{",
      `  ${key(feature.kind)}: "${feature.slug}",\n`,
    ),
    "update",
  );

  const translationPath = "packages/translation/src/lang/en.json";
  addChange(
    changes,
    root,
    translationPath,
    addJsonProperty(read(root, translationPath), "integration", feature.kind, {
      name: feature.name,
      description: feature.description,
    }),
    "update",
  );

  const docsBase = `apps/docs/docs/integrations/${feature.slug}`;
  addChange(
    changes,
    root,
    `${docsBase}/index.ts`,
    `import type { IntegrationDefinition } from "@site/src/types";\n\nexport const ${identifier(feature.kind)}Integration: IntegrationDefinition = {\n  name: ${JSON.stringify(feature.name)},\n  description: ${JSON.stringify(feature.description)},\n  iconUrl: ${JSON.stringify(feature.iconUrl)},\n  path: "../../integrations/${feature.slug}",\n};\n`,
    "create",
  );
  addChange(
    changes,
    root,
    `${docsBase}/index.mdx`,
    `---\ntitle: ${JSON.stringify(feature.name)}\ndescription: ${JSON.stringify(feature.description)}\nhide_title: true\n---\n\nimport { AddingIntegration } from "@site/src/components/integrations/adding";\nimport { IntegrationHeader } from "@site/src/components/integrations/header";\nimport { ${identifier(feature.kind)}Integration } from ".";\n\n<IntegrationHeader integration={${identifier(feature.kind)}Integration} categories={[${JSON.stringify(feature.category)}]} />\n\n${feature.description}\n\n### Adding the integration\n\n<AddingIntegration />\n\n### Contributor checklist\n\nDocument credentials, supported widgets, API version requirements, and a tested example URL before merging.\n`,
    "create",
  );
};

const planWidget = (root: string, feature: WidgetFeature, changes: PlannedChange[]) => {
  if (read(root, "packages/definitions/src/widget.ts").includes(`  "${feature.kind}",`)) {
    throw new Error(`Generator stopped: widget ${feature.kind} already exists.`);
  }
  const widgetPath = `packages/widgets/src/${feature.slug}`;
  const supportedLine =
    feature.supportedIntegrations.length > 0
      ? `\n  supportedIntegrations: [...nativeFeatureCapabilities.${feature.kind}.integrations],`
      : "";
  const capabilityImport =
    feature.supportedIntegrations.length > 0
      ? 'import { nativeFeatureCapabilities } from "@homarr/definitions";\n\n'
      : "";
  addChange(
    changes,
    root,
    `${widgetPath}/index.ts`,
    `import { ${feature.icon} } from "@tabler/icons-react";\n\n${capabilityImport}import { createWidgetDefinition } from "../definition";\nimport { optionsBuilder } from "../options";\n\nexport const { definition, componentLoader } = createWidgetDefinition("${feature.kind}", {\n  icon: ${feature.icon},${supportedLine}\n  createOptions() {\n    return optionsBuilder.from(() => ({}));\n  },\n}).withDynamicImport(() => import("./component"));\n`,
    "create",
  );
  addChange(
    changes,
    root,
    `${widgetPath}/component.tsx`,
    `"use client";\n\nimport { Center, Text } from "@mantine/core";\n\nimport type { WidgetComponentProps } from "../definition";\n\nexport default function ${pascalCase(feature.slug)}Widget(_props: WidgetComponentProps<"${feature.kind}">) {\n  return (\n    <Center h="100%">\n      <Text>{${JSON.stringify(feature.name)}}</Text>\n    </Center>\n  );\n}\n`,
    "create",
  );
  addChange(
    changes,
    root,
    `${widgetPath}/definition.spec.ts`,
    `import { describe, expect, test } from "vitest";\n\nimport { componentLoader, definition } from ".";\n\ndescribe(${JSON.stringify(`${feature.name} widget definition`)}, () => {\n  test("registers its kind and loader", () => {\n    expect(definition.kind).toBe("${feature.kind}");\n    expect(componentLoader).toBeTypeOf("function");\n  });\n});\n`,
    "create",
  );

  const kindsPath = "packages/definitions/src/widget.ts";
  addChange(
    changes,
    root,
    kindsPath,
    appendToContainer(read(root, kindsPath), "const widgetKinds", "[", `  "${feature.kind}",\n`),
    "update",
  );
  const manifestPath = "packages/widgets/src/manifest.ts";
  let manifest = read(root, manifestPath);
  manifest = appendToContainer(
    manifest,
    "const moduleLoaders",
    "{",
    `  ${key(feature.kind)}: () => import("./${feature.slug}") as Promise<WidgetModule>,\n`,
  );
  manifest = appendToContainer(
    manifest,
    "const componentLoaders",
    "{",
    `  ${key(feature.kind)}: () => import("./${feature.slug}/component") as Promise<WidgetComponentModule>,\n`,
  );
  addChange(changes, root, manifestPath, manifest, "update");

  const catalogPath = "packages/widgets/src/catalog.ts";
  let catalog = read(root, catalogPath);
  const iconBlockEnd = catalog.indexOf('} from "@tabler/icons-react";');
  if (iconBlockEnd < 0) throw new Error(`Generator stopped: expected Tabler icon import block in ${catalogPath}.`);
  if (!catalog.includes(`  ${feature.icon},`)) {
    catalog = `${catalog.slice(0, iconBlockEnd)}  ${feature.icon},\n${catalog.slice(iconBlockEnd)}`;
  }
  catalog = appendToContainer(catalog, "const widgetCatalogIcons", "{", `  ${key(feature.kind)}: ${feature.icon},\n`);
  addChange(changes, root, catalogPath, catalog, "update");

  const indexPath = "packages/widgets/src/index.tsx";
  const importName = identifier(feature.kind);
  let index = insertBeforeUnique(
    read(root, indexPath),
    "export type {\n  NormalizedWidgetQuery,",
    `import * as ${importName} from "./${feature.slug}";\n\n`,
    indexPath,
  );
  index = appendToContainer(index, "const widgetImports", "{", `  ${key(feature.kind)}: ${importName},\n`);
  addChange(changes, root, indexPath, index, "update");

  const slugPath = "packages/definitions/src/docs/widget-doc-slugs.ts";
  addChange(
    changes,
    root,
    slugPath,
    appendToContainer(
      read(root, slugPath),
      "const widgetDocSlugs",
      "{",
      `  ${key(feature.kind)}: "${feature.slug}",\n`,
    ),
    "update",
  );
  if (feature.supportedIntegrations.length > 0) {
    const supportPath = "packages/definitions/src/widget-integration-map.ts";
    addChange(
      changes,
      root,
      supportPath,
      appendToContainer(
        read(root, supportPath),
        "const nativeFeatureCapabilities",
        "{",
        `  ${key(feature.kind)}: { integrations: ${JSON.stringify(feature.supportedIntegrations)} },\n`,
      ),
      "update",
    );
  }
  const translationPath = "packages/translation/src/lang/en.json";
  addChange(
    changes,
    root,
    translationPath,
    addJsonProperty(read(root, translationPath), "widget", feature.kind, {
      name: feature.name,
      description: feature.description,
    }),
    "update",
  );

  const docsBase = `apps/docs/docs/widgets/${feature.slug}`;
  addChange(
    changes,
    root,
    `${docsBase}/index.ts`,
    `import type { WidgetDefinition } from "@site/src/types";\nimport { ${feature.icon} } from "@tabler/icons-react";\n\nexport const ${identifier(feature.kind)}Widget: WidgetDefinition = {\n  icon: ${feature.icon},\n  name: ${JSON.stringify(feature.name)},\n  description: ${JSON.stringify(feature.description)},\n  path: "../../widgets/${feature.slug}",\n  configuration: { items: [] },\n};\n`,
    "create",
  );
  addChange(
    changes,
    root,
    `${docsBase}/index.mdx`,
    `---\ntitle: ${JSON.stringify(feature.name)}\ndescription: ${JSON.stringify(feature.description)}\nhide_title: true\n---\n\nimport { AddingWidget } from "@site/src/components/widgets/adding";\nimport { WidgetHeader } from "@site/src/components/widgets/header";\nimport { ${identifier(feature.kind)}Widget } from ".";\n\n<WidgetHeader widget={${identifier(feature.kind)}Widget} categories={["Other"]} />\n\n${feature.description}\n\n### Adding the widget\n\n<AddingWidget />\n\n### Contributor checklist\n\nDocument configuration, supported integrations, empty/loading/error states, and screenshots before merging.\n`,
    "create",
  );
};

export const planFeatureGeneration = (root: string, request: FeatureRequest): PlannedChange[] => {
  validate(request);
  const changes: PlannedChange[] = [];
  if (request.integration) planIntegration(root, request.integration, changes);
  if (request.widget) {
    const knownIntegrations = new Set(
      [...read(root, "packages/definitions/src/integration.ts").matchAll(/^  (\w+): \{/gm)].map((match) => match[1]),
    );
    if (request.integration) knownIntegrations.add(request.integration.kind);
    const unknown = request.widget.supportedIntegrations.filter((kind) => !knownIntegrations.has(kind));
    if (unknown.length > 0)
      throw new Error(`Generator stopped: unknown supported integration(s): ${unknown.join(", ")}.`);
    const widgetChanges: PlannedChange[] = [];
    planWidget(root, request.widget, widgetChanges);
    for (const change of widgetChanges) {
      const existing = changes.find((candidate) => candidate.path === change.path);
      if (existing && change.path === "packages/translation/src/lang/en.json") {
        existing.content = addJsonProperty(existing.content, "widget", request.widget.kind, {
          name: request.widget.name,
          description: request.widget.description,
        });
      } else {
        changes.push(change);
      }
    }
  }
  const duplicatePaths = changes.filter(
    (change, index) => changes.findIndex((candidate) => candidate.path === change.path) !== index,
  );
  if (duplicatePaths.length > 0) {
    throw new Error(
      `Generator stopped: combined generation would update ${duplicatePaths[0].path} twice; merge planning is not safe yet.`,
    );
  }
  return changes;
};

const isFormatterManaged = (path: string) =>
  /\.(?:json|mdx|ts|tsx)$/.test(path) && path !== "packages/translation/src/lang/en.json";

export const formatFeatureChanges = async (changes: PlannedChange[]) =>
  await Promise.all(
    changes.map(async (change) => {
      if (!isFormatterManaged(change.path)) return change;
      const result = await format(change.path, change.content, { endOfLine: "lf", printWidth: 120 });
      if (result.errors.length > 0) {
        throw new Error(
          `Generator stopped: oxfmt could not format ${change.path}: ${result.errors.map(({ message }) => message).join("; ")}`,
        );
      }
      return { ...change, content: result.code };
    }),
  );

export const generateFeature = async (root: string, request: FeatureRequest) => {
  const changes = await formatFeatureChanges(planFeatureGeneration(root, request));
  for (const change of changes) {
    mkdirSync(dirname(join(root, change.path)), { recursive: true });
    writeFileSync(join(root, change.path), change.content);
  }
  return changes;
};
