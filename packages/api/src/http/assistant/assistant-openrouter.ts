import type { TextStreamPart, ToolSet } from "ai";

import { isRecord } from "@homarr/common";

const openRouterWebSearchTool = {
  type: "openrouter:web_search",
  parameters: {
    max_results: 6,
    max_uses: 3,
    max_total_results: 12,
    max_characters: 6_000,
    search_context_size: "medium",
  },
} as const;

const maximumOpenRouterServerToolCalls = 5;
const deepSeekV41ModelId = "deepseek/deepseek-v4.1-flash";
const parallelSafeAssistantToolNames = new Set(["customWidget_previewQuery"]);

export interface OpenRouterWebSearchSource {
  url: string;
  title?: string;
}

const maximumWebSearchSources = 12;

const asRecord = (value: unknown): Record<string, unknown> | undefined => (isRecord(value) ? value : undefined);

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

export const createOpenRouterCitationStreamTransform =
  <TOOLS extends ToolSet>() =>
  (_options: { tools: TOOLS; stopStream: () => void }) => {
    const emittedUrls = new Set<string>();
    let nextSourceId = 1;
    let pendingSources: OpenRouterWebSearchSource[] = [];
    const flushSources = (controller: TransformStreamDefaultController<TextStreamPart<TOOLS>>) => {
      for (const source of pendingSources) {
        controller.enqueue({
          type: "source",
          sourceType: "url",
          id: `openrouter-source-${nextSourceId}`,
          url: source.url,
          ...(source.title ? { title: source.title } : {}),
        });
        nextSourceId += 1;
      }
      pendingSources = [];
    };

    return new TransformStream<TextStreamPart<TOOLS>, TextStreamPart<TOOLS>>({
      transform(chunk, controller) {
        if (chunk.type === "raw") {
          for (const source of getOpenRouterWebSearchSources(chunk.rawValue)) {
            if (emittedUrls.has(source.url)) continue;
            emittedUrls.add(source.url);
            pendingSources.push(source);
          }
          controller.enqueue(chunk);
          return;
        }
        controller.enqueue(chunk);
        if (chunk.type === "text-delta" || chunk.type === "finish-step" || chunk.type === "finish") {
          flushSources(controller);
        }
      },
      flush: flushSources,
    });
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

export const withOpenRouterProviderRouting = (body: Record<string, unknown>) => {
  if (body.model === "openai/gpt-6-luna") {
    const { temperature: _temperature, top_p: _topP, reasoning_effort: _reasoningEffort, ...request } = body;
    return {
      ...request,
      provider: { only: ["openai"], allow_fallbacks: false },
      reasoning: { effort: "max", exclude: false },
    };
  }
  if (body.model !== deepSeekV41ModelId) return body;
  return {
    ...body,
    provider: {
      order: ["deepinfra/fp8"],
      quantizations: ["fp8"],
      allow_fallbacks: true,
    },
  };
};

export const withOpenRouterToolRequestOptions = (
  body: Record<string, unknown>,
  options: { webSearchEnabled: boolean },
) => {
  const routedBody = withOpenRouterProviderRouting(body);
  const requestBody = options.webSearchEnabled ? withOpenRouterWebSearch(routedBody) : routedBody;
  const tools = Array.isArray(requestBody.tools) ? requestBody.tools : [];
  const functionToolNames = tools.flatMap((candidate) => {
    const tool = asRecord(candidate);
    if (tool?.type !== "function") return [];
    const definition = asRecord(tool.function);
    if (typeof definition?.name !== "string") return [];
    return [definition.name];
  });
  const hasServerTool = tools.some((candidate) => asRecord(candidate)?.type === openRouterWebSearchTool.type);
  const allowParallelToolCalls =
    !hasServerTool &&
    functionToolNames.length > 0 &&
    functionToolNames.every((toolName) => parallelSafeAssistantToolNames.has(toolName));
  return {
    ...requestBody,
    ...(options.webSearchEnabled ? { max_tool_calls: maximumOpenRouterServerToolCalls } : {}),
    // Several routed models interleave mutation arguments when calls run together. Only the
    // explicitly allowlisted read-only preview-query phase may emit parallel calls.
    parallel_tool_calls: allowParallelToolCalls,
  };
};

export const getOpenRouterWebSearchRequests = (value: unknown) => {
  if (!isRecord(value)) return undefined;
  const usage = "usage" in value && typeof value.usage === "object" && value.usage !== null ? value.usage : undefined;
  const serverToolUse =
    usage && "server_tool_use" in usage && typeof usage.server_tool_use === "object" && usage.server_tool_use !== null
      ? usage.server_tool_use
      : undefined;
  const requests =
    serverToolUse && "web_search_requests" in serverToolUse ? Number(serverToolUse.web_search_requests) : Number.NaN;
  return Number.isFinite(requests) && requests >= 0 ? requests : undefined;
};
