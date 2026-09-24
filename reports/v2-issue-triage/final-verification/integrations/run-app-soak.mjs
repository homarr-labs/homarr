#!/usr/bin/env node

import { execFileSync } from "node:child_process";

const appUrl = process.env.HOMARR_URL ?? "http://127.0.0.1:47629";
const fixtureUrl = process.env.FIXTURE_URL ?? "http://homarr-final-fixture-runtime-20260918:47612";
const containerName = process.env.RUNTIME_CONTAINER ?? "homarr-final-runtime-20260918";
const sessionCount = Number(process.env.SESSION_COUNT ?? 12);
const cyclesPerSession = Number(process.env.CYCLES_PER_SESSION ?? 20);
const checks = [];
const samples = [];
const errors = [];
const startedAt = new Date().toISOString();

const record = (name, passed, details = {}) => checks.push({ name, passed, details });

const getSetCookies = (response) => {
  if (typeof response.headers.getSetCookie === "function") return response.headers.getSetCookie();
  const single = response.headers.get("set-cookie");
  return single ? [single] : [];
};

const toCookieHeader = (setCookies) =>
  setCookies
    .map((cookie) => cookie.split(";", 1)[0])
    .filter(Boolean)
    .join("; ");

const login = async () => {
  const csrfResponse = await fetch(`${appUrl}/api/auth/csrf`);
  const csrfCookies = getSetCookies(csrfResponse);
  const csrf = await csrfResponse.json();
  if (!csrfResponse.ok || typeof csrf.csrfToken !== "string") {
    throw new Error(`csrf status=${csrfResponse.status}`);
  }

  const loginResponse = await fetch(`${appUrl}/api/auth/callback/credentials`, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      cookie: toCookieHeader(csrfCookies),
    },
    body: new URLSearchParams({
      csrfToken: csrf.csrfToken,
      name: "demo",
      password: "demo",
      callbackUrl: `${appUrl}/`,
      json: "true",
    }),
    redirect: "manual",
  });
  const cookies = toCookieHeader([...csrfCookies, ...getSetCookies(loginResponse)]);
  if (loginResponse.status < 300 || loginResponse.status >= 400 || !/(?:session-token|authjs\.session-token)=/.test(cookies)) {
    throw new Error(`login status=${loginResponse.status} cookies=${cookies.length}`);
  }
  return cookies;
};

const trpc = async (cookie, path, input, method = "GET") => {
  const encodedInput = encodeURIComponent(JSON.stringify({ 0: { json: input } }));
  const response = await fetch(`${appUrl}/api/trpc/${path}?batch=1&input=${encodedInput}`, {
    method,
    headers: {
      cookie,
      ...(method === "POST" ? { "content-type": "application/json" } : {}),
    },
    ...(method === "POST" ? { body: JSON.stringify({ 0: { json: input } }) } : {}),
  });
  const payload = await response.json();
  const item = Array.isArray(payload) ? payload[0] : payload;
  if (!response.ok || item?.error) {
    throw new Error(`${path} status=${response.status} payload=${JSON.stringify(item?.error ?? payload)}`);
  }
  return item?.result?.data?.json;
};

const createIntegration = async (cookie, input) => {
  const result = await trpc(cookie, "integration.create", input, "POST");
  const id = result?.integration?.id;
  if (!id) throw new Error(`integration.create returned ${JSON.stringify(result)}`);
  return id;
};

const toBytes = (value) => {
  const match = String(value).trim().match(/^([\d.]+)\s*([KMGTPE]?i?B)$/i);
  if (!match) return null;
  const units = { b: 1, kb: 1000, mb: 1000 ** 2, gb: 1000 ** 3, tb: 1000 ** 4, kib: 1024, mib: 1024 ** 2, gib: 1024 ** 3, tib: 1024 ** 4 };
  return Math.round(Number(match[1]) * (units[match[2].toLowerCase()] ?? 1));
};

const measureRuntime = (label, sessionIndex, cycle) => {
  try {
    const raw = execFileSync("docker", ["stats", "--no-stream", "--format", "{{json .}}", containerName], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
    const stats = JSON.parse(raw);
    const state = execFileSync("docker", ["inspect", "--format", "{{.State.Status}} {{.State.OOMKilled}} {{.RestartCount}}", containerName], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim().split(/\s+/u);
    const sample = {
      label,
      sessionIndex,
      cycle,
      measuredAt: new Date().toISOString(),
      memoryUsageBytes: toBytes(stats.MemUsage?.split(" / ")[0]),
      memoryLimitBytes: toBytes(stats.MemUsage?.split(" / ")[1]),
      memoryPercent: stats.MemPerc,
      cpuPercent: stats.CPUPerc,
      pids: stats.PIDs,
      status: state[0],
      oomKilled: state[1] === "true",
      restartCount: Number(state[2]),
    };
    samples.push(sample);
    return sample;
  } catch (error) {
    errors.push({ phase: "measure", label, error: String(error) });
    return null;
  }
};

const run = async () => {
  const health = await fetch(`${appUrl}/api/health/live`);
  const healthPayload = await health.json();
  record("bounded runtime health is live", health.ok && healthPayload.status === "healthy", {
    status: health.status,
    payload: healthPayload,
  });

  const setupCookie = await login();
  record("credentials session can be established", true);

  const wudId = await createIntegration(setupCookie, {
    name: "WUD soak fixture",
    url: `${fixtureUrl}/wud`,
    kind: "wud",
    secrets: [
      { kind: "username", value: "fixture-wud-user" },
      { kind: "password", value: "fixture-wud-password" },
    ],
    attemptSearchEngineCreation: false,
  });
  const beszelId = await createIntegration(setupCookie, {
    name: "Beszel soak fixture",
    url: `${fixtureUrl}/beszel`,
    kind: "beszel",
    secrets: [
      { kind: "username", value: "fixture" },
      { kind: "password", value: "fixture" },
    ],
    attemptSearchEngineCreation: false,
  });
  const initialWud = await trpc(setupCookie, "widget.wud.getStats", { integrationId: wudId });
  record("WUD Docker fixture returns bounded container statistics", initialWud?.stats?.totalContainers === 2 && initialWud.stats.updatesAvailable === 1, {
    wudId,
    stats: initialWud?.stats,
  });
  const initialSystems = await trpc(setupCookie, "widget.beszel.getSystems", { integrationIds: [beszelId] });
  const systemId = initialSystems?.[0]?.systems?.[0]?.id;
  record("Beszel fixture returns one monitored system", systemId === "fixture-system-1", {
    beszelId,
    systemId,
    systems: initialSystems?.[0]?.systems?.length,
  });
  const initialStats = await trpc(setupCookie, "widget.beszel.getSystemStats", {
    integrationIds: [beszelId],
    systemId,
    timePeriod: "1m",
    includeDocker: true,
  });
  record("Beszel Docker stats fixture returns system and container records", initialStats?.systemStats?.length === 1 && initialStats?.containerStats?.length === 1, {
    systemStats: initialStats?.systemStats?.length,
    containerStats: initialStats?.containerStats?.length,
  });

  measureRuntime("after-setup", -1, -1);
  const soakStartedAt = Date.now();
  let successfulSessions = 0;
  let successfulCycles = 0;
  for (let sessionIndex = 0; sessionIndex < sessionCount; sessionIndex += 1) {
    let cookie;
    try {
      cookie = await login();
      successfulSessions += 1;
      for (let cycle = 0; cycle < cyclesPerSession; cycle += 1) {
        const [wud, systems, stats] = await Promise.all([
          trpc(cookie, "widget.wud.getStats", { integrationId: wudId }),
          trpc(cookie, "widget.beszel.getSystems", { integrationIds: [beszelId] }),
          trpc(cookie, "widget.beszel.getSystemStats", {
            integrationIds: [beszelId],
            systemId: "fixture-system-1",
            timePeriod: "1m",
            includeDocker: true,
          }),
        ]);
        if (wud?.stats?.totalContainers !== 2 || systems?.[0]?.systems?.length !== 1 || stats?.containerStats?.length !== 1) {
          throw new Error(`unexpected fixture payload at session=${sessionIndex} cycle=${cycle}`);
        }
        successfulCycles += 1;
        if (cycle === 0 || cycle === cyclesPerSession - 1) measureRuntime("soak", sessionIndex, cycle);
      }
    } catch (error) {
      errors.push({ phase: "soak", sessionIndex, error: String(error) });
    }
  }
  measureRuntime("after-soak", sessionCount, cyclesPerSession);

  const fixtureMetrics = await fetch(`${process.env.FIXTURE_METRICS_URL ?? "http://127.0.0.1:47628/__metrics"}`).then((response) => response.json());
  const firstMemory = samples.find((sample) => sample.label === "after-setup")?.memoryUsageBytes ?? null;
  const finalMemory = samples.findLast((sample) => sample.label === "after-soak")?.memoryUsageBytes ?? null;
  const peakMemory = Math.max(...samples.map((sample) => sample.memoryUsageBytes ?? 0));
  const oomKilled = samples.some((sample) => sample.oomKilled);
  const restartCount = Math.max(...samples.map((sample) => sample.restartCount ?? 0));
  record("bounded memory soak completes without OOM or runtime restart", successfulSessions === sessionCount && successfulCycles === sessionCount * cyclesPerSession && !oomKilled && restartCount === 0, {
    sessionCount,
    cyclesPerSession,
    successfulSessions,
    successfulCycles,
    durationMs: Date.now() - soakStartedAt,
    firstMemoryBytes: firstMemory,
    finalMemoryBytes: finalMemory,
    peakMemoryBytes: peakMemory,
    growthBytes: firstMemory !== null && finalMemory !== null ? finalMemory - firstMemory : null,
    oomKilled,
    restartCount,
  });

  console.log(JSON.stringify({
    startedAt,
    finishedAt: new Date().toISOString(),
    appUrl,
    fixtureUrl,
    containerName,
    resourceContract: { memory: "1536m", memorySwap: "1536m", cpus: 2, hostSocketMounted: false, hostDataMounted: false },
    checks,
    samples,
    fixtureMetrics,
    errors,
  }, null, 2));
};

await run();
