import { describe, expect, it, vi } from "vitest";

import { customWidgetDefinitionSchema } from "@homarr/custom-widgets/core";

import {
  applyCustomWidgetAiResponse,
  filterSecretsForSourceAuthentication,
  getChangedSecrets,
  getCustomWidgetPreviewOptionIssues,
  loadPreviewQueries,
  parseSources,
} from "./_custom-widget-form-utils";

const previewQuery = vi.hoisted(() => vi.fn());
vi.mock("@homarr/api/client", () => ({ fetchApi: { customWidget: { previewQuery: { query: previewQuery } } } }));

const definition = customWidgetDefinitionSchema.parse({
  $schema: "homarr-custom-widget-v2",
  name: "Preview options",
  sources: { default: { name: "API", baseUrl: "https://example.com", networkScope: "public", auth: "none" } },
  requests: { containers: { path: "/endpoints/{option:environmentId}/containers" } },
  options: { environmentId: { label: "Environment", control: "number", default: 1 } },
  template: "<Text>Preview</Text>",
});

describe("Custom Widget workbench preview options", () => {
  it("loads one complete AI response into every editor field, including JSX", () => {
    const setValues = vi.fn();
    const result = applyCustomWidgetAiResponse(
      {
        getValues: () => ({
          name: "",
          description: "",
          iconUrl: "",
          sources: "{}",
          requests: "{}",
          options: "{}",
          template: "",
          secrets: [],
        }),
        setValues,
      } as never,
      `\`\`\`json\n${JSON.stringify(definition)}\n\`\`\``,
    );

    if (!result.success) throw new Error("Expected the complete AI response to be accepted");
    expect(setValues).toHaveBeenCalledOnce();
    const values = setValues.mock.calls[0]?.[0];
    expect(values).toMatchObject({
      name: "Preview options",
      description: "",
      iconUrl: "",
      template: "<Text>Preview</Text>",
      secrets: [],
    });
    expect(JSON.parse(values?.sources as string)).toEqual(result.widget.sources);
    expect(JSON.parse(values?.requests as string)).toEqual(result.widget.requests);
    expect(JSON.parse(values?.options as string)).toEqual(result.widget.options);
  });

  it("shows the default source first regardless of manifest key order", () => {
    expect(
      parseSources(
        JSON.stringify({
          secondary: { baseUrl: "https://secondary.example.com", networkScope: "public", auth: "none" },
          default: { baseUrl: "https://default.example.com", networkScope: "public", auth: "none" },
        }),
      ).map(({ id }) => id),
    ).toEqual(["default", "secondary"]);
  });

  it("keeps load-query option resolution on the server", async () => {
    previewQuery.mockResolvedValueOnce({ ok: true, status: 200, data: [] });
    await loadPreviewQueries(definition, "preview-1");
    expect(previewQuery).toHaveBeenCalledWith({ sessionId: "preview-1", requestId: "containers", params: {} });
  });

  it("rejects invalid selected options", () => {
    expect(getCustomWidgetPreviewOptionIssues(definition, { environmentId: "wrong" })).toEqual([
      { path: "configuration.environmentId", message: "Expected a number" },
    ]);
  });

  it("normalizes only changed secrets", () => {
    expect(
      getChangedSecrets({
        secrets: [
          { sourceId: "default", kind: "apiKey", value: "", hasValue: true },
          { sourceId: "other", kind: "password", value: "replacement" },
        ],
      }),
    ).toEqual([{ sourceId: "other", kind: "password", value: "replacement" }]);
  });

  it("drops credentials that do not apply after an authentication transition", () => {
    expect(
      filterSecretsForSourceAuthentication(
        [
          { sourceId: "default", kind: "username", value: "admin", hasValue: true },
          { sourceId: "default", kind: "password", value: "secret", hasValue: true },
          { sourceId: "secondary", kind: "apiKey", value: "unchanged", hasValue: true },
        ],
        "default",
        "bearer",
      ),
    ).toEqual([{ sourceId: "secondary", kind: "apiKey", value: "unchanged", hasValue: true }]);
  });
});
