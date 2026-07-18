import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import { customJsxComponentRegistry } from "../src/core/component-registry";

const output = customJsxComponentRegistry.map(
  ({ name, package: packageName, category, safety, reason, documentationUrl }) => ({
    name,
    package: packageName,
    category,
    safety,
    reason,
    documentationUrl,
  }),
);

await writeFile(
  resolve(import.meta.dirname, "../../../apps/docs/src/generated/custom-jsx-components.json"),
  `${JSON.stringify(output, null, 2)}\n`,
);
