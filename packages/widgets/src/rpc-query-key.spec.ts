import { describe, expect, test } from "vitest";

import { createRpcQueryKey } from "./rpc-query-key";

describe("createRpcQueryKey", () => {
  test("matches the native TanStack query key shape", () => {
    expect(createRpcQueryKey("widget.downloads.getJobsAndStatuses", { integrationIds: ["one"], limit: 50 })).toEqual([
      ["widget", "downloads", "getJobsAndStatuses"],
      { input: { integrationIds: ["one"], limit: 50 }, type: "query" },
    ]);
  });
});
