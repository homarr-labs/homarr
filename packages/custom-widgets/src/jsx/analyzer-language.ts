import { enabledCustomJsxComponents } from "../core/component-registry";
import type { AstNode } from "./analyzer-ast";
import { nodeOf, staticPropertyName } from "./analyzer-ast";

export const ROOT_BINDINGS = new Set([
  "Array",
  "Boolean",
  "Date",
  "Infinity",
  "JSON",
  "Math",
  "NaN",
  "Number",
  "Object",
  "String",
  "data",
  "options",
  "inputs",
  "status",
  "decodeURIComponent",
  "encodeURIComponent",
  "isFinite",
  "isNaN",
  "parseFloat",
  "parseInt",
  "undefined",
]);

export const RESERVED_LOCAL_BINDINGS = new Set(["data", "status", "options", "inputs"]);
const callableRootBindings = new Set([
  "Boolean",
  "Number",
  "String",
  "decodeURIComponent",
  "encodeURIComponent",
  "isFinite",
  "isNaN",
  "parseFloat",
  "parseInt",
]);
const callableRootMembers: Readonly<Record<string, ReadonlySet<string>>> = {
  Array: new Set(["from", "isArray"]),
  Date: new Set([
    "create",
    "getDay",
    "getMonth",
    "getTime",
    "getYear",
    "now",
    "toISOString",
    "toLocaleDateString",
    "toLocaleTimeString",
  ]),
  JSON: new Set(["stringify"]),
  Math: new Set(["abs", "ceil", "floor", "max", "min", "pow", "round", "sqrt"]),
  Object: new Set(["entries", "keys", "values"]),
};
const enabledComponentNames = enabledCustomJsxComponents.map((component) => component.name);

export function closestCustomJsxComponentName(value: string): string | undefined {
  let closest: { name: string; distance: number } | undefined;
  for (const name of enabledComponentNames) {
    const distance = editDistance(value.toLowerCase(), name.toLowerCase());
    if (!closest || distance < closest.distance) closest = { name, distance };
  }
  return closest && closest.distance <= Math.max(2, Math.floor(value.length / 3)) ? closest.name : undefined;
}

export function customJsxTagName(node: AstNode): string | null {
  if (node.type === "JSXIdentifier") return String(node.name ?? "");
  if (node.type !== "JSXMemberExpression") return null;
  const object = nodeOf(node.object);
  const property = nodeOf(node.property);
  const left = object ? customJsxTagName(object) : null;
  const right = property ? customJsxTagName(property) : null;
  return left && right ? `${left}.${right}` : null;
}

export function isSafeLiteralCustomJsxUrl(value: string): boolean {
  if (value.startsWith("#") || (value.startsWith("/") && !value.startsWith("//"))) return true;
  try {
    const url = new URL(value);
    return (url.protocol === "http:" || url.protocol === "https:") && !url.username && !url.password;
  } catch {
    return false;
  }
}

export function isStaticallyCallableBinding(node: AstNode): boolean {
  if (node.type === "Identifier") return callableRootBindings.has(String(node.name));
  if (node.type !== "MemberExpression") return false;
  const object = nodeOf(node.object);
  const property = nodeOf(node.property);
  if (object?.type !== "Identifier") return false;
  const propertyName = node.computed ? staticPropertyName(property) : String(property?.name ?? "");
  return Boolean(propertyName && callableRootMembers[String(object.name)]?.has(propertyName));
}

export function canStaticallyProduceCallable(node: AstNode): boolean {
  if (isStaticallyCallableBinding(node) || ["ArrowFunctionExpression", "FunctionExpression"].includes(node.type)) {
    return true;
  }
  if (node.type === "ConditionalExpression") {
    const consequent = nodeOf(node.consequent);
    const alternate = nodeOf(node.alternate);
    return Boolean(
      (consequent && canStaticallyProduceCallable(consequent)) ||
      (alternate && canStaticallyProduceCallable(alternate)),
    );
  }
  if (node.type === "LogicalExpression") {
    const left = nodeOf(node.left);
    const right = nodeOf(node.right);
    return Boolean((left && canStaticallyProduceCallable(left)) || (right && canStaticallyProduceCallable(right)));
  }
  if (node.type === "ChainExpression") {
    const expression = nodeOf(node.expression);
    return Boolean(expression && canStaticallyProduceCallable(expression));
  }
  return false;
}

function editDistance(left: string, right: string): number {
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    const current = [leftIndex];
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      current[rightIndex] = Math.min(
        (current[rightIndex - 1] ?? 0) + 1,
        (previous[rightIndex] ?? 0) + 1,
        (previous[rightIndex - 1] ?? 0) + (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1),
      );
    }
    previous.splice(0, previous.length, ...current);
  }
  return previous[right.length] ?? Math.max(left.length, right.length);
}
