import type { UIMessage } from "ai";

import type { McpTool } from "@homarr/api/mcp";

const ignoredSearchTerms = new Set([
  "a",
  "an",
  "and",
  "can",
  "create",
  "for",
  "from",
  "get",
  "in",
  "list",
  "make",
  "my",
  "of",
  "on",
  "please",
  "the",
  "to",
  "want",
  "with",
]);

const searchTermAliases: Record<string, readonly string[]> = {
  account: ["user"],
  dashboard: ["board"],
  k8s: ["kubernetes"],
  movie: ["media", "radarr", "request"],
  seerr: ["overseerr", "jellyseerr", "media", "request"],
  show: ["media", "sonarr", "request"],
  streaming: ["stream", "media", "server"],
};

const normalizeSearchText = (value: string) =>
  value
    .replaceAll(/([a-z\d])([A-Z])/gu, "$1 $2")
    .normalize("NFKD")
    .toLowerCase()
    .replaceAll(/[^a-z\d]+/gu, " ")
    .trim();

const getSearchTerms = (query: string) => {
  const terms = normalizeSearchText(query)
    .split(" ")
    .filter((term) => term.length > 1 && !ignoredSearchTerms.has(term));
  return [...new Set(terms.flatMap((term) => [term, ...(searchTermAliases[term] ?? [])]))];
};

const scoreTool = (tool: McpTool, query: string, terms: readonly string[]) => {
  const normalizedName = normalizeSearchText(tool.name);
  const normalizedPath = normalizeSearchText(tool.pathInRouter.join(" "));
  const normalizedDescription = normalizeSearchText(tool.description);
  const searchable = `${normalizedName} ${normalizedPath} ${normalizedDescription}`;
  let score = 0;
  if (normalizedName.includes(query)) score += 40;
  if (normalizedDescription.includes(query)) score += 20;
  for (const term of terms) {
    if (normalizedName.split(" ").includes(term)) score += 12;
    else if (normalizedName.includes(term)) score += 7;
    if (normalizedPath.split(" ").includes(term)) score += 6;
    if (normalizedDescription.split(" ").includes(term)) score += 4;
    else if (searchable.includes(term)) score += 1;
  }
  return score;
};

export const findAssistantMcpTools = (tools: readonly McpTool[], query: string, limit = 8) => {
  const normalizedQuery = normalizeSearchText(query);
  const terms = getSearchTerms(query);
  if (!normalizedQuery || terms.length === 0) return [];

  return tools
    .map((tool) => ({ tool, score: scoreTool(tool, normalizedQuery, terms) }))
    .filter(({ score }) => score > 0)
    .toSorted((left, right) => right.score - left.score || left.tool.name.localeCompare(right.tool.name))
    .slice(0, limit)
    .map(({ tool }) => tool);
};

export const filterAssistantMcpToolMatches = <TTool extends Pick<McpTool, "name">>(
  tools: readonly TTool[],
  query: string,
  customWidgetAuthoringActive: boolean,
) => {
  if (!customWidgetAuthoringActive) return [...tools];
  const normalizedQuery = normalizeSearchText(query);
  const requestsCompleteCatalog =
    normalizedQuery.includes("all components") ||
    ["full component catalog", "complete component catalog"].some((phrase) => normalizedQuery.includes(phrase));
  return tools.filter((tool) => {
    if (tool.name === "customWidget_getComponentCatalog") return requestsCompleteCatalog;
    if (tool.name === "customWidget_schema") return false;
    return true;
  });
};

export const getLatestAssistantUserText = (messages: UIMessage[]) => {
  const latestUserMessage = messages.toReversed().find((message) => message.role === "user");
  if (!latestUserMessage) return "";
  return latestUserMessage.parts
    .flatMap((part) => {
      if (typeof part !== "object" || part === null || !("type" in part) || part.type !== "text") return [];
      if (!("text" in part) || typeof part.text !== "string") return [];
      return [part.text];
    })
    .join("\n");
};
