import { describe, expect, test } from "vitest";

import { getToolResultPresentation, humanizeToolResultKey } from "./assistant-tool-result";

describe("getToolResultPresentation", () => {
  test("presents icon search variants as image previews instead of the catalog count", () => {
    expect(
      getToolResultPresentation(
        {
          icons: [
            {
              id: "repository-id",
              slug: "homarr-labs/dashboard-icons",
              icons: [
                {
                  id: "svg-id",
                  name: "discord.svg",
                  url: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/discord.svg",
                },
                {
                  id: "png-id",
                  name: "discord.png",
                  url: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/discord.png",
                },
              ],
            },
            { id: "empty-repository", slug: "another/repository", icons: [] },
          ],
          countIcons: 28_154,
        },
        { toolName: "icon_findIcons" },
      ),
    ).toEqual({
      type: "icons",
      totalCount: 2,
      items: [
        {
          name: "discord.svg",
          url: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/discord.svg",
          repository: "homarr-labs/dashboard-icons",
          variant: "SVG",
        },
        {
          name: "discord.png",
          url: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/discord.png",
          repository: "homarr-labs/dashboard-icons",
          variant: "PNG",
        },
      ],
    });
  });

  test("does not render unsafe icon URLs", () => {
    expect(
      getToolResultPresentation(
        {
          icons: [
            {
              slug: "unsafe/repository",
              icons: [
                { name: "script.svg", url: "javascript:alert(1)" },
                { name: "credential.svg", url: "https://user:password@example.com/icon.svg" },
              ],
            },
          ],
          countIcons: 2,
        },
        { toolName: "icon_findIcons" },
      ),
    ).toEqual({ type: "icons", totalCount: 0, items: [] });
  });

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

  test("removes URL credentials and query parameters from inline descriptions", () => {
    expect(
      getToolResultPresentation({
        apps: [
          {
            name: "Sonarr",
            url: "https://user:password@sonarr.example/api/v3/series?apikey=secret#calendar",
          },
        ],
      }),
    ).toEqual({
      type: "collection",
      totalCount: 1,
      items: [
        {
          title: "Sonarr",
          description: "https://sonarr.example/api/v3/series#calendar",
          badges: [],
          fields: [],
        },
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
