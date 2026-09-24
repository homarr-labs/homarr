import { fixtures } from "./fixtures.mjs";

const appUrl = process.env.HOMARR_URL ?? "http://127.0.0.1:47577";
const fixtureUrl = process.env.FIXTURE_URL ?? "http://127.0.0.1:38041";
const checks = [];

const record = (name, passed, details) => {
  checks.push({ name, passed, details });
  if (!passed) throw new Error(`${name}: ${details}`);
};

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
  const { csrfToken } = await csrfResponse.json();
  record("demo CSRF endpoint responds", csrfResponse.ok && typeof csrfToken === "string", `status=${csrfResponse.status}`);

  const loginResponse = await fetch(`${appUrl}/api/auth/callback/credentials`, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      cookie: toCookieHeader(csrfCookies),
    },
    body: new URLSearchParams({
      csrfToken,
      name: "demo",
      password: "demo",
      callbackUrl: `${appUrl}/`,
      json: "true",
    }),
    redirect: "manual",
  });
  const sessionCookies = [...csrfCookies, ...getSetCookies(loginResponse)];
  const cookie = toCookieHeader(sessionCookies);
  record("demo credentials login redirects successfully", loginResponse.status === 302 && cookie.includes("session-token="), `status=${loginResponse.status}`);
  return cookie;
};

const trpc = async (cookie, path, input, method = "GET") => {
  const batchInput = encodeURIComponent(JSON.stringify({ 0: { json: input } }));
  const url = `${appUrl}/api/trpc/${path}?batch=1&input=${batchInput}`;
  const response = await fetch(url, {
    method,
    headers: {
      cookie,
      ...(method === "POST" ? { "content-type": "application/json" } : {}),
    },
    ...(method === "POST" ? { body: JSON.stringify({ 0: { json: input } }) } : {}),
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(`${path} status=${response.status} payload=${JSON.stringify(payload)}`);
  const item = Array.isArray(payload) ? payload[0] : payload;
  if (item?.error) throw new Error(`${path} error=${JSON.stringify(item.error)}`);
  return item?.result?.data?.json;
};

const createIntegration = async (cookie, input) => {
  const result = await trpc(cookie, "integration.create", input, "POST");
  record(`${input.kind} fixture integration created`, Boolean(result?.integration?.id), JSON.stringify(result));
  return result.integration.id;
};

const run = async () => {
  const cookie = await login();
  if (process.argv.includes("--cleanup")) {
    const integrations = await trpc(cookie, "integration.all", null);
    const fixtureIntegrations = integrations.filter(({ name }) => name.includes("fixture runtime"));
    for (const integration of fixtureIntegrations) {
      await trpc(cookie, "integration.delete", { id: integration.id }, "POST");
    }
    console.log(JSON.stringify({ cleaned: fixtureIntegrations.map(({ id, name }) => ({ id, name })) }, null, 2));
    return;
  }
  const kinds = await trpc(cookie, "integration.getKinds", null);
  record("runtime exposes WUD, Immich, and Unraid integration kinds", ["wud", "immich", "unraid"].every((kind) => kinds.some((entry) => entry.kind === kind)), "getKinds");

  const wudId = await createIntegration(cookie, {
    name: "WUD fixture runtime",
    url: `${fixtureUrl}/wud`,
    kind: "wud",
    secrets: [
      { kind: "username", value: fixtures.wud.username },
      { kind: "password", value: fixtures.wud.password },
    ],
    attemptSearchEngineCreation: false,
  });
  const wudStats = await trpc(cookie, "widget.wud.getStats", { integrationId: wudId });
  record("runtime WUD widget fetch returns fixture counts", wudStats?.stats?.totalContainers === 2 && wudStats.stats.updatesAvailable === 1, JSON.stringify(wudStats));

  const immichId = await createIntegration(cookie, {
    name: "Immich fixture runtime",
    url: `${fixtureUrl}/immich`,
    kind: "immich",
    secrets: [{ kind: "apiKey", value: fixtures.immich.apiKey }],
    attemptSearchEngineCreation: false,
  });
  const immichAlbums = await trpc(cookie, "widget.immich.getAlbums", { integrationId: immichId, limit: 10 });
  record("runtime Immich album fetch returns both fixture albums", immichAlbums?.length === 2, JSON.stringify(immichAlbums));
  const immichStats = await trpc(cookie, "widget.immich.getServerStats", { integrationId: immichId });
  record("runtime Immich server stats fetch preserves API-key access", immichStats?.photoCount === 12 && immichStats.userCount === 1, JSON.stringify(immichStats));

  const unraidId = await createIntegration(cookie, {
    name: "Unraid fixture runtime",
    url: `${fixtureUrl}/unraid`,
    kind: "unraid",
    secrets: [{ kind: "apiKey", value: fixtures.unraid.apiKey }],
    attemptSearchEngineCreation: false,
  });
  const unraidHealth = await trpc(cookie, "widget.healthMonitoring.getSystemHealthStatus", { integrationIds: [unraidId] });
  const healthInfo = unraidHealth?.[0]?.healthInfo;
  record(
    "runtime Unraid health request reaches fixture GraphQL",
    healthInfo !== null && healthInfo !== undefined,
    JSON.stringify(unraidHealth),
  );

  const integrations = await trpc(cookie, "integration.all", null);
  record("runtime integration list includes all three fixture integrations", [wudId, immichId, unraidId].every((id) => integrations.some((entry) => entry.id === id)), "integration.all");

  console.log(JSON.stringify({ appUrl, fixtureUrl, checks, passed: checks.filter(({ passed }) => passed).length }, null, 2));
};

await run();
