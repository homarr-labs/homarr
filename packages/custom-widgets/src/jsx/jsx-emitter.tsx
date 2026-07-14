import type { ComponentType, ReactNode } from "react";
import { createElement, Fragment } from "react";

import { asNode, asNodeArray, isInterpreterCallback, SafeJsxError } from "./interpreter-foundation";
import type { AstNode, Budget, Environment, InterpreterCallback } from "./interpreter-foundation";
import { normalizedProperty, sanitizeCustomJsxProps } from "./safe-properties";
import { CUSTOM_JSX_BLOCKED_TAGS } from "./policy";

export interface JsxEmitterContext {
  components: Readonly<Record<string, ComponentType<never>>>;
  budget: Budget;
  warnings: Set<string>;
  evaluate(node: AstNode, environment: Environment, depth: number): unknown;
  renderCallback(callback: InterpreterCallback, args: unknown[]): ReactNode;
}

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
  if (CUSTOM_JSX_BLOCKED_TAGS.has(tag.toLowerCase())) {
    context.warnings.add(`Blocked element: ${tag}`);
    return null;
  }
  const component = context.components[tag];
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
    const name = normalizedProperty(nameNode.name);
    if (attribute.value == null) rawProps[name] = true;
    else {
      const value = asNode(attribute.value, "attribute value");
      rawProps[name] = value.type === "Literal" ? value.value : context.evaluate(value, environment, depth + 1);
    }
  }
  let children = asNodeArray(node.children, "JSX children").map((child) =>
    context.evaluate(child, environment, depth + 1),
  );
  const props = sanitizeCustomJsxProps(rawProps, tag);
  if (tag === "SubFetch") {
    const callbackChildren = children.filter(isInterpreterCallback);
    const callbackProp = rawProps.render;
    if (callbackProp !== undefined && !isInterpreterCallback(callbackProp)) {
      throw new SafeJsxError("SubFetch render must be an inline arrow callback");
    }
    if (callbackChildren.length > 1 || (callbackChildren.length === 1 && callbackProp !== undefined)) {
      throw new SafeJsxError("SubFetch accepts only one render callback");
    }
    const callback = isInterpreterCallback(callbackProp) ? callbackProp : callbackChildren[0];
    if (callback) {
      props.render = (value: unknown, metadata: unknown) => context.renderCallback(callback, [value, metadata]);
      children = children.filter((child) => child !== callback);
    }
  }
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
