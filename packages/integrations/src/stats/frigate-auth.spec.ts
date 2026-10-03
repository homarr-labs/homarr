// @vitest-environment node

import { inspect } from "node:util";

import { Headers, Response } from "undici";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { fetchWithTrustedCertificatesAsync } from "@homarr/core/infrastructure/http";
import { integrationDefs } from "@homarr/definitions";

import type { IntegrationInput, IntegrationTestingInput } from "../base/integration";
import { frigateStatsProvider } from "./providers/frigate";
import { StatsIntegration } from "./stats-integration";

const logger = vi.hoisted(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() }));

vi.mock("@homarr/core/infrastructure/http", () => ({
  fetchWithTrustedCertificatesAsync: vi.fn(),
  createAxiosCertificateInstanceAsync: vi.fn(),
  createCertificateAgentAsync: vi.fn(),
}));
vi.mock("@homarr/core/infrastructure/certificates", () => ({
  getTrustedCertificateHostnamesAsync: vi.fn().mockResolvedValue([]),
}));
vi.mock("@homarr/core/infrastructure/logs", () => ({
  createLogger: () => logger,
}));

const token = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJhZG1pbiJ9.test_signature";
const credentials = [
  { kind: "username" as const, value: "operator" },
  { kind: "password" as const, value: "private-test-password" },
];
const fetchAsync = vi.mocked(fetchWithTrustedCertificatesAsync);
const createIntegration = (
  decryptedSecrets: IntegrationInput["decryptedSecrets"] = credentials,
  url = "https://frigate.test:8971",
) =>
  new StatsIntegration(
    {
      id: "frigate-test",
      kind: "frigate",
      name: "Frigate",
      url,
      externalUrl: null,
      decryptedSecrets,
    },
    frigateStatsProvider,
  );

const loginResponse = (cookie = `frigate_token=${token}; HttpOnly; Path=/; SameSite=Lax`) =>
  new Response(null, { status: 200, headers: { "set-cookie": cookie } });
const profileResponse = (username = "operator", role = "admin") =>
  Response.json({ username, role, allowed_cameras: [] });
const statsResponse = () => Response.json({ cameras: { front: {} }, service: { uptime: 42, version: "0.18.0" } });

beforeEach(() => fetchAsync.mockReset());

describe("authenticated Frigate", () => {
  test("uses a bodyless cookie login and the same verified session for native stats", async () => {
    fetchAsync
      .mockResolvedValueOnce(loginResponse())
      .mockResolvedValueOnce(profileResponse())
      .mockResolvedValueOnce(statsResponse());
    expect(await createIntegration().getStatsAsync()).toEqual({ cameras: 1, uptime: 42, version: "0.18.0" });
    expect(fetchAsync.mock.calls.map(([url]) => String(url))).toEqual([
      "https://frigate.test:8971/api/login",
      "https://frigate.test:8971/api/profile",
      "https://frigate.test:8971/api/stats",
    ]);
    const login = fetchAsync.mock.calls[0]?.[1];
    expect(login).toMatchObject({
      method: "POST",
      body: JSON.stringify({ user: "operator", password: credentials[1]?.value }),
      redirect: "error",
    });
    expect(new Headers(login?.headers).get("origin")).toBeNull();
    expect(login?.signal).toBeInstanceOf(AbortSignal);
    for (const [, init] of fetchAsync.mock.calls.slice(1)) {
      expect(new Headers(init?.headers).get("authorization")).toBe(`Bearer ${token}`);
      expect(init?.redirect).toBe("error");
    }
  });

  test("supplies verified bearer credentials and explicit token redaction for generic requests", async () => {
    fetchAsync.mockResolvedValueOnce(loginResponse()).mockResolvedValueOnce(profileResponse());
    expect(await createIntegration().getHttpAuthenticationAsync()).toEqual({
      headers: { Authorization: `Bearer ${token}` },
      redactValues: [token],
    });
    expect(fetchAsync).toHaveBeenCalledTimes(2);
  });

  test("uses the injected trusted transport for native connectivity testing", async () => {
    const injectedFetch = vi
      .fn<typeof fetchWithTrustedCertificatesAsync>()
      .mockResolvedValueOnce(loginResponse())
      .mockResolvedValueOnce(profileResponse())
      .mockResolvedValueOnce(statsResponse());
    // Only fetch is used by this provider; the other transports must never be invoked.
    const testing = { fetchAsync: injectedFetch } as unknown as IntegrationTestingInput;
    expect(await createIntegration().getStatsAsync(AbortSignal.timeout(1000), testing)).toMatchObject({ uptime: 42 });
    expect(injectedFetch).toHaveBeenCalledTimes(3);
    expect(fetchAsync).not.toHaveBeenCalled();
  });

  test.each([
    { secrets: [] },
    { secrets: [{ kind: "username" as const, value: "operator" }] },
    {
      secrets: [
        { kind: "username" as const, value: "" },
        { kind: "password" as const, value: "private-test-password" },
      ],
    },
  ])("rejects missing credentials without attempting an unauthenticated request (%j)", async ({ secrets }) => {
    await expect(createIntegration(secrets).getStatsAsync()).rejects.toThrow();
    expect(fetchAsync).not.toHaveBeenCalled();
  });

  test.each([401, 403, 404, 302])("rejects login status %i before profile or stats", async (status) => {
    fetchAsync.mockResolvedValueOnce(new Response("private login error", { status }));
    await expect(createIntegration().getStatsAsync()).rejects.toThrow();
    expect(fetchAsync).toHaveBeenCalledTimes(1);
  });

  test.each(["other_cookie=value", "frigate_token=not-a-jwt", `frigate_token=${"x".repeat(4097)}.b.c`])(
    "rejects missing or invalid cookies",
    async (cookie) => {
      fetchAsync.mockResolvedValueOnce(loginResponse(cookie));
      await expect(createIntegration().getHttpAuthenticationAsync()).rejects.toThrow();
      expect(fetchAsync).toHaveBeenCalledTimes(1);
    },
  );

  test("rejects duplicate session cookies", async () => {
    const headers = new Headers();
    headers.append("set-cookie", `frigate_token=${token}; Path=/`);
    headers.append("set-cookie", `frigate_token=${token}; Path=/api`);
    fetchAsync.mockResolvedValueOnce(new Response(null, { headers }));
    await expect(createIntegration().getStatsAsync()).rejects.toThrow();
    expect(fetchAsync).toHaveBeenCalledTimes(1);
  });

  test.each([
    ["operator", "viewer"],
    ["another-admin", "admin"],
  ])("rejects a profile for %s with role %s before stats", async (username, role) => {
    fetchAsync.mockResolvedValueOnce(loginResponse()).mockResolvedValueOnce(profileResponse(username, role));
    await expect(createIntegration().getStatsAsync()).rejects.toThrow();
    expect(fetchAsync).toHaveBeenCalledTimes(2);
  });

  test("bounds private response headers and discards the login body without parsing it", async () => {
    const response = new Response("not JSON", { headers: { "set-cookie": `other=${"x".repeat(16_384)}` } });
    fetchAsync.mockResolvedValueOnce(response);
    await expect(createIntegration().getHttpAuthenticationAsync()).rejects.toThrow();
    expect(response.body?.locked).toBe(false);
    expect(fetchAsync).toHaveBeenCalledTimes(1);
  });

  test("discards a successful login body without parsing or exposing its contents", async () => {
    const response = new Response(`private body ${"x".repeat(65_536)}`, {
      headers: { "set-cookie": `frigate_token=${token}; Path=/` },
    });
    const parse = vi.spyOn(response, "json");
    if (!response.body) throw new Error("Fixture must have a body");
    const cancel = vi.spyOn(response.body, "cancel");
    fetchAsync.mockResolvedValueOnce(response).mockResolvedValueOnce(profileResponse());
    expect(await createIntegration().getHttpAuthenticationAsync()).toMatchObject({ redactValues: [token] });
    expect(cancel).toHaveBeenCalledOnce();
    expect(parse).not.toHaveBeenCalled();
  });

  test.each(["login", "profile", "stats"])("does not expose transport secrets from %s", async (stage) => {
    if (stage !== "login") fetchAsync.mockResolvedValueOnce(loginResponse());
    if (stage === "stats") fetchAsync.mockResolvedValueOnce(profileResponse());
    fetchAsync.mockRejectedValueOnce(
      new Error(`secret ${credentials[1]?.value} ${token}`, { cause: new Error(token) }),
    );
    const failure: unknown = await createIntegration()
      .getStatsAsync()
      .catch((error: unknown) => error);
    expect(String(failure)).not.toContain(token);
    expect(String(failure)).not.toContain(credentials[1]?.value);
    expect(JSON.stringify(failure)).not.toContain(token);
    expect(JSON.stringify(failure)).not.toContain(credentials[1]?.value);
    expect(inspect(failure, { depth: 10 })).not.toContain(token);
    expect(inspect(failure, { depth: 10 })).not.toContain(credentials[1]?.value);
    expect(inspect(logger.warn.mock.calls, { depth: 10 })).not.toContain(token);
    expect(inspect(logger.warn.mock.calls, { depth: 10 })).not.toContain(credentials[1]?.value);
  });

  test("rejects HTTP integration URLs without transmitting credentials", async () => {
    const integration = createIntegration(credentials, "http://frigate.test:8971");
    await expect(integration.getHttpAuthenticationAsync()).rejects.toThrow();
    await expect(integration.getStatsAsync()).rejects.toThrow();
    expect(fetchAsync).not.toHaveBeenCalled();
  });

  test("requires saved credentials and defaults to the authenticated port", () => {
    expect(integrationDefs.frigate.secretKinds).toEqual([["username", "password"]]);
    expect(integrationDefs.frigate.defaultPort).toBe(8971);
  });
});
