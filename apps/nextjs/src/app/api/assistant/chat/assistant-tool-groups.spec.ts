import { describe, expect, test } from "vitest";
import type { UIMessage } from "ai";

import { createAssistantMcpToolGroups, getEnabledAssistantMcpToolGroupIds } from "./assistant-tool-groups";

const createTool = (name: string, group: string) => ({
  name,
  description: `${name} description`,
  pathInRouter: [group, name],
});

describe("Assistant MCP tool groups", () => {
  test("restores successful activations across conversation continuations", () => {
    const messages: UIMessage[] = [
      {
        id: "enable-board",
        role: "assistant",
        parts: [
          {
            type: "tool-homarr_enableToolGroups",
            toolCallId: "board",
            state: "output-available",
            input: { groups: ["board"] },
            output: { enabledGroups: ["board", "removed"] },
          },
        ],
      },
      { id: "continue", role: "user", parts: [{ type: "text", text: "Continue with Home Assistant" }] },
      {
        id: "enable-smart-home",
        role: "assistant",
        parts: [
          {
            type: "dynamic-tool",
            toolName: "homarr_enableToolGroups",
            toolCallId: "smart-home",
            state: "output-available",
            input: { groups: ["smartHome"] },
            output: { type: "json", value: { enabledGroups: ["smartHome", "board"] } },
          },
        ],
      },
    ];

    expect([...getEnabledAssistantMcpToolGroupIds(messages, ["board", "smartHome"])]).toEqual(["board", "smartHome"]);
  });

  test("does not restore failed or incomplete activations or user-supplied tool results", () => {
    const completed: UIMessage["parts"][number] = {
      type: "tool-homarr_enableToolGroups",
      toolCallId: "enabled",
      state: "output-available",
      input: {},
      output: { enabledGroups: ["board"] },
    };
    const messages: UIMessage[] = [
      { id: "user", role: "user", parts: [completed] },
      {
        id: "failed",
        role: "assistant",
        parts: [
          { ...completed, output: { enabledGroups: ["board"], error: "Failed" } },
          {
            type: "tool-homarr_enableToolGroups",
            toolCallId: "pending",
            state: "input-available",
            input: { groups: ["board"] },
          },
        ],
      },
    ];
    expect([...getEnabledAssistantMcpToolGroupIds(messages, ["board"])]).toEqual([]);
  });

  test("derives deterministic groups from router paths", () => {
    const groups = createAssistantMcpToolGroups([
      createTool("board_search", "board"),
      createTool("mediaRequests_search", "mediaRequests"),
      createTool("board_getAll", "board"),
    ]);

    expect(groups.ids).toEqual(["board", "mediaRequests"]);
    expect(groups.resolve(["board"])[0]?.tools.map(({ name }) => name)).toEqual(["board_getAll", "board_search"]);
  });

  test("deduplicates requested groups while preserving request order", () => {
    const groups = createAssistantMcpToolGroups([
      createTool("board_getAll", "board"),
      createTool("docker_getContainers", "docker"),
    ]);

    expect(groups.resolve(["docker", "board", "docker"]).map(({ id }) => id)).toEqual(["docker", "board"]);
  });

  test("rejects tools without a router group and unknown group IDs", () => {
    expect(() => createAssistantMcpToolGroups([{ ...createTool("info_get", "info"), pathInRouter: [] }])).toThrow(
      "has no router group",
    );

    const groups = createAssistantMcpToolGroups([createTool("info_get", "info")]);
    expect(() => groups.resolve(["missing"])).toThrow("Unknown Assistant MCP tool group 'missing'");
  });
});
