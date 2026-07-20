import type { HomarrCustomWidgetV2 } from "./custom-jsx-schema";
import { customWidgetImportSchema } from "./custom-jsx-schema";

export interface ImportReview {
  name: string;
  origins: string[];
  authTypes: string[];
  networkScopes: string[];
  methods: string[];
  permissions: string[];
  hasActions: boolean;
}

export interface CustomWidgetImportIssue {
  code: string;
  path?: Array<string | number>;
  message: string;
}

export type CustomWidgetParseResult =
  | { success: true; widget: HomarrCustomWidgetV2; warnings: CustomWidgetImportIssue[] }
  | { success: false; issues: CustomWidgetImportIssue[] };

interface FencedBlock {
  language: string;
  content: string;
}

const MAX_IMPORT_ISSUES = 8;

function extractFencedBlocks(text: string): FencedBlock[] {
  const blocks: FencedBlock[] = [];
  for (const match of text.matchAll(/```([^\n`]*)\n([\s\S]*?)```/gu)) {
    blocks.push({ language: (match[1] ?? "").trim().toLowerCase(), content: match[2] ?? "" });
  }
  return blocks;
}

function jsonSyntaxIssue(error: unknown, source: string): CustomWidgetImportIssue {
  const message = error instanceof Error ? error.message : "The response is not valid JSON";
  const position = /position\s+(\d+)/iu.exec(message)?.[1];
  if (!position) return { code: "INVALID_JSON", message };
  const offset = Number(position);
  const prefix = source.slice(0, offset);
  const line = prefix.split("\n").length;
  const column = offset - prefix.lastIndexOf("\n");
  return { code: "INVALID_JSON", message: `${message} (line ${line}, column ${column})` };
}

function zodIssues(error: { issues: Array<{ path: PropertyKey[]; message: string; code: string }> }) {
  return error.issues.slice(0, MAX_IMPORT_ISSUES).map((issue) => ({
    code: issue.code === "unrecognized_keys" ? "UNSUPPORTED_FIELD" : "INVALID_WIDGET",
    path: issue.path.map((part) => (typeof part === "symbol" ? String(part) : part)),
    message: issue.message,
  }));
}

function removedStateIssues(value: Record<string, unknown>): CustomWidgetImportIssue[] {
  return ["stateSchema", "defaultState"].flatMap((field) =>
    Object.hasOwn(value, field)
      ? [
          {
            code: "REMOVED_LOCAL_STATE",
            path: [field],
            message: `${field} is not supported. Use bind with inputs for temporary values or widget options for saved configuration.`,
          },
        ]
      : [],
  );
}

function isTemplatePlaceholder(value: unknown) {
  return typeof value === "string" && value.replace(/[\\*_`\s]/gu, "").toUpperCase() === "HOMARRTEMPLATE";
}

function normalizeAiRequestParameters(value: Record<string, unknown>, warnings: CustomWidgetImportIssue[]) {
  if (!Array.isArray(value.requests)) return;
  value.requests = value.requests.map((candidate, requestIndex) => {
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) return candidate;
    const request = { ...(candidate as Record<string, unknown>) };
    if (!request.parameters || typeof request.parameters !== "object" || Array.isArray(request.parameters))
      return request;
    const parameters = { ...(request.parameters as Record<string, unknown>) };
    for (const [name, parameter] of Object.entries(parameters)) {
      if (!parameter || typeof parameter !== "object" || Array.isArray(parameter)) continue;
      const keys = Object.keys(parameter);
      const type = (parameter as Record<string, unknown>).type;
      if (keys.length === 1 && ["string", "number", "boolean"].includes(String(type))) {
        parameters[name] = type;
        warnings.push({
          code: "NORMALIZED_PARAMETER_TYPE",
          path: ["requests", requestIndex, "parameters", name],
          message: `Converted { type: "${String(type)}" } to "${String(type)}".`,
        });
      }
    }
    request.parameters = parameters;
    return request;
  });
}

type ParsedWidgetValue =
  | { success: true; value: Record<string, unknown> }
  | { success: false; issue: CustomWidgetImportIssue };

function parseWidgetValue(source: string): ParsedWidgetValue {
  try {
    const parsed: unknown = JSON.parse(source);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {
        success: false,
        issue: { code: "INVALID_WIDGET", message: "The response must contain one widget JSON object." },
      };
    }
    return { success: true, value: parsed as Record<string, unknown> };
  } catch (error) {
    return { success: false, issue: jsonSyntaxIssue(error, source) };
  }
}

export function parseCustomWidgetClipboard(text: string): HomarrCustomWidgetV2 | null {
  const result = parseCustomWidgetClipboardDetailed(text);
  return result.success ? result.widget : null;
}

export function parseCustomWidgetClipboardDetailed(text: string): CustomWidgetParseResult {
  const blocks = extractFencedBlocks(text);
  const jsonBlock = blocks.find((block) => block.language === "json" || block.language === "");
  const jsxBlock = blocks.find((block) => block.language === "jsx" || block.language === "tsx");
  const source = jsonBlock?.content ?? text;
  const parsedValue = parseWidgetValue(source);
  if (!parsedValue.success) return { success: false, issues: [parsedValue.issue] };
  const widget = { ...parsedValue.value };
  if (jsonBlock && isTemplatePlaceholder(widget.template) && !jsxBlock) {
    return {
      success: false,
      issues: [
        {
          code: "MISSING_JSX_BLOCK",
          path: ["template"],
          message: "The manifest uses a template placeholder but no fenced JSX block was provided.",
        },
      ],
    };
  }
  if (jsxBlock && isTemplatePlaceholder(widget.template)) widget.template = jsxBlock.content.trim();
  const removedIssues = removedStateIssues(widget);
  if (removedIssues.length > 0) return { success: false, issues: removedIssues };
  const parsed = customWidgetImportSchema.safeParse(widget);
  if (!parsed.success) return { success: false, issues: zodIssues(parsed.error) };
  return { success: true, widget: parsed.data, warnings: [] };
}

export function parseCustomWidgetAiResponse(text: string): CustomWidgetParseResult {
  const blocks = extractFencedBlocks(text);
  const jsonBlocks = blocks.filter((block) => block.language === "json" || block.language === "");
  const jsxBlocks = blocks.filter((block) => block.language === "jsx" || block.language === "tsx");
  const formatIssues: CustomWidgetImportIssue[] = [];
  if (jsonBlocks.length !== 1)
    formatIssues.push({ code: "AI_JSON_BLOCK_REQUIRED", message: "Expected exactly one fenced json block." });
  if (jsxBlocks.length !== 1)
    formatIssues.push({ code: "AI_JSX_BLOCK_REQUIRED", message: "Expected exactly one fenced jsx block." });
  const source = jsonBlocks[0]?.content ?? text;
  const parsedValue = parseWidgetValue(source);
  if (!parsedValue.success) {
    if (/\\_/u.test(source))
      formatIssues.push({
        code: "INVALID_JSON_ESCAPE",
        message: 'JSON does not allow \\_ escapes. The template placeholder must be "__HOMARR_TEMPLATE__".',
      });
    if (/"(?:stateSchema|defaultState)"\s*:/u.test(source))
      formatIssues.push({
        code: "REMOVED_LOCAL_STATE",
        message: "stateSchema and defaultState are not supported; use bind with inputs or widget options.",
      });
    return { success: false, issues: [parsedValue.issue, ...formatIssues].slice(0, MAX_IMPORT_ISSUES) };
  }
  const widget = { ...parsedValue.value };
  const removedIssues = removedStateIssues(widget);
  if (removedIssues.length > 0) formatIssues.push(...removedIssues);
  const warnings: CustomWidgetImportIssue[] = [];
  normalizeAiRequestParameters(widget, warnings);
  if (jsxBlocks[0]) {
    if (isTemplatePlaceholder(widget.template) || !widget.template) widget.template = jsxBlocks[0].content.trim();
    else if (widget.template !== jsxBlocks[0].content.trim())
      formatIssues.push({
        code: "AI_TEMPLATE_PLACEHOLDER_REQUIRED",
        path: ["template"],
        message: 'The manifest template must be "__HOMARR_TEMPLATE__" when a separate JSX block is returned.',
      });
  }
  if (formatIssues.length > 0) return { success: false, issues: formatIssues.slice(0, MAX_IMPORT_ISSUES) };
  const parsed = customWidgetImportSchema.safeParse(widget);
  if (!parsed.success) return { success: false, issues: zodIssues(parsed.error) };
  return { success: true, widget: parsed.data, warnings };
}

export function looksLikeCustomWidgetClipboard(text: string) {
  return /homarr-custom-widget|```(?:json|jsx|tsx)?\s*\n|"\$schema"\s*:/iu.test(text);
}

export function formatCustomWidgetImportIssues(issues: readonly CustomWidgetImportIssue[]) {
  const visible = issues.slice(0, 3).map((issue) => {
    const path = issue.path?.length ? `${issue.path.join(".")}: ` : "";
    return `${path}${issue.message}`;
  });
  const remaining = issues.length - visible.length;
  return `${visible.join(" ")}${remaining > 0 ? ` (+${remaining} more)` : ""}`;
}

export function getImportReview(value: Record<string, unknown> | null): ImportReview | null {
  const parsed = customWidgetImportSchema.safeParse(value);
  if (!parsed.success) return null;
  const widget = parsed.data;
  return {
    name: widget.name,
    origins: widget.sources.map((source) => new URL(source.baseUrl).origin),
    authTypes: [...new Set(widget.sources.map((source) => source.auth.type))],
    networkScopes: [...new Set(widget.sources.map((source) => source.networkScope))],
    methods: [...new Set(widget.requests.map((request) => request.method))],
    permissions: [...new Set(widget.requests.map((request) => request.minimumBoardPermission))],
    hasActions: widget.requests.some((request) => request.kind === "action"),
  };
}
