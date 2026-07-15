import type { ComponentType, ReactNode } from "react";
import { Parser } from "acorn";
import jsx from "acorn-jsx";

import { callCollectionMethod } from "./collection-methods";
import { emitJsxElement, emitJsxFragment } from "./jsx-emitter";
import type { JsxEmitterContext } from "./jsx-emitter";
import { isSafeCallable } from "./safe-bindings";
import {
  asNode,
  asNodeArray,
  Budget,
  DEFAULT_BUDGETS,
  Environment,
  INTERPRETER_CALLBACK,
  SafeJsxError,
} from "./interpreter-foundation";
import type { AstNode, EvaluationBudgets, InterpreterCallback, SafeJsxBudgets } from "./interpreter-foundation";
import { normalizedProperty, ownProperty } from "./safe-properties";
import { CUSTOM_JSX_LIMITS } from "./policy";

export { SafeJsxError } from "./interpreter-foundation";
export type { SafeJsxBudgets } from "./interpreter-foundation";
export { sanitizeCustomJsxProps } from "./safe-properties";

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
    return emitJsxFragment(node, environment, depth, this.emitterContext());
  }

  private evaluateJsxElement(node: AstNode, environment: Environment, depth: number): ReactNode {
    return emitJsxElement(node, environment, depth, this.emitterContext());
  }

  private emitterContext(): JsxEmitterContext {
    return {
      components: this.components,
      budget: this.budget,
      warnings: this.warnings,
      evaluate: (node, environment, depth) => this.evaluate(node, environment, depth),
      renderCallback: (callback, args) =>
        new Interpreter(this.components, callback.environment, this.limits).runCallback(callback, args, 0) as ReactNode,
    };
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
    return callCollectionMethod(receiver, method, args, depth, {
      budget: this.budget,
      runCallback: (callback, callbackArgs, callbackDepth) => this.runCallback(callback, callbackArgs, callbackDepth),
    });
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
  if (template.length > CUSTOM_JSX_LIMITS.templateLength) {
    throw new SafeJsxError(`Template exceeds the ${CUSTOM_JSX_LIMITS.templateLength} character limit`);
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
