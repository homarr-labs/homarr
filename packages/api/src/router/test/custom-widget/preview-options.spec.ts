import { describe, expect, it } from "vitest";

import type { CustomJsxRequest } from "@homarr/custom-widgets/core";

import { resolvePreviewRequestParams } from "../../custom-widget/preview-procedure-helpers";

const loadRequest: CustomJsxRequest = {
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
};

describe("preview request option bindings", () => {
  it("resolves load request parameters from the selected preview options", () => {
    expect(resolvePreviewRequestParams(loadRequest, { environmentId: 7 }, { endpointId: 1 })).toEqual({
      endpointId: 7,
    });
  });

  it("preserves invoking component parameters for manual requests", () => {
    const manualRequest = { ...loadRequest, trigger: "manual" as const, optionsBinding: undefined };
    expect(resolvePreviewRequestParams(manualRequest, { environmentId: 7 }, { endpointId: 12 })).toEqual({
      endpointId: 12,
    });
  });
});
