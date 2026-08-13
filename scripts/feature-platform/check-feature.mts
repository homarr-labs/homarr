import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { spawnSync } from "node:child_process";

import { readArrayRegistry, readObjectRegistry } from "./contracts.mts";

export interface FeatureCheckCommand {
  label: string;
  executable: string;
  args: string[];
}

export interface FeatureCheckPlan {
  kind: string;
  types: ("integration" | "widget")[];
  files: string[];
  commands: FeatureCheckCommand[];
  optionalValidations: string[];
}

const walkFiles = (directory: string): string[] => {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? walkFiles(path) : [path];
  });
};

const directString = (value: string | undefined) => value?.match(/^"([^"]+)"/)?.[1];

const resolveSourceImport = (root: string, importer: string, importPath: string) => {
  const base = relative(root, resolve(root, dirname(importer), importPath));
  for (const candidate of [`${base}.ts`, `${base}.tsx`, join(base, "index.ts"), join(base, "index.tsx")]) {
    if (existsSync(join(root, candidate))) return candidate;
  }
  return null;
};

const integrationImplementation = (root: string, kind: string) => {
  const creatorPath = "packages/integrations/src/base/creator.ts";
  const creatorSource = readFileSync(join(root, creatorPath), "utf8");
  const creator = readObjectRegistry(root, creatorPath, "integrationCreators")
    .get(kind)
    ?.match(/[A-Za-z_$][\w$]*/)?.[0];
  if (!creator) return null;
  const escapedCreator = creator.replaceAll("$", "\\$");
  const importPath = creatorSource.match(
    new RegExp(`import \\{[^}]*\\b${escapedCreator}\\b[^}]*\\} from "([^"]+)"`),
  )?.[1];
  return importPath ? resolveSourceImport(root, creatorPath, importPath) : null;
};

const widgetImplementation = (root: string, kind: string) => {
  const value = readObjectRegistry(root, "packages/widgets/src/manifest.ts", "moduleLoaders").get(kind);
  const importPath = value?.match(/import\("([^"]+)"\)/)?.[1];
  return importPath ? resolveSourceImport(root, "packages/widgets/src/manifest.ts", importPath) : null;
};

const specsNear = (root: string, implementation: string | null) => {
  if (!implementation) return [];
  return walkFiles(dirname(join(root, implementation)))
    .filter((path) => /\.spec\.tsx?$/.test(path))
    .map((path) => relative(root, path))
    .toSorted();
};

const packageCommand = (label: string, packages: string[]): FeatureCheckCommand => ({
  label,
  executable: "pnpm",
  args: [...packages.flatMap((name) => ["--filter", name]), "typecheck"],
});

export const createFeatureCheckPlan = (root: string, kind: string): FeatureCheckPlan => {
  const integrationKinds = new Set(
    readObjectRegistry(root, "packages/definitions/src/integration.ts", "integrationDefs").keys(),
  );
  const widgetKinds = new Set(readArrayRegistry(root, "packages/definitions/src/widget.ts", "widgetKinds"));
  const types: FeatureCheckPlan["types"] = [];
  if (integrationKinds.has(kind)) types.push("integration");
  if (widgetKinds.has(kind)) types.push("widget");
  if (types.length === 0) {
    throw new Error(`Unknown feature kind ${JSON.stringify(kind)}. Use a key from integrationDefs or widgetKinds.`);
  }

  const files = new Set<string>(["packages/translation/src/lang/en.json"]);
  const tests = new Set<string>();
  const packages = new Set(["@homarr/definitions", "@homarr/translation"]);

  if (types.includes("integration")) {
    const implementation = integrationImplementation(root, kind);
    if (implementation) files.add(implementation);
    specsNear(root, implementation).forEach((path) => tests.add(path));
    tests.add("packages/integrations/src/base/response-contract.spec.ts");
    packages.add("@homarr/integrations");
    for (const path of [
      "packages/definitions/src/integration.ts",
      "packages/definitions/src/docs/integration-doc-slugs.ts",
      "packages/integrations/src/base/creator.ts",
      "packages/integrations/src/index.ts",
    ])
      files.add(path);
    const slug = directString(
      readObjectRegistry(root, "packages/definitions/src/docs/integration-doc-slugs.ts", "integrationDocSlugs").get(
        kind,
      ),
    );
    if (slug) {
      packages.add("@homarr/docs");
      files.add(`apps/docs/docs/integrations/${slug}/index.ts`);
      files.add(`apps/docs/docs/integrations/${slug}/index.mdx`);
    }
  }

  if (types.includes("widget")) {
    const implementation = widgetImplementation(root, kind);
    if (implementation) {
      const directory = dirname(join(root, implementation));
      walkFiles(directory)
        .filter((path) => /\.(?:ts|tsx|css)$/.test(path))
        .map((path) => relative(root, path))
        .forEach((path) => files.add(path));
    }
    specsNear(root, implementation).forEach((path) => tests.add(path));
    tests.add("packages/widgets/src/manifest.spec.ts");
    tests.add("packages/definitions/src/test/widget-integration-map.spec.ts");
    packages.add("@homarr/widgets");
    for (const path of [
      "packages/definitions/src/widget.ts",
      "packages/definitions/src/widget-integration-map.ts",
      "packages/definitions/src/docs/widget-doc-slugs.ts",
      "packages/widgets/src/manifest.ts",
      "packages/widgets/src/catalog.ts",
      "packages/widgets/src/index.tsx",
    ])
      files.add(path);
    const slug = directString(
      readObjectRegistry(root, "packages/definitions/src/docs/widget-doc-slugs.ts", "widgetDocSlugs").get(kind),
    );
    if (slug) {
      packages.add("@homarr/docs");
      const metadataTs = `apps/docs/docs/widgets/${slug}/index.ts`;
      files.add(existsSync(join(root, metadataTs)) ? metadataTs : `${metadataTs}x`);
      files.add(`apps/docs/docs/widgets/${slug}/index.mdx`);
    }
  }

  const sortedTests = [...tests].filter((path) => existsSync(join(root, path))).toSorted();
  sortedTests.forEach((path) => files.add(path));
  const sortedFiles = [...files].filter((path) => existsSync(join(root, path))).toSorted();
  const lintFiles = sortedFiles.filter((path) => /\.(?:ts|tsx|mts)$/.test(path));
  const sortedPackages = [...packages].toSorted();
  const commands: FeatureCheckCommand[] = [
    {
      label: "Descriptor, docs, translation, and export contracts",
      executable: "node",
      args: ["--experimental-strip-types", "scripts/check-feature-contracts.mts"],
    },
    { label: "Focused fixture and unit tests", executable: "pnpm", args: ["exec", "vitest", "run", ...sortedTests] },
    packageCommand("Affected package typechecks", sortedPackages),
    { label: "Affected file lint", executable: "pnpm", args: ["exec", "oxlint", ...lintFiles] },
    { label: "Affected file formatting", executable: "pnpm", args: ["exec", "oxfmt", "--check", ...sortedFiles] },
  ];

  return {
    kind,
    types,
    files: sortedFiles,
    commands,
    optionalValidations: [
      "LIVE SERVICE (optional, not run): exercise test-connection and feature requests against a disposable real service with non-production credentials.",
      "CONTAINER/E2E (optional, not run): validate the supported service image and network path when the feature depends on container-specific behavior.",
      ...(types.includes("widget")
        ? [
            "VISUAL (optional, not run): inspect shared states at /manage/tools/feature-workbench and the feature at compact and advanced sizes.",
          ]
        : []),
    ],
  };
};

const displayCommand = (command: FeatureCheckCommand) =>
  [command.executable, ...command.args]
    .map((part) => (/^[A-Za-z0-9_./:@=-]+$/.test(part) ? part : `'${part.replaceAll("'", "'\\''")}'`))
    .join(" ");

export const formatFeatureCheckPlan = (plan: FeatureCheckPlan) => {
  const lines = [`Feature check plan for ${plan.kind} (${plan.types.join(" + ")}):`, "", "Affected files:"];
  lines.push(...plan.files.map((path) => `- ${path}`), "", "Checks:");
  lines.push(...plan.commands.map((command, index) => `${index + 1}. ${command.label}\n   ${displayCommand(command)}`));
  lines.push("", "Optional validation:", ...plan.optionalValidations.map((validation) => `- ${validation}`));
  return lines.join("\n");
};

export type FeatureCommandRunner = (command: FeatureCheckCommand) => number;

export const executeFeatureCheckPlan = (
  plan: FeatureCheckPlan,
  runner: FeatureCommandRunner = (command) =>
    spawnSync(command.executable, command.args, { stdio: "inherit" }).status ?? 1,
) => {
  for (const command of plan.commands) {
    console.log(`\n[check:feature] ${command.label}`);
    const status = runner(command);
    if (status !== 0) return status;
  }
  return 0;
};
