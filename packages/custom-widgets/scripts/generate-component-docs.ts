import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import type { CustomJsxAuthoringCatalog } from "../src/core/component-catalog-types";
import { renderCustomWidgetComponentReferences } from "./component-docs";

const packageRoot = resolve(import.meta.dirname, "..");
const sourcePath = resolve(packageRoot, "src/core/component-catalog.generated.json");
const publicDirectory = resolve(packageRoot, "../../apps/docs/static/custom-widgets");
const publicPath = resolve(publicDirectory, "component-catalog-v1.json");
const skillReferenceDirectory = resolve(packageRoot, "../../.agents/skills/homarr-custom-widget/references");
const contents = await readFile(sourcePath, "utf8");
const catalog = JSON.parse(contents) as CustomJsxAuthoringCatalog;
const references = renderCustomWidgetComponentReferences(catalog);

await Promise.all([mkdir(publicDirectory, { recursive: true }), mkdir(skillReferenceDirectory, { recursive: true })]);
await Promise.all([
  writeFile(publicPath, contents),
  ...Object.entries(references).map(([path, content]) => writeFile(resolve(skillReferenceDirectory, path), content)),
]);
