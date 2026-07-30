import { describe, expect, test } from "vitest";

import { getToolResultPresentation, humanizeToolResultKey } from "./assistant-tool-result";

describe("getToolResultPresentation", () => {
  test("presents common widget collections as compact cards", () => {
    expect(
      getToolResultPresentation({
        containers: [
          { id: "one", name: "Plex", state: "running", image: "plex:latest", cpuUsage: 2.5 },
          { id: "two", name: "Sonarr", state: "stopped", image: "sonarr:latest", memoryUsage: 128 },
        ],
        timestamp: "2026-07-30T10:00:00.000Z",
      }),
    ).toEqual({
      type: "collection",
      totalCount: 2,
      items: [
        {
          title: "Plex",
          description: "plex:latest",
          badges: ["running"],
          fields: [{ label: "Cpu Usage", value: 2.5 }],
        },
        {
          title: "Sonarr",
          description: "sonarr:latest",
          badges: ["stopped"],
          fields: [{ label: "Memory Usage", value: 128 }],
        },
      ],
    });
  });

  test("uses integration identity and nested widget summary values", () => {
    expect(
      getToolResultPresentation([
        {
          integration: { id: "abc", name: "Pi-hole", kind: "pihole" },
          summary: { queries: 1000, blocked: 125, token: "never render this" },
        },
      ]),
    ).toEqual({
      type: "collection",
      totalCount: 1,
      items: [
        {
          title: "Pi-hole",
          badges: ["pihole"],
          fields: [
            { label: "Queries", value: 1000 },
            { label: "Blocked", value: 125 },
          ],
        },
      ],
    });
  });

  test("never includes secret-looking values in an inline presentation", () => {
    expect(
      getToolResultPresentation({
        version: "1.2.3",
        apiKey: "secret",
        access_token: "secret",
        enabled: true,
      }),
    ).toEqual({
      type: "properties",
      fields: [
        { label: "Version", value: "1.2.3" },
        { label: "Enabled", value: true },
      ],
    });
  });

  test("limits large collections while preserving their total", () => {
    const result = getToolResultPresentation({
      items: Array.from({ length: 8 }, (_, index) => ({ name: `Item ${index + 1}` })),
      totalCount: 42,
    });

    expect(result?.type).toBe("collection");
    if (result?.type !== "collection") return;
    expect(result.items).toHaveLength(6);
    expect(result.totalCount).toBe(42);
  });

  test("humanizes camel, snake, and kebab case labels", () => {
    expect(humanizeToolResultKey("memoryUsage")).toBe("Memory Usage");
    expect(humanizeToolResultKey("cached_input")).toBe("Cached input");
    expect(humanizeToolResultKey("response-time")).toBe("Response time");
  });
});
