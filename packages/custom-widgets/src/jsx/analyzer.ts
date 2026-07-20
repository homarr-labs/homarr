import { Parser } from "acorn";
import jsx from "acorn-jsx";

import {
  CUSTOM_JSX_BLOCKED_PROPERTIES,
  CUSTOM_JSX_LIMITS,
  isBlockedCustomJsxLexicalBinding,
  normalizeCustomJsxProperty,
} from "./policy";
import type { AstNode } from "./analyzer-ast";
import { nodeOf, nodesOf, staticPropertyName } from "./analyzer-ast";
import { analyzeCustomJsxElement } from "./analyzer-jsx";
import { isStaticallyCallableBinding, RESERVED_LOCAL_BINDINGS, ROOT_BINDINGS } from "./analyzer-language";
import {
  CUSTOM_JSX_BINARY_OPERATORS,
  CUSTOM_JSX_CALLBACK_METHODS,
  CUSTOM_JSX_SAFE_VALUE_METHODS,
} from "./safe-language-policy";

export interface CustomJsxTemplateDiagnostic {
  severity: "error" | "warning";
  message: string;
  index: number;
  line: number;
  column: number;
}

const JsxParser = Parser.extend(jsx());

export function validateCustomJsxTemplate(template: string): CustomJsxTemplateDiagnostic[] {
  const diagnostics: CustomJsxTemplateDiagnostic[] = [];
  let operations = 0;

  const add = (node: AstNode, message: string, severity: "error" | "warning" = "error") => {
    const line = node.loc?.start?.line ?? 1;
    diagnostics.push({
      severity,
      message,
      index: Math.max(0, (node.start ?? 2) - 2),
      line,
      column: Math.max(1, (node.loc?.start?.column ?? 0) + 1 - (line === 1 ? 2 : 0)),
    });
  };

  const checkBudget = (node: AstNode, depth: number) => {
    operations += 1;
    if (depth > CUSTOM_JSX_LIMITS.astDepth)
      add(node, `Template exceeds the AST depth limit (${CUSTOM_JSX_LIMITS.astDepth})`);
    if (operations === CUSTOM_JSX_LIMITS.operations + 1) {
      add(node, `Template exceeds the operation limit (${CUSTOM_JSX_LIMITS.operations})`);
    }
    return depth <= CUSTOM_JSX_LIMITS.astDepth && operations <= CUSTOM_JSX_LIMITS.operations;
  };

  let visit: (node: AstNode, depth: number, bindings: ReadonlySet<string>) => void;

  const visitArrow = (node: AstNode, depth: number, bindings: ReadonlySet<string>) => {
    if (node.async || node.generator) {
      add(node, "CALLBACK_VALUE_NOT_ALLOWED: Async and generator callbacks are not supported");
      return;
    }
    const callbackBindings = new Set(bindings);
    const parameterNames = new Set<string>();
    for (const parameter of nodesOf(node.params)) {
      if (parameter.type !== "Identifier") {
        add(parameter, "INVALID_LOCAL_DECLARATION: Callback parameters must be identifiers");
        continue;
      }
      const name = String(parameter.name);
      if (isBlockedCustomJsxLexicalBinding(name)) {
        add(parameter, `INVALID_LOCAL_DECLARATION: '${name}' is not a safe callback parameter name`);
        continue;
      }
      if (RESERVED_LOCAL_BINDINGS.has(name)) {
        add(parameter, `RESERVED_LOCAL_BINDING: '${name}' cannot be shadowed`);
        continue;
      }
      if (parameterNames.has(name)) {
        add(parameter, `DUPLICATE_LOCAL_BINDING: '${name}' is already declared`);
        continue;
      }
      parameterNames.add(name);
      callbackBindings.add(name);
    }
    const body = nodeOf(node.body);
    if (!body) return;
    if (body.type === "BlockStatement") visitSafeBlock(body, depth + 1, callbackBindings);
    else visit(body, depth + 1, callbackBindings);
  };

  const visitSafeBlock = (block: AstNode, depth: number, bindings: ReadonlySet<string>) => {
    if (!checkBudget(block, depth)) return;
    const statements = nodesOf(block.body);
    const finalStatement = statements.at(-1);
    if (statements.length === 0 || finalStatement?.type !== "ReturnStatement" || !nodeOf(finalStatement.argument)) {
      add(block, "BLOCK_REQUIRES_FINAL_RETURN: A safe block must end with exactly one value-returning return");
    }
    if (statements.length < 2) {
      add(block, "INVALID_LOCAL_DECLARATION: A safe block requires at least one const before its final return");
    }

    let scopedBindings = new Set(bindings);
    const localNames = new Set<string>();
    statements.forEach((statement, statementIndex) => {
      if (!checkBudget(statement, depth + 1)) return;
      const isFinal = statementIndex === statements.length - 1;
      if (statement.type === "ReturnStatement") {
        if (!isFinal) {
          add(statement, "BLOCK_REQUIRES_FINAL_RETURN: Return is only allowed as the final statement");
          return;
        }
        const argument = nodeOf(statement.argument);
        if (argument) visit(argument, depth + 1, scopedBindings);
        return;
      }
      if (statement.type !== "VariableDeclaration") {
        add(statement, `UNSUPPORTED_BLOCK_STATEMENT: '${statement.type}' is not allowed in a safe block`);
        return;
      }
      if (statement.kind !== "const") {
        add(statement, "INVALID_LOCAL_DECLARATION: Only immutable const declarations are allowed");
        return;
      }
      for (const declaration of nodesOf(statement.declarations)) {
        if (!checkBudget(declaration, depth + 2)) continue;
        const identifier = nodeOf(declaration.id);
        if (declaration.type !== "VariableDeclarator" || identifier?.type !== "Identifier") {
          add(declaration, "INVALID_LOCAL_DECLARATION: Local declarations require a simple identifier");
          continue;
        }
        const name = String(identifier.name);
        if (isBlockedCustomJsxLexicalBinding(name)) {
          add(identifier, `INVALID_LOCAL_DECLARATION: '${name}' is not a safe local binding name`);
          continue;
        }
        if (RESERVED_LOCAL_BINDINGS.has(name)) {
          add(identifier, `RESERVED_LOCAL_BINDING: '${name}' cannot be shadowed`);
          continue;
        }
        if (localNames.has(name)) {
          add(identifier, `DUPLICATE_LOCAL_BINDING: '${name}' is already declared`);
          continue;
        }
        const initializer = nodeOf(declaration.init);
        if (!initializer) {
          add(declaration, `LOCAL_BINDING_REQUIRES_INITIALIZER: '${name}' requires an initializer`);
          continue;
        }
        if (
          initializer.type === "ArrowFunctionExpression" ||
          initializer.type === "FunctionExpression" ||
          isStaticallyCallableBinding(initializer)
        ) {
          add(initializer, "CALLBACK_VALUE_NOT_ALLOWED: Functions cannot be stored in local bindings");
          continue;
        }
        visit(initializer, depth + 1, scopedBindings);
        localNames.add(name);
        scopedBindings = new Set(scopedBindings).add(name);
      }
    });
  };

  visit = (node: AstNode, depth: number, bindings: ReadonlySet<string>): void => {
    if (!checkBudget(node, depth)) return;

    switch (node.type) {
      case "Program":
        nodesOf(node.body).forEach((child) => visit(child, depth + 1, bindings));
        return;
      case "ExpressionStatement": {
        const expression = nodeOf(node.expression);
        if (expression) visit(expression, depth + 1, bindings);
        return;
      }
      case "JSXFragment":
        nodesOf(node.children).forEach((child) => visit(child, depth + 1, bindings));
        return;
      case "JSXElement": {
        analyzeCustomJsxElement(node, depth, bindings, { add, visit, visitArrow });
        return;
      }
      case "JSXText":
      case "JSXEmptyExpression":
      case "TemplateElement":
        return;
      case "JSXExpressionContainer": {
        const expression = nodeOf(node.expression);
        if (expression && expression.type !== "JSXEmptyExpression") visit(expression, depth + 1, bindings);
        return;
      }
      case "Literal":
        if (node.regex !== undefined || typeof node.value === "bigint") {
          add(node, "Regular expressions and bigint literals are not supported");
        }
        return;
      case "Identifier": {
        const name = String(node.name ?? "");
        if (!bindings.has(name)) add(node, `Unknown binding '${name}'`);
        return;
      }
      case "ArrayExpression":
        nodesOf(node.elements).forEach((child) => {
          const argument = child.type === "SpreadElement" ? nodeOf(child.argument) : child;
          if (argument) visit(argument, depth + 1, bindings);
        });
        return;
      case "ObjectExpression":
        nodesOf(node.properties).forEach((property) => {
          if (property.type === "SpreadElement") {
            const argument = nodeOf(property.argument);
            if (argument) visit(argument, depth + 1, bindings);
            return;
          }
          if (property.type !== "Property" || property.kind !== "init" || property.method || property.shorthand) {
            add(property, "Only explicit object properties are supported");
            return;
          }
          const key = nodeOf(property.key);
          if (property.computed && key) visit(key, depth + 1, bindings);
          if (
            !property.computed &&
            key &&
            CUSTOM_JSX_BLOCKED_PROPERTIES.has(normalizeCustomJsxProperty(key.name ?? key.value))
          ) {
            add(key, "Reflective object properties are not allowed");
          }
          const value = nodeOf(property.value);
          if (value) visit(value, depth + 1, bindings);
        });
        return;
      case "UnaryExpression":
        if (!["!", "+", "-", "typeof"].includes(String(node.operator))) {
          add(node, `Unary operator '${String(node.operator)}' is not supported`);
        }
        if (nodeOf(node.argument)) visit(node.argument as AstNode, depth + 1, bindings);
        return;
      case "BinaryExpression":
      case "LogicalExpression": {
        if (node.type === "BinaryExpression" && !CUSTOM_JSX_BINARY_OPERATORS.has(String(node.operator))) {
          add(node, `Binary operator '${String(node.operator)}' is not supported`);
        }
        const left = nodeOf(node.left);
        const right = nodeOf(node.right);
        if (left) visit(left, depth + 1, bindings);
        if (right) visit(right, depth + 1, bindings);
        return;
      }
      case "ConditionalExpression": {
        [node.test, node.consequent, node.alternate].map(nodeOf).forEach((child) => {
          if (child) visit(child, depth + 1, bindings);
        });
        return;
      }
      case "MemberExpression": {
        const object = nodeOf(node.object);
        const property = nodeOf(node.property);
        if (object) visit(object, depth + 1, bindings);
        if (node.computed && property) visit(property, depth + 1, bindings);
        const propertyName = node.computed
          ? staticPropertyName(property)
          : String(property?.name ?? property?.value ?? "");
        if (propertyName && CUSTOM_JSX_BLOCKED_PROPERTIES.has(normalizeCustomJsxProperty(propertyName))) {
          add(property ?? node, "Reflective property access is not allowed");
        }
        return;
      }
      case "CallExpression": {
        const callee = nodeOf(node.callee);
        const arguments_ = nodesOf(node.arguments);
        if (callee?.type === "ArrowFunctionExpression") {
          if (nodesOf(callee.params).length > 0) {
            add(callee, "CALLBACK_VALUE_NOT_ALLOWED: Inline derived-value functions cannot declare parameters");
          }
          if (arguments_.length > 0) {
            add(node, "CALLBACK_VALUE_NOT_ALLOWED: Inline derived-value functions must be called without arguments");
          }
          visitArrow(callee, depth + 1, bindings);
          arguments_.forEach((argument) => visit(argument, depth + 1, bindings));
          return;
        }
        if (callee) visit(callee, depth + 1, bindings);
        const property = callee?.type === "MemberExpression" ? nodeOf(callee.property) : null;
        const method = property?.type === "Identifier" ? String(property.name) : staticPropertyName(property);
        if (
          callee &&
          !isStaticallyCallableBinding(callee) &&
          (callee.type !== "MemberExpression" || !method || !CUSTOM_JSX_SAFE_VALUE_METHODS.has(method))
        ) {
          add(callee, "CALL_TARGET_NOT_ALLOWED: Only documented safe helpers and value methods can be called");
        }
        if (method && CUSTOM_JSX_CALLBACK_METHODS.has(method)) {
          const callback = arguments_[0];
          if (!callback) {
            add(node, `CALLBACK_VALUE_NOT_ALLOWED: '${method}' requires a callback`);
          } else if (["reduce", "sort"].includes(method) && callback.type !== "ArrowFunctionExpression") {
            add(callback, `CALLBACK_VALUE_NOT_ALLOWED: '${method}' requires an inline arrow callback`);
          } else if (callback.type !== "ArrowFunctionExpression" && !isStaticallyCallableBinding(callback)) {
            add(callback, `CALLBACK_VALUE_NOT_ALLOWED: '${method}' requires an inline arrow or safe helper callback`);
          }
        }
        arguments_.forEach((argument, argumentIndex) => {
          if (argument.type === "SpreadElement") add(argument, "Spread call arguments are not supported");
          else if (
            argument.type === "ArrowFunctionExpression" &&
            argumentIndex === 0 &&
            method &&
            CUSTOM_JSX_CALLBACK_METHODS.has(method)
          ) {
            visitArrow(argument, depth + 1, bindings);
          } else if (argument.type === "ArrowFunctionExpression") {
            add(argument, "CALLBACK_VALUE_NOT_ALLOWED: Callback arguments are only allowed in the first callback slot");
          } else visit(argument, depth + 1, bindings);
        });
        return;
      }
      case "ArrowFunctionExpression": {
        add(
          node,
          "CALLBACK_VALUE_NOT_ALLOWED: Callbacks are only allowed in safe collection methods and trusted slots",
        );
        return;
      }
      case "BlockStatement":
        add(node, "UNSUPPORTED_BLOCK_STATEMENT: Blocks are only allowed as safe callback or IIFE bodies");
        return;
      case "AssignmentExpression":
      case "UpdateExpression":
      case "NewExpression":
      case "AwaitExpression":
      case "YieldExpression":
        add(node, `UNSUPPORTED_BLOCK_STATEMENT: '${node.type}' is not allowed in safe expressions`);
        return;
      case "TemplateLiteral":
        nodesOf(node.expressions).forEach((expression) => visit(expression, depth + 1, bindings));
        return;
      case "ChainExpression": {
        const expression = nodeOf(node.expression);
        if (expression) visit(expression, depth + 1, bindings);
        return;
      }
      default:
        add(node, `Unsupported expression '${node.type}'`);
    }
  };

  try {
    const program = JsxParser.parse(`<>${template}</>`, {
      ecmaVersion: "latest",
      sourceType: "module",
      locations: true,
    }) as unknown as AstNode;
    visit(program, 0, ROOT_BINDINGS);
  } catch (error) {
    const parseError = error as Error & { pos?: number; loc?: { line?: number; column?: number } };
    const parseIndex = Math.max(0, (parseError.pos ?? 2) - 2);
    const missingInitializer = [...template.matchAll(/(?:\bconst|,)\s+([A-Za-z_$][\w$]*)\s*;/gu)].find((match) => {
      const semicolon = (match.index ?? 0) + match[0].length - 1;
      return Math.abs(semicolon - parseIndex) <= 1;
    });
    const duplicateCandidate = /Identifier '([^']+)' has already been declared/iu.exec(parseError.message);
    const duplicateBinding = duplicateCandidate;
    const message = missingInitializer
      ? `LOCAL_BINDING_REQUIRES_INITIALIZER: '${missingInitializer[1]}' requires an initializer`
      : duplicateBinding
        ? `DUPLICATE_LOCAL_BINDING: '${duplicateBinding[1]}' is already declared`
        : parseError.message;
    diagnostics.push({
      severity: "error",
      message,
      index: Math.max(0, (parseError.pos ?? 2) - 2),
      line: parseError.loc?.line ?? 1,
      column: Math.max(
        1,
        (parseError.loc?.column ?? 0) + (parseError.loc?.line === 1 || parseError.loc?.line === undefined ? -1 : 1),
      ),
    });
  }

  return diagnostics;
}
