// @vitest-environment node

import { Response } from "undici";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { fetchWithTrustedCertificatesAsync } from "@homarr/core/infrastructure/http";

import { PiHoleIntegrationV6 } from "./pi-hole-integration-v6";

const store = vi.hoisted(() => ({ value: null as unknown }));

vi.mock("@homarr/core/infrastructure/http", () => ({
  fetchWithTrustedCertificatesAsync: vi.fn(),
  createAxiosCertificateInstanceAsync: vi.fn(),
  createCertificateAgentAsync: vi.fn(),
}));
vi.mock("@homarr/core/infrastructure/certificates", () => ({
  getTrustedCertificateHostnamesAsync: vi.fn().mockResolvedValue([]),
}));
vi.mock("../../base/session-store", () => ({
  createSessionStore: () => ({
    getAsync: () => Promise.resolve(store.value),
    setAsync: (value: unknown) => {
      store.value = value;
      return Promise.resolve();
    },
    clearAsync: () => {
      store.value = null;
      return Promise.resolve();
    },
  }),
}));

const fetchAsync = vi.mocked(fetchWithTrustedCertificatesAsync);

const createIntegration = () =>
  new PiHoleIntegrationV6({
    id: "pihole-test",
    kind: "piHole",
    name: "Pi-hole",
    url: "http://pi.hole",
    externalUrl: null,
    decryptedSecrets: [{ kind: "apiKey", value: "app-password" }],
  });

const loginResponse = (sid: string) =>
  Response.json({ session: { valid: true, totp: false, sid, validity: 1800, message: "app-password correct" } });
const statusResponse = (sid: string) =>
  Response.json({ session: { valid: true, totp: false, sid, validity: 1800, message: null } });
const unauthorizedResponse = () =>
  Response.json({ session: { valid: false, totp: false, sid: null, validity: -1, message: null } }, { status: 401 });

const isLogin = (init?: { method?: string }) => init?.method === "POST";

beforeEach(() => {
  fetchAsync.mockReset();
  store.value = null;
});

describe("Pi-hole v6 HTTP authentication", () => {
  test("reuses the stored session across calls instead of logging in each time", async () => {
    fetchAsync.mockImplementation((_url, init) =>
      Promise.resolve(isLogin(init) ? loginResponse("sid-1") : statusResponse("sid-1")),
    );

    const first = await createIntegration().getHttpAuthenticationAsync();
    const second = await createIntegration().getHttpAuthenticationAsync();
    const third = await createIntegration().getHttpAuthenticationAsync();

    expect(first.headers).toEqual({ sid: "sid-1" });
    expect(second.headers).toEqual({ sid: "sid-1" });
    expect(third.headers).toEqual({ sid: "sid-1" });
    const logins = fetchAsync.mock.calls.filter(([, init]) => isLogin(init));
    expect(logins).toHaveLength(1);
  });

  test("creates and stores a new session when the stored one was rejected", async () => {
    store.value = { sid: "expired-sid" };
    fetchAsync.mockImplementation((_url, init) => {
      if (isLogin(init)) return Promise.resolve(loginResponse("sid-2"));
      const headers = (init?.headers ?? {}) as Record<string, string | undefined>;
      const sid = headers.sid;
      return Promise.resolve(sid === "sid-2" ? statusResponse("sid-2") : unauthorizedResponse());
    });

    const result = await createIntegration().getHttpAuthenticationAsync();

    expect(result).toEqual({ headers: { sid: "sid-2" }, redactValues: ["sid-2"] });
    expect(store.value).toEqual({ sid: "sid-2" });
    const logins = fetchAsync.mock.calls.filter(([, init]) => isLogin(init));
    expect(logins).toHaveLength(1);
  });
});
