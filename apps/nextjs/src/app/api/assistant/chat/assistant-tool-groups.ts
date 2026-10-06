import type { McpTool } from "@homarr/api/mcp";

type AssistantMcpTool = Pick<McpTool, "name" | "pathInRouter">;

export interface AssistantMcpToolGroup<TTool extends AssistantMcpTool = AssistantMcpTool> {
  id: string;
  tools: readonly TTool[];
}

export const createAssistantMcpToolGroups = <TTool extends AssistantMcpTool>(tools: readonly TTool[]) => {
  const toolsByGroup = new Map<string, TTool[]>();
  for (const tool of tools) {
    const groupId = tool.pathInRouter[0];
    if (!groupId) throw new Error(`Assistant MCP tool '${tool.name}' has no router group`);
    const groupedTools = toolsByGroup.get(groupId) ?? [];
    groupedTools.push(tool);
    toolsByGroup.set(groupId, groupedTools);
  }

  const groups = [...toolsByGroup.entries()]
    .toSorted(([left], [right]) => left.localeCompare(right))
    .map(([id, groupedTools]) => ({
      id,
      tools: groupedTools.toSorted((left, right) => left.name.localeCompare(right.name)),
    }));
  const groupsById = new Map(groups.map((group) => [group.id, group]));

  return {
    ids: groups.map(({ id }) => id),
    resolve(groupIds: readonly string[]): AssistantMcpToolGroup<TTool>[] {
      return [...new Set(groupIds)].map((groupId) => {
        const group = groupsById.get(groupId);
        if (!group) throw new Error(`Unknown Assistant MCP tool group '${groupId}'`);
        return group;
      });
    },
  };
};
