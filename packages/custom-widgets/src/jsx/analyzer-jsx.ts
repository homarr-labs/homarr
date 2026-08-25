import { customJsxCatalogComponentByName } from "../core/component-catalog";
import {
  customJsxBindableComponentNames,
  customJsxComponentByName,
  customJsxSupportedPropsByName,
  resolveCustomJsxComponentName,
} from "../core/component-registry";
import type { AstNode } from "./analyzer-ast";
import { containsEscapingCallback, nodeOf, nodesOf } from "./analyzer-ast";
import { closestCustomJsxComponentName, customJsxTagName, isSafeLiteralCustomJsxUrl } from "./analyzer-language";
import { CUSTOM_JSX_BINDING_IDENTIFIER_PATTERN, CUSTOM_JSX_URL_PROPS, isBlockedCustomJsxProp } from "./policy";
import { getInvalidCustomJsxPropValueReason } from "./runtime-component-policy";

interface AnalyzerJsxContext {
  add(node: AstNode, message: string, severity?: "error" | "warning"): void;
  visit(node: AstNode, depth: number, bindings: ReadonlySet<string>): void;
  visitArrow(node: AstNode, depth: number, bindings: ReadonlySet<string>): void;
}

export function analyzeCustomJsxElement(
  node: AstNode,
  depth: number,
  bindings: ReadonlySet<string>,
  context: AnalyzerJsxContext,
): void {
  const opening = nodeOf(node.openingElement);
  if (!opening) {
    context.add(node, "Invalid JSX element");
    return;
  }
  const nameNode = nodeOf(opening.name);
  const name = nameNode ? customJsxTagName(nameNode) : null;
  const resolvedName = name ? resolveCustomJsxComponentName(name) : null;
  const descriptor = resolvedName ? customJsxComponentByName.get(resolvedName) : undefined;
  const attributes = nodesOf(opening.attributes);
  if (resolvedName === "TablerIcon") {
    const attributeNames = new Set<string>();
    for (const attribute of attributes) {
      if (attribute.type !== "JSXAttribute") continue;
      const attributeName = nodeOf(attribute.name);
      if (attributeName?.type === "JSXIdentifier") attributeNames.add(String(attributeName.name));
    }
    for (const prop of customJsxCatalogComponentByName.get(resolvedName)?.props ?? []) {
      if (prop.required && !attributeNames.has(prop.name)) {
        context.add(opening, `MISSING_REQUIRED_PROP: '${prop.name}' on ${name} is required`);
      }
    }
  }
  if (descriptor?.safety === "denied") {
    context.add(
      opening,
      `BLOCKED_CAPABILITY: '${name}' is not available${descriptor.reason ? ` because it ${descriptor.reason.toLowerCase()}` : ""}`,
    );
  } else if (!descriptor) {
    const suggestion = name ? closestCustomJsxComponentName(name) : undefined;
    context.add(
      opening,
      name
        ? `UNKNOWN_COMPONENT: '${name}' is not available${suggestion ? `. Did you mean '${suggestion}'?` : ""}`
        : "UNKNOWN_COMPONENT: Invalid JSX component name",
    );
  }

  for (const attribute of attributes) {
    if (attribute.type === "JSXSpreadAttribute") {
      const argument = nodeOf(attribute.argument);
      if (argument) context.visit(argument, depth + 1, bindings);
      continue;
    }
    if (attribute.type !== "JSXAttribute") {
      context.add(attribute, `Unsupported JSX attribute '${attribute.type}'`);
      continue;
    }
    const attributeNameNode = nodeOf(attribute.name);
    const attributeName = attributeNameNode?.type === "JSXIdentifier" ? String(attributeNameNode.name) : "";
    const componentBlockedProp = descriptor?.blockedProps.find(({ name: propName }) => propName === attributeName);
    if (componentBlockedProp) {
      context.add(
        attribute,
        `BLOCKED_CAPABILITY: Prop '${attributeName}' on '${name}' is not allowed because ${componentBlockedProp.reason.toLowerCase()}`,
      );
    } else if (isBlockedCustomJsxProp(attributeName)) {
      context.add(attribute, `BLOCKED_CAPABILITY: Prop '${attributeName}' is not allowed`);
    } else if (
      resolvedName &&
      attributeName !== "bind" &&
      !customJsxSupportedPropsByName.get(resolvedName)?.has(attributeName)
    ) {
      if (resolvedName === "TablerIcon") {
        context.add(attribute, `UNKNOWN_COMPONENT_PROP: '${attributeName}' on ${name} is not supported`);
      } else {
        context.add(attribute, `UNKNOWN_MANTINE_PROP: '${attributeName}' on ${name} will be passed through`, "warning");
      }
    } else if (resolvedName && attributeName === "bind" && !customJsxBindableComponentNames.has(resolvedName)) {
      context.add(attribute, `BINDING_UNAVAILABLE: '${name}' does not have a declarative binding adapter`, "warning");
    }
    if (attributeName === "bind") analyzeBindAttribute(attribute, context);
    analyzeAttributeValue(resolvedName, attributeName, attribute, depth, bindings, context);
  }

  nodesOf(node.children).forEach((child) => {
    const expression = child.type === "JSXExpressionContainer" ? nodeOf(child.expression) : null;
    if (resolvedName === "SubFetch" && expression?.type === "ArrowFunctionExpression") {
      context.visitArrow(expression, depth + 1, bindings);
      return;
    }
    context.visit(child, depth + 1, bindings);
  });
}

function analyzeBindAttribute(attribute: AstNode, context: AnalyzerJsxContext): void {
  const value = nodeOf(attribute.value);
  if (value?.type !== "Literal" || typeof value.value !== "string") {
    context.add(attribute, "bind must use a literal input name");
  } else if (!CUSTOM_JSX_BINDING_IDENTIFIER_PATTERN.test(value.value)) {
    context.add(attribute, `Invalid bind input name '${value.value}'`);
  }
}

function analyzeAttributeValue(
  componentName: string | null,
  attributeName: string,
  attribute: AstNode,
  depth: number,
  bindings: ReadonlySet<string>,
  context: AnalyzerJsxContext,
): void {
  const value = nodeOf(attribute.value);
  const literalValue =
    value?.type === "Literal"
      ? value
      : value?.type === "JSXExpressionContainer" && nodeOf(value.expression)?.type === "Literal"
        ? nodeOf(value.expression)
        : null;
  if (componentName && literalValue?.type === "Literal") {
    const reason = getInvalidCustomJsxPropValueReason(componentName, attributeName, literalValue.value);
    if (reason) context.add(attribute, `INVALID_PROP_VALUE: ${reason}`);
  }
  if (
    CUSTOM_JSX_URL_PROPS.has(attributeName) &&
    value?.type === "Literal" &&
    typeof value.value === "string" &&
    !isSafeLiteralCustomJsxUrl(value.value)
  ) {
    context.add(attribute, `INVALID_PROP_VALUE: '${attributeName}' contains an unsafe URL`);
  }
  if (value?.type !== "JSXExpressionContainer") return;
  const expression = nodeOf(value.expression);
  if (expression && containsEscapingCallback(expression)) {
    context.add(attribute, `BLOCKED_CAPABILITY: Callback prop '${attributeName}' is not allowed`);
  } else if (expression && expression.type !== "JSXEmptyExpression") {
    context.visit(expression, depth + 1, bindings);
  }
}
