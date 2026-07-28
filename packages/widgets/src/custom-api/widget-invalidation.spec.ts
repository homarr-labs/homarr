import { describe, expect, it } from "vitest";

import type { CustomJsxRequestCapability } from "@homarr/custom-widgets/runtime";

import { resolveCustomWidgetInvalidationTargets } from "./widget-invalidation";

const capabilities: CustomJsxRequestCapability[] = [
  {
    id: "summary",
    kind: "query",
    method: "GET",
    trigger: "load",
    minimumBoardPermission: "view",
  },
  {
    id: "details",
    kind: "query",
    method: "GET",
    trigger: "manual",
    minimumBoardPermission: "view",
  },
  {
    id: "update",
    kind: "action",
    method: "POST",
    trigger: "manual",
    minimumBoardPermission: "modify",
  },
];

describe("resolveCustomWidgetInvalidationTargets", () => {
  it("expands the refresh wildcard to every query and the parent load request", () => {
    expect(resolveCustomWidgetInvalidationTargets(capabilities, ["parent", "*"])).toEqual({
      all: true,
      requestIds: ["summary", "details"],
      loadRequestIds: ["summary"],
      refreshParent: true,
    });
  });

  it("keeps action invalidation scoped to named query targets", () => {
    expect(resolveCustomWidgetInvalidationTargets(capabilities, ["details"])).toEqual({
      all: false,
      requestIds: ["details"],
      loadRequestIds: [],
      refreshParent: false,
    });
  });

  it("refreshes the parent when a load query is invalidated by name", () => {
    expect(resolveCustomWidgetInvalidationTargets(capabilities, ["summary"])).toEqual({
      all: false,
      requestIds: ["summary"],
      loadRequestIds: ["summary"],
      refreshParent: true,
    });
  });
});
