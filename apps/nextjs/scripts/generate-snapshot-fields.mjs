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
const enumValues = new Map();
const addEnumValues = (name, values) => {
  if (!values.length) return;
  if (!enumValues.has(name)) enumValues.set(name, new Set());
  values.forEach((value) => enumValues.get(name).add(value));
};
const literalKeys = (node, bindings, seen = new Set()) => {
  if (!node) return [];
  if (node.type === "TSAsExpression" || node.type === "TSSatisfiesExpression")
    return literalKeys(node.expression, bindings, seen);
  if (node.type === "Identifier" && bindings.has(node.name) && !seen.has(node.name))
    return literalKeys(bindings.get(node.name), bindings, new Set([...seen, node.name]));
  if (node.type === "ObjectExpression")
    return node.properties
      .filter((prop) => prop.type === "ObjectProperty" && ["Identifier", "StringLiteral"].includes(prop.key.type))
      .map((prop) => prop.key.name ?? prop.key.value);
  return [];
};
const literalValues = (node, bindings, seen = new Set()) => {
  if (!node) return [];
  if (node.type === "StringLiteral") return [node.value];
  if (node.type === "TSLiteralType") return literalValues(node.literal, bindings, seen);
  if (node.type === "TSUnionType") return node.types.flatMap((type) => literalValues(type, bindings, seen));
  if (node.type === "TSArrayType") return literalValues(node.elementType, bindings, seen);
  if (node.type === "TSAsExpression" || node.type === "TSParenthesizedType")
    return literalValues(node.expression ?? node.typeAnnotation, bindings, seen);
  if (node.type === "TSIndexedAccessType") return literalValues(node.objectType, bindings, seen);
  if (node.type === "TSTypeQuery") return literalValues(node.exprName, bindings, seen);
  if (node.type === "TSTypeReference") return literalValues(node.typeName, bindings, seen);
  if (node.type === "SpreadElement") return literalValues(node.argument, bindings, seen);
  if (node.type === "ArrayExpression") return node.elements.flatMap((value) => literalValues(value, bindings, seen));
  if (node.type === "Identifier" && bindings.has(node.name) && !seen.has(node.name)) {
    return literalValues(bindings.get(node.name), bindings, new Set([...seen, node.name]));
  }
  if (node.type === "CallExpression" && node.callee.type === "Identifier" && node.callee.name === "objectKeys")
    return literalKeys(node.arguments[0], bindings, seen);
  if (node.type === "CallExpression" && node.callee.type === "MemberExpression") {
    if (["enum", "literal"].includes(node.callee.property.name))
      return literalValues(node.arguments[0], bindings, seen);
    return literalValues(node.callee.object, bindings, seen);
  }
  return [];
};
const memberField = (node) => {
  if (!["MemberExpression", "OptionalMemberExpression"].includes(node?.type)) return;
  if (node.property.type === "StringLiteral") return node.property.value;
  if (!node.computed && node.property.type === "Identifier") return node.property.name;
};
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
const paletteValues = Object.keys(nativeTheme.colors).flatMap((color) => [
  color,
  ...Array.from({ length: 10 }, (_, shade) => `${color}.${shade}`),
]);
for (const name of ["color", "c"]) addEnumValues(name, paletteValues);
for (const resolver of [defaultCssVariablesResolver, v8CssVariablesResolver])
  for (const variables of Object.values(resolver(nativeTheme)))
    for (const name of Object.keys(variables)) fields.add(name);
for (const name of `html body p br h1 h2 h3 h4 h5 h6 strong b em i u s del code pre blockquote ul ol li a span div mark hr table thead tbody tfoot tr th td label input img button form section main aside header footer svg path g rect circle select option textarea root hover focus focus-visible focus-within active checked disabled enabled first-child last-child nth-child nth-of-type first-of-type last-of-type only-child only-of-type before after empty not is where has lang dir link visited any-link placeholder selection marker`.split(
  " ",
))
  fields.add(name);
const visit = (node, includeProperties = true, bindings = new Map()) => {
  if (!node || typeof node !== "object") return;
  if (
    includeProperties &&
    (node.type === "TSPropertySignature" || node.type === "ObjectProperty") &&
    ["Identifier", "StringLiteral"].includes(node.key?.type)
  ) {
    const name = node.key.name ?? node.key.value;
    fields.add(name);
    let values = [];
    if (node.type === "TSPropertySignature") values = literalValues(node.typeAnnotation?.typeAnnotation, bindings);
    if (node.type === "ObjectProperty" && node.value?.type === "CallExpression")
      values = literalValues(node.value, bindings);
    addEnumValues(name, values);
  }
  if (
    includeProperties &&
    (node.type === "MemberExpression" || node.type === "OptionalMemberExpression") &&
    ((!node.computed && node.property?.type === "Identifier") || node.property?.type === "StringLiteral")
  )
    fields.add(node.property.name ?? node.property.value);
  // Runtime comparisons declare discriminants even when integration types are
  // generic or expose a plain string, such as Proxmox resource.type.
  if (includeProperties && node.type === "BinaryExpression" && ["===", "!==", "==", "!="].includes(node.operator)) {
    for (const [member, literal] of [
      [node.left, node.right],
      [node.right, node.left],
    ]) {
      const name = memberField(member);
      if (name && literal.type === "StringLiteral") addEnumValues(name, [literal.value]);
    }
  }
  if (includeProperties && node.type === "SwitchStatement") {
    const name = memberField(node.discriminant);
    if (name)
      addEnumValues(
        name,
        node.cases.filter((entry) => entry.test?.type === "StringLiteral").map((entry) => entry.test.value),
      );
  }
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
    if (Array.isArray(value)) value.forEach((child) => visit(child, includeProperties, bindings));
    else if (value && typeof value === "object") visit(value, includeProperties, bindings);
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
    const ast = parse(readFileSync(join(source, file), "utf8"), { sourceType: "module", plugins });
    const bindings = new Map();
    const collect = (node) => {
      if (!node || typeof node !== "object") return;
      if (node.type === "VariableDeclarator" && node.id?.type === "Identifier") bindings.set(node.id.name, node.init);
      if (node.type === "TSTypeAliasDeclaration") bindings.set(node.id.name, node.typeAnnotation);
      for (const [key, value] of Object.entries(node)) {
        if (["loc", "comments"].includes(key)) continue;
        if (Array.isArray(value)) value.forEach(collect);
        else if (value && typeof value === "object") collect(value);
      }
    };
    collect(ast);
    visit(ast, !directory.startsWith("../"), bindings);
  }
}
const componentCatalog = JSON.parse(
  readFileSync(join(root, "packages/custom-widgets/src/core/component-catalog.generated.json"), "utf8"),
);
for (const prop of [
  ...componentCatalog.globalProps,
  ...componentCatalog.components.flatMap((component) => component.props),
]) {
  fields.add(prop.name);
  addEnumValues(
    prop.name,
    (prop.literalValues ?? []).filter((value) => typeof value === "string"),
  );
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
const enums = [...enumValues]
  .toSorted(([a], [b]) => a.localeCompare(b))
  .map(([name, values]) => [name, [...values].toSorted()]);
writeFileSync(
  join(root, "apps/nextjs/src/components/board/debug/public-fields.ts"),
  generated +
    `\nexport const snapshotPublicEnumValues = new Map<string, readonly string[]>(${JSON.stringify(enums, null, 2)});\n`,
);
