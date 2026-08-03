const openRouterWebSearchTool = {
  type: "openrouter:web_search",
  parameters: { max_results: 5 },
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
