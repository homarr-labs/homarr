export interface AstNode {
  type: string;
  start?: number;
  loc?: { start?: { line?: number; column?: number } };
  [key: string]: unknown;
}

export const nodeOf = (value: unknown): AstNode | null =>
  value !== null && typeof value === "object" && typeof (value as { type?: unknown }).type === "string"
    ? (value as AstNode)
    : null;

export const nodesOf = (value: unknown): AstNode[] =>
  Array.isArray(value) ? value.map(nodeOf).filter((node): node is AstNode => node !== null) : [];

export const staticPropertyName = (node: AstNode | null): string | undefined => {
  if (!node) return undefined;
  if (node.type === "Literal" && (typeof node.value === "string" || typeof node.value === "number")) {
    return String(node.value);
  }
  if (node.type === "BinaryExpression" && node.operator === "+") {
    const left = staticPropertyName(nodeOf(node.left));
    const right = staticPropertyName(nodeOf(node.right));
    return left === undefined || right === undefined ? undefined : left + right;
  }
  if (node.type === "TemplateLiteral" && Array.isArray(node.expressions) && node.expressions.length === 0) {
    return (node.quasis as Array<{ value?: { cooked?: unknown } }> | undefined)
      ?.map((quasi) => String(quasi.value?.cooked ?? ""))
      .join("");
  }
  return undefined;
};

const callbackCollectionMethods = new Set(["every", "filter", "find", "findIndex", "map", "reduce", "some", "sort"]);

export function containsEscapingCallback(node: AstNode): boolean {
  if (node.type === "ArrowFunctionExpression") return true;
  if (node.type === "CallExpression") {
    const callee = nodeOf(node.callee);
    const arguments_ = nodesOf(node.arguments);
    if (callee?.type === "ArrowFunctionExpression") {
      if (arguments_.length > 0) return true;
      const body = nodeOf(callee.body);
      return body ? containsEscapingCallbackChildren(body) : false;
    }
    if (callee && containsEscapingCallback(callee)) return true;
    const property = callee?.type === "MemberExpression" ? nodeOf(callee.property) : null;
    const method = property?.type === "Identifier" ? String(property.name) : staticPropertyName(property);
    return arguments_.some((argument) => {
      if (argument.type !== "ArrowFunctionExpression" || !method || !callbackCollectionMethods.has(method)) {
        return containsEscapingCallback(argument);
      }
      const body = nodeOf(argument.body);
      return body ? containsEscapingCallback(body) : false;
    });
  }
  return containsEscapingCallbackChildren(node);
}

function containsEscapingCallbackChildren(node: AstNode): boolean {
  return Object.entries(node).some(([key, value]) => {
    if (["loc", "start", "end", "type"].includes(key)) return false;
    if (Array.isArray(value)) {
      return value.some((entry) => {
        const child = nodeOf(entry);
        return child ? containsEscapingCallback(child) : false;
      });
    }
    const child = nodeOf(value);
    return child ? containsEscapingCallback(child) : false;
  });
}
