// @vitest-environment node
import { Response } from "undici";
import { beforeEach, describe, expect, test, vi } from "vitest";

vi.hoisted(() => {
  process.env.SKIP_ENV_VALIDATION = "true";
  process.env.SECRET_ENCRYPTION_KEY = "ff3f4f7ce30e870c9630de9e5d244ffa81101a24ed0dfe5f064beb53a7e684f1";
});

import { fetchWithTrustedCertificatesAsync } from "@homarr/core/infrastructure/http";

import type { IntegrationTestingInput } from "../../base/integration";
import { KomodoIntegration } from "../komodo-integration";

vi.mock("@homarr/core/infrastructure/http", () => ({
  fetchWithTrustedCertificatesAsync: vi.fn(),
}));

const TEST_URL = "https://komodo.example.com";
const TEST_API_KEY = "test-api-key";
const TEST_API_SECRET = "test-api-secret";

const mockFetch = vi.mocked(fetchWithTrustedCertificatesAsync);

type MockResponse = { body: unknown; status?: number };

const setupMockResponses = (responses: Record<string, MockResponse>) => {
  mockFetch.mockImplementation((url) => {
    const path = new URL(String(url)).pathname;
    const response = responses[path] ?? { body: { error: "Not found" }, status: 404 };
    const body = typeof response.body === "string" ? response.body : JSON.stringify(response.body);
    return Promise.resolve(
      new Response(body, {
        status: response.status ?? 200,
        headers: { "content-type": "application/json" },
      }),
    );
  });
};

const createIntegration = () =>
  new KomodoIntegration({
    id: "test-komodo",
    name: "Test Komodo",
    url: TEST_URL,
    externalUrl: null,
    decryptedSecrets: [
      { kind: "apiKey", value: TEST_API_KEY },
      { kind: "komodoApiSecret", value: TEST_API_SECRET },
    ],
  });

class TestableKomodoIntegration extends KomodoIntegration {
  public async testWithFetchAsync(fetchAsync: IntegrationTestingInput["fetchAsync"]) {
    return await this.testingAsync({ fetchAsync } as IntegrationTestingInput);
  }
}

const createTestableIntegration = () =>
  new TestableKomodoIntegration({
    id: "test-komodo",
    name: "Test Komodo",
    url: TEST_URL,
    externalUrl: null,
    decryptedSecrets: [
      { kind: "apiKey", value: TEST_API_KEY },
      { kind: "komodoApiSecret", value: TEST_API_SECRET },
    ],
  });

beforeEach(() => {
  mockFetch.mockReset();
});

describe("KomodoIntegration resource lists", () => {
  test("authenticates with the official API key headers", async () => {
    setupMockResponses({
      "/read/ListServers": { body: [] },
    });

    await createIntegration().listServersAsync();

    const [url, options] = mockFetch.mock.calls[0] ?? [];
    expect(String(url)).toBe(`${TEST_URL}/read/ListServers`);
    expect(options?.headers).toMatchObject({
      "x-api-key": TEST_API_KEY,
      "x-api-secret": TEST_API_SECRET,
    });
    expect(JSON.parse(String(options?.body))).toStrictEqual({ limit: 0 });
    expect(options?.timeout).toBe(10_000);
  });

  test("reads servers and maps their states", async () => {
    setupMockResponses({
      "/read/ListServers": {
        body: [
          { id: "server-1", name: "Server One", info: { state: "Ok", extra: true }, tags: [] },
          { id: "server-2", name: "Server Two", info: { state: "NotOk" }, tags: [] },
          { id: "server-3", name: "Maintenance", info: { state: "Disabled" }, tags: [] },
        ],
      },
    });

    await expect(createIntegration().listServersAsync()).resolves.toStrictEqual([
      { id: "server-1", name: "Server One", state: "Ok", status: "healthy" },
      { id: "server-2", name: "Server Two", state: "NotOk", status: "error" },
      { id: "server-3", name: "Maintenance", state: "Disabled", status: "warning" },
    ]);
  });

  test("reads stacks and maps their states", async () => {
    setupMockResponses({
      "/read/ListStacks": {
        body: [
          { id: "stack-1", name: "Media", info: { state: "running" } },
          { id: "stack-2", name: "Monitoring", info: { state: "unhealthy" } },
          { id: "stack-3", name: "Stopped", info: { state: "stopped" } },
        ],
      },
    });

    await expect(createIntegration().listStacksAsync()).resolves.toStrictEqual([
      { id: "stack-1", name: "Media", state: "running", status: "healthy" },
      { id: "stack-2", name: "Monitoring", state: "unhealthy", status: "error" },
      { id: "stack-3", name: "Stopped", state: "stopped", status: "warning" },
    ]);
  });

  test("excludes templates from operational resource lists", async () => {
    setupMockResponses({
      "/read/ListStacks": {
        body: [
          { id: "stack-1", name: "Media", template: false, info: { state: "running" } },
          { id: "stack-template", name: "Stack Template", template: true, info: { state: "unknown" } },
        ],
      },
    });

    await expect(createIntegration().listStacksAsync()).resolves.toStrictEqual([
      { id: "stack-1", name: "Media", state: "running", status: "healthy" },
    ]);
  });

  test("reads deployments and maps their states", async () => {
    setupMockResponses({
      "/read/ListDeployments": {
        body: [
          { id: "deployment-1", name: "API", info: { state: "running" } },
          { id: "deployment-2", name: "Worker", info: { state: "restarting" } },
          { id: "deployment-3", name: "Planned", info: { state: "not_deployed" } },
        ],
      },
    });

    await expect(createIntegration().listDeploymentsAsync()).resolves.toStrictEqual([
      { id: "deployment-1", name: "API", state: "running", status: "healthy" },
      { id: "deployment-2", name: "Worker", state: "restarting", status: "error" },
      { id: "deployment-3", name: "Planned", state: "not_deployed", status: "warning" },
    ]);
  });
});

describe("KomodoIntegration overview", () => {
  test("summarizes healthy, warning, error, unknown, and problem counts", async () => {
    setupMockResponses({
      "/read/ListServers": {
        body: [
          { id: "server-1", name: "Online", info: { state: "Ok" } },
          { id: "server-2", name: "Offline", info: { state: "NotOk" } },
        ],
      },
      "/read/ListStacks": {
        body: [
          { id: "stack-1", name: "Running", info: { state: "running" } },
          { id: "stack-2", name: "Deploying", info: { state: "deploying" } },
        ],
      },
      "/read/ListDeployments": {
        body: [
          { id: "deployment-1", name: "Running", info: { state: "running" } },
          { id: "deployment-2", name: "Future", info: { state: "future_state" } },
        ],
      },
    });

    const result = await createIntegration().getOverviewAsync();

    expect(result.servers).toStrictEqual({ total: 2, healthy: 1, warning: 0, error: 1, unknown: 0 });
    expect(result.stacks).toStrictEqual({ total: 2, healthy: 1, warning: 1, error: 0, unknown: 0 });
    expect(result.deployments).toStrictEqual({ total: 2, healthy: 1, warning: 0, error: 0, unknown: 1 });
    expect(result.problemCount).toBe(3);
    expect(result.problems.map((problem) => problem.name)).toStrictEqual(["Offline", "Deploying", "Future"]);
  });

  test("supports empty resource lists", async () => {
    setupMockResponses({
      "/read/ListServers": { body: [] },
      "/read/ListStacks": { body: [] },
      "/read/ListDeployments": { body: [] },
    });

    await expect(createIntegration().getOverviewAsync()).resolves.toStrictEqual({
      servers: { total: 0, healthy: 0, warning: 0, error: 0, unknown: 0 },
      stacks: { total: 0, healthy: 0, warning: 0, error: 0, unknown: 0 },
      deployments: { total: 0, healthy: 0, warning: 0, error: 0, unknown: 0 },
      problemCount: 0,
      problems: [],
    });
  });

  test("keeps an unknown future state without crashing", async () => {
    setupMockResponses({
      "/read/ListStacks": {
        body: [{ id: "stack-1", name: "Future", info: { state: "brand_new_state" } }],
      },
    });

    await expect(createIntegration().listStacksAsync()).resolves.toStrictEqual([
      { id: "stack-1", name: "Future", state: "brand_new_state", status: "unknown" },
    ]);
  });

  test("keeps a single malformed resource as unknown", async () => {
    setupMockResponses({
      "/read/ListServers": {
        body: [
          { id: "server-1", name: "Valid", info: { state: "Ok" } },
          { id: "server-2", name: "Missing state", info: {} },
        ],
      },
    });

    await expect(createIntegration().listServersAsync()).resolves.toStrictEqual([
      { id: "server-1", name: "Valid", state: "Ok", status: "healthy" },
      { id: "server-2", name: "Missing state", state: "unknown", status: "unknown" },
    ]);
  });
});

describe("KomodoIntegration errors and connection testing", () => {
  test.each([401, 403])("handles authentication error %s", async (status) => {
    setupMockResponses({
      "/read/ListServers": { body: { error: "Invalid user credentials" }, status },
    });

    await expect(createIntegration().listServersAsync()).rejects.toMatchObject({
      name: "IntegrationResponseError",
      cause: { statusCode: status },
    });
  });

  test("handles an upstream API error", async () => {
    setupMockResponses({
      "/read/ListServers": { body: { error: "Internal error" }, status: 500 },
    });

    await expect(createIntegration().listServersAsync()).rejects.toMatchObject({
      name: "IntegrationResponseError",
      cause: { statusCode: 500 },
    });
  });

  test("does not include credentials in an error chain", async () => {
    setupMockResponses({
      "/read/ListServers": { body: { error: "Invalid user credentials" }, status: 401 },
    });

    let caught: unknown;
    try {
      await createIntegration().listServersAsync();
    } catch (error) {
      caught = error;
    }

    const messages: string[] = [];
    const seen = new Set<unknown>();
    let current = caught;
    while (current instanceof Error && !seen.has(current)) {
      seen.add(current);
      messages.push(`${current.name}: ${current.message}`);
      current = current.cause;
    }

    const errorChain = messages.join("\n");
    expect(errorChain).not.toContain(TEST_API_KEY);
    expect(errorChain).not.toContain(TEST_API_SECRET);
  });

  test("connection test validates an authenticated Komodo version response", async () => {
    const fetchAsync: IntegrationTestingInput["fetchAsync"] = vi.fn(async (_url, options) => {
      expect(options?.headers).toMatchObject({
        "x-api-key": TEST_API_KEY,
        "x-api-secret": TEST_API_SECRET,
      });
      expect(options?.signal).toBeInstanceOf(AbortSignal);
      return new Response(JSON.stringify({ version: "2.2.0", additionalField: "supported" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    });

    await expect(createTestableIntegration().testWithFetchAsync(fetchAsync)).resolves.toStrictEqual({
      success: true,
    });
  });

  test("connection test rejects an unexpected response", async () => {
    const fetchAsync: IntegrationTestingInput["fetchAsync"] = vi.fn(
      async () =>
        new Response(JSON.stringify({ unexpected: true }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
    );

    const result = await createTestableIntegration().testWithFetchAsync(fetchAsync);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe("TestConnectionError");
    }
  });
});
