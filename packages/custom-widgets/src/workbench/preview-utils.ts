import type { PreviewNamedRequest } from "./preview-request-panel";

export const redactPreviewUrl = (value: string): string => {
  try {
    const url = new URL(value);
    for (const key of url.searchParams.keys()) url.searchParams.set(key, "redacted");
    return url.toString();
  } catch {
    return value;
  }
};

export const getPreviewNamedRequests = (displayConfig: Record<string, unknown>): PreviewNamedRequest[] => {
  if (!Array.isArray(displayConfig.requests)) return [];
  return displayConfig.requests.filter(
    (request): request is PreviewNamedRequest =>
      request !== null &&
      typeof request === "object" &&
      "id" in request &&
      typeof request.id === "string" &&
      "kind" in request &&
      (request.kind === "query" || request.kind === "action") &&
      "method" in request &&
      typeof request.method === "string" &&
      "pathTemplate" in request &&
      typeof request.pathTemplate === "string",
  );
};

export const getPreviewLegacyMethods = (template: string): string[] => {
  const methods = new Set<string>();
  for (const match of template.matchAll(/<(?:SubFetch|ActionButton|ToggleSwitch)\b([^>]*)>/giu)) {
    const method = match[1]?.match(/\bmethod\s*=\s*["'](GET|POST|PUT|PATCH|DELETE)["']/iu)?.[1];
    methods.add(method?.toUpperCase() ?? (match[0].startsWith("<SubFetch") ? "GET" : "POST"));
  }
  return [...methods];
};
