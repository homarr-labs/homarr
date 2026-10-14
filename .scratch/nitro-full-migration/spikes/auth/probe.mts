import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";

import { createMemoryStore } from "./adapter.ts";
import { createAuthFetch, createCookieJar, getCsrf, postRequest } from "./auth-fetch.ts";
import type { AuthFetch, CookieJar, ProbeFault, ProbeMode, RequestTrace } from "./auth-fetch.ts";
import { createIdentities, fixture } from "./fixtures.ts";

const require = createRequire(import.meta.url);
const versions: Record<string, unknown> = { node: process.version, platform: process.platform, arch: process.arch };
const sourceSha256: Record<string, string> = {};
for (const path of [
  "index.js",
  "lib/utils/assert.js",
  "lib/init.js",
  "lib/actions/callback/index.js",
  "lib/actions/session.js",
  "lib/actions/signout.js",
  "lib/utils/web.js",
]) {
  const bytes = await readFile(new URL(`../../../../node_modules/@auth/core/${path}`, import.meta.url));
  sourceSha256[path] = createHash("sha256").update(bytes).digest("hex");
}
for (const name of ["@auth/core", "@auth/drizzle-adapter", "bcrypt", "ldapts"]) {
  const path = new URL(`../../../../node_modules/${name}/package.json`, import.meta.url);
  const value: unknown = JSON.parse(await readFile(path, "utf8"));
  assert.ok(value && typeof value === "object" && "version" in value);
  versions[name] = { version: value.version, resolved: require.resolve(name) };
}

const identities = await createIdentities();
const store = createMemoryStore(identities.map((identity) => identity.user));
const traces: RequestTrace[] = [];
const ldapCalls: { name: unknown; requestUrl: string; method: string }[] = [];
const observations: Record<string, unknown> = {};
const harness = (
  mode: ProbeMode,
  fault: ProbeFault = "none",
  trustHost = true,
  beforeAuthorize?: () => Promise<void>,
) =>
  createAuthFetch({
    identities,
    store,
    traces,
    mode,
    fault,
    trustHost,
    beforeAuthorize,
    async ldapVerifier(input, request) {
      ldapCalls.push({ name: input.name, requestUrl: request.url, method: request.method });
      if (input.name !== "directory-alice" || input.password !== fixture.password) return null;
      const identity = identities.find((candidate) => candidate.user.id === "ldap-a");
      assert.ok(identity);
      return { ...identity.user };
    },
  });

async function snapshot(response: Response) {
  const text = await response.text();
  let body: unknown = text;
  try {
    body = JSON.parse(text);
  } catch {}
  return {
    status: response.status,
    location: response.headers.get("location"),
    setCookies: response.headers.getSetCookie(),
    cacheControl: response.headers.get("cache-control"),
    body,
  };
}

async function login(
  authFetch: AuthFetch,
  id: string,
  name: string,
  password: string,
  provider = "credentials",
  existingJar?: CookieJar,
) {
  const jar = existingJar ?? createCookieJar();
  const csrfToken = await getCsrf(authFetch, jar, `${id}:csrf`);
  const response = await authFetch(
    postRequest(`callback/${provider}`, jar, { name, password, csrfToken, callbackUrl: "/after-login" }),
    id,
  );
  jar.absorb(response);
  return { response, jar };
}

async function session(authFetch: AuthFetch, jar: CookieJar, id: string) {
  return authFetch(
    new Request(`${fixture.origin}${fixture.basePath}/session`, { headers: { cookie: jar.header() } }),
    id,
  );
}

function requestTrace(id: string) {
  const trace = traces.find((candidate) => candidate.requestId === id);
  assert.ok(trace);
  return trace;
}

function jarFor(token: string) {
  const jar = createCookieJar();
  jar.set(fixture.sessionCookie, token);
  return jar;
}

async function databaseProbe() {
  const authFetch = harness({ kind: "database-reader" });
  const seed = store.forRequest("fixture-seed");
  assert.ok(seed.createSession);
  const seededAt = Date.now();
  const entries = [
    { sessionToken: "disposable-alice-fresh", userId: "local-a", expires: new Date(seededAt + 590_000) },
    { sessionToken: "disposable-bob-due", userId: "local-b", expires: new Date(seededAt + 100_000) },
    { sessionToken: "disposable-expired", userId: "local-a", expires: new Date(seededAt - 60_000) },
    { sessionToken: "disposable-late-event", userId: "local-a", expires: new Date(seededAt + 100_000) },
    { sessionToken: "disposable-late-callback", userId: "local-b", expires: new Date(seededAt + 100_000) },
  ];
  for (const entry of entries) await seed.createSession(entry);
  const concurrent = await Promise.all(
    entries.slice(0, 2).map(async (entry, index) => {
      const response = await session(authFetch, jarFor(entry.sessionToken), `db-concurrent-${index}`);
      const observed = await snapshot(response);
      const body = observed.body;
      assert.ok(
        body &&
          typeof body === "object" &&
          "user" in body &&
          body.user &&
          typeof body.user === "object" &&
          "id" in body.user,
      );
      assert.equal(body.user.id, entry.userId);
      assert.equal(observed.cacheControl, "private, no-cache, no-store");
      assert.equal(observed.setCookies.filter((cookie) => cookie.startsWith(`${fixture.sessionCookie}=`)).length, 1);
      assert.ok(
        observed.setCookies.some((cookie) => cookie.startsWith(`${fixture.sessionCookie}=${entry.sessionToken};`)),
      );
      return observed;
    }),
  );
  assert.equal(
    store.calls.filter((call) => call.requestId === "db-concurrent-0" && call.method === "updateSession").length,
    0,
  );
  assert.equal(
    store.calls.filter((call) => call.requestId === "db-concurrent-1" && call.method === "updateSession").length,
    1,
  );
  assert.ok((store.sessions.get("disposable-bob-due")?.expires.valueOf() ?? 0) > seededAt + 590_000);
  observations.concurrentDatabaseReads = concurrent;
  const renewed = concurrent[1]?.body;
  assert.ok(renewed && typeof renewed === "object" && "expires" in renewed);
  assert.equal(renewed.expires, entries[1]?.expires.toISOString());
  observations.renewalProjection = {
    returnedExpiry: renewed.expires,
    persistedExpiry: store.sessions.get("disposable-bob-due")?.expires.toISOString(),
    returnedProjectionUsesPreUpdateRow: true,
  };

  const expired = await snapshot(await session(authFetch, jarFor("disposable-expired"), "db-expired"));
  assert.equal(expired.body, null);
  assert.equal(store.sessions.has("disposable-expired"), false);
  assert.ok(
    expired.setCookies.some((cookie) => cookie.startsWith(`${fixture.sessionCookie}=`) && cookie.includes("Max-Age=0")),
  );
  observations.expired = expired;

  const unknown = await snapshot(await session(authFetch, jarFor("disposable-missing"), "db-missing"));
  assert.equal(unknown.body, null);
  assert.ok(unknown.setCookies.some((cookie) => cookie.includes("Max-Age=0")));
  observations.missing = unknown;

  const lateEvent = await snapshot(
    await session(
      harness({ kind: "database-reader" }, "session-event"),
      jarFor("disposable-late-event"),
      "db-late-event",
    ),
  );
  assert.ok(lateEvent.body);
  assert.equal(requestTrace("db-late-event").errors[0]?.type, "EventError");
  assert.ok(
    lateEvent.setCookies.some((cookie) => cookie.startsWith(`${fixture.sessionCookie}=disposable-late-event;`)),
  );
  assert.ok((store.sessions.get("disposable-late-event")?.expires.valueOf() ?? 0) > seededAt + 590_000);
  observations.lateSessionEvent = lateEvent;

  const lateCallback = await snapshot(
    await session(
      harness({ kind: "database-reader" }, "session-callback"),
      jarFor("disposable-late-callback"),
      "db-late-callback",
    ),
  );
  assert.equal(lateCallback.body, null);
  assert.equal(requestTrace("db-late-callback").errors[0]?.type, "SessionTokenError");
  assert.equal(
    lateCallback.setCookies.some((cookie) => cookie.startsWith(`${fixture.sessionCookie}=`)),
    false,
  );
  assert.ok((store.sessions.get("disposable-late-callback")?.expires.valueOf() ?? 0) > seededAt + 590_000);
  observations.lateSessionCallback = lateCallback;

  const logoutJar = jarFor("disposable-alice-fresh");
  const csrfToken = await getCsrf(authFetch, logoutJar, "db-signout:csrf");
  const logout = await snapshot(
    await authFetch(postRequest("signout", logoutJar, { csrfToken, callbackUrl: "/signed-out" }), "db-signout"),
  );
  assert.equal(logout.location, `${fixture.origin}/signed-out`);
  assert.equal(store.sessions.has("disposable-alice-fresh"), false);
  assert.ok(
    logout.setCookies.some((cookie) => cookie.startsWith(`${fixture.sessionCookie}=`) && cookie.includes("Max-Age=0")),
  );
  const revoked = await snapshot(await session(authFetch, jarFor("disposable-alice-fresh"), "db-revoked"));
  assert.equal(revoked.body, null);
  observations.signout = { logout, revoked };

  const failingLogout = harness({ kind: "database-reader" }, "signout-event");
  const failingJar = jarFor("disposable-bob-due");
  const failingCsrf = await getCsrf(failingLogout, failingJar, "db-signout-event:csrf");
  const failingResponse = await snapshot(
    await failingLogout(
      postRequest("signout", failingJar, { csrfToken: failingCsrf, callbackUrl: "/signed-out" }),
      "db-signout-event",
    ),
  );
  assert.equal(store.sessions.has("disposable-bob-due"), false);
  assert.equal(requestTrace("db-signout-event").errors[0]?.type, "EventError");
  assert.ok(failingResponse.setCookies.some((cookie) => cookie.includes("Max-Age=0")));
  observations.lateSignoutEvent = failingResponse;

  const rejected = await snapshot(
    await authFetch(
      postRequest("session", createCookieJar(), { csrfToken: "invalid-fixture-csrf" }),
      "db-session-csrf-denied",
    ),
  );
  assert.equal(rejected.status, 400);
  assert.equal(rejected.body, null);
  assert.equal(requestTrace("db-session-csrf-denied").errors[0]?.type, "MissingCSRF");
  observations.sessionCsrfDenied = rejected;
}

async function credentialsProbe() {
  const nativeDatabase = harness({ kind: "credentials", strategy: "database", providers: ["credentials", "ldap"] });
  const failedCsrf = await snapshot(
    await nativeDatabase(new Request(`${fixture.origin}${fixture.basePath}/csrf`), "database-credentials-csrf"),
  );
  assert.equal(failedCsrf.status, 500);
  assert.equal(requestTrace("database-credentials-csrf").errors[0]?.type, "UnsupportedStrategy");
  observations.nativeDatabaseCsrf = failedCsrf;
  const jwt = harness({ kind: "credentials", strategy: "jwt", providers: ["credentials", "ldap"] });
  const jar = createCookieJar();
  const csrfToken = await getCsrf(jwt, jar, "diagnostic-csrf-for-database-probes");
  for (const [id, name, password, provider] of [
    ["db-valid-credentials", "alice", fixture.password, "credentials"],
    ["db-invalid-credentials", "alice", "wrong", "credentials"],
    ["db-injected-ldap", "directory-alice", fixture.password, "ldap"],
  ]) {
    assert.ok(id && name && password && provider);
    const response = await snapshot(
      await nativeDatabase(postRequest(`callback/${provider}`, jar, { name, password, csrfToken }), id),
    );
    assert.equal(response.status, 500);
    assert.deepEqual(response.setCookies, []);
    assert.deepEqual(requestTrace(id).steps, []);
    assert.equal(requestTrace(id).errors[0]?.type, "UnsupportedStrategy");
    observations[id] = response;
  }
  assert.equal(ldapCalls.length, 0);
  assert.equal(store.calls.length, 0);

  for (const [id, name, password] of [
    ["jwt-wrong-password", "alice", "wrong"],
    ["jwt-missing-user", "nobody", fixture.password],
    ["jwt-wrong-provider", "directory-alice", fixture.password],
    ["jwt-empty-input", "", ""],
  ]) {
    assert.ok(id && name !== undefined && password !== undefined);
    const result = await login(jwt, id, name, password);
    const observed = await snapshot(result.response);
    assert.equal(observed.location, `${fixture.origin}/auth/login?error=CredentialsSignin&code=credentials`);
    assert.equal(requestTrace(id).errors[0]?.type, "CredentialsSignin");
    assert.equal(result.jar.get(fixture.sessionCookie), undefined);
    observations[id] = observed;
  }

  const valid = await login(jwt, "jwt-valid", "ALICE", fixture.password);
  const validSnapshot = await snapshot(valid.response);
  assert.equal(validSnapshot.location, `${fixture.origin}/after-login`);
  assert.ok(
    validSnapshot.setCookies.some(
      (cookie) =>
        cookie.startsWith(`${fixture.sessionCookie}=`) &&
        cookie.includes("HttpOnly") &&
        cookie.includes("Secure") &&
        cookie.includes("SameSite=Lax"),
    ),
  );
  assert.equal(validSnapshot.setCookies.filter((cookie) => cookie.startsWith(`${fixture.sessionCookie}=`)).length, 1);
  assert.equal(valid.jar.get(fixture.themeCookie), "local-a");
  const validSession = await snapshot(await session(jwt, valid.jar, "jwt-valid-session"));
  assert.ok(
    validSession.body &&
      typeof validSession.body === "object" &&
      "user" in validSession.body &&
      validSession.body.user &&
      typeof validSession.body.user === "object" &&
      "id" in validSession.body.user,
  );
  assert.equal(validSession.body.user.id, "local-a");
  observations.jwtValid = { login: validSnapshot, session: validSession };
  const jsonJar = createCookieJar();
  const jsonCsrf = await getCsrf(jwt, jsonJar, "jwt-json-redirect:csrf");
  const jsonRequest = postRequest("callback/credentials", jsonJar, {
    name: "alice",
    password: fixture.password,
    csrfToken: jsonCsrf,
    callbackUrl: "/after-login",
  });
  jsonRequest.headers.set("X-Auth-Return-Redirect", "1");
  const jsonRedirect = await snapshot(await jwt(jsonRequest, "jwt-json-redirect"));
  assert.equal(jsonRedirect.status, 200);
  assert.deepEqual(jsonRedirect.body, { url: `${fixture.origin}/after-login` });
  assert.equal(jsonRedirect.location, `${fixture.origin}/after-login`);
  assert.equal(jsonRedirect.setCookies.length, 3);
  observations.jsonRedirectTransport = jsonRedirect;

  const ldap = await login(jwt, "jwt-ldap-dispatch", "directory-alice", fixture.password, "ldap");
  const ldapSnapshot = await snapshot(ldap.response);
  assert.equal(ldapSnapshot.location, `${fixture.origin}/after-login`);
  assert.equal(ldap.jar.get(fixture.themeCookie), "ldap-a");
  observations.injectedLdapDispatch = ldapSnapshot;
  const invalidLdap = await login(jwt, "jwt-ldap-invalid", "directory-alice", "wrong", "ldap");
  const invalidLdapSnapshot = await snapshot(invalidLdap.response);
  assert.equal(invalidLdapSnapshot.location, `${fixture.origin}/auth/login?error=CredentialsSignin&code=credentials`);
  observations.injectedLdapInvalid = invalidLdapSnapshot;

  const callbackJar = createCookieJar();
  const badCsrf = await snapshot(
    await jwt(
      postRequest("callback/credentials", callbackJar, {
        name: "alice",
        password: fixture.password,
        csrfToken: "invalid-fixture-csrf",
      }),
      "jwt-csrf-denied",
    ),
  );
  assert.equal(badCsrf.location, `${fixture.origin}/auth/login?error=MissingCSRF`);
  assert.deepEqual(requestTrace("jwt-csrf-denied").steps, []);
  observations.credentialsCsrfDenied = badCsrf;

  const lateEvent = await login(
    harness({ kind: "credentials", strategy: "jwt", providers: ["credentials"] }, "sign-in-event"),
    "jwt-late-event",
    "bob",
    fixture.password,
  );
  const lateEventSnapshot = await snapshot(lateEvent.response);
  assert.equal(lateEventSnapshot.location, `${fixture.origin}/after-login`);
  assert.equal(requestTrace("jwt-late-event").errors[0]?.type, "EventError");
  assert.ok(lateEvent.jar.get(fixture.sessionCookie));
  assert.equal(lateEvent.jar.get(fixture.themeCookie), undefined);
  const lateEventSession = await snapshot(await session(jwt, lateEvent.jar, "jwt-late-event-session"));
  assert.ok(lateEventSession.body);
  observations.lateSignInEvent = {
    login: lateEventSnapshot,
    session: lateEventSession,
    authenticationRolledBack: false,
    customThemeEffectDiscarded: true,
  };

  const lateEncode = await login(
    harness({ kind: "credentials", strategy: "jwt", providers: ["credentials"] }, "jwt-encode"),
    "jwt-late-encode",
    "alice",
    fixture.password,
  );
  const lateEncodeSnapshot = await snapshot(lateEncode.response);
  assert.equal(lateEncodeSnapshot.location, `${fixture.origin}/auth/login?error=Configuration`);
  assert.equal(requestTrace("jwt-late-encode").errors[0]?.type, "CallbackRouteError");
  assert.equal(lateEncode.jar.get(fixture.sessionCookie), undefined);
  assert.deepEqual(lateEncodeSnapshot.setCookies, []);
  observations.lateJwtEncode = lateEncodeSnapshot;

  const priorToken = valid.jar.get(fixture.sessionCookie);
  const failedReplacement = await login(
    harness({ kind: "credentials", strategy: "jwt", providers: ["credentials"] }, "jwt-encode"),
    "jwt-late-encode-existing",
    "bob",
    fixture.password,
    "credentials",
    valid.jar,
  );
  const failedReplacementSnapshot = await snapshot(failedReplacement.response);
  assert.deepEqual(failedReplacementSnapshot.setCookies, []);
  assert.equal(failedReplacement.jar.get(fixture.sessionCookie), priorToken);
  observations.lateEncodeExistingSession = { response: failedReplacementSnapshot, existingSessionRetained: true };

  let arrived = 0;
  const { promise: barrier, resolve: release } = Promise.withResolvers<void>();
  const parallel = harness(
    { kind: "credentials", strategy: "jwt", providers: ["credentials", "ldap"] },
    "none",
    true,
    async () => {
      arrived += 1;
      if (arrived === 8) release();
      await barrier;
    },
  );
  const simultaneous = await Promise.all(
    Array.from({ length: 8 }, async (_, index) => {
      const provider = index === 7 ? "ldap" : "credentials";
      const name = provider === "ldap" ? "directory-alice" : index % 2 === 0 ? "alice" : "bob";
      const expectedId = provider === "ldap" ? "ldap-a" : index % 2 === 0 ? "local-a" : "local-b";
      const result = await login(parallel, `parallel-${index}`, name, fixture.password, provider);
      assert.equal(result.jar.get(fixture.themeCookie), expectedId);
      const token = result.jar.get(fixture.sessionCookie);
      assert.ok(token);
      const response = await session(jwt, result.jar, `parallel-session-${index}`);
      const observed = await snapshot(response);
      assert.ok(
        observed.body &&
          typeof observed.body === "object" &&
          "user" in observed.body &&
          observed.body.user &&
          typeof observed.body.user === "object" &&
          "id" in observed.body.user,
      );
      assert.equal(observed.body.user.id, expectedId);
      return {
        requestId: `parallel-${index}`,
        expectedId,
        token,
        login: await snapshot(result.response),
        session: observed,
      };
    }),
  );
  assert.equal(new Set(simultaneous.map((result) => result.token)).size, 8);
  assert.equal(arrived, 8);
  observations.concurrentJwtLogins = simultaneous;

  const untrusted = await snapshot(
    await harness(
      { kind: "credentials", strategy: "jwt", providers: ["credentials"] },
      "none",
      false,
    )(new Request(`${fixture.origin}${fixture.basePath}/session`), "untrusted-host"),
  );
  assert.equal(untrusted.status, 500);
  assert.equal(requestTrace("untrusted-host").errors[0]?.type, "UntrustedHost");
  observations.untrustedHost = untrusted;

  assert.equal(store.calls.length, 0);
  assert.equal(store.sessions.size, 0);
  observations.nativeJwtAdapterSessionWrites = 0;
}

async function contaminationProbe() {
  const reader = harness({ kind: "database-reader" });
  const before = await snapshot(
    await reader(new Request(`${fixture.origin}${fixture.basePath}/session`), "before-credentials"),
  );
  assert.equal(before.status, 200);
  await harness({ kind: "credentials", strategy: "jwt", providers: ["credentials"] })(
    new Request(`${fixture.origin}${fixture.basePath}/providers`),
    "register-credentials",
  );
  const after = await snapshot(
    await reader(new Request(`${fixture.origin}${fixture.basePath}/session`), "after-credentials"),
  );
  assert.equal(after.status, 500);
  assert.equal(requestTrace("after-credentials").errors[0]?.type, "UnsupportedStrategy");
  observations.providerlessReaderModuleState = { before, after };
}

const mode = process.argv[2];
if (mode === "database") await databaseProbe();
else if (mode === "credentials") await credentialsProbe();
else if (mode === "contamination") await contaminationProbe();
else throw new Error("Choose database, credentials or contamination; each runs in its own fresh Node process");

console.log(
  JSON.stringify(
    {
      verdict: mode === "credentials" ? "native-credentials-database-disproved" : "diagnostic-only",
      mode,
      versions,
      sourceSha256,
      fixture: {
        origin: fixture.origin,
        basePath: fixture.basePath,
        maxAge: fixture.maxAge,
        updateAge: fixture.updateAge,
        secureCookies: true,
        bcryptCost: 10,
      },
      observations,
      traces,
      adapterCalls: store.calls,
      ldapDispatchCalls: ldapCalls,
      remainingDisposableSessions: [...store.sessions.values()],
      limits: [
        "No production persistence proof",
        "No real LDAP login or role policy",
        "No production JWT approval",
        "No placeholder or provider-type assertion bypass",
        "No native database credentials session creation reached",
      ],
    },
    null,
    2,
  ),
);
