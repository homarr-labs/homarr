import assert from "node:assert/strict";
import test from "node:test";

import { createMemoryStore } from "./adapter.ts";
import { createAuthFetch, createCookieJar, getCsrf, postRequest } from "./auth-fetch.ts";
import type { RequestTrace } from "./auth-fetch.ts";
import { createIdentities, fixture } from "./fixtures.ts";

test("AuthFetch discards request-local cookie effects after a late sign-in failure", async () => {
  const identities = await createIdentities();
  const traces: RequestTrace[] = [];
  const authFetch = createAuthFetch({
    identities,
    store: createMemoryStore(identities.map((identity) => identity.user)),
    mode: { kind: "credentials", strategy: "jwt", providers: ["credentials"] },
    fault: "sign-in-event",
    ldapVerifier: async () => {
      throw new Error("LDAP dispatch unexpected");
    },
    traces,
    trustHost: true,
  });
  const jar = createCookieJar();
  const csrfToken = await getCsrf(authFetch, jar, "late-failure-csrf");
  const response = await authFetch(
    postRequest("callback/credentials", jar, {
      csrfToken,
      name: "alice",
      password: fixture.password,
      callbackUrl: "/after-login",
    }),
    "late-failure-login",
  );
  assert.equal(response.headers.get("location"), `${fixture.origin}/after-login`);
  assert.equal(traces.at(-1)?.errors[0]?.type, "EventError");
  assert.ok(response.headers.getSetCookie().some((cookie) => cookie.startsWith(`${fixture.sessionCookie}=`)));
  assert.equal(
    response.headers.getSetCookie().some((cookie) => cookie.startsWith(`${fixture.themeCookie}=`)),
    false,
  );
});
