import { describe, expect, test } from "vitest";
import { stringify as stringifySuperJson } from "superjson";

import { buildLegacyCustomWidgetMigrationPrompt } from "../../custom-widget/legacy-migration";

describe("legacy custom widget migration prompt", () => {
  test("preserves ordinary request values while redacting credential-like values", () => {
    const prompt = buildLegacyCustomWidgetMigrationPrompt(
      {
        id: "legacy",
        name: "Private service",
        description: "Status",
        iconUrl: "https://icons:password@example.test/private/icon.svg?access_token=icon-secret",
        url: "https://admin:password@example.test/api/v1/path-token/status?api_key=top-secret&mode=full&page=2",
        authType: "bearer",
        headerName: null,
        method: "POST",
        requestBody: JSON.stringify({ token: "body-secret", limit: 5, label: "CPU" }),
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
    expect(prompt).toContain('"path": "/api/v1/[REDACTED]/status"');
    expect(prompt).toContain('"mode": "full"');
    expect(prompt).toContain('"page": "2"');
    expect(prompt).toContain("https://example.test/private/icon.svg");
    expect(prompt).toContain('"limit": 5');
    expect(prompt).toContain('"label": "CPU"');
    expect(prompt).toContain("display configuration is unavailable");
    expect(prompt).not.toContain("top-secret");
    expect(prompt).not.toContain("body-secret");
    expect(prompt).not.toContain("admin:password");
    expect(prompt).not.toContain("path-token");
    expect(prompt).not.toContain("icon-secret");
    expect(prompt).not.toContain("icons:password");
    expect(prompt).not.toContain("display-secret");
    expect(prompt).not.toContain('"requestBody"');
  });

  test("redacts a custom api-key query value without losing its parameter name", () => {
    const prompt = buildLegacyCustomWidgetMigrationPrompt(
      {
        id: "legacy-api-key-query",
        name: "Query-key service",
        description: "Status",
        iconUrl: null,
        url: "https://example.test/api/status?sig=custom-query-secret&mode=full",
        authType: "apiKeyQuery",
        headerName: "sig",
        method: "GET",
        requestBody: null,
        displayType: "singleValue",
        displayConfig: null,
        enabled: true,
        createdAt: new Date(0),
        updatedAt: new Date(0),
        creatorId: null,
      },
      ["apiKey"],
    );

    expect(prompt).toContain('"sig": "[REDACTED]"');
    expect(prompt).toContain('"mode": "full"');
    expect(prompt).toContain('"headerName": "sig"');
    expect(prompt).not.toContain("custom-query-secret");
  });

  test("preserves valid JSX display configuration while redacting literals", () => {
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

    expect(prompt).toContain("LEGACY_PRIVATE_MARKER");
    expect(prompt).not.toContain("Bearer sk-secret-123456");
    expect(prompt).not.toContain("sk-secret-123456");
  });
});
