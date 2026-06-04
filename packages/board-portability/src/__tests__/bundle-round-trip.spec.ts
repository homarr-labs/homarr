import { describe, expect, test } from "vitest";

import type { HomarrBundle } from "../schema";
import { homarrBundleSchema } from "../schema";
import { bundleToJson, bundleFilenameForBoard } from "../export/to-json";
import { parseBundleJson } from "../import/parse-bundle";

const createMinimalBundle = (overrides: Partial<HomarrBundle> = {}): HomarrBundle => ({
  version: "1.0",
  exportedAt: new Date().toISOString(),
  homarrVersion: "1.0.0-test",
  boards: [
    {
      name: "Test Board",
      settings: {
        primaryColor: "#FA5252",
        secondaryColor: "#868E96",
        opacity: 100,
        itemRadius: "md",
      },
      layouts: [
        {
          ref: "layout-1",
          name: "Default",
          columnCount: 10,
          breakpoint: 0,
        },
      ],
      sections: [
        {
          ref: "section-1",
          kind: "category",
          name: "Apps",
          yOffset: 0,
          xOffset: 0,
        },
      ],
      items: [
        {
          ref: "item-1",
          kind: "app",
          options: { appId: "app-ref-1", openInNewTab: true },
          advancedOptions: { title: null, customCssClasses: [], borderColor: "" },
          integrationRefs: [],
          appRef: "app-ref-1",
          layouts: [
            {
              layoutRef: "layout-1",
              sectionRef: "section-1",
              x: 0,
              y: 0,
              w: 2,
              h: 1,
            },
          ],
        },
      ],
    },
  ],
  apps: [
    {
      ref: "app-ref-1",
      name: "Jellyfin",
      href: "https://jellyfin.local",
      iconUrl: "https://cdn.example/jellyfin.png",
      description: "Media server",
      pingUrl: "https://jellyfin.local/health",
    },
  ],
  integrations: [
    {
      ref: "int-ref-1",
      kind: "jellyfin",
      name: "Jellyfin",
      url: "https://jellyfin.local",
      secretKinds: ["apiKey"],
      secrets: "REDACTED",
    },
  ],
  ...overrides,
});

describe("bundle round-trip", () => {
  test("serialized bundle parses back to equal object", () => {
    const original = createMinimalBundle();
    const json = bundleToJson(original);
    const parsed = parseBundleJson(json);

    expect(parsed.version).toBe(original.version);
    expect(parsed.homarrVersion).toBe(original.homarrVersion);
    expect(parsed.boards).toHaveLength(1);
    expect(parsed.boards[0]?.name).toBe("Test Board");
    expect(parsed.apps).toHaveLength(1);
    expect(parsed.apps[0]?.name).toBe("Jellyfin");
    expect(parsed.integrations).toHaveLength(1);
    expect(parsed.integrations[0]?.secrets).toBe("REDACTED");
  });

  test("schema validates valid bundle", () => {
    const bundle = createMinimalBundle();
    const result = homarrBundleSchema.safeParse(bundle);
    expect(result.success).toBe(true);
  });

  test("schema rejects missing boards", () => {
    const invalid = { ...createMinimalBundle(), boards: [] };
    const result = homarrBundleSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  test("schema rejects invalid version", () => {
    const invalid = { ...createMinimalBundle(), version: "2.0" };
    const result = homarrBundleSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  test("bundle preserves multiple items with layouts", () => {
    const bundle = createMinimalBundle();
    bundle.boards[0]?.items.push({
      ref: "item-2",
      kind: "clock",
      options: { is24HourFormat: true },
      advancedOptions: { title: "My Clock", customCssClasses: ["custom"], borderColor: "#000" },
      integrationRefs: [],
      layouts: [{ layoutRef: "layout-1", sectionRef: "section-1", x: 2, y: 0, w: 2, h: 1 }],
    });

    const json = bundleToJson(bundle);
    const parsed = parseBundleJson(json);

    expect(parsed.boards[0]?.items).toHaveLength(2);
    expect(parsed.boards[0]?.items[1]?.kind).toBe("clock");
    expect(parsed.boards[0]?.items[1]?.advancedOptions.title).toBe("My Clock");
  });

  test("bundle preserves section layouts", () => {
    const bundle = createMinimalBundle();
    const firstSection = bundle.boards[0]?.sections[0];
    if (!firstSection) throw new Error("missing section");
    firstSection.layouts = [
      {
        layoutRef: "layout-1",
        parentSectionRef: "section-1",
        xOffset: 0,
        yOffset: 0,
        width: 10,
        height: 5,
      },
    ];

    const json = bundleToJson(bundle);
    const parsed = parseBundleJson(json);

    expect(parsed.boards[0]?.sections[0]?.layouts).toHaveLength(1);
    expect(parsed.boards[0]?.sections[0]?.layouts?.[0]?.width).toBe(10);
  });

  test("empty apps and integrations are valid", () => {
    const bundle = createMinimalBundle({ apps: [], integrations: [] });
    if (bundle.boards[0]) {
      bundle.boards[0].items = [];
    }

    const json = bundleToJson(bundle);
    const parsed = parseBundleJson(json);

    expect(parsed.apps).toHaveLength(0);
    expect(parsed.integrations).toHaveLength(0);
  });
});

describe("bundleFilenameForBoard", () => {
  test("sanitizes board name for filename", () => {
    expect(bundleFilenameForBoard("My Board")).toBe("homarr-board-My-Board.json");
    expect(bundleFilenameForBoard("test_board-1")).toBe("homarr-board-test_board-1.json");
    expect(bundleFilenameForBoard("special!@#chars")).toBe("homarr-board-special---chars.json");
  });
});
