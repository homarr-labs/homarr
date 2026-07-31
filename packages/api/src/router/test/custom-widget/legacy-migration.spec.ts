import { describe, expect, test } from "vitest";
import { stringify as stringifySuperJson } from "superjson";

import { buildLegacyCustomWidgetMigrationPrompt } from "../../custom-widget/legacy-migration";

describe("legacy custom widget migration prompt", () => {
  test("describes the legacy widget without exposing URL or body credentials", () => {
    const prompt = buildLegacyCustomWidgetMigrationPrompt(
      {
        id: "legacy",
        name: "Private service",
        description: "Status",
        iconUrl: "https://icons:password@example.test/private/icon.svg?access_token=icon-secret",
        url: "https://admin:password@example.test/hooks/path-token?api_key=top-secret&mode=full",
        authType: "bearer",
        headerName: null,
        method: "POST",
        requestBody: JSON.stringify({ token: "body-secret", limit: 5 }),
        displayType: "singleValue",
        displayConfig: "corrupted-config-with-display-secret",
        enabled: true,
        createdAt: new Date(0),
        updatedAt: new Date(0),
        creatorId: null,
      },
      ["apiKey"],
    );

    expect(prompt).toContain("homarr-custom-widget-v1");
    expect(prompt).toContain("homarr-custom-widget-v2");
    expect(prompt).toContain("configuredSecretKinds");
    expect(prompt).not.toContain("top-secret");
    expect(prompt).not.toContain("body-secret");
    expect(prompt).not.toContain("admin:password");
    expect(prompt).not.toContain("path-token");
    expect(prompt).not.toContain("icon-secret");
    expect(prompt).not.toContain("icons:password");
    expect(prompt).not.toContain("private/icon.svg");
    expect(prompt).not.toContain("display-secret");
  });

  test("omits valid free-text display configuration from the migration prompt", () => {
    const prompt = buildLegacyCustomWidgetMigrationPrompt(
      {
        id: "legacy-custom-jsx",
        name: "Private service",
        description: "Status",
        iconUrl: null,
        url: "https://example.test/api/status",
        authType: "bearer",
        headerName: null,
        method: "GET",
        requestBody: null,
        displayType: "customJsx",
        displayConfig: stringifySuperJson({
          type: "customJsx",
          template: "<Text>LEGACY_PRIVATE_MARKER Bearer sk-secret-123456</Text>",
        }),
        enabled: true,
        createdAt: new Date(0),
        updatedAt: new Date(0),
        creatorId: null,
      },
      ["apiKey"],
    );

    expect(prompt).toContain("display configuration was intentionally omitted");
    expect(prompt).not.toContain("LEGACY_PRIVATE_MARKER");
    expect(prompt).not.toContain("Bearer sk-secret-123456");
    expect(prompt).not.toContain("sk-secret-123456");
  });
});
