import { getToolName, isToolUIPart } from "ai";
import type { UIMessage } from "ai";

import type { McpTool } from "@homarr/api/mcp";
import { isRecord } from "@homarr/common";

type AssistantMcpTool = Pick<McpTool, "name" | "pathInRouter">;

export interface AssistantMcpToolGroup<TTool extends AssistantMcpTool = AssistantMcpTool> {
  id: string;
  tools: readonly TTool[];
}

export const getEnabledAssistantMcpToolGroupIds = (messages: readonly UIMessage[], availableIds: readonly string[]) => {
  const enabledIds = new Set<string>();
  for (const message of messages) {
    if (message.role !== "assistant") continue;
    for (const part of message.parts) {
      if (!isToolUIPart(part) || part.state !== "output-available") continue;
      if (getToolName(part) !== "homarr_enableToolGroups") continue;
      let output = part.output;
      if (isRecord(output) && output.type === "json") output = output.value;
      if (!isRecord(output) || output.error || !Array.isArray(output.enabledGroups)) continue;
      for (const groupId of output.enabledGroups) {
        if (typeof groupId === "string" && availableIds.includes(groupId)) enabledIds.add(groupId);
      }
    }
  }
  return enabledIds;
};

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
