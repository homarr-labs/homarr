// Run against an isolated Homarr instance. Inputs contain credentials and must stay outside the repository.
import { readFile, writeFile } from "node:fs/promises";

const [manifestPath, statePath, outputPath, baseUrl = "http://localhost:3138"] = process.argv.slice(2);
if (!manifestPath || !statePath || !outputPath) {
  throw new Error(
    "Usage: node validate.mjs <private-manifest.json> <private-browser-state.json> <private-results.json> [homarr-url]",
  );
}
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const state = JSON.parse(await readFile(statePath, "utf8"));
const hostname = new URL(baseUrl).hostname;
const cookie = state.cookies
  .filter((item) => item.domain.replace(/^\./, "") === hostname)
  .map((item) => `${item.name}=${item.value}`)
  .join("; ");
if (!cookie) throw new Error("No authenticated cookies found for the Homarr hostname");
let previous = [];
try {
  previous = JSON.parse(await readFile(outputPath, "utf8"));
} catch {
  /* First run. */
}

async function call(procedure, input, mutation = false, authenticated = true) {
  const headers = { "content-type": "application/json", "x-trpc-source": "stats-live-validation" };
  if (authenticated) headers.cookie = cookie;
  let url = `${baseUrl}/api/trpc/${procedure}`;
  const init = { headers, signal: AbortSignal.timeout(120_000) };
  if (mutation) {
    init.method = "POST";
    init.body = JSON.stringify({ json: input });
  } else {
    url += `?input=${encodeURIComponent(JSON.stringify({ json: input }))}`;
  }
  const response = await fetch(url, init);
  const body = await response.json();
  if (body.error) return { apiError: body.error.json?.data?.code ?? "UNKNOWN" };
  return body.result?.data?.json;
}

const results = [];
for (const source of manifest) {
  const result = { kind: source.kind, name: source.name, url: source.url, success: false };
  try {
    let id = previous.find((item) => item.kind === source.kind)?.integrationId;
    if (id) {
      result.integrationId = id;
      const updated = await call(
        "integration.update",
        { id, name: source.name, url: source.url, secrets: source.decryptedSecrets, appId: null },
        true,
      );
      if (updated?.error || updated?.apiError) throw new Error("Connection update failed");
    } else {
      const created = await call(
        "integration.create",
        {
          kind: source.kind,
          name: source.name,
          url: source.url,
          secrets: source.decryptedSecrets,
          attemptSearchEngineCreation: false,
        },
        true,
      );
      if (!created?.integration?.id) {
        result.connectionError = created?.apiError ?? created?.error?.type ?? "CONNECTION_FAILED";
        results.push(result);
        console.log(`${source.kind}: connection failed (${result.connectionError})`);
        continue;
      }
      id = created.integration.id;
    }
    result.integrationId = id;
    result.connectionPassed = true;
    const catalog = await call("widget.stats.catalog", { integrationId: id });
    const snapshot = await call("widget.stats.refresh", { integrationId: id, force: true }, true);
    result.metricCount = catalog?.metrics?.length ?? 0;
    result.snapshot = snapshot;
    result.success = result.metricCount > 0 && snapshot?.updatedAt != null && snapshot?.error === false;
    if (result.success) result.metrics = catalog.metrics;
  } catch (error) {
    // Never print upstream URLs, payloads, tokens, cookies, or stack traces.
    result.failure = error instanceof Error ? error.name : "UnknownError";
  }
  results.push(result);
  console.log(`${source.kind}: ${result.success ? "PASS" : "FAIL"} (${result.metricCount ?? 0} metrics)`);
  await writeFile(outputPath, JSON.stringify(results, null, 2), { mode: 0o600 });
}
await writeFile(outputPath, JSON.stringify(results, null, 2), { mode: 0o600 });
console.log(`Validated ${results.filter((item) => item.success).length}/${results.length} real services`);
if (results.some((item) => !item.success)) process.exitCode = 1;
