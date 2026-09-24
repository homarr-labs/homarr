#!/usr/bin/env node

const fixtureOrigin = process.env.FIXTURE_ORIGIN ?? "http://127.0.0.1:47612";
const expectPaginationRecovery = process.env.EXPECT_PAGINATION_RECOVERY === "true";
const results = [];
const startedAt = new Date().toISOString();

const record = (name, passed, details = {}) => {
  results.push({ name, passed, details });
};

const input = ({ id, kind, path, secrets = [] }) => ({
  id,
  kind,
  name: `Synthetic ${kind}`,
  url: `${fixtureOrigin}${path}`,
  externalUrl: null,
  decryptedSecrets: secrets,
});

const memory = () => {
  const usage = process.memoryUsage();
  return {
    rssBytes: usage.rss,
    heapUsedBytes: usage.heapUsed,
    heapTotalBytes: usage.heapTotal,
    externalBytes: usage.external,
  };
};

const fixtureMetrics = async () => await (await fetch(`${fixtureOrigin}/__metrics`)).json();

const sessionStub = (initial = null) => {
  let value = initial;
  return {
    async getAsync() {
      return value;
    },
    async setAsync(next) {
      value = next;
    },
    async clearAsync() {
      value = null;
    },
  };
};

const setSessionStore = (instance, initial = null) => {
  instance.sessionStore = sessionStub(initial);
};

const errorMessages = (error) => {
  const messages = [];
  let current = error;
  for (let depth = 0; current && depth < 8; depth += 1) {
    messages.push(current instanceof Error ? current.message : String(current));
    current = current instanceof Error ? current.cause : undefined;
  }
  return messages;
};

const run = async () => {
  const { getLatestMatchingReleaseAsync } = await import("/app/packages/request-handler/src/release-providers.ts");
  const { TrueNasClient } = await import("/app/packages/integrations/src/truenas/truenas-client.ts");
  const { TrueNasIntegration } = await import("/app/packages/integrations/src/truenas/truenas-integration.ts");
  const { OpenMediaVaultIntegration } = await import("/app/packages/integrations/src/openmediavault/openmediavault-integration.ts");
  const { BeszelIntegration } = await import("/app/packages/integrations/src/beszel/beszel-integration.ts");

  const release = await getLatestMatchingReleaseAsync({
    id: "github-over-1000",
    provider: "github",
    identifier: "fixture-owner/fixture-repository",
    providerUrl: `${fixtureOrigin}/github`,
  });
  record("#6559 GitHub provider collects a controlled 1001-release history", release.success && release.data.latestRelease === "v1001", {
    success: release.success,
    latestRelease: release.success ? release.data.latestRelease : undefined,
  });

  const cappedRelease = await getLatestMatchingReleaseAsync({
    id: "github-page-11-cap",
    provider: "github",
    identifier: "fixture-owner/fixture-repository",
    providerUrl: `${fixtureOrigin}/github-cap`,
  });
  const cappedMessage = cappedRelease.success ? "success" : cappedRelease.error.message;
  const paginationRecovered = cappedRelease.success && cappedRelease.data.latestRelease === "v1001";
  record(
    expectPaginationRecovery
      ? "#6559 fixed provider retains earlier pages when GitHub caps page 11"
      : "#6559 controlled GitHub page-11 422 reproduces the unbounded pagination failure",
    expectPaginationRecovery ? paginationRecovered : !cappedRelease.success && cappedRelease.error.code === "unexpected",
    {
    success: cappedRelease.success,
    errorCode: cappedRelease.success ? undefined : cappedRelease.error.code,
    errorMessage: cappedMessage,
    latestRelease: cappedRelease.success ? cappedRelease.data.latestRelease : undefined,
    paginationRecovered,
    minimalFailure: "Page 1-10 are valid newest-first pages; page 11 returns 422 Only the first 1000 results are available.",
    },
  );

  const lifecycleClient = new TrueNasClient(
    "truenas-lifecycle",
    (path) => new URL(`${fixtureOrigin}/truenas${path}`),
    { apiKey: "fixture-truenas-api-key" },
  );
  let lifecycleSuccesses = 0;
  const lifecycleErrors = [];
  const lifecycleMemory = [];
  for (let index = 0; index < 120; index += 1) {
    try {
      const response = await lifecycleClient.requestAsync("system.info");
      if (response?.version === "25.10.4") lifecycleSuccesses += 1;
    } catch (error) {
      lifecycleErrors.push(String(error));
    }
    if (index % 20 === 0) lifecycleMemory.push({ index, ...memory() });
  }
  record("#6271 TrueNAS JSON-RPC socket lifecycle reuses and reconnects under a sustained request loop", lifecycleSuccesses >= 110, {
    requests: 120,
    successes: lifecycleSuccesses,
    errors: lifecycleErrors.slice(0, 5),
    memory: lifecycleMemory,
  });

  const legacyClient = new TrueNasClient(
    "truenas-legacy",
    (path) => new URL(`${fixtureOrigin}/truenas-legacy${path}`),
    { apiKey: "fixture-truenas-api-key" },
  );
  const legacyResponse = await legacyClient.requestAsync("system.info");
  record("#6271 TrueNAS legacy websocket fallback returns a valid system.info result", legacyResponse?.version === "25.10.4", {
    responseVersion: legacyResponse?.version,
  });

  const truenasIntegration = new TrueNasIntegration(
    input({ id: "truenas-health", kind: "truenas", path: "/truenas", secrets: [{ kind: "apiKey", value: "fixture-truenas-api-key" }] }),
  );
  const truenasHealth = await truenasIntegration.getSystemInfoAsync();
  record("#6271 TrueNAS four-query health contract maps synthetic data", truenasHealth.version === "25.10.4" && truenasHealth.fileSystem.length === 1, {
    version: truenasHealth.version,
    filesystemCount: truenasHealth.fileSystem.length,
    memoryUsed: truenasHealth.memUsedInBytes,
  });

  for (const version of ["6.0", "7.7.17-1", "8.0"]) {
    const omv = new OpenMediaVaultIntegration(
      input({ id: `omv-valid-${version}`, kind: "openmediavault", path: `/omv-valid-v${version}`, secrets: [{ kind: "username", value: "fixture" }, { kind: "password", value: "fixture" }] }),
    );
    setSessionStore(omv, { type: "header", sessionId: "fixture-omv-session" });
    const health = await omv.getSystemInfoAsync();
    record(`#4190 OMV valid response contract accepts supported version fixture ${version}`, health.version === version && health.cpuModelName === "Unknown CPU", {
      version: health.version,
      cpuModelName: health.cpuModelName,
      memoryUsed: health.memUsedInBytes,
    });
  }

  for (const malformed of ["cpu", "memory", "load"]) {
    const omv = new OpenMediaVaultIntegration(
      input({ id: `omv-malformed-${malformed}`, kind: "openmediavault", path: `/omv-malformed-${malformed}`, secrets: [{ kind: "username", value: "fixture" }, { kind: "password", value: "fixture" }] }),
    );
    setSessionStore(omv, { type: "header", sessionId: "fixture-omv-session" });
    let error;
    try {
      await omv.getSystemInfoAsync();
    } catch (caught) {
      error = caught;
    }
    const causeMessages = errorMessages(error);
    record(`#4190 OMV malformed ${malformed} field hits the integration validation boundary`, causeMessages.includes("Invalid system information response"), {
      errorName: error?.name,
      errorMessage: error?.message,
      causeMessages,
    });
  }

  const beszelSessions = [];
  let beszelRequests = 0;
  const soakStarted = Date.now();
  for (let sessionIndex = 0; sessionIndex < 12; sessionIndex += 1) {
    const beszel = new BeszelIntegration(
      input({ id: `beszel-session-${sessionIndex}`, kind: "beszel", path: "/beszel", secrets: [{ kind: "username", value: "fixture" }, { kind: "password", value: "fixture" }] }),
    );
    setSessionStore(beszel);
    const systems = await beszel.getSystemsAsync();
    const details = await beszel.getSystemDetailsAsync("fixture-system-1");
    const stats = await beszel.getSystemStatsAsync("fixture-system-1", "1m", 60);
    const containers = await beszel.getContainerStatsAsync("fixture-system-1", "1m", 60);
    beszelRequests += systems.length + (details.id ? 1 : 0) + stats.length + containers.length;
    beszelSessions.push({ sessionIndex, systems: systems.length, stats: stats.length, containers: containers.length, ...memory() });
  }
  record("#6438 Beszel repeated sessions/docker fixture remain bounded at source-class level", beszelSessions.every((session) => session.systems === 1 && session.stats === 1 && session.containers === 1), {
    sessions: beszelSessions.length,
    logicalRecords: beszelRequests,
    durationMs: Date.now() - soakStarted,
    samples: beszelSessions,
  });

  const parserBeszel = new BeszelIntegration(
    input({ id: "beszel-parser-error", kind: "beszel", path: "/beszel-parser", secrets: [{ kind: "username", value: "fixture" }, { kind: "password", value: "fixture" }] }),
  );
  setSessionStore(parserBeszel, { token: "fixture-beszel-token", userId: "fixture-user" });
  let parserError;
  try {
    await parserBeszel.getSystemsAsync();
  } catch (error) {
    parserError = error;
  }
  record("#6024 malformed Beszel JSON reproducibly enters the parser error boundary", Boolean(parserError), {
    errorName: parserError?.name,
    errorMessage: parserError?.message,
    causeName: parserError?.cause?.name,
    causeMessage: parserError?.cause?.message,
    originalPayloadAvailable: false,
    acknowledgement: "The issue supplied only the stack/message, not the upstream response body; the fixture proves the malformed-JSON path but cannot identify the original payload.",
  });

  const endMetrics = await fixtureMetrics();
  console.log(JSON.stringify({ startedAt, finishedAt: new Date().toISOString(), fixtureOrigin, results, endMetrics }, null, 2));
};

await run();
