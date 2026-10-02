import { describe, expect, test } from "vitest";

import { createAssistantMcpToolGroups } from "./assistant-tool-groups";

const createTool = (name: string, group: string) => ({
  name,
  description: `${name} description`,
  pathInRouter: [group, name],
});

describe("Assistant MCP tool groups", () => {
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
