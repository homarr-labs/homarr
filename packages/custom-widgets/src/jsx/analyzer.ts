import { Parser } from "acorn";
import jsx from "acorn-jsx";

import {
  customJsxBindableComponentNames,
  customJsxComponentByName,
  customJsxSupportedPropsByName,
  enabledCustomJsxComponents,
} from "../core/component-registry";
import {
  CUSTOM_JSX_BLOCKED_PROPERTIES,
  CUSTOM_JSX_LIMITS,
  CUSTOM_JSX_URL_PROPS,
  isBlockedCustomJsxProp,
  normalizeCustomJsxProperty,
} from "./policy";
import type { AstNode } from "./analyzer-ast";
import { containsEscapingCallback, nodeOf, nodesOf, staticPropertyName } from "./analyzer-ast";

export interface CustomJsxTemplateDiagnostic {
  severity: "error" | "warning";
  message: string;
  index: number;
  line: number;
  column: number;
}

const JsxParser = Parser.extend(jsx());
const enabledComponentNames = enabledCustomJsxComponents.map((component) => component.name);

function closestComponentName(value: string): string | undefined {
  let closest: { name: string; distance: number } | undefined;
  for (const name of enabledComponentNames) {
    const distance = editDistance(value.toLowerCase(), name.toLowerCase());
    if (!closest || distance < closest.distance) closest = { name, distance };
  }
  return closest && closest.distance <= Math.max(2, Math.floor(value.length / 3)) ? closest.name : undefined;
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

const rootBindings = new Set([
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
  "state",
  "status",
  "decodeURIComponent",
  "encodeURIComponent",
  "isFinite",
  "isNaN",
  "parseFloat",
  "parseInt",
  "undefined",
]);

function tagName(node: AstNode): string | null {
  if (node.type === "JSXIdentifier") return String(node.name ?? "");
  if (node.type !== "JSXMemberExpression") return null;
  const object = nodeOf(node.object);
  const property = nodeOf(node.property);
  const left = object ? tagName(object) : null;
  const right = property ? tagName(property) : null;
  return left && right ? `${left}.${right}` : null;
}

export function validateCustomJsxTemplate(template: string): CustomJsxTemplateDiagnostic[] {
  const diagnostics: CustomJsxTemplateDiagnostic[] = [];
  let operations = 0;

  const add = (node: AstNode, message: string, severity: "error" | "warning" = "error") => {
    const line = node.loc?.start?.line ?? 1;
    diagnostics.push({
      severity,
      message,
      index: Math.max(0, (node.start ?? 2) - 2),
      line,
      column: Math.max(1, (node.loc?.start?.column ?? 0) + 1 - (line === 1 ? 2 : 0)),
    });
  };

  const checkBudget = (node: AstNode, depth: number) => {
    operations += 1;
    if (depth > CUSTOM_JSX_LIMITS.astDepth)
      add(node, `Template exceeds the AST depth limit (${CUSTOM_JSX_LIMITS.astDepth})`);
    if (operations === CUSTOM_JSX_LIMITS.operations + 1) {
      add(node, `Template exceeds the operation limit (${CUSTOM_JSX_LIMITS.operations})`);
    }
    return depth <= CUSTOM_JSX_LIMITS.astDepth && operations <= CUSTOM_JSX_LIMITS.operations;
  };

  const visit = (node: AstNode, depth: number, bindings: ReadonlySet<string>): void => {
    if (!checkBudget(node, depth)) return;

    switch (node.type) {
      case "Program":
        nodesOf(node.body).forEach((child) => visit(child, depth + 1, bindings));
        return;
      case "ExpressionStatement": {
        const expression = nodeOf(node.expression);
        if (expression) visit(expression, depth + 1, bindings);
        return;
      }
      case "JSXFragment":
        nodesOf(node.children).forEach((child) => visit(child, depth + 1, bindings));
        return;
      case "JSXElement": {
        const opening = nodeOf(node.openingElement);
        if (!opening) {
          add(node, "Invalid JSX element");
          return;
        }
        const nameNode = nodeOf(opening.name);
        const name = nameNode ? tagName(nameNode) : null;
        const descriptor = name ? customJsxComponentByName.get(name) : undefined;
        if (descriptor?.safety === "denied") {
          add(
            opening,
            `BLOCKED_CAPABILITY: '${name}' is not available${descriptor.reason ? ` because it ${descriptor.reason.toLowerCase()}` : ""}`,
          );
        } else if (!descriptor) {
          const suggestion = name ? closestComponentName(name) : undefined;
          add(
            opening,
            name
              ? `UNKNOWN_COMPONENT: '${name}' is not available${suggestion ? `. Did you mean '${suggestion}'?` : ""}`
              : "UNKNOWN_COMPONENT: Invalid JSX component name",
          );
        }

        for (const attribute of nodesOf(opening.attributes)) {
          if (attribute.type === "JSXSpreadAttribute") {
            const argument = nodeOf(attribute.argument);
            if (argument) visit(argument, depth + 1, bindings);
            continue;
          }
          if (attribute.type !== "JSXAttribute") {
            add(attribute, `Unsupported JSX attribute '${attribute.type}'`);
            continue;
          }
          const attributeNameNode = nodeOf(attribute.name);
          const attributeName = attributeNameNode?.type === "JSXIdentifier" ? String(attributeNameNode.name) : "";
          if (isBlockedCustomJsxProp(attributeName)) {
            add(attribute, `BLOCKED_CAPABILITY: Prop '${attributeName}' is not allowed`);
          } else if (name && attributeName !== "bind" && !customJsxSupportedPropsByName.get(name)?.has(attributeName)) {
            add(attribute, `UNKNOWN_MANTINE_PROP: '${attributeName}' on ${name} will be passed through`, "warning");
          } else if (name && attributeName === "bind" && !customJsxBindableComponentNames.has(name)) {
            add(attribute, `BINDING_UNAVAILABLE: '${name}' does not have a declarative binding adapter`, "warning");
          }
          const value = nodeOf(attribute.value);
          if (
            CUSTOM_JSX_URL_PROPS.has(attributeName) &&
            value?.type === "Literal" &&
            typeof value.value === "string" &&
            !isSafeLiteralUrl(value.value)
          ) {
            add(attribute, `INVALID_PROP_VALUE: '${attributeName}' contains an unsafe URL`);
          }
          if (value?.type === "JSXExpressionContainer") {
            const expression = nodeOf(value.expression);
            if (expression && containsEscapingCallback(expression)) {
              add(attribute, `BLOCKED_CAPABILITY: Callback prop '${attributeName}' is not allowed`);
            } else if (expression && expression.type !== "JSXEmptyExpression") {
              visit(expression, depth + 1, bindings);
            }
          }
        }
        nodesOf(node.children).forEach((child) => visit(child, depth + 1, bindings));
        return;
      }
      case "JSXText":
      case "JSXEmptyExpression":
      case "TemplateElement":
        return;
      case "JSXExpressionContainer": {
        const expression = nodeOf(node.expression);
        if (expression && expression.type !== "JSXEmptyExpression") visit(expression, depth + 1, bindings);
        return;
      }
      case "Literal":
        if (node.regex !== undefined || typeof node.value === "bigint") {
          add(node, "Regular expressions and bigint literals are not supported");
        }
        return;
      case "Identifier": {
        const name = String(node.name ?? "");
        if (!bindings.has(name)) add(node, `Unknown binding '${name}'`);
        return;
      }
      case "ArrayExpression":
        nodesOf(node.elements).forEach((child) => {
          const argument = child.type === "SpreadElement" ? nodeOf(child.argument) : child;
          if (argument) visit(argument, depth + 1, bindings);
        });
        return;
      case "ObjectExpression":
        nodesOf(node.properties).forEach((property) => {
          if (property.type === "SpreadElement") {
            const argument = nodeOf(property.argument);
            if (argument) visit(argument, depth + 1, bindings);
            return;
          }
          if (property.type !== "Property" || property.kind !== "init" || property.method || property.shorthand) {
            add(property, "Only explicit object properties are supported");
            return;
          }
          const key = nodeOf(property.key);
          if (property.computed && key) visit(key, depth + 1, bindings);
          if (
            !property.computed &&
            key &&
            CUSTOM_JSX_BLOCKED_PROPERTIES.has(normalizeCustomJsxProperty(key.name ?? key.value))
          ) {
            add(key, "Reflective object properties are not allowed");
          }
          const value = nodeOf(property.value);
          if (value) visit(value, depth + 1, bindings);
        });
        return;
      case "UnaryExpression":
        if (!["!", "+", "-", "typeof"].includes(String(node.operator))) {
          add(node, `Unary operator '${String(node.operator)}' is not supported`);
        }
        if (nodeOf(node.argument)) visit(node.argument as AstNode, depth + 1, bindings);
        return;
      case "BinaryExpression":
      case "LogicalExpression": {
        const left = nodeOf(node.left);
        const right = nodeOf(node.right);
        if (left) visit(left, depth + 1, bindings);
        if (right) visit(right, depth + 1, bindings);
        return;
      }
      case "ConditionalExpression": {
        [node.test, node.consequent, node.alternate].map(nodeOf).forEach((child) => {
          if (child) visit(child, depth + 1, bindings);
        });
        return;
      }
      case "MemberExpression": {
        const object = nodeOf(node.object);
        const property = nodeOf(node.property);
        if (object) visit(object, depth + 1, bindings);
        if (node.computed && property) visit(property, depth + 1, bindings);
        const propertyName = node.computed
          ? staticPropertyName(property)
          : String(property?.name ?? property?.value ?? "");
        if (propertyName && CUSTOM_JSX_BLOCKED_PROPERTIES.has(normalizeCustomJsxProperty(propertyName))) {
          add(property ?? node, "Reflective property access is not allowed");
        }
        return;
      }
      case "CallExpression": {
        const callee = nodeOf(node.callee);
        if (callee) visit(callee, depth + 1, bindings);
        nodesOf(node.arguments).forEach((argument) => {
          if (argument.type === "SpreadElement") add(argument, "Spread call arguments are not supported");
          else visit(argument, depth + 1, bindings);
        });
        return;
      }
      case "ArrowFunctionExpression": {
        if (node.async || node.generator || node.expression === false) {
          add(node, "Only synchronous expression-bodied arrow callbacks are supported");
          return;
        }
        const callbackBindings = new Set(bindings);
        for (const parameter of nodesOf(node.params)) {
          if (parameter.type !== "Identifier") add(parameter, "Callback parameters must be identifiers");
          else callbackBindings.add(String(parameter.name));
        }
        const body = nodeOf(node.body);
        if (body) visit(body, depth + 1, callbackBindings);
        return;
      }
      case "TemplateLiteral":
        nodesOf(node.expressions).forEach((expression) => visit(expression, depth + 1, bindings));
        return;
      case "ChainExpression": {
        const expression = nodeOf(node.expression);
        if (expression) visit(expression, depth + 1, bindings);
        return;
      }
      default:
        add(node, `Unsupported expression '${node.type}'`);
    }
  };

  try {
    const program = JsxParser.parse(`<>${template}</>`, {
      ecmaVersion: "latest",
      sourceType: "module",
      locations: true,
    }) as unknown as AstNode;
    visit(program, 0, rootBindings);
  } catch (error) {
    const parseError = error as Error & { pos?: number; loc?: { line?: number; column?: number } };
    diagnostics.push({
      severity: "error",
      message: parseError.message,
      index: Math.max(0, (parseError.pos ?? 2) - 2),
      line: parseError.loc?.line ?? 1,
      column: Math.max(1, (parseError.loc?.column ?? 2) - 1),
    });
  }

  return diagnostics;
}

function isSafeLiteralUrl(value: string) {
  if (value.startsWith("#") || (value.startsWith("/") && !value.startsWith("//"))) return true;
  try {
    const url = new URL(value);
    return (url.protocol === "http:" || url.protocol === "https:") && !url.username && !url.password;
  } catch {
    return false;
  }
}
