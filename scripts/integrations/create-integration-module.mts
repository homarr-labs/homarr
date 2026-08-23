import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const integrationsRoot = path.join(repositoryRoot, "packages/integrations/src");

const readOption = (name: string) => {
  const optionIndex = process.argv.indexOf(name);
  if (optionIndex < 0) return undefined;
  return process.argv[optionIndex + 1];
};

const kind = process.argv[2];
if (!kind || kind.startsWith("--")) {
  throw new Error(
    "Usage: pnpm integrations:new <kind> --icon-url <url> [--slug <docs-slug>] [--name <display-name>] [--category <category>] [--default-port <port>]",
  );
}
if (!/^[a-z][A-Za-z0-9]*$/.test(kind)) {
  throw new Error("Integration kind must be a stable lower-camel-case identifier");
}

const defaultSlug = kind.replace(/([a-z0-9])([A-Z])/gu, "$1-$2").toLowerCase();
const slug = readOption("--slug") ?? defaultSlug;
const name =
  readOption("--name") ??
  slug
    .split("-")
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
const category = readOption("--category") ?? "miscellaneous";
const iconUrl = readOption("--icon-url");
const defaultPortInput = readOption("--default-port");

if (!/^[a-z0-9][a-z0-9-]*$/.test(slug)) throw new Error("Integration slug must use lower-case kebab-case");
if (!iconUrl || !URL.canParse(iconUrl)) throw new Error("--icon-url must be a valid absolute URL");
if (!/^[a-z][A-Za-z0-9]*$/.test(category)) throw new Error("Integration category must be a stable identifier");

let defaultPort: number | undefined;
if (defaultPortInput !== undefined) {
  defaultPort = Number(defaultPortInput);
  if (!Number.isSafeInteger(defaultPort) || defaultPort < 1 || defaultPort > 65_535) {
    throw new Error("--default-port must be an integer between 1 and 65535");
  }
}

const className = `${kind.charAt(0).toUpperCase()}${kind.slice(1)}Integration`;
const metadataExportName = `${kind}Integration`;
const directory = path.join(integrationsRoot, slug);
await mkdir(directory);
await mkdir(path.join(directory, "docs"));

const defaultPortLine = defaultPort === undefined ? "" : `  defaultPort: ${defaultPort},\n`;
const files = {
  "module.ts": `import { defineIntegrationModule } from "@homarr/definitions";

export default defineIntegrationModule({
  kind: ${JSON.stringify(kind)},
  name: ${JSON.stringify(name)},
  iconUrl: ${JSON.stringify(iconUrl)},
  secretKinds: [[]],
  categories: [${JSON.stringify(category)}],
${defaultPortLine}  documentation: {
    slug: ${JSON.stringify(slug)},
    sourceDirectory: "docs",
  },
  creator: {
    type: "constructor",
    module: "./${slug}-integration",
    exportName: ${JSON.stringify(className)},
  },
});
`,
  [`${slug}-integration.ts`]: `import type { IntegrationTestingInput } from "../base/integration";
import { Integration } from "../base/integration";
import { TestConnectionError } from "../base/test-connection/test-connection-error";
import type { TestingResult } from "../base/test-connection/test-connection-service";

export class ${className} extends Integration {
  protected async testingAsync(input: IntegrationTestingInput): Promise<TestingResult> {
    const response = await input.fetchAsync(this.url("/"));
    if (!response.ok) return TestConnectionError.StatusResult(response);
    return { success: true };
  }
}
`,
  "docs/index.ts": `export const ${metadataExportName} = {
  name: ${JSON.stringify(name)},
  description: ${JSON.stringify(`Connect Homarr to ${name}.`)},
  iconUrl: ${JSON.stringify(iconUrl)},
  path: "../../integrations/${slug}",
} as const;
`,
  "docs/index.mdx": `---
title: ${JSON.stringify(name)}
description: ${JSON.stringify(`Connect Homarr to ${name}.`)}
hide_title: true
---

import { IntegrationHeader } from "@site/src/components/integrations/header";
import { AddingIntegration } from "@site/src/components/integrations/adding";
import { ${metadataExportName} } from ".";

<IntegrationHeader integration={${metadataExportName}} categories={["Miscellaneous"]} />

Describe the service, supported Homarr widgets, required permissions, and setup prerequisites here.

### Adding the integration

<AddingIntegration />
`,
} as const;

for (const [relativePath, content] of Object.entries(files)) {
  await writeFile(path.join(directory, relativePath), content, { flag: "wx" });
}

await import("./sync-integration-modules.mts");
console.log(`Created integration module ${kind} in ${path.relative(repositoryRoot, directory)}`);
