import assert from "node:assert/strict";
import { test } from "node:test";

import { createCookies, expireDateAfter, generateSessionToken, writeSessionTokenCookie } from "./index";
import type { SessionTokenCookieOptions } from "./index";

test("session primitives preserve 48-byte hex tokens, second-based expiry and request-owned cookie effects", () => {
  const token = generateSessionToken();
  assert.match(token, /^[a-f0-9]{96}$/);
  assert.notEqual(token, generateSessionToken());
  const expires = expireDateAfter(600, () => Date.parse("2026-10-10T12:00:00Z"));
  assert.equal(expires.toISOString(), "2026-10-10T12:10:00.000Z");
  const configuration = { prefix: "fixture", useSecureCookies: true };
  assert.deepEqual(createCookies(configuration), {
    sessionToken: { name: "fixture.session-token" },
    csrfToken: { name: "__Host-fixture.csrf-token" },
    callbackUrl: { name: "__Secure-fixture.callback-url" },
    pkceCodeVerifier: { name: "__Secure-fixture.pkce.cooldown" },
    state: { name: "__Secure-fixture.state" },
    nonce: { name: "__Secure-fixture.nonce" },
  });
  assert.equal(createCookies({ prefix: "fixture", useSecureCookies: false }).csrfToken.name, "fixture.csrf-token");
  const first: { name: string; value: string; options: SessionTokenCookieOptions }[] = [];
  const second: typeof first = [];
  writeSessionTokenCookie(
    {
      set(name, value, options) {
        first.push({ name, value, options });
      },
    },
    configuration,
    { sessionToken: "fixture-first", expires },
  );
  writeSessionTokenCookie(
    {
      set(name, value, options) {
        second.push({ name, value, options });
      },
    },
    { prefix: "other-fixture", useSecureCookies: false },
    { sessionToken: "fixture-second", expires },
  );
  assert.deepEqual(first, [
    {
      name: "fixture.session-token",
      value: "fixture-first",
      options: { path: "/", expires, httpOnly: true, sameSite: "lax", secure: true },
    },
  ]);
  assert.deepEqual(second, [
    {
      name: "other-fixture.session-token",
      value: "fixture-second",
      options: { path: "/", expires, httpOnly: true, sameSite: "lax", secure: false },
    },
  ]);
});
