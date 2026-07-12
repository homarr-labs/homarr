import type { ComponentType, ReactNode } from "react";
import { createElement, Fragment } from "react";
import { Parser } from "acorn";
import jsx from "acorn-jsx";

import { customJsxSupportedPropsByName } from "@homarr/definitions";

import { isSafeCallable } from "./safe-bindings";

interface AstNode {
  type: string;
  start?: number;
  end?: number;
  [key: string]: unknown;
}

interface InterpreterCallback {
  readonly kind: typeof INTERPRETER_CALLBACK;
  readonly params: readonly string[];
  readonly body: AstNode;
  readonly environment: Environment;
}

interface EvaluationBudgets {
  maxAstDepth: number;
  maxOperations: number;
  maxCollectionItems: number;
  maxRenderedNodes: number;
  maxStringLength: number;
}

export interface SafeJsxBudgets extends Partial<EvaluationBudgets> {}

export interface RenderSafeJsxOptions {
  template: string;
  components: Readonly<Record<string, ComponentType<never>>>;
  bindings: Readonly<Record<string, unknown>>;
  budgets?: SafeJsxBudgets;
}

export interface SafeJsxRenderResult {
  node: ReactNode;
  warnings: string[];
}

const JsxParser = Parser.extend(jsx());
const INTERPRETER_CALLBACK = Symbol("custom-jsx-interpreter-callback");
const MAX_TEMPLATE_LENGTH = 50_000;

const DEFAULT_BUDGETS: EvaluationBudgets = {
  maxAstDepth: 64,
  maxOperations: 25_000,
  maxCollectionItems: 2_000,
  maxRenderedNodes: 10_000,
  maxStringLength: 200_000,
};

const BLOCKED_PROPERTIES = new Set([
  "__proto__",
  "arguments",
  "bind",
  "call",
  "callee",
  "caller",
  "constructor",
  "prototype",
  "apply",
]);

const BLOCKED_TAGS = new Set(["base", "embed", "form", "iframe", "link", "meta", "object", "script", "style"]);

const BLOCKED_PROPS = new Set([
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

const URL_PROPS = new Set(["backgroundImage", "href", "src"]);
const BLOCKED_STYLE_KEYS = new Set([
  "backdropFilter",
  "behavior",
  "bottom",
  "clipPath",
  "content",
  "filter",
  "inset",
  "left",
  "mask",
  "pointerEvents",
  "position",
  "right",
  "top",
  "zIndex",
]);

export class SafeJsxError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "SafeJsxError";
  }
}

class Environment {
  public constructor(
    private readonly values: Readonly<Record<string, unknown>>,
    private readonly parent?: Environment,
  ) {}

  public get(name: string): unknown {
    if (Object.hasOwn(this.values, name)) return this.values[name];
    if (this.parent) return this.parent.get(name);
    if (name === "undefined") return undefined;
    if (name === "NaN") return Number.NaN;
    if (name === "Infinity") return Number.POSITIVE_INFINITY;
    throw new SafeJsxError(`Unknown binding: ${name}`);
  }
}

class Budget {
  private operations = 0;
  private collectionItems = 0;
  private renderedNodes = 0;

  public constructor(private readonly limits: EvaluationBudgets) {}

  public operation(depth: number): void {
    if (depth > this.limits.maxAstDepth) {
      throw new SafeJsxError(`Template exceeded the AST depth limit (${this.limits.maxAstDepth})`);
    }
    this.operations += 1;
    if (this.operations > this.limits.maxOperations) {
      throw new SafeJsxError(`Template exceeded the operation limit (${this.limits.maxOperations})`);
    }
  }

  public collection(count = 1): void {
    this.collectionItems += count;
    if (this.collectionItems > this.limits.maxCollectionItems) {
      throw new SafeJsxError(`Template exceeded the collection limit (${this.limits.maxCollectionItems})`);
    }
  }

  public rendered(): void {
    this.renderedNodes += 1;
    if (this.renderedNodes > this.limits.maxRenderedNodes) {
      throw new SafeJsxError(`Template exceeded the rendered node limit (${this.limits.maxRenderedNodes})`);
    }
  }

  public string(value: string): string {
    if (value.length > this.limits.maxStringLength) {
      throw new SafeJsxError(`Template exceeded the string length limit (${this.limits.maxStringLength})`);
    }
    return value;
  }
}

function asNode(value: unknown, context: string): AstNode {
  if (!value || typeof value !== "object" || typeof (value as { type?: unknown }).type !== "string") {
    throw new SafeJsxError(`Invalid ${context} node`);
  }
  return value as AstNode;
}

function asNodeArray(value: unknown, context: string): AstNode[] {
  if (!Array.isArray(value)) throw new SafeJsxError(`Invalid ${context}`);
  return value.map((item) => asNode(item, context));
}

function normalizedProperty(value: unknown): string {
  if (typeof value !== "string" && typeof value !== "number") {
    throw new SafeJsxError("Property names must be strings or numbers");
  }
  const property = String(value);
  const normalized = property.normalize("NFKC").toLowerCase();
  if (BLOCKED_PROPERTIES.has(normalized)) {
    throw new SafeJsxError(`Access to reflective property '${property}' is not allowed`);
  }
  return property;
}

function isArrayIndex(property: string): boolean {
  if (!/^(?:0|[1-9]\d*)$/.test(property)) return false;
  const index = Number(property);
  return Number.isSafeInteger(index) && index >= 0;
}

function ownProperty(object: unknown, propertyValue: unknown): unknown {
  const property = normalizedProperty(propertyValue);
  if (object == null) return undefined;

  if (Array.isArray(object)) {
    if (property === "length") return object.length;
    if (!isArrayIndex(property)) return undefined;
    return Object.hasOwn(object, property) ? object[Number(property)] : undefined;
  }

  if (typeof object === "string") {
    if (property === "length") return object.length;
    if (!isArrayIndex(property)) return undefined;
    return object[Number(property)];
  }

  if (typeof object !== "object") return undefined;
  return Object.hasOwn(object, property) ? (object as Record<string, unknown>)[property] : undefined;
}

function isSafeUrl(value: unknown): boolean {
  if (typeof value !== "string") return false;
  if (value.startsWith("#")) return true;
  if (value.startsWith("/") && !value.startsWith("//")) return true;
  try {
    const parsed = new URL(value);
    return (parsed.protocol === "http:" || parsed.protocol === "https:") && !parsed.username && !parsed.password;
  } catch {
    return false;
  }
}

function sanitizeStyle(value: unknown): Record<string, string | number> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const result: Record<string, string | number> = {};
  for (const [key, styleValue] of Object.entries(value)) {
    if (BLOCKED_STYLE_KEYS.has(key) || key.startsWith("--")) continue;
    if (typeof styleValue !== "string" && typeof styleValue !== "number") continue;
    if (typeof styleValue === "string" && /(?:url\s*\(|expression\s*\(|javascript:|position\s*:)/i.test(styleValue)) {
      continue;
    }
    result[key] = styleValue;
  }
  return result;
}

function isInterpreterCallback(value: unknown): value is InterpreterCallback {
  return Boolean(value && typeof value === "object" && (value as { kind?: unknown }).kind === INTERPRETER_CALLBACK);
}

export function sanitizeCustomJsxProps(
  props: Readonly<Record<string, unknown>>,
  componentName?: string,
): Record<string, unknown> {
  const safe: Record<string, unknown> = {};
  const supportedProps = componentName ? customJsxSupportedPropsByName.get(componentName) : undefined;
  for (const [key, value] of Object.entries(props)) {
    if ((/^on/i.test(key) && !supportedProps?.has(key)) || BLOCKED_PROPS.has(key)) continue;
    if (componentName && !supportedProps?.has(key)) continue;
    if (typeof value === "function" || isInterpreterCallback(value)) continue;
    if (URL_PROPS.has(key)) {
      if (isSafeUrl(value)) safe[key] = value;
      continue;
    }
    if (key === "style") {
      const style = sanitizeStyle(value);
      if (style) safe.style = style;
      continue;
    }
    safe[key] = value;
  }
  return safe;
}

function jsxText(value: string): string {
  const lines = value.replace(/\r/g, "").split("\n");
  let result = "";
  for (let index = 0; index < lines.length; index += 1) {
    let line = lines[index] ?? "";
    line = line.replace(/\t/g, " ");
    if (index !== 0) line = line.replace(/^\s+/, "");
    if (index !== lines.length - 1) line = line.replace(/\s+$/, "");
    if (!line) continue;
    if (result) result += " ";
    result += line;
  }
  return result;
}

function numericArgument(value: unknown, fallback: number): number {
  if (value === undefined) return fallback;
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.trunc(number);
}

function normalizedSliceIndex(value: unknown, length: number, fallback: number): number {
  const index = numericArgument(value, fallback);
  if (index < 0) return Math.max(length + index, 0);
  return Math.min(index, length);
}

class Interpreter {
  private readonly budget: Budget;
  private readonly warnings = new Set<string>();

  public constructor(
    private readonly components: Readonly<Record<string, ComponentType<never>>>,
    private readonly environment: Environment,
    private readonly limits: EvaluationBudgets,
  ) {
    this.budget = new Budget(limits);
  }

  public render(root: AstNode): SafeJsxRenderResult {
    return { node: this.evaluate(root, this.environment, 0) as ReactNode, warnings: [...this.warnings] };
  }

  private evaluate(node: AstNode, environment: Environment, depth: number): unknown {
    this.budget.operation(depth);

    switch (node.type) {
      case "Literal":
        return node.value;
      case "Identifier":
        return environment.get(String(node.name));
      case "JSXElement":
        return this.evaluateJsxElement(node, environment, depth + 1);
      case "JSXFragment":
        return this.evaluateJsxFragment(node, environment, depth + 1);
      case "JSXText": {
        const text = this.budget.string(jsxText(String(node.value ?? "")));
        if (text) this.budget.rendered();
        return text || null;
      }
      case "JSXExpressionContainer": {
        const expression = asNode(node.expression, "JSX expression");
        if (expression.type === "JSXEmptyExpression") return null;
        const value = this.evaluate(expression, environment, depth + 1);
        return typeof value === "string" ? this.budget.string(value) : value;
      }
      case "ArrayExpression":
        return this.evaluateArray(node, environment, depth + 1);
      case "ObjectExpression":
        return this.evaluateObject(node, environment, depth + 1);
      case "UnaryExpression":
        return this.evaluateUnary(node, environment, depth + 1);
      case "BinaryExpression":
        return this.evaluateBinary(node, environment, depth + 1);
      case "LogicalExpression":
        return this.evaluateLogical(node, environment, depth + 1);
      case "ConditionalExpression":
        return this.evaluate(node.test as AstNode, environment, depth + 1)
          ? this.evaluate(asNode(node.consequent, "conditional consequent"), environment, depth + 1)
          : this.evaluate(asNode(node.alternate, "conditional alternate"), environment, depth + 1);
      case "MemberExpression":
        return this.evaluateMember(node, environment, depth + 1);
      case "CallExpression":
        return this.evaluateCall(node, environment, depth + 1);
      case "ArrowFunctionExpression":
        return this.createCallback(node, environment);
      case "TemplateLiteral":
        return this.evaluateTemplateLiteral(node, environment, depth + 1);
      case "ChainExpression":
        return this.evaluate(asNode(node.expression, "chain expression"), environment, depth + 1);
      default:
        throw new SafeJsxError(`Unsupported expression: ${node.type}`);
    }
  }

  private evaluateJsxFragment(node: AstNode, environment: Environment, depth: number): ReactNode {
    const children = asNodeArray(node.children, "fragment children").map((child) =>
      this.evaluate(child, environment, depth + 1),
    );
    this.budget.rendered();
    return createElement(Fragment, null, ...(children as ReactNode[]));
  }

  private evaluateJsxElement(node: AstNode, environment: Environment, depth: number): ReactNode {
    const opening = asNode(node.openingElement, "JSX opening element");
    const tag = this.jsxTagName(asNode(opening.name, "JSX tag"));
    if (BLOCKED_TAGS.has(tag.toLowerCase())) {
      this.warnings.add(`Blocked element: ${tag}`);
      return null;
    }
    const component = this.components[tag];
    if (!component) {
      this.warnings.add(`Unknown or unavailable component: ${tag}`);
      return null;
    }

    const rawProps: Record<string, unknown> = {};
    for (const attribute of asNodeArray(opening.attributes, "JSX attributes")) {
      if (attribute.type === "JSXSpreadAttribute") {
        const spread = this.evaluate(asNode(attribute.argument, "spread attribute"), environment, depth + 1);
        if (spread && typeof spread === "object" && !Array.isArray(spread)) {
          Object.assign(rawProps, spread);
        }
        continue;
      }
      if (attribute.type !== "JSXAttribute") throw new SafeJsxError(`Unsupported JSX attribute: ${attribute.type}`);
      const nameNode = asNode(attribute.name, "attribute name");
      if (nameNode.type !== "JSXIdentifier") throw new SafeJsxError("Namespaced JSX attributes are not supported");
      const name = normalizedProperty(nameNode.name);
      if (attribute.value == null) {
        rawProps[name] = true;
      } else {
        const valueNode = asNode(attribute.value, "attribute value");
        rawProps[name] =
          valueNode.type === "Literal" ? valueNode.value : this.evaluate(valueNode, environment, depth + 1);
      }
    }

    let children = asNodeArray(node.children, "JSX children").map((child) =>
      this.evaluate(child, environment, depth + 1),
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
      const renderCallback = isInterpreterCallback(callbackProp) ? callbackProp : callbackChildren[0];
      if (renderCallback) {
        props.render = (value: unknown, metadata: unknown) =>
          new Interpreter(this.components, renderCallback.environment, this.limits).runCallback(
            renderCallback,
            [value, metadata],
            0,
          ) as ReactNode;
        children = children.filter((child) => child !== renderCallback);
      }
    }
    this.budget.rendered();
    return createElement(component, props as never, ...(children as ReactNode[]));
  }

  private jsxTagName(node: AstNode): string {
    if (node.type === "JSXIdentifier") return String(node.name);
    if (node.type === "JSXMemberExpression") {
      return `${this.jsxTagName(asNode(node.object, "JSX member object"))}.${this.jsxTagName(
        asNode(node.property, "JSX member property"),
      )}`;
    }
    throw new SafeJsxError(`Unsupported JSX tag: ${node.type}`);
  }

  private evaluateArray(node: AstNode, environment: Environment, depth: number): unknown[] {
    const result: unknown[] = [];
    const elements = node.elements;
    if (!Array.isArray(elements)) throw new SafeJsxError("Invalid array expression");
    for (const elementValue of elements) {
      if (elementValue == null) {
        result.push(undefined);
        continue;
      }
      const element = asNode(elementValue, "array element");
      if (element.type === "SpreadElement") {
        const spread = this.evaluate(asNode(element.argument, "array spread"), environment, depth + 1);
        if (!Array.isArray(spread)) throw new SafeJsxError("Only arrays can be spread into arrays");
        this.budget.collection(spread.length);
        result.push(...spread);
      } else {
        this.budget.collection();
        result.push(this.evaluate(element, environment, depth + 1));
      }
    }
    return result;
  }

  private evaluateObject(node: AstNode, environment: Environment, depth: number): Record<string, unknown> {
    const result: Record<string, unknown> = Object.create(null);
    for (const property of asNodeArray(node.properties, "object properties")) {
      if (property.type === "SpreadElement") {
        const spread = this.evaluate(asNode(property.argument, "object spread"), environment, depth + 1);
        if (!spread || typeof spread !== "object" || Array.isArray(spread)) {
          throw new SafeJsxError("Only objects can be spread into objects");
        }
        for (const [key, value] of Object.entries(spread)) result[normalizedProperty(key)] = value;
        continue;
      }
      if (property.type !== "Property" || property.kind !== "init" || property.method || property.shorthand) {
        throw new SafeJsxError("Only explicit object properties are supported");
      }
      const keyNode = asNode(property.key, "object key");
      const key = normalizedProperty(
        property.computed
          ? this.evaluate(keyNode, environment, depth + 1)
          : keyNode.type === "Identifier"
            ? keyNode.name
            : keyNode.value,
      );
      result[key] = this.evaluate(asNode(property.value, "object value"), environment, depth + 1);
    }
    return result;
  }

  private evaluateUnary(node: AstNode, environment: Environment, depth: number): unknown {
    const value = this.evaluate(asNode(node.argument, "unary argument"), environment, depth + 1);
    switch (node.operator) {
      case "!":
        return !value;
      case "+":
        return Number(value);
      case "-":
        return -Number(value);
      case "typeof":
        return typeof value;
      default:
        throw new SafeJsxError(`Unsupported unary operator: ${String(node.operator)}`);
    }
  }

  private evaluateBinary(node: AstNode, environment: Environment, depth: number): unknown {
    const left = this.evaluate(asNode(node.left, "binary left operand"), environment, depth + 1);
    const right = this.evaluate(asNode(node.right, "binary right operand"), environment, depth + 1);
    switch (node.operator) {
      case "+":
        return typeof left === "string" || typeof right === "string"
          ? this.budget.string(String(left) + String(right))
          : Number(left) + Number(right);
      case "-":
        return Number(left) - Number(right);
      case "*":
        return Number(left) * Number(right);
      case "/":
        return Number(left) / Number(right);
      case "%":
        return Number(left) % Number(right);
      case "**":
        return Number(left) ** Number(right);
      case "<":
        return (left as number) < (right as number);
      case "<=":
        return (left as number) <= (right as number);
      case ">":
        return (left as number) > (right as number);
      case ">=":
        return (left as number) >= (right as number);
      case "==":
        return String(left) === String(right);
      case "!=":
        return String(left) !== String(right);
      case "===":
        return left === right;
      case "!==":
        return left !== right;
      default:
        throw new SafeJsxError(`Unsupported binary operator: ${String(node.operator)}`);
    }
  }

  private evaluateLogical(node: AstNode, environment: Environment, depth: number): unknown {
    const left = this.evaluate(asNode(node.left, "logical left operand"), environment, depth + 1);
    if (node.operator === "&&") {
      return left ? this.evaluate(asNode(node.right, "logical right operand"), environment, depth + 1) : left;
    }
    if (node.operator === "||") {
      return left ? left : this.evaluate(asNode(node.right, "logical right operand"), environment, depth + 1);
    }
    if (node.operator === "??") {
      return left == null ? this.evaluate(asNode(node.right, "logical right operand"), environment, depth + 1) : left;
    }
    throw new SafeJsxError(`Unsupported logical operator: ${String(node.operator)}`);
  }

  private memberProperty(node: AstNode, environment: Environment, depth: number): string {
    const propertyNode = asNode(node.property, "member property");
    return normalizedProperty(
      node.computed
        ? this.evaluate(propertyNode, environment, depth + 1)
        : propertyNode.type === "Identifier"
          ? propertyNode.name
          : propertyNode.value,
    );
  }

  private evaluateMember(node: AstNode, environment: Environment, depth: number): unknown {
    const object = this.evaluate(asNode(node.object, "member object"), environment, depth + 1);
    const property = this.memberProperty(node, environment, depth + 1);
    return ownProperty(object, property);
  }

  private evaluateCall(node: AstNode, environment: Environment, depth: number): unknown {
    if (node.optional) throw new SafeJsxError("Optional calls are not supported");
    const args = asNodeArray(node.arguments, "call arguments").map((argument) => {
      if (argument.type === "SpreadElement") throw new SafeJsxError("Spread call arguments are not supported");
      return this.evaluate(argument, environment, depth + 1);
    });
    const callee = asNode(node.callee, "call target");

    if (callee.type === "MemberExpression") {
      const receiver = this.evaluate(asNode(callee.object, "method receiver"), environment, depth + 1);
      const method = this.memberProperty(callee, environment, depth + 1);
      const collectionResult = this.callCollectionMethod(receiver, method, args, depth + 1);
      if (collectionResult.handled) return collectionResult.value;
      const callable = ownProperty(receiver, method);
      if (!isSafeCallable(callable)) throw new SafeJsxError(`Calling method '${method}' is not allowed`);
      return this.accountHostResult(callable(...(args as never[])));
    }

    const callable = this.evaluate(callee, environment, depth + 1);
    if (!isSafeCallable(callable)) throw new SafeJsxError("Calling this value is not allowed");
    return this.accountHostResult(callable(...(args as never[])));
  }

  private callCollectionMethod(
    receiver: unknown,
    method: string,
    args: unknown[],
    depth: number,
  ): { handled: boolean; value?: unknown } {
    if (Array.isArray(receiver)) {
      if (method === "map" || method === "filter") {
        const callback = args[0];
        if (isSafeCallable(callback)) {
          const result: unknown[] = [];
          for (let index = 0; index < receiver.length; index += 1) {
            this.budget.collection();
            const callbackResult = callback(receiver[index] as never);
            if (method === "map") result.push(callbackResult);
            else if (callbackResult) result.push(receiver[index]);
          }
          return { handled: true, value: result };
        }
        if (!isInterpreterCallback(callback)) throw new SafeJsxError(`${method} requires an inline arrow callback`);
        const result: unknown[] = [];
        for (let index = 0; index < receiver.length; index += 1) {
          this.budget.collection();
          const callbackResult = this.runCallback(callback, [receiver[index], index, receiver], depth + 1);
          if (method === "map" || callbackResult) result.push(method === "map" ? callbackResult : receiver[index]);
        }
        return { handled: true, value: result };
      }
      if (method === "pop") {
        this.budget.collection();
        return { handled: true, value: receiver.length > 0 ? receiver[receiver.length - 1] : undefined };
      }
      if (method === "slice") {
        const start = normalizedSliceIndex(args[0], receiver.length, 0);
        const end = normalizedSliceIndex(args[1], receiver.length, receiver.length);
        const result: unknown[] = [];
        for (let index = start; index < Math.max(start, end); index += 1) {
          this.budget.collection();
          result.push(receiver[index]);
        }
        return { handled: true, value: result };
      }
      if (method === "join") {
        this.budget.collection(receiver.length);
        const separator = String(args[0] ?? ",");
        let result = "";
        receiver.forEach((item, index) => {
          result += `${index === 0 ? "" : separator}${String(item ?? "")}`;
          this.budget.string(result);
        });
        return { handled: true, value: result };
      }
      if (method === "includes") {
        this.budget.collection(receiver.length);
        return { handled: true, value: receiver.some((item) => Object.is(item, args[0])) };
      }
      if (method === "indexOf") {
        this.budget.collection(receiver.length);
        return { handled: true, value: receiver.findIndex((item) => Object.is(item, args[0])) };
      }
      if (method === "find" || method === "findIndex" || method === "some" || method === "every") {
        const callback = args[0];
        const useSafe = isSafeCallable(callback);
        if (!useSafe && !isInterpreterCallback(callback))
          throw new SafeJsxError(`${method} requires an inline arrow callback`);
        for (let index = 0; index < receiver.length; index += 1) {
          this.budget.collection();
          const result = useSafe
            ? (callback as (...a: never[]) => unknown)(receiver[index] as never)
            : this.runCallback(callback as InterpreterCallback, [receiver[index], index, receiver], depth + 1);
          if (method === "find" && result) return { handled: true, value: receiver[index] };
          if (method === "findIndex" && result) return { handled: true, value: index };
          if (method === "some" && result) return { handled: true, value: true };
          if (method === "every" && !result) return { handled: true, value: false };
        }
        const defaults: Record<string, unknown> = { find: undefined, findIndex: -1, some: false, every: true };
        return { handled: true, value: defaults[method] };
      }
      if (method === "sort") {
        const callback = args[0];
        if (!isInterpreterCallback(callback)) throw new SafeJsxError("sort requires an inline arrow callback");
        const copy = [...receiver];
        copy.sort((left, right) => {
          this.budget.collection();
          const delta = Number(this.runCallback(callback, [left, right], depth + 1));
          if (!Number.isFinite(delta)) return 0;
          return delta;
        });
        return { handled: true, value: copy };
      }
      if (method === "reduce") {
        const callback = args[0];
        if (!isInterpreterCallback(callback)) throw new SafeJsxError("reduce requires an inline arrow callback");
        if (receiver.length === 0 && args.length < 2) {
          throw new SafeJsxError("Reduce of empty array with no initial value");
        }
        let startIndex = 0;
        let accumulator: unknown;
        if (args.length < 2) {
          accumulator = receiver[0];
          startIndex = 1;
        } else {
          accumulator = args[1];
        }
        for (let index = startIndex; index < receiver.length; index += 1) {
          this.budget.collection();
          accumulator = this.runCallback(callback, [accumulator, receiver[index], index, receiver], depth + 1);
        }
        return { handled: true, value: accumulator };
      }
      if (method === "at") {
        const index = numericArgument(args[0], 0);
        let normalizedIndex = index;
        if (index < 0) normalizedIndex = receiver.length + index;
        this.budget.collection();
        const outOfBounds = normalizedIndex < 0 || normalizedIndex >= receiver.length;
        return { handled: true, value: outOfBounds ? undefined : receiver[normalizedIndex] };
      }
      if (method === "flat") {
        // ponytail: only depth=1 supported; deeper nesting requires recursive budget tracking
        const depth = numericArgument(args[0], 1);
        if (depth !== 1) throw new SafeJsxError("flat() only supports depth 1");
        const result: unknown[] = [];
        for (const item of receiver) {
          this.budget.collection();
          if (Array.isArray(item)) {
            for (const nested of item) {
              this.budget.collection();
              result.push(nested);
            }
          } else {
            result.push(item);
          }
        }
        return { handled: true, value: result };
      }
      if (method === "reverse") {
        const copy = [...receiver];
        const result: unknown[] = [];
        for (let index = copy.length - 1; index >= 0; index -= 1) {
          this.budget.collection();
          result.push(copy[index]);
        }
        return { handled: true, value: result };
      }
    }

    if (typeof receiver === "string") {
      switch (method) {
        case "toUpperCase":
          return { handled: true, value: this.budget.string(receiver.toUpperCase()) };
        case "toLowerCase":
          return { handled: true, value: this.budget.string(receiver.toLowerCase()) };
        case "trim":
          return { handled: true, value: this.budget.string(receiver.trim()) };
        case "trimStart":
          return { handled: true, value: this.budget.string(receiver.trimStart()) };
        case "trimEnd":
          return { handled: true, value: this.budget.string(receiver.trimEnd()) };
        case "replace": {
          const search = String(args[0] ?? "");
          const replacement = String(args[1] ?? "");
          const matchIndex = receiver.indexOf(search);
          if (matchIndex === -1) return { handled: true, value: this.budget.string(receiver) };
          return {
            handled: true,
            value: this.budget.string(
              receiver.slice(0, matchIndex) + replacement + receiver.slice(matchIndex + search.length),
            ),
          };
        }
        case "replaceAll": {
          const search = String(args[0] ?? "");
          const replacement = String(args[1] ?? "");
          if (search.length === 0) return { handled: true, value: this.budget.string(receiver) };
          let result = "";
          let cursor = 0;
          while (cursor < receiver.length) {
            const matchIndex = receiver.indexOf(search, cursor);
            if (matchIndex === -1) {
              result += receiver.slice(cursor);
              break;
            }
            result += receiver.slice(cursor, matchIndex) + replacement;
            cursor = matchIndex + search.length;
          }
          return { handled: true, value: this.budget.string(result) };
        }
        case "indexOf":
          return { handled: true, value: receiver.indexOf(String(args[0] ?? ""), numericArgument(args[1], 0)) };
        case "lastIndexOf": {
          const fromIndex = args[1] !== undefined ? numericArgument(args[1], receiver.length) : undefined;
          return { handled: true, value: receiver.lastIndexOf(String(args[0] ?? ""), fromIndex) };
        }
        case "repeat": {
          let maxCount = 0;
          if (receiver.length > 0) maxCount = Math.floor(200_001 / receiver.length);
          const count = Math.max(0, Math.min(numericArgument(args[0], 0), maxCount));
          return { handled: true, value: this.budget.string(receiver.repeat(count).slice(0, 200_001)) };
        }
        case "slice":
          return {
            handled: true,
            value: this.budget.string(receiver.slice(numericArgument(args[0], 0), args[1] as number | undefined)),
          };
        case "substring":
          return {
            handled: true,
            value: this.budget.string(receiver.substring(numericArgument(args[0], 0), args[1] as number | undefined)),
          };
        case "includes":
          return { handled: true, value: receiver.includes(String(args[0] ?? ""), numericArgument(args[1], 0)) };
        case "startsWith":
          return { handled: true, value: receiver.startsWith(String(args[0] ?? ""), numericArgument(args[1], 0)) };
        case "endsWith":
          return { handled: true, value: receiver.endsWith(String(args[0] ?? ""), args[1] as number | undefined) };
        case "padStart":
          return {
            handled: true,
            value: this.budget.string(
              receiver.padStart(Math.min(numericArgument(args[0], 0), 200_001), String(args[1] ?? " ")),
            ),
          };
        case "padEnd":
          return {
            handled: true,
            value: this.budget.string(
              receiver.padEnd(Math.min(numericArgument(args[0], 0), 200_001), String(args[1] ?? " ")),
            ),
          };
        case "charAt":
          return { handled: true, value: receiver.charAt(numericArgument(args[0], 0)) };
        case "split": {
          const limit = Math.max(0, Math.min(2_000, numericArgument(args[1], 100)));
          const split = args[0] === undefined ? [receiver] : receiver.split(String(args[0]), limit);
          this.budget.collection(split.length);
          return { handled: true, value: split };
        }
      }
    }

    if (typeof receiver === "number") {
      if (method === "toFixed") {
        const digits = Math.max(0, Math.min(20, numericArgument(args[0], 0)));
        return { handled: true, value: receiver.toFixed(digits) };
      }
      if (method === "toPrecision") {
        const precision = Math.max(1, Math.min(21, numericArgument(args[0], 1)));
        return { handled: true, value: receiver.toPrecision(precision) };
      }
    }

    if (
      (typeof receiver === "number" || typeof receiver === "boolean" || typeof receiver === "string") &&
      method === "toString"
    ) {
      return { handled: true, value: this.budget.string(String(receiver)) };
    }

    return { handled: false };
  }

  private accountHostResult(value: unknown): unknown {
    if (typeof value === "string") return this.budget.string(value);
    if (Array.isArray(value)) this.budget.collection(value.length);
    return value;
  }

  private createCallback(node: AstNode, environment: Environment): InterpreterCallback {
    if (node.async || node.generator || node.expression === false) {
      throw new SafeJsxError("Only synchronous expression-bodied arrow callbacks are supported");
    }
    const params = asNodeArray(node.params, "callback parameters").map((param) => {
      if (param.type !== "Identifier") throw new SafeJsxError("Callback parameters must be identifiers");
      return normalizedProperty(param.name);
    });
    return {
      kind: INTERPRETER_CALLBACK,
      params,
      body: asNode(node.body, "callback body"),
      environment,
    };
  }

  private runCallback(callback: InterpreterCallback, args: unknown[], depth: number): unknown {
    const values: Record<string, unknown> = Object.create(null);
    callback.params.forEach((name, index) => {
      values[name] = args[index];
    });
    return this.evaluate(callback.body, new Environment(values, callback.environment), depth + 1);
  }

  private evaluateTemplateLiteral(node: AstNode, environment: Environment, depth: number): string {
    const quasis = asNodeArray(node.quasis, "template literal parts");
    const expressions = asNodeArray(node.expressions, "template literal expressions");
    let result = "";
    quasis.forEach((quasi, index) => {
      const value = quasi.value;
      if (!value || typeof value !== "object") throw new SafeJsxError("Invalid template literal part");
      result += String((value as { cooked?: unknown }).cooked ?? "");
      const expression = expressions[index];
      if (expression) result += String(this.evaluate(expression, environment, depth + 1));
    });
    return this.budget.string(result);
  }
}

function parseTemplate(template: string): AstNode {
  if (template.length > MAX_TEMPLATE_LENGTH) {
    throw new SafeJsxError(`Template exceeds the ${MAX_TEMPLATE_LENGTH} character limit`);
  }
  let program: AstNode;
  try {
    program = JsxParser.parse(`<>${template}</>`, {
      ecmaVersion: "latest",
      sourceType: "module",
      allowAwaitOutsideFunction: false,
      allowReturnOutsideFunction: false,
    }) as unknown as AstNode;
  } catch (error) {
    throw new SafeJsxError(error instanceof Error ? error.message : "Unable to parse JSX template");
  }
  const body = asNodeArray(program.body, "program body");
  if (body.length !== 1 || body[0]?.type !== "ExpressionStatement") {
    throw new SafeJsxError("Template must contain JSX only");
  }
  return asNode(body[0].expression, "template expression");
}

export function renderSafeJsx({ template, components, bindings, budgets }: RenderSafeJsxOptions): SafeJsxRenderResult {
  const limits: EvaluationBudgets = { ...DEFAULT_BUDGETS, ...budgets };
  for (const [name, value] of Object.entries(limits)) {
    if (!Number.isSafeInteger(value) || value <= 0) throw new SafeJsxError(`Invalid interpreter budget: ${name}`);
  }
  const root = parseTemplate(template);
  return new Interpreter(components, new Environment(bindings), limits).render(root);
}
