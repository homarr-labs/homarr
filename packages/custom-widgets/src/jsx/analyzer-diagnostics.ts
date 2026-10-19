import type { AstNode } from "./analyzer-ast";

export interface CustomJsxTemplateDiagnostic {
  severity: "error" | "warning";
  message: string;
  index: number;
  line: number;
  column: number;
}

export function createCustomJsxNodeDiagnostic(
  node: AstNode,
  message: string,
  severity: "error" | "warning" = "error",
): CustomJsxTemplateDiagnostic {
  const line = node.loc?.start?.line ?? 1;
  return {
    severity,
    message,
    index: Math.max(0, (node.start ?? 2) - 2),
    line,
    column: Math.max(1, (node.loc?.start?.column ?? 0) + 1 - (line === 1 ? 2 : 0)),
  };
}

export function createCustomJsxParseDiagnostic(_template: string, error: unknown): CustomJsxTemplateDiagnostic {
  const parseError = error as Error & { pos?: number; loc?: { line?: number; column?: number } };
  const parseIndex = Math.max(0, (parseError.pos ?? 2) - 2);
  const duplicateArgument = /Argument name clash/iu.test(parseError.message);
  const message = duplicateArgument
    ? "DUPLICATE_LOCAL_BINDING: Callback parameter names must be unique"
    : parseError.message;

  return {
    severity: "error",
    message,
    index: parseIndex,
    line: parseError.loc?.line ?? 1,
    column: Math.max(
      1,
      (parseError.loc?.column ?? 0) + (parseError.loc?.line === 1 || parseError.loc?.line === undefined ? -1 : 1),
    ),
  };
}
