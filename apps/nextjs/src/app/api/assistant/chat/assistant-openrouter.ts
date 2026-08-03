const openRouterWebSearchTool = {
  type: "openrouter:web_search",
  parameters: { max_results: 5, max_uses: 3 },
} as const;

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
