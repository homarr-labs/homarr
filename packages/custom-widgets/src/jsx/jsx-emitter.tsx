import type { ReactNode } from "react";
import { createElement, Fragment } from "react";

import { asNode, asNodeArray, SafeJsxError } from "./interpreter-foundation";
import type { AstNode, Environment } from "./interpreter-foundation";
import type { JsxEmitterContext } from "./emitter-context";
import { resolveCustomJsxComponentName } from "../core/component-registry";
import { diagnoseCustomJsxProps, normalizedProperty, sanitizeCustomJsxProps } from "./safe-properties";
import { CUSTOM_JSX_BLOCKED_TAGS } from "./policy";

export function emitJsxFragment(
  node: AstNode,
  environment: Environment,
  depth: number,
  context: JsxEmitterContext,
): ReactNode {
  const children = asNodeArray(node.children, "fragment children").map((child) =>
    context.evaluate(child, environment, depth + 1),
  );
  context.budget.rendered();
  return createElement(Fragment, null, ...(children as ReactNode[]));
}

export function emitJsxElement(
  node: AstNode,
  environment: Environment,
  depth: number,
  context: JsxEmitterContext,
): ReactNode {
  const opening = asNode(node.openingElement, "JSX opening element");
  const tag = jsxTagName(asNode(opening.name, "JSX tag"));
  const resolvedTag = resolveCustomJsxComponentName(tag);
  if (CUSTOM_JSX_BLOCKED_TAGS.has(tag.toLowerCase())) {
    context.warnings.add(`Blocked element: ${tag}`);
    return null;
  }
  const component = context.components[resolvedTag];
  if (!component) {
    context.warnings.add(`Unknown or unavailable component: ${tag}`);
    return null;
  }
  const rawProps: Record<string, unknown> = {};
  for (const attribute of asNodeArray(opening.attributes, "JSX attributes")) {
    if (attribute.type === "JSXSpreadAttribute") {
      const spread = context.evaluate(asNode(attribute.argument, "spread attribute"), environment, depth + 1);
      if (spread && typeof spread === "object" && !Array.isArray(spread)) Object.assign(rawProps, spread);
      continue;
    }
    if (attribute.type !== "JSXAttribute") throw new SafeJsxError(`Unsupported JSX attribute: ${attribute.type}`);
    const nameNode = asNode(attribute.name, "attribute name");
    if (nameNode.type !== "JSXIdentifier") throw new SafeJsxError("Namespaced JSX attributes are not supported");
    const rawName = String(nameNode.name);
    // `bind` is a safe declarative JSX prop even though reflective `.bind` access is blocked by the interpreter.
    const name = rawName === "bind" ? rawName : normalizedProperty(rawName);
    if (attribute.value == null) rawProps[name] = true;
    else {
      const value = asNode(attribute.value, "attribute value");
      rawProps[name] = value.type === "Literal" ? value.value : context.evaluate(value, environment, depth + 1);
    }
  }
  const children = asNodeArray(node.children, "JSX children").map((child) => {
    const expression =
      child.type === "JSXExpressionContainer" ? asNode(child.expression, "JSX child expression") : null;
    if (resolvedTag === "SubFetch" && expression?.type === "ArrowFunctionExpression") {
      const callback = context.createCallback(expression, environment);
      return (value: unknown) => context.renderCallback(callback, [value], depth + 1);
    }
    return context.evaluate(child, environment, depth + 1);
  });
  diagnoseCustomJsxProps(rawProps, resolvedTag).forEach((diagnostic) => context.warnings.add(diagnostic));
  const props = sanitizeCustomJsxProps(rawProps, resolvedTag);
  context.budget.rendered();
  return createElement(component, props as never, ...(children as ReactNode[]));
}

function jsxTagName(node: AstNode): string {
  if (node.type === "JSXIdentifier") return String(node.name);
  if (node.type === "JSXMemberExpression") {
    return `${jsxTagName(asNode(node.object, "JSX member object"))}.${jsxTagName(asNode(node.property, "JSX member property"))}`;
  }
  throw new SafeJsxError(`Unsupported JSX tag: ${node.type}`);
}
