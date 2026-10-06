import { describe, expect, test } from "vitest";

import { createTrpcQueryKey } from "./trpc-query-key";

describe("createTrpcQueryKey", () => {
  test("matches the tRPC TanStack query key shape", () => {
    expect(createTrpcQueryKey("widget.downloads.getJobsAndStatuses", { integrationIds: ["one"], limit: 50 })).toEqual([
      ["widget", "downloads", "getJobsAndStatuses"],
      { input: { integrationIds: ["one"], limit: 50 }, type: "query" },
    ]);
  });
});
