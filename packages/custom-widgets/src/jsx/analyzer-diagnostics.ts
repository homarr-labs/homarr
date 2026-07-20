export interface CustomJsxTemplateDiagnostic {
  severity: "error" | "warning";
  message: string;
  index: number;
  line: number;
  column: number;
}

export function createCustomJsxParseDiagnostic(template: string, error: unknown): CustomJsxTemplateDiagnostic {
  const parseError = error as Error & { pos?: number; loc?: { line?: number; column?: number } };
  const parseIndex = Math.max(0, (parseError.pos ?? 2) - 2);
  const missingInitializer = [...template.matchAll(/(?:\bconst|,)\s+([A-Za-z_$][\w$]*)\s*;/gu)].find((match) => {
    const semicolon = (match.index ?? 0) + match[0].length - 1;
    return Math.abs(semicolon - parseIndex) <= 1;
  });
  const duplicateBinding = /Identifier '([^']+)' has already been declared/iu.exec(parseError.message);
  const duplicateArgument = /Argument name clash/iu.test(parseError.message);
  const message = missingInitializer
    ? `LOCAL_BINDING_REQUIRES_INITIALIZER: '${missingInitializer[1]}' requires an initializer`
    : duplicateBinding
      ? `DUPLICATE_LOCAL_BINDING: '${duplicateBinding[1]}' is already declared`
      : duplicateArgument
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
