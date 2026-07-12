import { Parser } from "acorn";
import jsx from "acorn-jsx";

import { customJsxComponentByName, customJsxSupportedPropsByName } from "@homarr/definitions";

interface AstNode {
  type: string;
  start?: number;
  loc?: { start?: { line?: number; column?: number } };
  [key: string]: unknown;
}

export interface CustomJsxTemplateDiagnostic {
  severity: "error" | "warning";
  message: string;
  index: number;
  line: number;
  column: number;
}

const JsxParser = Parser.extend(jsx());
const MAX_AST_DEPTH = 64;
const MAX_OPERATIONS = 25_000;

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
  "decodeURIComponent",
  "encodeURIComponent",
  "isFinite",
  "isNaN",
  "parseFloat",
  "parseInt",
  "undefined",
]);

const blockedProperties = new Set([
  "__proto__",
  "apply",
  "arguments",
  "bind",
  "call",
  "callee",
  "caller",
  "constructor",
  "prototype",
]);

const blockedProps = new Set([
  "children",
  "className",
  "classNames",
  "classes",
  "component",
  "dangerouslySetInnerHTML",
  "innerRef",
  "portalProps",
  "ref",
  "renderRoot",
  "styles",
  "unstyled",
  "withinPortal",
]);

const nodeOf = (value: unknown): AstNode | null =>
  value !== null && typeof value === "object" && typeof (value as { type?: unknown }).type === "string"
    ? (value as AstNode)
    : null;

const nodesOf = (value: unknown): AstNode[] =>
  Array.isArray(value) ? value.map(nodeOf).filter((node): node is AstNode => node !== null) : [];

const normalizedProperty = (value: unknown): string =>
  String(value ?? "")
    .normalize("NFKC")
    .toLowerCase();

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
    if (depth > MAX_AST_DEPTH) add(node, `Template exceeds the AST depth limit (${MAX_AST_DEPTH})`);
    if (operations === MAX_OPERATIONS + 1) {
      add(node, `Template exceeds the operation limit (${MAX_OPERATIONS})`);
    }
    return depth <= MAX_AST_DEPTH && operations <= MAX_OPERATIONS;
  };

  const tagName = (node: AstNode): string | null => {
    if (node.type === "JSXIdentifier") return String(node.name ?? "");
    if (node.type !== "JSXMemberExpression") return null;
    const object = nodeOf(node.object);
    const property = nodeOf(node.property);
    const left = object ? tagName(object) : null;
    const right = property ? tagName(property) : null;
    return left && right ? `${left}.${right}` : null;
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
        if (!descriptor || descriptor.safety === "denied") {
          add(opening, name ? `Component '${name}' is not available` : "Invalid JSX component name");
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
          const supportedProps = name ? customJsxSupportedPropsByName.get(name) : undefined;
          if ((/^on/i.test(attributeName) && !supportedProps?.has(attributeName)) || blockedProps.has(attributeName)) {
            add(attribute, `Prop '${attributeName}' is not allowed`);
          } else if (name && !supportedProps?.has(attributeName)) {
            add(attribute, `Prop '${attributeName}' is not supported by ${name} and will be ignored`, "warning");
          }
          const value = nodeOf(attribute.value);
          if (value?.type === "JSXExpressionContainer") {
            const expression = nodeOf(value.expression);
            if (expression && expression.type !== "JSXEmptyExpression") visit(expression, depth + 1, bindings);
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
          if (!property.computed && key && blockedProperties.has(normalizedProperty(key.name ?? key.value))) {
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
        if (property && blockedProperties.has(normalizedProperty(property.name ?? property.value))) {
          add(property, "Reflective property access is not allowed");
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
