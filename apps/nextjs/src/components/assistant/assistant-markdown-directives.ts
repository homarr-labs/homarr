export type AssistantDirectiveType = "app" | "integration" | "board" | "widget";

export type AssistantDirectiveEntity = {
  id: string;
  type: AssistantDirectiveType;
  label: string;
  description: string;
  iconUrl?: string;
};

type MarkdownNode = {
  type?: string;
  name?: string;
  value?: string;
  attributes?: Record<string, string | null | undefined> | null;
  children?: MarkdownNode[];
  data?: Record<string, unknown>;
};

const directiveTypes = new Set<AssistantDirectiveType>(["app", "integration", "board", "widget"]);

const getNodeText = (node: MarkdownNode): string =>
  typeof node.value === "string" ? node.value : (node.children ?? []).map(getNodeText).join("");

export const transformAssistantMarkdownDirectives = (tree: MarkdownNode) => {
  const visit = (node: MarkdownNode) => {
    if (node.type === "textDirective" && node.name && directiveTypes.has(node.name as AssistantDirectiveType)) {
      const label = getNodeText(node).trim();
      const directiveId = node.attributes?.name?.trim() || label;
      if (label && directiveId) {
        node.data = {
          ...node.data,
          hName: "span",
          hProperties: {
            "data-assistant-directive": "true",
            "data-directive-id": directiveId,
            "data-directive-label": label,
            "data-directive-type": node.name,
          },
        };
      }
    }
    for (const child of node.children ?? []) visit(child);
  };

  visit(tree);
};

export const remarkAssistantDirectives = () => transformAssistantMarkdownDirectives;

export const resolveAssistantDirectiveEntity = (
  entities: AssistantDirectiveEntity[],
  directive: { id: string; label: string; type: string },
) => {
  if (!directiveTypes.has(directive.type as AssistantDirectiveType)) return undefined;
  const matchingType = entities.filter((entity) => entity.type === directive.type);
  const exactId = matchingType.find((entity) => entity.id === directive.id);
  if (exactId) return exactId;

  const normalizedLabel = directive.label.trim().toLocaleLowerCase();
  const labelMatches = matchingType.filter((entity) => entity.label.trim().toLocaleLowerCase() === normalizedLabel);
  return labelMatches.length === 1 ? labelMatches[0] : undefined;
};
