import assert from "node:assert/strict";
import { Headers, Response } from "undici";
import { test } from "vitest";

import { createFixture } from "./fixture";
import { StatsIntegration } from "../stats-integration";

test("real native Miniflux factory and wrapper consume scoped injected transport", async () => {
  let calls = 0;
  const fixture = createFixture(async (url, options) => {
    calls += 1;
    assert.equal(String(url), "https://miniflux.invalid/prefix/v1/feeds/counters");
    assert.equal(new Headers(options?.headers).get("X-Auth-Token"), "synthetic-token");
    assert.equal(options?.redirect, "error");
    assert(options?.signal);
    return Response.json({ reads: { a: 2, b: 7 }, unreads: { a: 1, b: 3 } });
  });
  try {
    const values = await fixture.runtime.executeNativeAsync(
      fixture.request("miniflux"),
      "query",
      async (client, context) => {
        assert(client instanceof StatsIntegration, `Factory returned ${client.constructor.name}`);
        assert.equal(client.publicIntegration.id, "synthetic-miniflux");
        return await client.getStatsAsync(context.signal);
      },
    );
    assert.deepEqual(values, { read: 9, unread: 4 });
    assert.deepEqual(await fixture.runtime.testConnectionAsync(fixture.request("miniflux", ["full"])), {
      success: true,
    });
    assert.deepEqual(await fixture.runtime.getHttpAuthenticationAsync(fixture.request("miniflux", ["full"])), {
      headers: { "X-Auth-Token": "synthetic-token" },
    });
    assert.equal(calls, 2);
    assert.deepEqual(fixture.counts(), { secretReads: 3, acquired: 2, released: 2 });
  } finally {
    await fixture.closeAsync();
  }
});
