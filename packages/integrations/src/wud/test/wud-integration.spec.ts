// @vitest-environment node
import { ParseError } from "@homarr/common/server";
import { Response } from "undici";
import { beforeEach, describe, expect, test, vi } from "vitest";

vi.hoisted(() => {
  process.env.SKIP_ENV_VALIDATION = "true";
  process.env.SECRET_ENCRYPTION_KEY = "ff3f4f7ce30e870c9630de9e5d244ffa81101a24ed0dfe5f064beb53a7e684f1";
});

import { fetchWithTrustedCertificatesAsync } from "@homarr/core/infrastructure/http";

import type { IntegrationTestingInput } from "../../base/integration";
import { IntegrationParseError } from "../../base/errors/parse/integration-parse-error";
import type { IntegrationSecret } from "../../base/types";
import { WudIntegration } from "../wud-integration";

vi.mock("@homarr/core/infrastructure/http", () => ({
  fetchWithTrustedCertificatesAsync: vi.fn(),
}));

const TEST_URL = "https://wud.example.com";
const TEST_USERNAME = "user";
const TEST_PASSWORD = "p@ss";

const mockFetch = vi.mocked(fetchWithTrustedCertificatesAsync);

const sampleContainersResponse = [
  {
    id: "1",
    name: "homeassistant",
    displayName: "Home Assistant",
    updateAvailable: true,
    link: "https://github.com/home-assistant/core/releases/tag/2024.1.0",
    image: { tag: { value: "2023.12.0" } },
    updateKind: { remoteValue: "2024.1.0" },
  },
  { id: "2", name: "traefik", updateAvailable: false },
  {
    id: "3",
    name: "grafana",
    updateAvailable: true,
    image: { tag: { value: "10.0.0" } },
    result: { tag: "10.1.0" },
  },
];

const sampleUpdates = [
  {
    id: "1",
    name: "Home Assistant",
    currentVersion: "2023.12.0",
    newVersion: "2024.1.0",
    link: "https://github.com/home-assistant/core/releases/tag/2024.1.0",
  },
  {
    id: "3",
    name: "grafana",
    currentVersion: "10.0.0",
    newVersion: "10.1.0",
    link: null,
  },
];

const createIntegration = (decryptedSecrets: IntegrationSecret[] = []) =>
  new WudIntegration({
    id: "test-wud",
    name: "Test WUD",
    url: TEST_URL,
    externalUrl: null,
    decryptedSecrets,
  });

const createIntegrationWithBasicAuth = () =>
  createIntegration([
    { kind: "username", value: TEST_USERNAME },
    { kind: "password", value: TEST_PASSWORD },
  ]);

beforeEach(() => {
  mockFetch.mockReset();
});

describe("WudIntegration getStatsAsync", () => {
  test("computes total and available-update counts from the containers list", async () => {
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify(sampleContainersResponse), {
        status: 200,
        headers: { "content-type": "application/json" },
      }) as unknown as Awaited<ReturnType<typeof fetchWithTrustedCertificatesAsync>>,
    );

    const stats = await createIntegration().getStatsAsync();

    expect(stats).toStrictEqual({ totalContainers: 3, updatesAvailable: 2, updates: sampleUpdates });
  });

  test("returns zero counts for an empty containers list", async () => {
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify([]), {
        status: 200,
        headers: { "content-type": "application/json" },
      }) as unknown as Awaited<ReturnType<typeof fetchWithTrustedCertificatesAsync>>,
    );

    const stats = await createIntegration().getStatsAsync();

    expect(stats).toStrictEqual({ totalContainers: 0, updatesAvailable: 0, updates: [] });
  });

  test("maps container updates using displayName, falling back to result.tag and null link", async () => {
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify(sampleContainersResponse), {
        status: 200,
        headers: { "content-type": "application/json" },
      }) as unknown as Awaited<ReturnType<typeof fetchWithTrustedCertificatesAsync>>,
    );

    const stats = await createIntegration().getStatsAsync();

    expect(stats.updates).toStrictEqual(sampleUpdates);
  });

  test("throws ParseError when API response is not valid JSON", async () => {
    mockFetch.mockResolvedValue(
      new Response("not-json", {
        status: 200,
        headers: { "content-type": "application/json" },
      }) as unknown as Awaited<ReturnType<typeof fetchWithTrustedCertificatesAsync>>,
    );

    await expect(createIntegration().getStatsAsync()).rejects.toSatisfy((error) => {
      if (!(error instanceof IntegrationParseError)) return false;

      const cause = error.cause;
      return cause instanceof ParseError && cause.message.includes("Invalid WUD containers response");
    });
  });

  test("throws ParseError when API response does not match schema", async () => {
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ invalid: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }) as unknown as Awaited<ReturnType<typeof fetchWithTrustedCertificatesAsync>>,
    );

    await expect(createIntegration().getStatsAsync()).rejects.toSatisfy((error) => {
      if (!(error instanceof IntegrationParseError)) return false;

      const cause = error.cause;
      return cause instanceof ParseError && cause.message.includes("Invalid WUD containers response");
    });
  });

  test("throws when API returns an error", async () => {
    mockFetch.mockResolvedValue(
      new Response("Unauthorized", {
        status: 401,
        headers: { "content-type": "text/plain" },
      }) as unknown as Awaited<ReturnType<typeof fetchWithTrustedCertificatesAsync>>,
    );

    await expect(createIntegration().getStatsAsync()).rejects.toThrow();
  });
});

describe("WudIntegration authentication", () => {
  test("sends no Authorization header when no credentials are configured", async () => {
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify(sampleContainersResponse), {
        status: 200,
        headers: { "content-type": "application/json" },
      }) as unknown as Awaited<ReturnType<typeof fetchWithTrustedCertificatesAsync>>,
    );

    await createIntegration().getStatsAsync();

    const [, requestInit] = mockFetch.mock.calls[0] ?? [];
    const headers = (requestInit?.headers ?? {}) as Record<string, string>;
    expect(headers.Authorization).toBeUndefined();
  });

  test("sends a Basic auth header when username and password are configured", async () => {
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify(sampleContainersResponse), {
        status: 200,
        headers: { "content-type": "application/json" },
      }) as unknown as Awaited<ReturnType<typeof fetchWithTrustedCertificatesAsync>>,
    );

    await createIntegrationWithBasicAuth().getStatsAsync();

    const expected = `Basic ${Buffer.from(`${TEST_USERNAME}:${TEST_PASSWORD}`).toString("base64")}`;
    const [url, requestInit] = mockFetch.mock.calls[0] ?? [];
    expect(String(url)).toContain("/api/containers");
    expect(requestInit?.headers).toMatchObject({ Authorization: expected });
    expect(requestInit?.timeout).toBe(10_000);
  });

  test("does not send credentials over a non-HTTPS URL", async () => {
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify(sampleContainersResponse), {
        status: 200,
        headers: { "content-type": "application/json" },
      }) as unknown as Awaited<ReturnType<typeof fetchWithTrustedCertificatesAsync>>,
    );

    const integration = new WudIntegration({
      id: "test-wud-http",
      name: "Test WUD HTTP",
      url: "http://wud.example.com",
      externalUrl: null,
      decryptedSecrets: [
        { kind: "username", value: TEST_USERNAME },
        { kind: "password", value: TEST_PASSWORD },
      ],
    });

    await integration.getStatsAsync();

    const [, requestInit] = mockFetch.mock.calls[0] ?? [];
    const headers = (requestInit?.headers ?? {}) as Record<string, string>;
    expect(headers.Authorization).toBeUndefined();
  });
});

describe("WudIntegration testing endpoint", () => {
  type TestingFn = (input: IntegrationTestingInput) => Promise<{ success: boolean }>;

  const invokeTesting = (integration: WudIntegration, input: IntegrationTestingInput) => {
    const testing = (integration as unknown as { testingAsync: TestingFn }).testingAsync.bind(integration);
    return testing(input);
  };

  const makeInput = (response: Response): IntegrationTestingInput =>
    ({
      fetchAsync: vi.fn().mockResolvedValue(response),
    }) as unknown as IntegrationTestingInput;

  test("returns success when /api/app responds 200", async () => {
    const input = makeInput(new Response(JSON.stringify({ name: "wud", version: "5.0.0" }), { status: 200 }));

    const result = await invokeTesting(createIntegration(), input);

    expect(result.success).toBe(true);
  });

  test("returns a status-code failure when /api/app responds non-OK", async () => {
    const input = makeInput(new Response("unauthorized", { status: 401 }));

    const result = await invokeTesting(createIntegration(), input);

    expect(result.success).toBe(false);
  });

  test("passes the Basic auth header through to fetchAsync when configured", async () => {
    const response = new Response(JSON.stringify({ name: "wud", version: "5.0.0" }), { status: 200 });
    const input = makeInput(response);

    await invokeTesting(createIntegrationWithBasicAuth(), input);

    const fetchAsyncMock = vi.mocked(input.fetchAsync);
    const init = fetchAsyncMock.mock.calls[0]?.[1];
    const headers = (init?.headers ?? {}) as Record<string, string>;
    const expected = `Basic ${Buffer.from(`${TEST_USERNAME}:${TEST_PASSWORD}`).toString("base64")}`;
    expect(headers.Authorization).toBe(expected);
  });
});
