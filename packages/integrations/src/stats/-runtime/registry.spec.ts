import assert from "node:assert/strict";
import { Response } from "undici";
import { test, vi } from "vitest";

import { createFixture } from "./fixture";
import { getStatsMetrics } from "../index";
import { statsProviders } from "../providers";

vi.mock("@homarr/core/infrastructure/http", () => ({
  withHttpRequestSignalAsync: () => {
    throw new Error("Unadapted legacy SDK dispatch is forbidden in this registry-only tracer");
  },
}));

test("existing registry metadata and native Stats dispatch retain the real providers", async () => {
  assert.equal(Object.keys(statsProviders).length, 30);
  assert.deepEqual(
    getStatsMetrics("miniflux").map(({ key, unit }) => ({ key, unit })),
    [
      { key: "read", unit: "count" },
      { key: "unread", unit: "count" },
    ],
  );
  assert.deepEqual(
    getStatsMetrics("mock").map(({ key, unit }) => ({ key, unit })),
    [
      { key: "documents", unit: "count" },
      { key: "songs", unit: "count" },
      { key: "storage", unit: "bytes" },
    ],
  );
  const fixture = createFixture(async () => Response.json({ reads: { a: 9 }, unreads: { a: 4 } }));
  try {
    assert.deepEqual(await fixture.runtime.fetchStatsAsync(fixture.request("miniflux")), { read: 9, unread: 4 });
  } finally {
    await fixture.closeAsync();
  }
});
