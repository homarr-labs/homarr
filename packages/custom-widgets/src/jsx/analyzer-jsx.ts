import {
  customJsxBindableComponentNames,
  customJsxComponentByName,
  customJsxSupportedPropsByName,
} from "../core/component-registry";
import type { AstNode } from "./analyzer-ast";
import { containsEscapingCallback, nodeOf, nodesOf } from "./analyzer-ast";
import {
  closestCustomJsxComponentName,
  customJsxTagName,
  isRestrictedRecursiveListPath,
  isSafeLiteralCustomJsxUrl,
} from "./analyzer-language";
import { CUSTOM_JSX_URL_PROPS, isBlockedCustomJsxProp } from "./policy";
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
  const descriptor = name ? customJsxComponentByName.get(name) : undefined;
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

  const attributeNames = new Set<string>();
  let hasAttributeSpread = false;
  for (const attribute of nodesOf(opening.attributes)) {
    if (attribute.type === "JSXSpreadAttribute") {
      hasAttributeSpread = true;
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
    attributeNames.add(attributeName);
    const componentBlockedProp = descriptor?.blockedProps.find(({ name: propName }) => propName === attributeName);
    if (componentBlockedProp) {
      context.add(
        attribute,
        `BLOCKED_CAPABILITY: Prop '${attributeName}' on '${name}' is not allowed because ${componentBlockedProp.reason.toLowerCase()}`,
      );
    } else if (isBlockedCustomJsxProp(attributeName)) {
      context.add(attribute, `BLOCKED_CAPABILITY: Prop '${attributeName}' is not allowed`);
    } else if (name && attributeName !== "bind" && !customJsxSupportedPropsByName.get(name)?.has(attributeName)) {
      context.add(attribute, `UNKNOWN_MANTINE_PROP: '${attributeName}' on ${name} will be passed through`, "warning");
    } else if (name && attributeName === "bind" && !customJsxBindableComponentNames.has(name)) {
      context.add(attribute, `BINDING_UNAVAILABLE: '${name}' does not have a declarative binding adapter`, "warning");
    }
    analyzeAttributeValue(name, attributeName, attribute, depth, bindings, context);
  }

  if (name === "RecursiveList") analyzeRecursiveList(node, opening, attributeNames, hasAttributeSpread, context);
  nodesOf(node.children).forEach((child) => {
    if (name === "RecursiveList" && child.type === "JSXExpressionContainer") {
      const expression = nodeOf(child.expression);
      if (expression?.type === "ArrowFunctionExpression") {
        context.visitArrow(expression, depth + 1, bindings);
        return;
      }
    }
    context.visit(child, depth + 1, bindings);
  });
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
  if (componentName === "RecursiveList" && literalValue?.type === "Literal") {
    if (
      ["childrenPath", "keyPath"].includes(attributeName) &&
      (typeof literalValue.value !== "string" || !isRestrictedRecursiveListPath(literalValue.value))
    ) {
      context.add(attribute, `INVALID_PROP_VALUE: '${attributeName}' must be a safe dotted property path`);
    }
    if (
      attributeName === "maxDepth" &&
      (typeof literalValue.value !== "number" ||
        !Number.isInteger(literalValue.value) ||
        literalValue.value < 1 ||
        literalValue.value > 32)
    ) {
      context.add(attribute, "INVALID_PROP_VALUE: 'maxDepth' must be between 1 and 32");
    }
    if (
      attributeName === "maxNodes" &&
      (typeof literalValue.value !== "number" ||
        !Number.isInteger(literalValue.value) ||
        literalValue.value < 1 ||
        literalValue.value > 2_000)
    ) {
      context.add(attribute, "INVALID_PROP_VALUE: 'maxNodes' must be between 1 and 2000");
    }
  }
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

function analyzeRecursiveList(
  node: AstNode,
  opening: AstNode,
  attributeNames: ReadonlySet<string>,
  hasAttributeSpread: boolean,
  context: AnalyzerJsxContext,
): void {
  for (const requiredProp of ["data", "childrenPath", "keyPath"]) {
    if (!hasAttributeSpread && !attributeNames.has(requiredProp)) {
      context.add(opening, `INVALID_PROP_VALUE: RecursiveList requires '${requiredProp}'`);
    }
  }
  const meaningfulChildren = nodesOf(node.children).filter(
    (child) => child.type !== "JSXText" || String(child.value ?? "").trim().length > 0,
  );
  const templateExpression =
    meaningfulChildren.length === 1 && meaningfulChildren[0]?.type === "JSXExpressionContainer"
      ? nodeOf(meaningfulChildren[0].expression)
      : null;
  if (templateExpression?.type !== "ArrowFunctionExpression") {
    context.add(node, "RECURSIVE_LIST_TEMPLATE_REQUIRED: RecursiveList requires exactly one inline arrow child");
    return;
  }
  const parameters = nodesOf(templateExpression.params);
  if (parameters.length === 0 || parameters.length > 2) {
    context.add(
      templateExpression,
      "RECURSIVE_LIST_TEMPLATE_REQUIRED: RecursiveList child accepts node and optional metadata parameters",
    );
  }
}
