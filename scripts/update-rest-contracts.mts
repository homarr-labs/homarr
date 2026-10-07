import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import * as ts from "typescript/unstable/sync";

// Derive response contracts from the same procedure types used by the UI. No runtime imports,
// credentials, database, or upstream connections are needed to regenerate this document.
const sourcePath = path.resolve("packages/api/src/rest/sources.ts");
const api = new ts.API();
const snapshot = api.updateSnapshot({ openProjects: [path.resolve("packages/api/tsconfig.json")] });
const project = snapshot.getProject(path.resolve("packages/api/tsconfig.json"));
assert.ok(project);
const checker = project.checker;
const sourceText = await readFile(sourcePath, "utf8");
const outputs = checker.getTypeAtPosition(sourcePath, sourceText.indexOf("RestOutputs"));
assert.ok(outputs);
type Schema = Record<string, unknown>;
const definitions: Record<string, Schema> = {};
const names = new Map<ts.Type, string>();
const dynamic: Schema = {
  description: "JSON payload with a shape supplied by the upstream integration or widget configuration.",
};
const isUndefined = (type: ts.Type) =>
  Boolean(type.flags & (ts.TypeFlags.Undefined | ts.TypeFlags.Void | ts.TypeFlags.Never));

function schemaFor(type: ts.Type): Schema {
  assert.ok(!type.isErrorType(), "Cannot generate a contract from an unresolved type");
  if (!(type.flags & ts.TypeFlags.Object) && !type.isUnionType() && !type.isIntersectionType())
    return inlineSchema(type);
  const previous = names.get(type);
  if (previous) return { $ref: `#/$defs/${previous}` };
  const name = `shape${names.size + 1}`;
  names.set(type, name);
  definitions[name] = {};
  definitions[name] = inlineSchema(type);
  return { $ref: `#/$defs/${name}` };
}

function inlineSchema(type: ts.Type): Schema {
  if (type.flags & (ts.TypeFlags.Any | ts.TypeFlags.Unknown)) return dynamic;
  if (type.flags & ts.TypeFlags.Never) return { not: {} };
  if (type.flags & ts.TypeFlags.Null) return { type: "null" };
  if (type.flags & ts.TypeFlags.StringLiteral) return { type: "string", const: (type as ts.StringLiteralType).value };
  if (type.flags & ts.TypeFlags.NumberLiteral) return { type: "number", const: (type as ts.NumberLiteralType).value };
  if (type.flags & ts.TypeFlags.BooleanLiteral)
    return { type: "boolean", const: (type as ts.BooleanLiteralType).value };
  if (type.flags & ts.TypeFlags.StringLike) return { type: "string" };
  if (type.flags & ts.TypeFlags.NumberLike) return { type: "number" };
  if (type.flags & ts.TypeFlags.BooleanLike) return { type: "boolean" };
  if (type.flags & ts.TypeFlags.BigIntLike)
    return { type: "string", pattern: "^-?[0-9]+$", description: "Decimal integer serialized as a string." };
  if (isUndefined(type)) return { type: "null" };
  if (type.isUnionType()) {
    const parts = type.getTypes().filter((part) => !isUndefined(part));
    if (parts.length === 0) return { type: "null" };
    const members = parts.map(schemaFor);
    if (members.every((member) => "const" in member)) {
      const values = members.map((member) => member.const);
      if (values.every((value) => typeof value === typeof values[0])) {
        return { type: typeof values[0], enum: values };
      }
    }
    if (members.length === 1) return members[0] ?? dynamic;
    return { anyOf: members };
  }
  const symbolName = type.getSymbol()?.name;
  if (symbolName === "Date") return { type: "string", format: "date-time" };
  if (checker.isArrayType(type)) {
    const element = checker.getTypeArguments(type as ts.TypeReference)[0];
    return { type: "array", items: element ? schemaFor(element) : dynamic };
  }
  if (checker.isTupleType(type)) {
    const elements = checker.getTypeArguments(type as ts.TypeReference).map(schemaFor);
    return { type: "array", items: { anyOf: elements }, minItems: elements.length, maxItems: elements.length };
  }
  if (symbolName === "Map" || symbolName === "ReadonlyMap") {
    const args = checker.getTypeArguments(type as ts.TypeReference);
    return { type: "object", additionalProperties: args[1] ? schemaFor(args[1]) : dynamic };
  }
  if (symbolName === "Set" || symbolName === "ReadonlySet") {
    const element = checker.getTypeArguments(type as ts.TypeReference)[0];
    return { type: "array", items: element ? schemaFor(element) : dynamic };
  }
  assert.ok(
    type.flags & ts.TypeFlags.Object || type.isIntersectionType(),
    `Unsupported output: ${checker.typeToString(type)}`,
  );
  const properties: Record<string, Schema> = {};
  const required: string[] = [];
  const result: Schema = { type: "object", properties, additionalProperties: true };
  for (const property of checker.getPropertiesOfType(type)) {
    const propertyType = checker.getTypeOfSymbol(property);
    assert.ok(propertyType);
    if (checker.getSignaturesOfType(propertyType, ts.SignatureKind.Call).length > 0) continue;
    const parts = propertyType.isUnionType() ? propertyType.getTypes() : [propertyType];
    if (parts.every(isUndefined)) continue;
    properties[property.name] = schemaFor(propertyType);
    if (!(property.flags & ts.SymbolFlags.Optional) && !parts.some(isUndefined)) required.push(property.name);
  }
  if (required.length > 0) result.required = required;
  const index = checker
    .getIndexInfosOfType(type)
    .find((index) => Boolean(index.keyType.flags & (ts.TypeFlags.StringLike | ts.TypeFlags.NumberLike)))?.valueType;
  if (index) result.additionalProperties = schemaFor(index);
  return result;
}

const responses: Record<string, Schema | null> = {};
for (const property of checker.getPropertiesOfType(outputs)) {
  const type = checker.getTypeOfSymbol(property);
  assert.ok(type);
  if (isUndefined(type)) responses[property.name] = null;
  else responses[property.name] = schemaFor(type);
}
assert.ok(Object.keys(responses).length > 200, "REST source types could not be resolved");
const serialized = `${JSON.stringify({ responses, $defs: definitions }, null, 2)}\n`;
const destination = "packages/api/src/rest/response-contracts.json";
if (process.argv.includes("--write")) await writeFile(destination, serialized);
else
  assert.equal(
    await readFile(destination, "utf8"),
    serialized,
    "REST response contracts are stale; run pnpm scripts:update-rest-contracts",
  );
console.log(
  `REST response contracts verified: ${Object.keys(responses).length} actions, ${Object.keys(definitions).length} shared shapes`,
);

snapshot.dispose();
api.close();
