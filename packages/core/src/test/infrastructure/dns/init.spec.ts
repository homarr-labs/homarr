// @vitest-environment node

import dns from "node:dns";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

vi.mock("@homarr/core/infrastructure/logs", () => ({
  createLogger: () => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
}));

const nativeLookup = dns.lookup;
const nativePromiseLookup = dns.promises.lookup;

beforeEach(() => {
  vi.resetModules();
  // Exercise runtime validation, including the default, rather than CI's raw env values.
  vi.stubEnv("CI", "");
  vi.stubEnv("SKIP_ENV_VALIDATION", "");
  vi.stubEnv("npm_lifecycle_event", "test");
  vi.stubEnv("ENABLE_DNS_CACHING", "");
});

afterEach(() => {
  dns.lookup = nativeLookup;
  dns.promises.lookup = nativePromiseLookup;
  delete global.homarr?.dnsCacheManager;
  vi.unstubAllEnvs();
});

test.each([undefined, "false"])(
  "preserves native address-family filtering with DNS caching set to '%s'",
  async (value) => {
    vi.stubEnv("ENABLE_DNS_CACHING", value);
    await import("@homarr/core/infrastructure/dns/init");
    const options = { family: 4, all: true } as const;
    const expected = await nativePromiseLookup("localhost", options);
    const addresses = await dns.promises.lookup("localhost", options);
    expect(addresses).toEqual(expected);
    expect(addresses.every(({ family }) => family === 4)).toBe(true);

    const callbackAddresses = await new Promise<dns.LookupAddress[]>((resolve, reject) => {
      dns.lookup("localhost", options, (error, result) => {
        if (error) reject(error);
        else resolve(result);
      });
    });
    expect(callbackAddresses).toEqual(expected);
  },
);

test("still enables DNS caching when explicitly requested", async () => {
  vi.stubEnv("ENABLE_DNS_CACHING", "true");
  await import("@homarr/core/infrastructure/dns/init");
  expect(dns.lookup).not.toBe(nativeLookup);
  expect(dns.promises.lookup).not.toBe(nativePromiseLookup);
  expect(await dns.promises.lookup("localhost")).toEqual({ address: "127.0.0.1", family: 4 });
});
