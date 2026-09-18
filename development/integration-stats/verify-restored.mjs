// Run from the repository root after loading the private pack environment.
import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
const root = process.argv[2];
if (!root) throw new Error("Pass the isolated restored pack directory (including ports.json)");
const ports = JSON.parse(fs.readFileSync(path.join(root, "ports.json"), "utf8"));
process.env.DB_URL = path.join(root, "homarr/db.sqlite");
process.env.REDIS_PORT = ports["16388"];
const { decryptSecret } = await import(`${process.cwd()}/packages/common/src/encryption.ts`);
const { fetchStatsAsync, getStatsMetrics } = await import(`${process.cwd()}/packages/integrations/src/stats/index.ts`);
const db = new DatabaseSync(process.env.DB_URL, { readOnly: true });
const results = [];
for (const integration of db.prepare("SELECT * FROM integration").all()) {
  const url = new URL(integration.url);
  const port = ports[url.port];
  if (!port) {
    results.push({ kind: integration.kind, success: false, error: "Missing restored port" });
    console.log(integration.kind + ": RESTORE FAIL (missing port)");
    continue;
  }
  url.hostname = "127.0.0.1";
  url.port = port;
  const input = {
    ...integration,
    url: url.toString(),
    externalUrl: null,
    decryptedSecrets: db
      .prepare("SELECT kind,value FROM integrationSecret WHERE integration_id=?")
      .all(integration.id)
      .map((s) => ({ ...s, value: decryptSecret(s.value) })),
  };
  try {
    const values = await fetchStatsAsync(input, AbortSignal.timeout(45_000));
    const metrics = getStatsMetrics(input.kind);
    if (!metrics.every((m) => Object.hasOwn(values, m.key))) throw new Error("Incomplete catalog values");
    results.push({ kind: input.kind, success: true, metricCount: metrics.length, values });
    console.log(input.kind + ": RESTORE PASS (" + metrics.length + " metrics)");
  } catch (error) {
    results.push({ kind: input.kind, success: false, error: error.name });
    console.log(input.kind + ": RESTORE FAIL (" + error.name + ")");
  }
}
fs.writeFileSync(path.join(root, "restored-results.json"), JSON.stringify(results, null, 2), { mode: 0o600 });
console.log(
  `Restored database credentials and API data verified: ${results.filter((r) => r.success).length}/${results.length}`,
);
db.close();
process.exit(results.every((r) => r.success) ? 0 : 1);
