import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "@babel/parser";
import { definitionSyntax, lexer } from "css-tree";
import { DEFAULT_THEME, defaultCssVariablesResolver, v8CssVariablesResolver } from "@mantine/core";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const fields = new Set(
  `map filter reduce slice find findIndex includes join split toLowerCase toUpperCase trim length keys values entries toFixed round floor ceil abs min max get format add subtract isBefore isAfter`.split(
    " ",
  ),
);
const attributes = new Set();
fields.add("Inter");
for (const name of `class id href src alt title style name type value details summary colgroup col --font-sans all screen print not only and or portrait landscape orientation prefers-color-scheme prefers-reduced-motion hover any-hover pointer any-pointer resolution min-resolution max-resolution aspect-ratio min-aspect-ratio max-aspect-ratio color-gamut forced-colors inverted-colors display-mode style scroll-state`.split(
  " ",
))
  fields.add(name);
const nativeTheme = {
  ...DEFAULT_THEME,
  colors: {
    ...DEFAULT_THEME.colors,
    primaryColor: DEFAULT_THEME.colors.blue,
    secondaryColor: DEFAULT_THEME.colors.blue,
    iconColor: DEFAULT_THEME.colors.blue,
  },
};
for (const resolver of [defaultCssVariablesResolver, v8CssVariablesResolver])
  for (const variables of Object.values(resolver(nativeTheme)))
    for (const name of Object.keys(variables)) fields.add(name);
for (const name of `html body p br h1 h2 h3 h4 h5 h6 strong b em i u s del code pre blockquote ul ol li a span div mark hr table thead tbody tfoot tr th td label input img button form section main aside header footer svg path g rect circle select option textarea root hover focus focus-visible focus-within active checked disabled enabled first-child last-child nth-child nth-of-type first-of-type last-of-type only-child only-of-type before after empty not is where has lang dir link visited any-link placeholder selection marker`.split(
  " ",
))
  fields.add(name);
const visit = (node, includeProperties = true) => {
  if (!node || typeof node !== "object") return;
  if (
    includeProperties &&
    (node.type === "TSPropertySignature" || node.type === "ObjectProperty") &&
    node.key?.type === "Identifier"
  )
    fields.add(node.key.name);
  if (
    includeProperties &&
    (node.type === "MemberExpression" || node.type === "OptionalMemberExpression") &&
    !node.computed &&
    node.property?.type === "Identifier"
  )
    fields.add(node.property.name);
  if (node.type === "JSXAttribute" && node.name?.name) fields.add(node.name.name);
  if (node.type === "JSXAttribute" && /^(?:data-|aria-)/.test(node.name?.name)) {
    let value = node.value;
    if (value?.type === "JSXExpressionContainer") value = value.expression;
    if (value?.type === "StringLiteral") attributes.add(`${node.name.name}:${value.value}`);
  }
  if (node.type === "JSXAttribute" && node.name?.name === "className" && node.value?.type === "StringLiteral")
    node.value.value.split(/\s+/).forEach((name) => fields.add(name));
  for (const [key, value] of Object.entries(node)) {
    if (key === "loc" || key === "comments") continue;
    if (Array.isArray(value)) value.forEach((child) => visit(child, includeProperties));
    else if (value && typeof value === "object") visit(value, includeProperties);
  }
};
for (const directory of [
  "integrations",
  "definitions",
  "validation",
  "custom-widgets",
  "widgets",
  "api",
  "ui",
  "../apps/nextjs",
]) {
  let source = join(root, "packages", directory, "src");
  if (directory.startsWith("../")) source = join(root, "apps/nextjs/src");
  for (const file of readdirSync(source, { recursive: true }).toSorted()) {
    if (file.endsWith("public-fields.ts")) continue;
    if (/\.(css|scss)$/.test(file)) {
      const css = readFileSync(join(source, file), "utf8");
      for (const match of css.matchAll(/\.([a-zA-Z_][\w-]*)|(--[\w-]+)/g)) fields.add(match[1] ?? match[2]);
      continue;
    }
    if (!/\.tsx?$/.test(file) || /\.(spec|test)\.|(?:^|\/)test\//.test(file)) continue;
    const plugins = ["typescript", "decorators-legacy"];
    if (file.endsWith(".tsx")) plugins.push("jsx");
    visit(
      parse(readFileSync(join(source, file), "utf8"), { sourceType: "module", plugins }),
      !directory.startsWith("../"),
    );
  }
}
for (const name of Object.keys(lexer.properties)) {
  fields.add(name);
  definitionSyntax.walk(lexer.getProperty(name).syntax, (node) => {
    if (node.type === "Keyword" || node.type === "Function") {
      fields.add(node.name);
    }
  });
}
for (const name of Object.keys(lexer.types)) {
  const syntax = lexer.getType(name).syntax;
  if (!syntax) continue;
  definitionSyntax.walk(syntax, (node) => {
    if (node.type === "Keyword" || node.type === "Function") {
      fields.add(node.name);
    }
  });
}
// Mantine's public static classes are stable selectors used in custom CSS.
const mantine = join(root, "node_modules/@mantine/core/esm/components");
for (const file of readdirSync(mantine, { recursive: true }).toSorted()) {
  if (!file.endsWith(".module.mjs")) continue;
  const component = file.split("/").at(-1).replace(".module.mjs", "");
  const source = readFileSync(join(mantine, file), "utf8");
  for (const match of source.matchAll(/"([\w-]+)":\s*"(m_[\w-]+)"/g)) {
    fields.add(`mantine-${component}-${match[1]}`);
    fields.add(match[2]);
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
const generated = `// Generated from trusted native contracts; unknown dictionary keys are anonymized.\n// Regenerate with: bun run --cwd apps/nextjs snapshot:fields\nexport const snapshotPublicFields = new Set(\n  \`\n${lines.join("\n")}\n\`\n    .trim()\n    .split(/\\s+/),\n);\n\nexport const snapshotPublicAttributeValues = new Set(${JSON.stringify([...attributes].toSorted(), null, 2)});\n`;
writeFileSync(join(root, "apps/nextjs/src/components/board/debug/public-fields.ts"), generated);
