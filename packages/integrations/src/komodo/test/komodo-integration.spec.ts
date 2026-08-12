// @vitest-environment node
import { Response } from "undici";
import { beforeEach, describe, expect, test, vi } from "vitest";

vi.hoisted(() => {
  process.env.SKIP_ENV_VALIDATION = "true";
  process.env.SECRET_ENCRYPTION_KEY = "ff3f4f7ce30e870c9630de9e5d244ffa81101a24ed0dfe5f064beb53a7e684f1";
});

import { fetchWithTrustedCertificatesAsync } from "@homarr/core/infrastructure/http";
import { ParseError } from "@homarr/common/server";

import type { IntegrationInput, IntegrationTestingInput } from "../../base/integration";
import { IntegrationParseError } from "../../base/errors/parse/integration-parse-error";
import { KomodoIntegration } from "../komodo-integration";
import { createKomodoOverview, parseKomodoPollingRateSeconds } from "../komodo-types";

vi.mock("@homarr/core/infrastructure/http", () => ({
  fetchWithTrustedCertificatesAsync: vi.fn(),
}));

const TEST_URL = "https://komodo.example.com";
const TEST_API_KEY = "test-api-key";
const TEST_API_SECRET = "test-api-secret";
const TEST_INTEGRATION_INPUT: IntegrationInput = {
  id: "test-komodo",
  name: "Test Komodo",
  url: TEST_URL,
  externalUrl: null,
  decryptedSecrets: [
    { kind: "komodoApiKey", value: TEST_API_KEY },
    { kind: "komodoApiSecret", value: TEST_API_SECRET },
  ],
};

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

const createIntegration = () => new KomodoIntegration(TEST_INTEGRATION_INPUT);

class TestableKomodoIntegration extends KomodoIntegration {
  public async testWithFetchAsync(fetchAsync: IntegrationTestingInput["fetchAsync"]) {
    return await this.testingAsync({ fetchAsync } as IntegrationTestingInput);
  }
}

const createTestableIntegration = () => new TestableKomodoIntegration(TEST_INTEGRATION_INPUT);

beforeEach(() => {
  mockFetch.mockReset();
});

describe("parseKomodoPollingRateSeconds", () => {
  test.each([
    ["1-sec", 1],
    ["5-sec", 5],
    ["1-min", 60],
    ["2-hr", 7_200],
    ["1-day", 86_400],
    ["1-wk", 604_800],
  ])("parses %s", (pollingRate, expected) => {
    expect(parseKomodoPollingRateSeconds(pollingRate)).toBe(expected);
  });

  test.each([undefined, "", "0-sec", "5-seconds", "future"])("rejects unsupported value %s", (pollingRate) => {
    expect(parseKomodoPollingRateSeconds(pollingRate)).toBeNull();
  });
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

describe("KomodoIntegration containers", () => {
  test("reads containers and converts Docker stats for the existing table", async () => {
    setupMockResponses({
      "/read/ListAllContainers": {
        body: [
          {
            server_id: "server-1",
            server_name: "Production",
            name: "homarr",
            id: "container-1",
            image: "ghcr.io/homarr-labs/homarr:latest",
            state: "running",
            stats: {
              name: "homarr",
              cpu_perc: "2.50%",
              mem_perc: "25.00%",
              mem_usage: "256MiB / 1GiB",
              net_io: "1MB / 2MB",
              block_io: "0B / 0B",
              pids: "12",
            },
          },
        ],
      },
    });

    await expect(createIntegration().getContainersAsync()).resolves.toStrictEqual([
      {
        id: "container-1",
        name: "homarr",
        host: "Production",
        state: "running",
        image: "ghcr.io/homarr-labs/homarr:latest",
        cpuUsage: 2.5,
        memoryUsage: 256 * 1024 * 1024,
      },
    ]);

    const [url, options] = mockFetch.mock.calls[0] ?? [];
    expect(String(url)).toBe(`${TEST_URL}/read/ListAllContainers`);
    expect(JSON.parse(String(options?.body))).toStrictEqual({ limit: 0 });
  });

  test.each([400, 404])("supports the pre-2.3 container endpoint after status %s", async (status) => {
    setupMockResponses({
      "/read/ListAllContainers": { body: { error: "Not found" }, status },
      "/read/ListAllDockerContainers": { body: [] },
    });

    await expect(createIntegration().getContainersAsync()).resolves.toStrictEqual([]);
    expect(mockFetch.mock.calls.map(([url]) => new URL(String(url)).pathname)).toStrictEqual([
      "/read/ListAllContainers",
      "/read/ListAllDockerContainers",
    ]);
  });

  test("keeps unknown states and malformed statistics visible", async () => {
    setupMockResponses({
      "/read/ListAllContainers": {
        body: [
          {
            server_id: "server-1",
            name: "future-container",
            state: "future-state",
            stats: { cpu_perc: "invalid", mem_usage: "unknown" },
          },
        ],
      },
    });

    await expect(createIntegration().getContainersAsync()).resolves.toStrictEqual([
      {
        id: "server-1:future-container:0",
        name: "future-container",
        host: "server-1",
        state: "unknown",
        image: "",
        cpuUsage: 0,
        memoryUsage: 0,
      },
    ]);
  });

  test("handles invalid JSON in the container response", async () => {
    setupMockResponses({
      "/read/ListAllContainers": { body: "not-json" },
    });

    await expect(createIntegration().getContainersAsync()).rejects.toSatisfy((error) => {
      if (!(error instanceof IntegrationParseError)) return false;
      return (
        error.cause instanceof ParseError && error.cause.message.includes("Invalid Komodo container list response")
      );
    });
  });

  test("handles a non-array container response", async () => {
    setupMockResponses({
      "/read/ListAllContainers": { body: { unexpected: true } },
    });

    await expect(createIntegration().getContainersAsync()).rejects.toSatisfy((error) => {
      if (!(error instanceof IntegrationParseError)) return false;
      return (
        error.cause instanceof ParseError && error.cause.message.includes("Invalid Komodo container list response")
      );
    });
  });

  test("handles an upstream container API error", async () => {
    setupMockResponses({
      "/read/ListAllContainers": { body: { error: "Internal error" }, status: 500 },
    });

    await expect(createIntegration().getContainersAsync()).rejects.toMatchObject({
      name: "IntegrationResponseError",
      cause: { statusCode: 500 },
    });
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

  test("retains problems from every resource kind when one kind exceeds the display limit", () => {
    const serverProblems = Array.from({ length: 21 }, (_, index) => ({
      id: `server-${index}`,
      name: `Server ${index}`,
      state: "NotOk",
      status: "error" as const,
    }));
    const stackProblems = [{ id: "stack-1", name: "Stack", state: "stopped", status: "warning" as const }];
    const deploymentProblems = [
      { id: "deployment-1", name: "Deployment", state: "unknown", status: "unknown" as const },
    ];

    const overview = createKomodoOverview(serverProblems, stackProblems, deploymentProblems);

    expect(overview.problemCount).toBe(23);
    expect(overview.problems).toHaveLength(22);
    expect(overview.problems.at(-2)?.kind).toBe("stack");
    expect(overview.problems.at(-1)?.kind).toBe("deployment");
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

describe("KomodoIntegration server overview", () => {
  test("reads server metrics, core counts, and Periphery versions from the server list", async () => {
    setupMockResponses({
      "/read/ListServers": {
        body: [
          {
            id: "server-1",
            name: "Production",
            info: {
              state: "Ok",
              version: "2.3.1",
              core_count: 4,
              logical_core_count: 8,
              stats: {
                cpu_perc: 33.3,
                load_average: { one: 0.21, five: 0.32, fifteen: 0.31 },
                mem_used_gb: 4.7,
                mem_total_gb: 10,
                disk_used_gb: 92.2,
                disk_total_gb: 100,
                network_ingress_bytes: 512,
                network_egress_bytes: 32,
                polling_rate: "5-sec",
                refresh_ts: 1_786_444_800_000,
              },
            },
          },
          {
            id: "server-2",
            name: "Offline",
            info: { state: "NotOk", version: null, stats: null },
          },
          {
            id: "server-template",
            name: "Template",
            template: true,
            info: { state: "Unknown", stats: null },
          },
        ],
      },
    });

    await expect(createIntegration().getServerOverviewAsync()).resolves.toStrictEqual([
      {
        id: "server-1",
        name: "Production",
        state: "Ok",
        status: "healthy",
        version: "2.3.1",
        physicalCoreCount: 4,
        logicalCoreCount: 8,
        stats: {
          cpuPercentage: 33.3,
          loadAverage: { one: 0.21, five: 0.32, fifteen: 0.31 },
          memoryUsedGb: 4.7,
          memoryTotalGb: 10,
          diskUsedGb: 92.2,
          diskTotalGb: 100,
          networkIngressBytesPerSecond: 102.4,
          networkEgressBytesPerSecond: 6.4,
        },
      },
      {
        id: "server-2",
        name: "Offline",
        state: "NotOk",
        status: "error",
        version: null,
        physicalCoreCount: null,
        logicalCoreCount: null,
        stats: null,
      },
    ]);

    const [url, options] = mockFetch.mock.calls[0] ?? [];
    expect(String(url)).toBe(`${TEST_URL}/read/ListServers`);
    expect(JSON.parse(String(options?.body))).toStrictEqual({ limit: 0 });
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  test("keeps a server visible when its statistics are malformed", async () => {
    setupMockResponses({
      "/read/ListServers": {
        body: [
          {
            id: "server-1",
            name: "Production",
            info: { state: "Ok", version: "2.3.1", stats: { cpu_perc: "invalid" } },
          },
        ],
      },
    });

    await expect(createIntegration().getServerOverviewAsync()).resolves.toStrictEqual([
      {
        id: "server-1",
        name: "Production",
        state: "Ok",
        status: "healthy",
        version: "2.3.1",
        physicalCoreCount: null,
        logicalCoreCount: null,
        stats: null,
      },
    ]);
  });
});

describe("KomodoIntegration errors and connection testing", () => {
  test("handles invalid JSON in the server overview response", async () => {
    setupMockResponses({
      "/read/ListServers": { body: "not-json" },
    });

    await expect(createIntegration().getServerOverviewAsync()).rejects.toSatisfy((error) => {
      if (!(error instanceof IntegrationParseError)) return false;
      return error.cause instanceof ParseError && error.cause.message.includes("Invalid Komodo resource list response");
    });
  });

  test("handles a non-array server overview response", async () => {
    setupMockResponses({
      "/read/ListServers": { body: { unexpected: true } },
    });

    await expect(createIntegration().getServerOverviewAsync()).rejects.toSatisfy((error) => {
      if (!(error instanceof IntegrationParseError)) return false;
      return error.cause instanceof ParseError && error.cause.message.includes("Invalid Komodo resource list response");
    });
  });

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

  test("handles an upstream API error for the server overview", async () => {
    setupMockResponses({
      "/read/ListServers": { body: { error: "Internal error" }, status: 500 },
    });

    await expect(createIntegration().getServerOverviewAsync()).rejects.toMatchObject({
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
