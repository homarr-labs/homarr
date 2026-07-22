import { describe, expect, it } from "vitest";

import type { CustomJsxRequest } from "@homarr/custom-widgets/core";

import { resolvePreviewRequestParams } from "../../custom-widget/preview-procedure-helpers";
import { resolveOptionRequestValues } from "../../custom-widget/management-queries";

const loadRequest: CustomJsxRequest = {
  source: "default",
  kind: "query",
  method: "GET",
  path: "/endpoints/{option:environmentId}/containers",
  auth: "inherit",
  permission: "view",
  trigger: "load",
};

describe("preview request option bindings", () => {
  it("resolves load request parameters from the selected preview options", () => {
    expect(resolvePreviewRequestParams(loadRequest, { environmentId: 7 }, {})).toEqual({
      "option:environmentId": 7,
    });
  });

  it("preserves invoking component parameters for manual requests", () => {
    const manualRequest = {
      ...loadRequest,
      trigger: "manual" as const,
      path: "/endpoints/{param:endpointId}/containers",
    };
    expect(resolvePreviewRequestParams(manualRequest, { environmentId: 7 }, { endpointId: 12 })).toEqual({
      endpointId: 12,
    });
  });
});

describe("configuration option request bindings", () => {
  it("resolves option configuration and runtime parameters in their own slots", () => {
    const request: CustomJsxRequest = {
      ...loadRequest,
      path: "/environments/{option:environmentId}/containers/{param:containerId}",
    };

    expect(resolveOptionRequestValues(request, { environmentId: 7, containerId: 12, unrelated: true })).toEqual({
      "option:environmentId": 7,
      containerId: 12,
    });
  });
});
