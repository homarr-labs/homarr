import assert from "node:assert/strict";
import { Headers, Response } from "undici";

import { StatsIntegration } from "../stats-integration";
import { createFixture } from "./fixture";

let calls = 0;
let phase = "before-native-factory";
const fixture = createFixture(async (url, init) => {
  calls += 1;
  assert.equal(String(url), "https://miniflux.invalid/prefix/v1/feeds/counters");
  assert.equal(new Headers(init?.headers).get("X-Auth-Token"), "synthetic-token");
  assert.equal(init?.redirect, "error");
  return Response.json({ reads: { a: 2, b: 7 }, unreads: { a: 1, b: 3 } });
});

try {
  const values = await fixture.runtime.executeNativeAsync(
    fixture.request("miniflux"),
    "query",
    async (client, context) => {
      phase = "native-factory-settled";
      assert(client instanceof StatsIntegration);
      phase = "native-wrapper";
      try {
        return await client.getStatsAsync(context.signal);
      } catch (error: unknown) {
        phase = `native-wrapper:${error instanceof Error ? error.name : "unknown"}`;
        throw error;
      }
    },
  );
  assert.deepEqual(values, { read: 9, unread: 4 });
  phase = "testing-lease";
  assert.deepEqual(await fixture.runtime.testConnectionAsync(fixture.request("miniflux", ["full"])), { success: true });
  assert.deepEqual(await fixture.runtime.getHttpAuthenticationAsync(fixture.request("miniflux", ["full"])), {
    headers: { "X-Auth-Token": "synthetic-token" },
  });
  assert.equal(calls, 2);
  assert.deepEqual(fixture.counts(), { secretReads: 3, acquired: 2, released: 2 });
  process.stdout.write(
    `${JSON.stringify({ factory: "base/creator.ts", wrapper: "StatsIntegration", values, calls, leases: fixture.counts() })}\n`,
  );
} catch (error: unknown) {
  process.stderr.write(
    `${JSON.stringify({ phase, calls, leases: fixture.counts(), error: error instanceof Error ? error.name : "unknown" })}\n`,
  );
  throw error;
} finally {
  await fixture.closeAsync();
}
