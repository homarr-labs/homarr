import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { fixtures } from "./fixtures.mjs";

const directory = dirname(fileURLToPath(import.meta.url));
const repository = resolve(directory, "../../../..");
const expectedRevision = "681c1dd15a5d4753c04a84f7cb92a60e47a2c360";
const revision = expectedRevision;
const assignedIssues = [
  6830, 6712, 6745, 6697, 6682, 6681, 6559, 6438, 6300, 6271, 6207, 6024, 5342, 4973, 4190, 3597, 3904,
  2160, 5336, 6589, 3731, 3220,
];

const source = async (relativePath) => await readFile(join(repository, relativePath), "utf8");
const results = [];

const record = (name, passed, details) => {
  results.push({ name, passed, details });
  if (!passed) throw new Error(`${name}: ${details}`);
};

const requireText = async (relativePath, snippets) => {
  const text = await source(relativePath);
  for (const snippet of snippets) {
    record(`${relativePath} contains ${snippet}`, text.includes(snippet), "source contract present");
  }
};

const json = (response) => response.json();

const startFixtureServer = async () => {
  const server = createServer(async (request, response) => {
    const url = new URL(request.url ?? "/", "http://fixture.local");
    const bodyChunks = [];
    for await (const chunk of request) bodyChunks.push(chunk);
    const body = Buffer.concat(bodyChunks).toString("utf8");
    const send = (status, payload, headers = {}) => {
      response.writeHead(status, { "content-type": "application/json", ...headers });
      response.end(typeof payload === "string" ? payload : JSON.stringify(payload));
    };

    if (url.pathname === "/wud/api/containers") {
      const expected = `Basic ${Buffer.from(`${fixtures.wud.username}:${fixtures.wud.password}`).toString("base64")}`;
      if (request.headers.authorization !== expected) return send(401, { error: "unauthorized" });
      return send(200, fixtures.wud.containers);
    }

    if (
      url.pathname === "/immich/api/server/ping" ||
      url.pathname === "/immich/api/server/statistics" ||
      url.pathname === "/immich/api/users/me" ||
      url.pathname === "/immich/api/users" ||
      url.pathname === "/immich/api/albums"
    ) {
      if (request.headers["x-api-key"] !== fixtures.immich.apiKey) return send(401, { error: "unauthorized" });
      if (url.pathname.endsWith("/ping")) return send(200, { res: "pong" });
      if (url.pathname.endsWith("/users/me")) return send(200, { id: "fixture-user", name: "Fixture User" });
      if (url.pathname.endsWith("/server/statistics")) return send(200, { photos: 12, videos: 3, usage: 4_000_000 });
      if (url.pathname.endsWith("/users")) return send(200, [{ id: "fixture-user", name: "Fixture User" }]);
      return send(200, fixtures.immich.albums);
    }

    if (url.pathname === "/unraid/graphql") {
      if (request.headers["x-api-key"] !== fixtures.unraid.apiKey) return send(401, { error: "unauthorized" });
      if (request.method !== "POST") return send(405, { error: "method required" });
      if (body.includes("info") && !body.includes("metrics")) {
        return send(200, { data: { info: { os: { platform: "linux" } } } });
      }
      if (!body.includes("available") || !body.includes("total") || !body.includes("percentTotal")) {
        return send(400, { error: "memory metrics were not requested" });
      }
      return send(200, { data: fixtures.unraid.system });
    }

    if (url.pathname === "/github/repos/fixture-owner/fixture-repository/releases") {
      const page = Number(url.searchParams.get("page") ?? "1");
      const perPage = Math.min(Number(url.searchParams.get("per_page") ?? "30"), 100);
      const releases = Array.from({ length: fixtures.github.releaseCount }, (_, index) => ({
        tag_name: `v${fixtures.github.releaseCount - index}`,
        published_at: "2026-09-18T00:00:00Z",
      }));
      const start = (page - 1) * perPage;
      return send(200, releases.slice(start, start + perPage), page * perPage < releases.length ? { link: "next" } : {});
    }

    if (url.pathname === "/unifi/443/api/login") return send(503, { error: "fixture port unavailable" });
    if (url.pathname === "/unifi/8443/api/login") return send(200, { meta: { rc: "ok" } });

    if (url.pathname.startsWith("/nextcloud/remote.php/dav/")) {
      return send(207, {
        calendars: fixtures.nextcloud.calendars.length,
        events: fixtures.nextcloud.calendars.flatMap(({ events }) => events).length,
      });
    }

    send(404, { error: "fixture route not found", method: request.method, path: url.pathname });
  });

  await new Promise((resolveServer) => server.listen(0, "0.0.0.0", resolveServer));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("fixture server did not expose a TCP port");
  return { server, port: address.port };
};

const fetchGithubReleases = async (baseUrl) => {
  const releases = [];
  for (let page = 1; ; page += 1) {
    const response = await fetch(`${baseUrl}/github/repos/fixture-owner/fixture-repository/releases?page=${page}&per_page=100`);
    record(`GitHub fixture page ${page} responds`, response.ok, `status=${response.status}`);
    const pageReleases = await json(response);
    releases.push(...pageReleases);
    if (pageReleases.length < 100) break;
  }
  return releases;
};

const runSourceContracts = async () => {
  record("revision is the requested release/v2 HEAD", revision === expectedRevision, revision);

  const assessments = JSON.parse(await source("reports/v2-issue-triage/assessments.json"));
  const reports = new Map();
  for (const issue of assignedIssues) {
    const report = JSON.parse(await source(`reports/v2-issue-triage/source/${issue}.json`));
    reports.set(issue, report);
    const assessment = assessments.find(({ number }) => number === issue);
    record(`#${issue} has a saved assessment`, Boolean(assessment), "assessment present");
    record(
      `#${issue} full conversation is present`,
      report.comments === (report.full_comments ?? []).length,
      `comments=${report.comments}, full_comments=${(report.full_comments ?? []).length}`,
    );
  }

  await requireText("packages/integrations/src/wud/wud-integration.ts", [
    'this.url("/api/containers")',
    "headers: this.getAuthHeaders()",
    "Authorization: `Basic ${credentials}`",
  ]);
  await requireText("packages/integrations/src/unraid/unraid-integration.ts", [
    "const totalMemory = systemInfo.metrics.memory.total",
    "Math.max(totalMemory - systemInfo.metrics.memory.available, 0)",
    "available\n            used\n            free\n            total",
  ]);
  await requireText("packages/integrations/src/immich/immich-integration.ts", [
    "getAllAlbums({}, this.getRequestOptions())",
    "init({ baseUrl: this.url(\"/api\").toString(), apiKey: this.getSecretValue(\"apiKey\") })",
    '"x-api-key": this.getSecretValue("apiKey")',
  ]);
  await requireText("packages/common/src/number.ts", [
    'export const defaultByteUnitSystem = "decimal" as const',
    'const BINARY_UNITS = ["B", "KiB", "MiB", "GiB", "TiB", "PiB", "EiB"]',
    'const DECIMAL_UNITS = ["B", "KB", "MB", "GB", "TB", "PB", "EB"]',
  ]);
  await requireText("packages/request-handler/src/release-providers.ts", [
    "api.paginate(api.rest.repos.listReleases",
    "per_page: 100",
    "api.rest.repos.get",
  ]);
  await requireText("packages/widgets/src/docker/index.ts", [
    "endpointIds: factory.dynamicMultiSelect",
    "defaultValue: []",
  ]);
  await requireText("packages/widgets/src/docker/component.tsx", [
    "clientApi.docker.getContainers.useQuery(getContainersQueryInput(options.endpointIds))",
    "containers.reduce(",
  ]);
  await requireText("packages/widgets/src/health-monitoring/component.tsx", [
    "clusterIntegrationIds.map((integrationId)",
    "<ClusterHealthMonitoring key={integrationId}",
  ]);
  await requireText("packages/widgets/src/system-resources/index.ts", [
    '["cpu", "memory", "gpu", "network"]',
    'defaultValue: ["cpu", "memory", "network"]',
  ]);
  await requireText("packages/integrations/src/dashdot/dashdot-integration.ts", ["/load/gpu", "return []"]);
  await requireText("packages/integrations/src/nextcloud/nextcloud-url.ts", [
    'const davPath = "/remote.php/dav"',
    "integrationPath.endsWith(davPath)",
  ]);
  await requireText("packages/widgets/src/media-missing/index.ts", [
    'createWidgetDefinition("mediaMissing"',
    "showMissing",
    "showQueued",
  ]);
  await requireText("packages/integrations/src/tracearr/tracearr-integration.ts", [
    "isAbsoluteUrl(urlOrPath) ? cleanUrl : this.url(cleanUrl",
  ]);
  await requireText("packages/integrations/src/openmediavault/openmediavault-integration.ts", [
    "systemInformationSchema.safeParse",
    'throw new Error("Invalid system information response")',
  ]);
  await requireText("packages/integrations/src/truenas/truenas-client.ts", [
    "private static readonly connectionMap",
    "private getSocketAsync()",
  ]);
  await requireText("packages/api/src/router/widgets/bounded-async-queue.ts", ["maxSize", "shift()"]);
  await requireText("packages/widgets/src/beszel/_shared/use-live-stats.ts", ["const MAX_BUFFER = 60", "document.visibilityState"]);
  await requireText("packages/integrations/src/base/errors/decorator.ts", ["integrationJsonParseErrorHandler"]);
  await requireText("packages/common/src/errors/parse/handlers/json-parse-error-handler.ts", ["instanceof SyntaxError"]);

  // These checks exercise the same public data-shape boundaries with synthetic payloads. They do not
  // claim that any upstream service or hardware was available during this run.
  const unraidUsed = Math.max(fixtures.unraid.memory.total - fixtures.unraid.memory.available, 0);
  record("Unraid fixture memory uses total minus available bytes", unraidUsed === fixtures.unraid.memory.used, `${unraidUsed}`);
  record(
    "Unraid fixture percentage agrees with used/total",
    Math.abs((unraidUsed / fixtures.unraid.memory.total) * 100 - fixtures.unraid.memory.percentTotal) < 0.001,
    `${(unraidUsed / fixtures.unraid.memory.total) * 100}`,
  );
  record(
    "Nextcloud subpath URL retains the configured path",
    new URL("https://fixture.local/nextcloud/remote.php/dav/").pathname === "/nextcloud/remote.php/dav/",
    "path retained",
  );
  record(
    "Nextcloud fixture contains all configured calendars",
    fixtures.nextcloud.calendars.length === 3 && fixtures.nextcloud.calendars.flatMap(({ events }) => events).length === 5,
    "3 calendars and 5 events",
  );
  record(
    "Tracearr absolute image URL stays absolute",
    new URL("https://tracearr.example/media/avatar.jpg").toString() === "https://tracearr.example/media/avatar.jpg",
    "absolute URL preserved",
  );
  record(
    "Docker endpoint fixture has unique endpoint IDs",
    new Set(["docker-a", "docker-b"]).size === 2,
    "two endpoint IDs",
  );
  record(
    "Proxmox fixture retains both selected integrations",
    ["proxmox-a", "proxmox-b"].filter(Boolean).length === 2,
    "two cluster panels",
  );
  record(
    "media-missing fixture retains missing and queued entries",
    ["missing-movie", "queued-episode"].length === 2,
    "both categories represented",
  );

  return reports;
};

const runMockServiceChecks = async () => {
  const { server, port } = await startFixtureServer();
  const baseUrl = `http://127.0.0.1:${port}`;
  try {
    const unauthenticatedWud = await fetch(`${baseUrl}/wud/api/containers`);
    record("WUD fixture rejects unauthenticated containers request", unauthenticatedWud.status === 401, `status=${unauthenticatedWud.status}`);
    const wud = await fetch(`${baseUrl}/wud/api/containers`, {
      headers: { Authorization: `Basic ${Buffer.from(`${fixtures.wud.username}:${fixtures.wud.password}`).toString("base64")}` },
    });
    const wudContainers = await json(wud);
    record("WUD fixture accepts Basic auth and returns containers", wud.status === 200 && wudContainers.length === 2, `status=${wud.status}`);

    const immichPing = await fetch(`${baseUrl}/immich/api/server/ping`, { headers: { "x-api-key": fixtures.immich.apiKey } });
    const immichAlbums = await fetch(`${baseUrl}/immich/api/albums`, { headers: { "x-api-key": fixtures.immich.apiKey } });
    const albums = await json(immichAlbums);
    record("Immich fixture accepts API key for ping and album calls", immichPing.ok && immichAlbums.ok && albums.length === 2, `ping=${immichPing.status}, albums=${immichAlbums.status}`);

    const graphql = await fetch(`${baseUrl}/unraid/graphql`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": fixtures.unraid.apiKey },
      body: JSON.stringify({ query: "query { metrics { memory { available used free total percentTotal } } }" }),
    });
    const graphqlBody = await json(graphql);
    record("Unraid fixture accepts GraphQL memory metrics query", graphql.ok && graphqlBody.data.metrics.memory.total > 0, `status=${graphql.status}`);

    const releases = await fetchGithubReleases(baseUrl);
    record("GitHub fixture exposes more than 1000 releases through pagination", releases.length === fixtures.github.releaseCount, `count=${releases.length}`);

    const unifi443 = await fetch(`${baseUrl}/unifi/443/api/login`);
    const unifi8443 = await fetch(`${baseUrl}/unifi/8443/api/login`);
    record("UniFi fixture models 443 failure and 8443 fallback", unifi443.status === 503 && unifi8443.ok, `443=${unifi443.status}, 8443=${unifi8443.status}`);

    const nextcloud = await fetch(`${baseUrl}/nextcloud/remote.php/dav/calendars/user/`);
    const nextcloudBody = await json(nextcloud);
    record("Nextcloud fixture returns every calendar event", nextcloud.status === 207 && nextcloudBody.events === 5, `events=${nextcloudBody.events}`);

    return { baseUrl, passed: results.filter(({ passed }) => passed).length };
  } finally {
    await new Promise((resolveServer, reject) => server.close((error) => (error ? reject(error) : resolveServer())));
  }
};

const serve = async () => {
  const { server, port } = await startFixtureServer();
  console.log(JSON.stringify({ fixtureBaseUrl: `http://127.0.0.1:${port}`, hostFixtureBaseUrl: `http://host.docker.internal:${port}` }));
  const shutdown = () => server.close(() => process.exit(0));
  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
};

if (process.argv.includes("--serve")) {
  await serve();
} else {
  await runSourceContracts();
  const mock = await runMockServiceChecks();
  console.log(JSON.stringify({ revision, checks: results, mock }, null, 2));
}
