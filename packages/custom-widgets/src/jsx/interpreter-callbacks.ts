import { asNode, asNodeArray, Environment, INTERPRETER_CALLBACK, SafeJsxError } from "./interpreter-foundation";
import type { AstNode, Budget, InterpreterCallback } from "./interpreter-foundation";
import { RESERVED_LOCAL_BINDINGS } from "./analyzer-language";
import { isBlockedCustomJsxLexicalBinding } from "./policy";

interface InterpreterCallbackContext {
  budget: Budget;
  evaluate(node: AstNode, environment: Environment, depth: number): unknown;
}

export function createInterpreterCallback(node: AstNode, environment: Environment): InterpreterCallback {
  if (node.async || node.generator)
    throw new SafeJsxError("CALLBACK_VALUE_NOT_ALLOWED: Async and generator callbacks are not supported");
  const parameterNames = new Set<string>();
  const params = asNodeArray(node.params, "callback parameters").map((param) => {
    if (param.type !== "Identifier")
      throw new SafeJsxError("INVALID_LOCAL_DECLARATION: Callback parameters must be identifiers");
    const name = String(param.name);
    if (isBlockedCustomJsxLexicalBinding(name) || RESERVED_LOCAL_BINDINGS.has(name))
      throw new SafeJsxError(`INVALID_LOCAL_DECLARATION: '${name}' is not a safe callback parameter name`);
    if (parameterNames.has(name)) throw new SafeJsxError(`DUPLICATE_LOCAL_BINDING: '${name}' is already declared`);
    parameterNames.add(name);
    return name;
  });
  const body = asNode(node.body, "callback body");
  if (body.type === "BlockStatement")
    throw new SafeJsxError("UNSUPPORTED_BLOCK_STATEMENT: Use one expression in authored callbacks");
  return { kind: INTERPRETER_CALLBACK, params, body, environment };
}

export function runInterpreterCallback(
  callback: InterpreterCallback,
  args: unknown[],
  depth: number,
  context: InterpreterCallbackContext,
): unknown {
  context.budget.operation(depth);
  const values: Record<string, unknown> = Object.create(null);
  callback.params.forEach((name, index) => {
    values[name] = args[index];
  });
  const result = context.evaluate(callback.body, new Environment(values, callback.environment), depth + 1);
  if (
    typeof result === "function" ||
    (result !== null && typeof result === "object" && "kind" in result && result.kind === INTERPRETER_CALLBACK)
  ) {
    throw new SafeJsxError("CALLBACK_VALUE_NOT_ALLOWED: Authored callbacks cannot return callable values");
  }
  return result;
}
