import { describe, expect, it } from "vitest";

import { getDependentRequestIds, removeDependentRequests } from "./_custom-widget-source-dependencies";

const requests = JSON.stringify({
  status: { source: "default", path: "/status" },
  restart: { source: "secondary", path: "/restart", kind: "action" },
  logs: { source: "secondary", path: "/logs" },
});

describe("custom widget source dependencies", () => {
  it("lists every request that would be removed with a source", () => {
    expect(getDependentRequestIds(requests, "secondary")).toEqual(["restart", "logs"]);
  });

  it("removes only requests that use the selected source", () => {
    expect(removeDependentRequests(requests, "secondary")).toEqual({
      status: { source: "default", path: "/status" },
    });
  });
});
