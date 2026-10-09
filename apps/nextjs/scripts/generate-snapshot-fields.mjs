import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "@babel/parser";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const fields = new Set(
  `map filter reduce slice find findIndex includes join split toLowerCase toUpperCase trim length keys values entries toFixed round floor ceil abs min max get format add subtract isBefore isAfter`.split(
    " ",
  ),
);
const visit = (node) => {
  if (!node || typeof node !== "object") return;
  if ((node.type === "TSPropertySignature" || node.type === "ObjectProperty") && node.key?.type === "Identifier")
    fields.add(node.key.name);
  if (
    (node.type === "MemberExpression" || node.type === "OptionalMemberExpression") &&
    !node.computed &&
    node.property?.type === "Identifier"
  )
    fields.add(node.property.name);
  for (const [key, value] of Object.entries(node)) {
    if (key === "loc" || key === "comments") continue;
    if (Array.isArray(value)) value.forEach(visit);
    else if (value && typeof value === "object") visit(value);
  }
};
for (const directory of ["integrations", "definitions", "validation", "custom-widgets", "widgets", "api"]) {
  const source = join(root, "packages", directory, "src");
  for (const file of readdirSync(source, { recursive: true }).toSorted()) {
    if (!/\.tsx?$/.test(file) || /\.(spec|test)\.|(?:^|\/)test\//.test(file)) continue;
    const plugins = ["typescript", "decorators-legacy"];
    if (file.endsWith(".tsx")) plugins.push("jsx");
    visit(parse(readFileSync(join(source, file), "utf8"), { sourceType: "module", plugins }));
  }
}
const lines = [];
let line = "";
for (const field of [...fields].toSorted()) {
  if (line.length + field.length > 110) {
    lines.push(line);
    line = "";
  }
  if (line) line += " ";
  line += field;
}
if (line) lines.push(line);
const generated = `// Generated from trusted native contracts; unknown dictionary keys are anonymized.\n// Regenerate with: bun run --cwd apps/nextjs snapshot:fields\nexport const snapshotPublicFields = new Set(\n  \`\n${lines.join("\n")}\n\`\n    .trim()\n    .split(/\\s+/),\n);\n`;
writeFileSync(join(root, "apps/nextjs/src/components/board/debug/public-fields.ts"), generated);
