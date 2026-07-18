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

function extractFencedBlock(text: string, acceptedLanguages: readonly string[]): string | undefined {
  let cursor = 0;
  while (cursor < text.length) {
    const fenceStart = text.indexOf("```", cursor);
    if (fenceStart === -1) return undefined;
    const headerStart = fenceStart + 3;
    const headerEnd = text.indexOf("\n", headerStart);
    if (headerEnd === -1) return undefined;
    const contentStart = headerEnd + 1;
    const fenceEnd = text.indexOf("```", contentStart);
    if (fenceEnd === -1) return undefined;
    const language = text.slice(headerStart, headerEnd).trim().toLowerCase();
    if (acceptedLanguages.includes(language)) return text.slice(contentStart, fenceEnd);
    cursor = fenceEnd + 3;
  }
  return undefined;
}

export function parseCustomWidgetClipboard(text: string): Record<string, unknown> | null {
  const result = parseCustomWidgetClipboardDetailed(text);
  return result.success ? result.widget : null;
}

export function parseCustomWidgetClipboardDetailed(
  text: string,
): { success: true; widget: Record<string, unknown> } | { success: false; error: string } {
  try {
    const jsonBlock = extractFencedBlock(text, ["", "json"]);
    const jsxBlock = extractFencedBlock(text, ["jsx", "tsx"])?.trim();
    const value: unknown = JSON.parse(jsonBlock ?? text);
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return { success: false, error: "The response must contain one widget JSON object" };
    }
    const widget = { ...(value as Record<string, unknown>) };
    if (jsxBlock && (widget.template === "__HOMARR_TEMPLATE__" || !widget.template)) widget.template = jsxBlock;
    const parsed = customWidgetImportSchema.safeParse(widget);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return {
        success: false,
        error: `${issue?.path.map(String).join(".") || "widget"}: ${issue?.message ?? "Invalid widget"}`,
      };
    }
    return { success: true, widget };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "The response is not valid JSON" };
  }
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
