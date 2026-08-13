import { describe, expect, test } from "vitest";

import { getIndexerDisplayStatus } from "./status";

describe("Indexer display status", () => {
  test("distinguishes disabled indexers from unhealthy enabled indexers", () => {
    expect(getIndexerDisplayStatus({ enabled: false, status: false })).toBe("disabled");
    expect(getIndexerDisplayStatus({ enabled: false, status: true })).toBe("disabled");
    expect(getIndexerDisplayStatus({ enabled: true, status: false })).toBe("unhealthy");
    expect(getIndexerDisplayStatus({ enabled: true, status: true })).toBe("healthy");
  });
});
