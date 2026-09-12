import type { ReactNode } from "react";
import { createElement, Fragment } from "react";

import { asNode, asNodeArray, SafeJsxError, Environment } from "./interpreter-foundation";
import type { AstNode } from "./interpreter-foundation";
import type { JsxEmitterContext } from "./emitter-context";
import { resolveCustomJsxComponentName } from "../core/component-registry";
import { diagnoseCustomJsxProps, normalizedProperty, sanitizeCustomJsxProps } from "./safe-properties";
import { parseCustomJsxTemplate } from "./interpreter-parser";
import { scopeCustomWidgetClassNames } from "../core/scoped-styles";
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
  if (!component && resolvedTag !== "View") {
    context.warnings.add(`Unknown or unavailable component: ${tag}`);
    return null;
  }
  const rawProps: Record<string, unknown> = {};
  for (const attribute of asNodeArray(opening.attributes, "JSX attributes")) {
    if (attribute.type === "JSXSpreadAttribute") {
      const spread = context.evaluate(asNode(attribute.argument, "spread attribute"), environment, depth + 1);
      if (spread && typeof spread === "object" && !Array.isArray(spread)) {
        if (Object.hasOwn(spread, "bind")) {
          throw new SafeJsxError("BIND_SPREAD_NOT_ALLOWED: The bind prop must be an explicit literal JSX attribute");
        }
        Object.assign(rawProps, spread);
      }
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
  if (resolvedTag === "View") {
    const fragment = context.fragments?.[String(rawProps.name)];
    if (!fragment) throw new SafeJsxError(`Unknown view fragment: ${String(rawProps.name)}`);
    const values = rawProps.values;
    const props = values && typeof values === "object" && !Array.isArray(values) ? values : {};
    const content = context.evaluate(
      parseCustomJsxTemplate(fragment),
      new Environment({ props }, environment, String(rawProps.name)),
      depth + 1,
    ) as ReactNode;
    if (typeof rawProps.key === "string" || typeof rawProps.key === "number") {
      context.budget.rendered();
      return createElement(Fragment, { key: rawProps.key }, content);
    }
    return content;
  }
  if (!component) return null;
  const children = asNodeArray(node.children, "JSX children").map((child) => {
    const expression =
      child.type === "JSXExpressionContainer" ? asNode(child.expression, "JSX child expression") : null;
    if (["SubFetch", "NativeQuery"].includes(resolvedTag) && expression?.type === "ArrowFunctionExpression") {
      const callback = context.createCallback(expression, environment);
      return (...values: unknown[]) => context.renderCallback(callback, values, depth + 1);
    }
    return context.evaluate(child, environment, depth + 1);
  });
  diagnoseCustomJsxProps(rawProps, resolvedTag).forEach((diagnostic) => context.warnings.add(diagnostic));
  const props = sanitizeCustomJsxProps(rawProps, resolvedTag);
  props.className = scopeCustomWidgetClassNames(props.className, context.scopeId);
  delete props["data-cw-source"];
  if (context.captureSourceLocations) {
    const fragment = environment.getSourceId();
    const source = context.fragments?.[fragment ?? ""] ?? context.template ?? "";
    const index = Math.max(0, (node.start ?? 2) - 2);
    const prefix = source.slice(0, index);
    props["data-cw-source"] = JSON.stringify({
      index,
      line: prefix.split("\n").length,
      column: index - prefix.lastIndexOf("\n"),
      fragment,
    });
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
