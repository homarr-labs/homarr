export interface ImportReview {
  name: string;
  origin: string;
  authType: string;
  networkScope: string;
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
  try {
    const jsonBlock = extractFencedBlock(text, ["", "json"]);
    const jsxBlock = extractFencedBlock(text, ["jsx", "tsx"])?.trim();
    const value: unknown = JSON.parse(jsonBlock ?? text);
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    const widget = value as Record<string, unknown>;
    if (
      typeof widget.name !== "string" ||
      typeof widget.url !== "string" ||
      typeof widget.displayType !== "string" ||
      !widget.displayConfig ||
      typeof widget.displayConfig !== "object" ||
      Array.isArray(widget.displayConfig)
    ) {
      return null;
    }
    if (jsxBlock && widget.displayType === "customJsx") {
      const displayConfig = widget.displayConfig as Record<string, unknown>;
      if (displayConfig.template === "__HOMARR_TEMPLATE__" || !displayConfig.template) {
        displayConfig.template = jsxBlock;
      }
    }
    return widget;
  } catch {
    return null;
  }
}

export function getImportReview(value: Record<string, unknown> | null): ImportReview | null {
  if (!value) return null;
  const displayConfig = value.displayConfig as Record<string, unknown>;
  const requests = Array.isArray(displayConfig.requests)
    ? displayConfig.requests.filter(
        (request): request is Record<string, unknown> =>
          request !== null && typeof request === "object" && !Array.isArray(request),
      )
    : [];
  const baseMethod = typeof value.method === "string" ? value.method : "GET";
  const methods = [
    ...new Set([
      baseMethod,
      ...requests.map((request) => request.method).filter((method): method is string => typeof method === "string"),
    ]),
  ];
  const permissions = [
    ...new Set(
      requests
        .map((request) => request.minimumBoardPermission)
        .filter(
          (permission): permission is string =>
            permission === "view" || permission === "modify" || permission === "full",
        ),
    ),
  ];
  if (permissions.length === 0) permissions.push(baseMethod === "GET" ? "view" : "modify");

  let origin = value.url;
  try {
    origin = new URL(value.url as string).origin;
  } catch {
    // The server returns the localized validation error after confirmation.
  }

  return {
    name: value.name as string,
    origin: String(origin),
    authType: typeof value.authType === "string" ? value.authType : "none",
    networkScope: typeof displayConfig.networkScope === "string" ? displayConfig.networkScope : "legacy",
    methods,
    permissions,
    hasActions: methods.some((method) => method !== "GET"),
  };
}
