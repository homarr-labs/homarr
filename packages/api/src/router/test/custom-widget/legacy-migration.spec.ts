import { describe, expect, test } from "vitest";

import { buildLegacyCustomWidgetMigrationPrompt } from "../../custom-widget/legacy-migration";

describe("legacy custom widget migration prompt", () => {
  test("describes the legacy widget without exposing URL or body credentials", () => {
    const prompt = buildLegacyCustomWidgetMigrationPrompt(
      {
        id: "legacy",
        name: "Private service",
        description: "Status",
        iconUrl: null,
        url: "https://admin:password@example.test/hooks/path-token?api_key=top-secret&mode=full",
        authType: "bearer",
        headerName: null,
        method: "POST",
        requestBody: JSON.stringify({ token: "body-secret", limit: 5 }),
        displayType: "singleValue",
        displayConfig: JSON.stringify({ json: { type: "singleValue", jsonPath: "$.status" } }),
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
  });
});
