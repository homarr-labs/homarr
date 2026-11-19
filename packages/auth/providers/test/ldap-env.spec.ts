import { afterEach, beforeEach, expect, test, vi } from "vitest";

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv("CI", undefined);
  vi.stubEnv("SKIP_ENV_VALIDATION", undefined);
  vi.stubEnv("NODE_ENV", "development");
  vi.stubEnv("AUTH_PROVIDERS", "ldap");
  vi.stubEnv("AUTH_LDAP_URI", "ldap://127.0.0.1:389");
  vi.stubEnv("AUTH_LDAP_BASE", "dc=example,dc=com");
  vi.stubEnv("AUTH_LDAP_BIND_DN", undefined);
  vi.stubEnv("AUTH_LDAP_BIND_PASSWORD", undefined);
});

afterEach(() => vi.unstubAllEnvs());

test.each([undefined, ""])(
  "loads LDAP configuration with absent or empty service bind credentials: %s",
  async (value) => {
    vi.stubEnv("AUTH_LDAP_BIND_DN", value);
    vi.stubEnv("AUTH_LDAP_BIND_PASSWORD", value);
    const { env } = await import("@homarr/auth/env");

    expect(env.AUTH_PROVIDERS).toEqual(["ldap"]);
  },
);

test.each([
  ["AUTH_LDAP_BIND_DN", "uid=service,dc=example,dc=com"],
  ["AUTH_LDAP_BIND_PASSWORD", "fixture-service-password"],
])("rejects an incomplete service bind when only %s is configured", async (name, value) => {
  vi.stubEnv(name, value);

  await expect(import("@homarr/auth/env")).rejects.toThrow(/AUTH_LDAP_BIND_DN.*AUTH_LDAP_BIND_PASSWORD/);
});
