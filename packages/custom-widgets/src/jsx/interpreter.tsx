import type { ComponentType, ReactNode } from "react";

import { callCollectionMethod } from "./collection-methods";
import { staticPropertyName } from "./analyzer-ast";
import type { JsxEmitterContext } from "./emitter-context";
import { createInterpreterCallback, runInterpreterCallback } from "./interpreter-callbacks";
import { emitJsxElement, emitJsxFragment } from "./jsx-emitter";
import { isSafeCallable } from "./safe-bindings";
import { asNode, asNodeArray, Budget, DEFAULT_BUDGETS, Environment, SafeJsxError } from "./interpreter-foundation";
import type { AstNode, EvaluationBudgets, InterpreterCallback, SafeJsxBudgets } from "./interpreter-foundation";
import { normalizeCustomJsxText, parseCustomJsxTemplate } from "./interpreter-parser";
import { normalizedProperty, ownProperty } from "./safe-properties";
import { CUSTOM_JSX_CALLBACK_METHODS } from "./safe-language-policy";

export { SafeJsxBudgetError, SafeJsxError } from "./interpreter-foundation";
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
        const text = this.budget.string(normalizeCustomJsxText(String(node.value ?? "")));
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
        throw new SafeJsxError(
          "CALLBACK_VALUE_NOT_ALLOWED: Callbacks are only allowed in safe collection methods and trusted slots",
        );
      case "TemplateLiteral":
        return this.evaluateTemplateLiteral(node, environment, depth + 1);
      case "ChainExpression":
        return this.evaluate(asNode(node.expression, "chain expression"), environment, depth + 1);
      case "AssignmentExpression":
      case "UpdateExpression":
      case "NewExpression":
      case "AwaitExpression":
      case "YieldExpression":
        throw new SafeJsxError(`UNSUPPORTED_BLOCK_STATEMENT: '${node.type}' is not allowed in safe expressions`);
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
      createCallback: (node, environment) => this.createCallback(node, environment),
      renderCallback: (callback, args, depth) => this.runCallback(callback, args, depth) as ReactNode,
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
    const callee = asNode(node.callee, "call target");
    const argumentNodes = asNodeArray(node.arguments, "call arguments");
    if (callee.type === "ArrowFunctionExpression") {
      if (asNodeArray(callee.params, "inline derived-value parameters").length > 0) {
        throw new SafeJsxError("CALLBACK_VALUE_NOT_ALLOWED: Inline derived-value functions cannot declare parameters");
      }
      if (argumentNodes.length > 0) {
        throw new SafeJsxError(
          "CALLBACK_VALUE_NOT_ALLOWED: Inline derived-value functions must be called without arguments",
        );
      }
      return this.runCallback(this.createCallback(callee, environment), [], depth + 1);
    }
    const callbackMethod =
      callee.type === "MemberExpression"
        ? callee.computed
          ? staticPropertyName(asNode(callee.property, "method property"))
          : normalizedProperty(asNode(callee.property, "method property").name)
        : null;
    const args = argumentNodes.map((argument) => {
      if (argument.type === "SpreadElement") throw new SafeJsxError("Spread call arguments are not supported");
      if (argument.type === "ArrowFunctionExpression") {
        if (!callbackMethod || !CUSTOM_JSX_CALLBACK_METHODS.has(callbackMethod)) {
          throw new SafeJsxError("CALLBACK_VALUE_NOT_ALLOWED: Callback argument is not allowed for this call");
        }
        return this.createCallback(argument, environment);
      }
      return this.evaluate(argument, environment, depth + 1);
    });

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
    return createInterpreterCallback(node, environment);
  }

  private runCallback(callback: InterpreterCallback, args: unknown[], depth: number): unknown {
    return runInterpreterCallback(callback, args, depth, {
      budget: this.budget,
      evaluate: (node, environment, callbackDepth) => this.evaluate(node, environment, callbackDepth),
    });
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

export function renderSafeJsx({ template, components, bindings, budgets }: RenderSafeJsxOptions): SafeJsxRenderResult {
  const limits: EvaluationBudgets = { ...DEFAULT_BUDGETS, ...budgets };
  for (const [name, value] of Object.entries(limits)) {
    if (!Number.isSafeInteger(value) || value <= 0) throw new SafeJsxError(`Invalid interpreter budget: ${name}`);
  }
  const root = parseCustomJsxTemplate(template);
  return new Interpreter(components, new Environment(bindings), limits).render(root);
}
