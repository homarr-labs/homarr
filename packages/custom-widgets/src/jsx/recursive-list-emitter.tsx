import type { ComponentType, ReactNode } from "react";
import { createElement } from "react";

import { buildTrustedRecursiveList } from "./recursive-list";
import { asNode, asNodeArray, SafeJsxError } from "./interpreter-foundation";
import type { AstNode, Environment, InterpreterCallback } from "./interpreter-foundation";
import type { JsxEmitterContext } from "./emitter-context";
import { diagnoseCustomJsxProps, normalizedProperty, sanitizeCustomJsxProps } from "./safe-properties";

const supportedProps = new Set([
  "data",
  "childrenPath",
  "keyPath",
  "maxDepth",
  "maxNodes",
  "defaultExpandedDepth",
  "indent",
  "gap",
  "showLines",
  "bind",
]);

export function emitRecursiveList(
  node: AstNode,
  environment: Environment,
  depth: number,
  component: ComponentType<never>,
  context: JsxEmitterContext,
): ReactNode {
  const opening = asNode(node.openingElement, "RecursiveList opening element");
  const props: Record<string, unknown> = Object.create(null);
  for (const attribute of asNodeArray(opening.attributes, "RecursiveList attributes")) {
    if (attribute.type === "JSXSpreadAttribute") {
      const spread = context.evaluate(
        asNode(attribute.argument, "RecursiveList spread attribute"),
        environment,
        depth + 1,
      );
      if (spread && typeof spread === "object" && !Array.isArray(spread)) {
        for (const [name, value] of Object.entries(spread)) {
          props[name] = value;
        }
      }
      continue;
    }
    if (attribute.type !== "JSXAttribute") throw new SafeJsxError(`Unsupported JSX attribute: ${attribute.type}`);
    const nameNode = asNode(attribute.name, "RecursiveList attribute name");
    if (nameNode.type !== "JSXIdentifier") throw new SafeJsxError("Namespaced JSX attributes are not supported");
    const rawName = String(nameNode.name);
    const name = rawName === "bind" ? rawName : normalizedProperty(rawName);
    if (attribute.value == null) props[name] = true;
    else {
      const value = asNode(attribute.value, `RecursiveList ${name} value`);
      props[name] = value.type === "Literal" ? value.value : context.evaluate(value, environment, depth + 1);
    }
  }

  const callback = recursiveListCallback(node, environment, context);
  const data = props.data;
  const childrenPath = typeof props.childrenPath === "string" ? props.childrenPath : "";
  const keyPath = typeof props.keyPath === "string" ? props.keyPath : "";
  const nodes = buildTrustedRecursiveList({
    data,
    childrenPath,
    keyPath,
    maxDepth: props.maxDepth,
    maxNodes: props.maxNodes,
    budget: context.budget,
    warnings: context.warnings,
    render: (value, metadata, callbackDepth) =>
      context.renderCallback(callback, [value, metadata], depth + callbackDepth + 1),
  });
  if (Object.hasOwn(props, "bind")) {
    context.warnings.add("BINDING_UNAVAILABLE: 'RecursiveList' does not have a declarative binding adapter");
  }
  diagnoseCustomJsxProps(props, "RecursiveList").forEach((diagnostic) => context.warnings.add(diagnostic));
  const rootProps = sanitizeCustomJsxProps(
    Object.fromEntries(Object.entries(props).filter(([name]) => !supportedProps.has(name))),
    "RecursiveList",
  );
  const trustedProps = {
    nodes,
    defaultExpandedDepth: finiteNumber(props.defaultExpandedDepth),
    indent: spacing(props.indent),
    gap: spacing(props.gap),
    showLines: props.showLines === true,
    rootProps,
  };
  context.budget.rendered();
  return createElement(component, trustedProps as never);
}

function recursiveListCallback(
  node: AstNode,
  environment: Environment,
  context: JsxEmitterContext,
): InterpreterCallback {
  const meaningfulChildren = asNodeArray(node.children, "RecursiveList children").filter(
    (child) => child.type !== "JSXText" || String(child.value ?? "").trim().length > 0,
  );
  if (meaningfulChildren.length !== 1 || meaningfulChildren[0]?.type !== "JSXExpressionContainer") {
    throw new SafeJsxError("RECURSIVE_LIST_TEMPLATE_REQUIRED: RecursiveList requires exactly one inline arrow child");
  }
  const expression = asNode(meaningfulChildren[0].expression, "RecursiveList template child");
  if (expression.type !== "ArrowFunctionExpression") {
    throw new SafeJsxError("RECURSIVE_LIST_TEMPLATE_REQUIRED: RecursiveList child must be an inline arrow");
  }
  const params = asNodeArray(expression.params, "RecursiveList template parameters");
  if (params.length === 0 || params.length > 2) {
    throw new SafeJsxError(
      "RECURSIVE_LIST_TEMPLATE_REQUIRED: RecursiveList child accepts node and optional metadata parameters",
    );
  }
  return context.createCallback(expression, environment);
}

function spacing(value: unknown): string | number | undefined {
  return typeof value === "string" || typeof value === "number" ? value : undefined;
}

function finiteNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}
