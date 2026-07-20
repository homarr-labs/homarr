import {
  asNode,
  asNodeArray,
  Environment,
  INTERPRETER_CALLBACK,
  isInterpreterCallback,
  SafeJsxError,
} from "./interpreter-foundation";
import type { AstNode, Budget, InterpreterCallback } from "./interpreter-foundation";
import { isBlockedCustomJsxLexicalBinding } from "./policy";

interface InterpreterCallbackContext {
  budget: Budget;
  evaluate(node: AstNode, environment: Environment, depth: number): unknown;
}

const reservedLocalBindings = new Set(["data", "status", "options", "inputs"]);

export function createInterpreterCallback(node: AstNode, environment: Environment): InterpreterCallback {
  if (node.async || node.generator) {
    throw new SafeJsxError("CALLBACK_VALUE_NOT_ALLOWED: Async and generator callbacks are not supported");
  }
  const parameterNames = new Set<string>();
  const params = asNodeArray(node.params, "callback parameters").map((param) => {
    if (param.type !== "Identifier") throw new SafeJsxError("Callback parameters must be identifiers");
    const name = String(param.name);
    if (isBlockedCustomJsxLexicalBinding(name)) {
      throw new SafeJsxError(`INVALID_LOCAL_DECLARATION: '${name}' is not a safe callback parameter name`);
    }
    if (reservedLocalBindings.has(name)) {
      throw new SafeJsxError(`RESERVED_LOCAL_BINDING: '${name}' cannot be shadowed`);
    }
    if (parameterNames.has(name)) {
      throw new SafeJsxError(`DUPLICATE_LOCAL_BINDING: '${name}' is already declared`);
    }
    parameterNames.add(name);
    return name;
  });
  return {
    kind: INTERPRETER_CALLBACK,
    params,
    body: asNode(node.body, "callback body"),
    environment,
  };
}

export function runInterpreterCallback(
  callback: InterpreterCallback,
  args: unknown[],
  depth: number,
  context: InterpreterCallbackContext,
): unknown {
  const values: Record<string, unknown> = Object.create(null);
  callback.params.forEach((name, index) => {
    values[name] = args[index];
  });
  const environment = new Environment(values, callback.environment);
  return callback.body.type === "BlockStatement"
    ? executeSafeBlock(callback.body, environment, depth + 1, context)
    : context.evaluate(callback.body, environment, depth + 1);
}

function executeSafeBlock(
  block: AstNode,
  environment: Environment,
  depth: number,
  context: InterpreterCallbackContext,
): unknown {
  context.budget.operation(depth);
  const statements = asNodeArray(block.body, "safe block statements");
  const finalStatement = statements.at(-1);
  if (statements.length === 0 || finalStatement?.type !== "ReturnStatement" || !finalStatement.argument) {
    throw new SafeJsxError(
      "BLOCK_REQUIRES_FINAL_RETURN: A safe block must end with exactly one value-returning return",
    );
  }
  if (statements.length < 2) {
    throw new SafeJsxError(
      "INVALID_LOCAL_DECLARATION: A safe block requires at least one const before its final return",
    );
  }

  let scopedEnvironment = environment;
  const localNames = new Set<string>();
  for (let statementIndex = 0; statementIndex < statements.length; statementIndex += 1) {
    const statement = statements[statementIndex];
    if (!statement) continue;
    context.budget.operation(depth + 1);
    const isFinal = statementIndex === statements.length - 1;
    if (statement.type === "ReturnStatement") {
      if (!isFinal) {
        throw new SafeJsxError("BLOCK_REQUIRES_FINAL_RETURN: Return is only allowed as the final statement");
      }
      return context.evaluate(asNode(statement.argument, "safe block return value"), scopedEnvironment, depth + 1);
    }
    if (statement.type !== "VariableDeclaration") {
      throw new SafeJsxError(`UNSUPPORTED_BLOCK_STATEMENT: '${statement.type}' is not allowed in a safe block`);
    }
    if (statement.kind !== "const") {
      throw new SafeJsxError("INVALID_LOCAL_DECLARATION: Only immutable const declarations are allowed");
    }
    for (const declaration of asNodeArray(statement.declarations, "local declarations")) {
      context.budget.operation(depth + 2);
      const identifier = asNode(declaration.id, "local identifier");
      if (declaration.type !== "VariableDeclarator" || identifier.type !== "Identifier") {
        throw new SafeJsxError("INVALID_LOCAL_DECLARATION: Local declarations require a simple identifier");
      }
      const name = String(identifier.name);
      if (isBlockedCustomJsxLexicalBinding(name)) {
        throw new SafeJsxError(`INVALID_LOCAL_DECLARATION: '${name}' is not a safe local binding name`);
      }
      if (reservedLocalBindings.has(name)) {
        throw new SafeJsxError(`RESERVED_LOCAL_BINDING: '${name}' cannot be shadowed`);
      }
      if (localNames.has(name)) {
        throw new SafeJsxError(`DUPLICATE_LOCAL_BINDING: '${name}' is already declared`);
      }
      const initializer = asNode(declaration.init, `initializer for '${name}'`);
      if (initializer.type === "ArrowFunctionExpression" || initializer.type === "FunctionExpression") {
        throw new SafeJsxError("CALLBACK_VALUE_NOT_ALLOWED: Functions cannot be stored in local bindings");
      }
      const value = context.evaluate(initializer, scopedEnvironment, depth + 1);
      if (typeof value === "function" || isInterpreterCallback(value)) {
        throw new SafeJsxError("CALLBACK_VALUE_NOT_ALLOWED: Functions cannot be stored in local bindings");
      }
      localNames.add(name);
      scopedEnvironment = new Environment({ [name]: value }, scopedEnvironment);
    }
  }
  throw new SafeJsxError("BLOCK_REQUIRES_FINAL_RETURN: Safe block did not return a value");
}
