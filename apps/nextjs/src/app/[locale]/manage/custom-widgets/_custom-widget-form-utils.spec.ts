import { describe, expect, it, vi } from "vitest";

import type { HomarrCustomWidgetV2 } from "@homarr/custom-widgets/core";

import { getCustomWidgetPreviewOptionIssues, loadPreviewQueries } from "./_custom-widget-form-utils";

const previewQuery = vi.hoisted(() => vi.fn());

vi.mock("@homarr/api/client", () => ({
  fetchApi: { customWidget: { previewQuery: { query: previewQuery } } },
}));

const definition: HomarrCustomWidgetV2 = {
  $schema: "homarr-custom-widget-v2",
  name: "Preview options",
  sources: [
    {
      id: "default",
      name: "API",
      baseUrl: "https://example.com",
      networkScope: "public",
      auth: { type: "none" },
    },
  ],
  requests: [
    {
      id: "containers",
      sourceId: "default",
      kind: "query",
      method: "GET",
      pathTemplate: "/endpoints/{endpointId}/containers",
      parameters: { endpointId: "number" },
      optionsBinding: { endpointId: { $option: "environmentId" } },
      auth: "inherit",
      minimumBoardPermission: "view",
      trigger: "load",
    },
  ],
  optionsSchema: {
    type: "object",
    properties: { environmentId: { type: "number" } },
    required: ["environmentId"],
    additionalProperties: false,
  },
  defaultOptions: { environmentId: 1 },
  template: "<Text>Preview</Text>",
};

describe("Custom Widget workbench preview options", () => {
  it("passes the selected options to load-query bindings without replacing them with defaults", async () => {
    previewQuery.mockResolvedValueOnce({ ok: true, status: 200, data: [] });

    await loadPreviewQueries(definition, "preview-1", { environmentId: 7 });

    expect(previewQuery).toHaveBeenCalledWith({
      sessionId: "preview-1",
      requestId: "containers",
      params: { endpointId: 7 },
    });
  });

  it("rejects invalid selected options before creating a preview session", () => {
    expect(getCustomWidgetPreviewOptionIssues(definition, { environmentId: "wrong" })).toEqual([
      { path: "configuration.environmentId", message: "Expected number" },
    ]);
  });
});
