import assert from "node:assert/strict";
import fs from "node:fs";
const root = process.cwd();
const { refreshStatsAsync, getStatsSnapshotAsync } = await import(`${root}/packages/request-handler/src/stats.ts`);
const { createGetSetChannel, invalidateIntegrationResponseCacheAsync, invalidateIntegrationCacheAsync } = await import(
  `${root}/packages/redis/src/index.ts`
);
const { createRedisConnection } = await import(`${root}/packages/redis/src/lib/connection.ts`);
const source = JSON.parse(fs.readFileSync(process.argv[2], "utf8")).find((item) => item.kind === "sonarr");
const input = { ...source, id: "stats-persistence-verification", externalUrl: null };
const client = createRedisConnection();
try {
  await client.ping();
  await new Promise((resolve) => setTimeout(resolve, 100));
  await refreshStatsAsync(input, true);
  const original = await getStatsSnapshotAsync(input);
  assert.equal(original.error, false);
  assert.equal(typeof original.values.shows, "number");
  const channel = createGetSetChannel(`integration-stats:snapshot:v1:${input.id}`);
  const stored = await channel.getAsync();
  await channel.setAsync({ ...stored, identity: `0:999:${stored.identity}` });
  assert.deepEqual(await getStatsSnapshotAsync(input), original);
  await invalidateIntegrationResponseCacheAsync(input.id);
  assert.deepEqual(await getStatsSnapshotAsync(input), original);
  await client.expire(`integration-cache:generation:${input.id}`, 1);
  await new Promise((resolve) => setTimeout(resolve, 2100));
  assert.deepEqual(await getStatsSnapshotAsync(input), original);
  assert.equal((await getStatsSnapshotAsync({ ...input, url: `${input.url}/changed` })).updatedAt, null);
  assert.equal(
    (
      await getStatsSnapshotAsync({
        ...input,
        decryptedSecrets: input.decryptedSecrets.map((secret) => ({ ...secret, value: "changed" })),
      })
    ).updatedAt,
    null,
  );
  await invalidateIntegrationCacheAsync(input.id);
  assert.equal((await getStatsSnapshotAsync(input)).updatedAt, null);
  console.log(
    "PASS: real Sonarr snapshot survives response-generation change/expiry; URL, credentials, and explicit integration invalidation reject old data.",
  );
  process.exit(0);
} catch (error) {
  console.error(error.name, error.message);
  process.exit(1);
}
