import { describe, expect, test } from "vitest";

import type { HomarrConfigBundle } from "../schema";
import { homarrConfigBundleSchema } from "../schema";
import { assessBundleCompatibility, parseConfigBundleJson } from "../config-bundle-compat";

const createMinimalConfigBundle = (overrides: Partial<HomarrConfigBundle> = {}): HomarrConfigBundle => ({
  version: "2.0",
  type: "full-config",
  exportedAt: new Date().toISOString(),
  homarrVersion: "1.5.0",
  encryptionKey: "a".repeat(64),
  boards: [
    {
      ref: "board-uuid-1",
      name: "Main Dashboard",
      settings: {
        primaryColor: "#FA5252",
        secondaryColor: "#868E96",
        opacity: 100,
        itemRadius: "md",
      },
      layouts: [
        { ref: "layout-1", name: "Default", columnCount: 10, breakpoint: 0 },
      ],
      sections: [
        { ref: "section-1", kind: "category", name: "Media", yOffset: 0, xOffset: 0 },
      ],
      items: [
        {
          ref: "item-1",
          kind: "app",
          options: { appId: "app-ref-1", openInNewTab: true },
          advancedOptions: { title: null, customCssClasses: [], borderColor: "" },
          integrationRefs: ["int-ref-1"],
          appRef: "app-ref-1",
          layouts: [{ layoutRef: "layout-1", sectionRef: "section-1", x: 0, y: 0, w: 2, h: 1 }],
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
      pingUrl: null,
    },
  ],
  integrations: [
    {
      ref: "int-ref-1",
      kind: "jellyfin",
      name: "Jellyfin",
      url: "https://jellyfin.local",
      secrets: [{ kind: "apiKey", value: "encrypted.value" }],
    },
  ],
  serverSettings: {
    board: { enableStatusByDefault: true, forceDisableStatus: false },
    docker: { targetBoardName: null, readHomepageLabels: true },
  },
  searchEngines: [
    {
      ref: "se-1",
      iconUrl: "https://google.com/favicon.ico",
      name: "Google",
      short: "g",
      description: "Google search",
      urlTemplate: "https://google.com/search?q={query}",
      type: "generic",
      integrationRef: null,
    },
  ],
  groups: [
    {
      ref: "group-1",
      name: "Admins",
      position: 0,
      ownerRef: "user-1",
      homeBoardRef: null,
      mobileHomeBoardRef: null,
      permissions: ["admin"],
      boardPermissions: [{ boardRef: "board-uuid-1", permission: "board-full-access" }],
      integrationPermissions: [{ integrationRef: "int-ref-1", permission: "integration-use-credentials" }],
      memberRefs: ["user-1"],
    },
  ],
  users: [
    {
      ref: "user-1",
      name: "admin",
      email: "admin@example.com",
      password: "$2b$10$odRXt5e95kSQV5Axmk/FeO6GVOxuRQQ8NnRcBA78Wg4V3kZxPY68u",
      provider: "credentials",
      homeBoardRef: "board-uuid-1",
      mobileHomeBoardRef: null,
      defaultSearchEngineRef: "se-1",
      colorScheme: "dark",
      firstDayOfWeek: 1,
      openSearchInNewTab: true,
      ddgBangs: true,
      pingIconsEnabled: false,
    },
  ],
  ...overrides,
});

describe("v2.0 config bundle schema", () => {
  test("schema validates a valid config bundle", () => {
    const bundle = createMinimalConfigBundle();
    const result = homarrConfigBundleSchema.safeParse(bundle);
    expect(result.success).toBe(true);
  });

  test("schema rejects v1.0 version for config bundle", () => {
    const invalid = { ...createMinimalConfigBundle(), version: "1.0" };
    const result = homarrConfigBundleSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  test("schema rejects missing type field", () => {
    const { type: _type, ...invalid } = createMinimalConfigBundle();
    const result = homarrConfigBundleSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  test("schema accepts bundle with no boards", () => {
    const bundle = createMinimalConfigBundle({ boards: [] });
    const result = homarrConfigBundleSchema.safeParse(bundle);
    expect(result.success).toBe(true);
  });

  test("schema accepts board with optional ref field", () => {
    const bundle = createMinimalConfigBundle();
    delete (bundle.boards[0] as Record<string, unknown>).ref;
    const result = homarrConfigBundleSchema.safeParse(bundle);
    expect(result.success).toBe(true);
  });
});

describe("v2.0 config bundle round-trip", () => {
  test("serialized config bundle parses back correctly", () => {
    const original = createMinimalConfigBundle();
    const json = JSON.stringify(original);
    const parsed = parseConfigBundleJson(json);

    expect(parsed.version).toBe("2.0");
    expect(parsed.type).toBe("full-config");
    expect(parsed.homarrVersion).toBe("1.5.0");
    expect(parsed.boards).toHaveLength(1);
    expect(parsed.boards[0]?.ref).toBe("board-uuid-1");
    expect(parsed.boards[0]?.name).toBe("Main Dashboard");
    expect(parsed.apps).toHaveLength(1);
    expect(parsed.integrations).toHaveLength(1);
    expect(parsed.integrations[0]?.secrets).toHaveLength(1);
    expect(parsed.searchEngines).toHaveLength(1);
    expect(parsed.groups).toHaveLength(1);
    expect(parsed.groups[0]?.boardPermissions).toHaveLength(1);
    expect(parsed.groups[0]?.boardPermissions[0]?.boardRef).toBe("board-uuid-1");
  });

  test("preserves encryption key", () => {
    const bundle = createMinimalConfigBundle();
    const json = JSON.stringify(bundle);
    const parsed = parseConfigBundleJson(json);
    expect(parsed.encryptionKey).toBe("a".repeat(64));
  });

  test("preserves server settings", () => {
    const bundle = createMinimalConfigBundle();
    const json = JSON.stringify(bundle);
    const parsed = parseConfigBundleJson(json);
    expect(parsed.serverSettings).toEqual({
      board: { enableStatusByDefault: true, forceDisableStatus: false },
      docker: { targetBoardName: null, readHomepageLabels: true },
    });
  });

  test("preserves users and group memberships", () => {
    const bundle = createMinimalConfigBundle();
    const json = JSON.stringify(bundle);
    const parsed = parseConfigBundleJson(json);

    expect(parsed.users).toHaveLength(1);
    expect(parsed.users![0]?.email).toBe("admin@example.com");
    expect(parsed.users![0]?.provider).toBe("credentials");
    expect(parsed.users![0]?.homeBoardRef).toBe("board-uuid-1");
    expect(parsed.groups[0]?.memberRefs).toEqual(["user-1"]);
    expect(parsed.groups[0]?.ownerRef).toBe("user-1");
  });

  test("accepts bundle without users (backward compat)", () => {
    const { users: _users, ...bundleWithoutUsers } = createMinimalConfigBundle();
    const json = JSON.stringify(bundleWithoutUsers);
    const parsed = parseConfigBundleJson(json);
    expect(parsed.users).toBeUndefined();
  });
});

describe("assessBundleCompatibility", () => {
  test("marks valid bundle as compatible", () => {
    const bundle = createMinimalConfigBundle();
    const result = assessBundleCompatibility(bundle, "1.5.0");
    expect(result.compatibility.status).toBe("compatible");
    expect(result.bundle).not.toBeNull();
    expect(result.compatibility.issues).toHaveLength(0);
  });

  test("marks compatible even with version mismatch (different Homarr version)", () => {
    const bundle = createMinimalConfigBundle({ homarrVersion: "1.4.0" });
    const result = assessBundleCompatibility(bundle, "1.5.0");
    expect(result.compatibility.status).toBe("compatible");
    expect(result.compatibility.issues).toHaveLength(1);
    expect(result.compatibility.issues[0]).toContain("1.4.0");
  });

  test("rejects unsupported format version", () => {
    const bundle = { ...createMinimalConfigBundle(), version: "3.0" };
    const result = assessBundleCompatibility(bundle, "1.5.0");
    expect(result.compatibility.status).toBe("unsupportedVersion");
    expect(result.bundle).toBeNull();
  });

  test("rejects non-object input", () => {
    const result = assessBundleCompatibility(null, "1.5.0");
    expect(result.compatibility.status).toBe("invalidStructure");
    expect(result.bundle).toBeNull();
  });

  test("rejects malformed structure", () => {
    const result = assessBundleCompatibility({ version: "2.0", type: "full-config" }, "1.5.0");
    expect(result.compatibility.status).toBe("invalidStructure");
  });
});
