const openRouterWebSearchTool = {
  type: "openrouter:web_search",
  parameters: {
    max_results: 5,
    max_uses: 3,
    max_total_results: 10,
    max_characters: 2_500,
    search_context_size: "low",
  },
} as const;

export interface OpenRouterWebSearchSource {
  url: string;
  title?: string;
}

const maximumWebSearchSources = 12;

const asRecord = (value: unknown): Record<string, unknown> | undefined =>
  typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined;

const getSafeWebSourceUrl = (value: unknown) => {
  if (typeof value !== "string" || !URL.canParse(value)) return undefined;
  const url = new URL(value);
  if ((url.protocol !== "http:" && url.protocol !== "https:") || url.username || url.password) return undefined;
  return url.href;
};

const getWebSearchSource = (value: unknown, requireCitationType: boolean): OpenRouterWebSearchSource | undefined => {
  const annotation = asRecord(value);
  if (!annotation || (requireCitationType && annotation.type !== "url_citation")) return undefined;
  const citation = asRecord(annotation.url_citation) ?? annotation;
  const url = getSafeWebSourceUrl(citation.url);
  if (!url) return undefined;
  const title = typeof citation.title === "string" ? citation.title.trim().slice(0, 200) : "";
  return { url, ...(title ? { title } : {}) };
};

export const normalizeOpenRouterWebSearchSources = (value: unknown): OpenRouterWebSearchSource[] => {
  if (!Array.isArray(value)) return [];
  const sources = new Map<string, OpenRouterWebSearchSource>();
  for (const item of value) {
    const source = getWebSearchSource(item, false);
    if (!source) continue;
    const existing = sources.get(source.url);
    sources.set(source.url, existing?.title || !source.title ? (existing ?? source) : source);
    if (sources.size >= maximumWebSearchSources) break;
  }
  return [...sources.values()];
};

export const getOpenRouterWebSearchSources = (value: unknown): OpenRouterWebSearchSource[] => {
  const sources = new Map<string, OpenRouterWebSearchSource>();
  const visit = (candidate: unknown, depth: number) => {
    if (depth > 8 || sources.size >= maximumWebSearchSources) return;
    if (Array.isArray(candidate)) {
      for (const item of candidate) visit(item, depth + 1);
      return;
    }
    const record = asRecord(candidate);
    if (!record) return;
    const source = getWebSearchSource(record, true);
    if (source) {
      const existing = sources.get(source.url);
      sources.set(source.url, existing?.title || !source.title ? (existing ?? source) : source);
    }
    for (const nested of Object.values(record)) visit(nested, depth + 1);
  };

  visit(value, 0);
  return [...sources.values()];
};

export const withOpenRouterWebSearch = (body: Record<string, unknown>) => {
  const tools = Array.isArray(body.tools) ? body.tools : [];
  if (
    tools.some(
      (candidate) =>
        typeof candidate === "object" &&
        candidate !== null &&
        "type" in candidate &&
        candidate.type === openRouterWebSearchTool.type,
    )
  ) {
    return body;
  }

  return { ...body, tools: [...tools, openRouterWebSearchTool] };
};

export const withOpenRouterToolRequestOptions = (
  body: Record<string, unknown>,
  options: { webSearchEnabled: boolean },
) => ({
  ...(options.webSearchEnabled ? withOpenRouterWebSearch(body) : body),
  // OpenRouter enables parallel tool calls for most models by default. Several routed models
  // interleave or truncate function argument streams when they emit multiple calls together.
  // Sequential calls preserve the same agent loop while making every tool input independently valid.
  parallel_tool_calls: false,
});

export const getOpenRouterWebSearchRequests = (value: unknown) => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return undefined;
  const usage = "usage" in value && typeof value.usage === "object" && value.usage !== null ? value.usage : undefined;
  const serverToolUse =
    usage && "server_tool_use" in usage && typeof usage.server_tool_use === "object" && usage.server_tool_use !== null
      ? usage.server_tool_use
      : undefined;
  const requests =
    serverToolUse && "web_search_requests" in serverToolUse ? Number(serverToolUse.web_search_requests) : Number.NaN;
  return Number.isFinite(requests) && requests >= 0 ? requests : undefined;
};
