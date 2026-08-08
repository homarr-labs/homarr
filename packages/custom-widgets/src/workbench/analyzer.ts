import { getCustomJsxBindingType } from "../core/component-registry";
import { customJsxRequestSchema } from "../core/request-schema";
import { z } from "zod/v4";
import { CUSTOM_JSX_LIMITS, validateCustomJsxTemplate } from "../jsx";

export type EditorDiagnosticCode =
  | "ast"
  | "bindingTypeConflict"
  | "dynamicRequestId"
  | "dynamicInputBinding"
  | "inlineRequestProps"
  | "invalidRequestManifest"
  | "missingRequestId"
  | "templateEmpty"
  | "templateTooLong"
  | "unknownRequest";

export interface EditorDiagnostic {
  code: EditorDiagnosticCode;
  severity: "error" | "warning";
  line?: number;
  column?: number;
  index?: number;
  value?: string;
}

export interface AnalyzeJsxTemplateOptions {
  requestIds?: string[];
}
const networkComponentPattern = /<(SubFetch|ActionButton|ToggleSwitch)\b([^>]*)>/giu;
const inputBindingPattern = /<([A-Z][A-Za-z0-9.]*)(?:\s[^<>]*?)?\bbind\s*=\s*(?:"([^"]+)"|'([^']+)'|\{)/gu;
const lineAt = (source: string, index: number) => source.slice(0, index).split("\n").length;
export const CUSTOM_JSX_TEMPLATE_LIMIT = CUSTOM_JSX_LIMITS.templateLength;

export function analyzeJsxTemplate(
  template: string,
  { requestIds = [] }: AnalyzeJsxTemplateOptions = {},
): EditorDiagnostic[] {
  const diagnostics: EditorDiagnostic[] = [];
  if (!template.trim()) diagnostics.push({ code: "templateEmpty", severity: "error", line: 1, column: 1, index: 0 });
  if (template.length > CUSTOM_JSX_TEMPLATE_LIMIT)
    diagnostics.push({ code: "templateTooLong", severity: "error", line: 1, column: 1, index: 0 });
  diagnostics.push(
    ...validateCustomJsxTemplate(template).map((entry) => ({
      code: "ast" as const,
      severity: entry.severity,
      line: entry.line,
      column: entry.column,
      index: entry.index,
      value: entry.message,
    })),
  );
  const knownIds = new Set(requestIds);
  for (const match of template.matchAll(networkComponentPattern)) {
    const props = match[2] ?? "";
    const line = lineAt(template, match.index);
    if (/\b(?:url|method|headers|body|onBody|offBody)\s*=/iu.test(props)) {
      diagnostics.push({ code: "inlineRequestProps", severity: "error", line, index: match.index });
    }
    const staticRequest = props.match(/\brequestId\s*=\s*["']([^"']+)["']/iu);
    if (staticRequest?.[1] && !knownIds.has(staticRequest[1])) {
      diagnostics.push({
        code: "unknownRequest",
        severity: "error",
        line,
        index: match.index,
        value: staticRequest[1],
      });
    } else if (!staticRequest && /\brequestId\s*=/iu.test(props)) {
      diagnostics.push({ code: "dynamicRequestId", severity: "error", line, index: match.index });
    } else if (!staticRequest) {
      diagnostics.push({ code: "missingRequestId", severity: "error", line, index: match.index });
    }
  }
  const inputTypes = new Map<string, string>();
  for (const match of template.matchAll(inputBindingPattern)) {
    const componentName = match[1] ?? "";
    const inputName = match[2] ?? match[3];
    if (!inputName) {
      diagnostics.push({
        code: "dynamicInputBinding",
        severity: "error",
        line: lineAt(template, match.index),
        index: match.index,
      });
      continue;
    }
    const type = getCustomJsxBindingType(componentName);
    const existing = inputTypes.get(inputName);
    if (type && existing && existing !== type) {
      diagnostics.push({
        code: "bindingTypeConflict",
        severity: "error",
        line: lineAt(template, match.index),
        index: match.index,
        value: inputName,
      });
    } else if (type) {
      inputTypes.set(inputName, type);
    }
  }
  return diagnostics;
}

export function analyzeRequestManifest(value: string): EditorDiagnostic[] {
  try {
    const result = z.record(z.string(), customJsxRequestSchema).safeParse(JSON.parse(value) as unknown);
    if (result.success) return [];
    return result.error.issues.map((issue) => ({
      code: "invalidRequestManifest",
      severity: "error",
      line: 1,
      value: `${issue.path.map(String).join(".") || "requests"}: ${issue.message}`,
    }));
  } catch {
    return [{ code: "invalidRequestManifest", severity: "error", line: 1 }];
  }
}

export function parseRequestManifest(value: string): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(value);
    return parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}
