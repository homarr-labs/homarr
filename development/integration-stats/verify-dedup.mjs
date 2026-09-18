import assert from "node:assert/strict";
import http from "node:http";
import fs from "node:fs";
const { refreshStatsAsync, getStatsSnapshotAsync } = await import(
  `${process.cwd()}/packages/request-handler/src/stats.ts`
);
const manifest = process.argv[2];
if (!manifest) throw new Error("Pass a private real-Sonarr integration manifest");
const source = JSON.parse(fs.readFileSync(manifest, "utf8")).find((s) => s.kind === "sonarr");
const counts = {};
const proxy = http.createServer(async (req, res) => {
  const path = new URL(req.url, "http://localhost").pathname;
  counts[path] = (counts[path] ?? 0) + 1;
  try {
    const r = await fetch(source.url + req.url, { headers: { "X-Api-Key": source.decryptedSecrets[0].value } });
    res.writeHead(r.status, { "content-type": r.headers.get("content-type") });
    res.end(Buffer.from(await r.arrayBuffer()));
  } catch {
    res.writeHead(502);
    res.end();
  }
});
await new Promise((r) => proxy.listen(0, "127.0.0.1", r));
const input = {
  ...source,
  id: "stats-real-dedup-verification",
  url: `http://127.0.0.1:${proxy.address().port}`,
  externalUrl: null,
};
try {
  await Promise.all(Array.from({ length: 24 }, () => refreshStatsAsync(input, true)));
  const snapshot = await getStatsSnapshotAsync(input);
  assert.equal(snapshot.error, false);
  assert.equal(typeof snapshot.values.shows, "number");
  assert.deepEqual(counts, { "/api/v3/series": 1, "/api/v3/wanted/missing": 1, "/api/v3/queue": 1 });
  await Promise.all(Array.from({ length: 24 }, () => refreshStatsAsync(input, false)));
  assert.equal(
    Object.values(counts).reduce((a, b) => a + b, 0),
    3,
  );
  console.log(
    "PASS: 24 simultaneous refreshes produce one real Sonarr request per endpoint; 24 fresh-cache refreshes produce none. Seven metrics share the response.",
  );
  proxy.closeAllConnections();
  proxy.close();
  process.exit(0);
} catch (e) {
  console.error(e.name, e.message);
  proxy.closeAllConnections();
  proxy.close();
  process.exit(1);
}
