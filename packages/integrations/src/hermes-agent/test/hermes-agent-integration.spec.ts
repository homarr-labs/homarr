// @vitest-environment node

import { Request, Response } from "undici";
import { beforeEach, describe, expect, test, vi } from "vitest";

vi.hoisted(() => {
  process.env.SKIP_ENV_VALIDATION = "true";
  process.env.SECRET_ENCRYPTION_KEY = "ff3f4f7ce30e870c9630de9e5d244ffa81101a24ed0dfe5f064beb53a7e684f1";
});

import { fetchWithTrustedCertificatesAsync } from "@homarr/core/infrastructure/http";

import type { IntegrationTestingInput } from "../../base/integration";
import { HermesAgentIntegration } from "../hermes-agent-integration";
import {
  hermesJobSchema,
  parseHermesTimestamp,
  hermesSessionSchema,
  hermesSessionsResponseSchema,
  hermesSkillSchema,
} from "../hermes-agent-types";

vi.mock("@homarr/core/infrastructure/http", () => ({
  fetchWithTrustedCertificatesAsync: vi.fn(),
}));

const TEST_API_KEY = "test-hermes-api-key";
const TEST_URL = "http://127.0.0.1:8642";

type MockResponseData = Record<string, unknown> | unknown[];

const mockFetchWithTrustedCertificates = vi.mocked(fetchWithTrustedCertificatesAsync);

class TestableHermesAgentIntegration extends HermesAgentIntegration {
  public async callTestingAsync(fetchAsync: IntegrationTestingInput["fetchAsync"]) {
    return await this.testingAsync({
      fetchAsync,
      dispatcher: undefined as never,
      axiosInstance: undefined as never,
      options: undefined as never,
    });
  }
}

const createHermesAgentIntegration = (
  decryptedSecrets: { kind: "apiKey"; value: string }[] = [{ kind: "apiKey", value: TEST_API_KEY }],
) => {
  return new TestableHermesAgentIntegration({
    id: "test-hermes-agent",
    name: "Test Hermes Agent",
    url: TEST_URL,
    externalUrl: null,
    decryptedSecrets,
  });
};

const createResponse = (data: MockResponseData, status = 200) => {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
};

const getRequestUrl = (url: Parameters<typeof fetchWithTrustedCertificatesAsync>[0]) =>
  new URL(typeof url === "string" ? url : url instanceof Request ? url.url : url.toString());

const getPathname = (url: Parameters<typeof fetchWithTrustedCertificatesAsync>[0]) => getRequestUrl(url).pathname;

const setupMockFetch = (responses: Record<string, MockResponseData>) => {
  mockFetchWithTrustedCertificates.mockImplementation((url) => {
    const path = getPathname(url);

    const response = responses[path];
    if (response !== undefined) {
      return Promise.resolve(createResponse(response) as Awaited<ReturnType<typeof fetchWithTrustedCertificatesAsync>>);
    }

    return Promise.resolve(
      createResponse({ error: "Not Found" }, 404) as Awaited<ReturnType<typeof fetchWithTrustedCertificatesAsync>>,
    );
  });
};

describe("HermesAgentIntegration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("job data strips raw prompts that may contain secrets", () => {
    const job = hermesJobSchema.parse({
      id: "backup-job",
      name: "Backup",
      prompt: "run backup with password=secret-value",
      last_error: "request failed with token=secret-value",
      schedule: "0 3 * * *",
      enabled: true,
    });

    expect(job.has_error).toBe(true);
    expect(job).not.toHaveProperty("prompt");
    expect(job).not.toHaveProperty("last_error");
  });

  test("skill data keeps usage metadata but strips descriptions and provenance", () => {
    const skill = hermesSkillSchema.parse({
      name: "github-pr-workflow",
      enabled: true,
      category: "development",
      usage: 12,
      description: "Contains internal workflow details",
      provenance: "/home/user/.hermes/skills/github-pr-workflow",
    });

    expect(skill).toEqual({ name: "github-pr-workflow", enabled: true, category: "development", usage: 12 });
    expect(JSON.stringify(skill)).not.toContain("internal workflow");
    expect(JSON.stringify(skill)).not.toContain("/home/user");
  });

  test("session data strips previews and usage metadata that may contain sensitive values", () => {
    const session = hermesSessionSchema.parse({
      id: "session-1",
      source: "telegram",
      title: "Team chat",
      chat_id: "private-chat-id",
      thread_id: "private-thread-id",
      display_name: "Private channel",
      preview: "content of the most recent message",
      user_id: "user-1",
      model: "hermes-agent",
      message_count: 3,
      tool_call_count: 1,
      input_tokens: 100,
      output_tokens: 50,
      estimated_cost_usd: 0.5,
      actual_cost_usd: 0.4,
    });

    expect(session).toMatchObject({ id: "session-1", source: "telegram", title: "Team chat" });
    expect(session).not.toHaveProperty("preview");
    expect(session).not.toHaveProperty("user_id");
    expect(session).not.toHaveProperty("chat_id");
    expect(session).not.toHaveProperty("thread_id");
    expect(session).not.toHaveProperty("display_name");
    expect(session).not.toHaveProperty("input_tokens");
    expect(session).not.toHaveProperty("estimated_cost_usd");
  });

  test("parses API timestamps without treating compact calendar dates as Unix seconds", () => {
    expect(parseHermesTimestamp("1786422600")).toBe(1_786_422_600_000);
    expect(parseHermesTimestamp("2026-08-13T09:30:00Z")).toBe(Date.parse("2026-08-13T09:30:00Z"));
    expect(parseHermesTimestamp("20260813")).toBeNull();
  });

  test("session pages derive pagination from current Hermes total metadata", () => {
    const page = hermesSessionsResponseSchema.parse({
      sessions: [
        {
          id: "session-1",
          last_active: 1_786_422_600,
          ended_at: null,
          is_active: true,
        },
      ],
      total: 3,
      limit: 1,
      offset: 0,
    });

    expect(page).toMatchObject({ total: 3, hasMore: true });
    expect(page.items[0]).toMatchObject({ ended_at: null, is_active: true });
  });

  test("testingAsync checks health and authenticated capabilities", async () => {
    const fetchAsync = vi.fn((url: Parameters<IntegrationTestingInput["fetchAsync"]>[0]) => {
      const path = getPathname(url);
      if (path === "/health") {
        return Promise.resolve(createResponse({ status: "ok", platform: "hermes-agent", version: "0.19.0" }));
      }
      if (path === "/v1/capabilities") {
        return Promise.resolve(
          createResponse({
            object: "hermes.api_server.capabilities",
            platform: "hermes-agent",
            model: "hermes-agent",
            auth: { type: "bearer", required: true },
            features: { run_status: true },
          }),
        );
      }
      return Promise.resolve(createResponse({ error: "Not Found" }, 404));
    }) as IntegrationTestingInput["fetchAsync"];

    const integration = createHermesAgentIntegration();
    const result = await integration.callTestingAsync(fetchAsync);

    expect(result.success).toBe(true);
    expect(fetchAsync).toHaveBeenCalledTimes(2);
    expect(fetchAsync).toHaveBeenLastCalledWith(
      expect.any(URL),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: `Bearer ${TEST_API_KEY}` }),
      }),
    );
  });

  test("testingAsync rejects a current API server without an API key", async () => {
    const fetchAsync = vi.fn((url: Parameters<IntegrationTestingInput["fetchAsync"]>[0]) => {
      const path = getPathname(url);
      if (path === "/health") {
        return Promise.resolve(createResponse({ status: "ok", platform: "hermes-agent", version: "0.19.0" }));
      }
      if (path === "/v1/capabilities") {
        return Promise.resolve(createResponse({ error: "API key required" }, 401));
      }
      return Promise.resolve(createResponse({ error: "Not Found" }, 404));
    }) as IntegrationTestingInput["fetchAsync"];

    const integration = createHermesAgentIntegration([]);
    await expect(integration.callTestingAsync(fetchAsync)).rejects.toThrow();
    expect(fetchAsync).toHaveBeenCalledTimes(2);
    expect(fetchAsync).toHaveBeenLastCalledWith(
      expect.any(URL),
      expect.objectContaining({
        headers: { Accept: "application/json" },
      }),
    );
  });

  test("testingAsync accepts dashboard status endpoint", async () => {
    const fetchAsync = vi.fn((url: Parameters<IntegrationTestingInput["fetchAsync"]>[0]) => {
      const path = getPathname(url);
      if (path === "/api/status") {
        return Promise.resolve(
          createResponse({
            version: "0.15.1",
            release_date: "2026.5.29",
            gateway_running: true,
            gateway_state: "running",
            gateway_platforms: {},
            active_sessions: 0,
          }),
        );
      }
      return Promise.resolve(createResponse({ error: "Not Found" }, 404));
    }) as IntegrationTestingInput["fetchAsync"];

    const integration = createHermesAgentIntegration();
    const result = await integration.callTestingAsync(fetchAsync);

    expect(result.success).toBe(true);
    expect(fetchAsync).toHaveBeenCalledTimes(2);
  });

  test("testingAsync accepts a dashboard that serves HTML from the health route", async () => {
    const requestedPaths: string[] = [];
    const fetchAsync = vi.fn((url: Parameters<IntegrationTestingInput["fetchAsync"]>[0]) => {
      const path = getPathname(url);
      requestedPaths.push(path);
      if (path === "/health") {
        return Promise.resolve(
          new Response("<!doctype html><html><body>Hermes Control Center</body></html>", {
            status: 200,
            headers: { "content-type": "text/html" },
          }),
        );
      }
      if (path === "/api/status") {
        return Promise.resolve(
          createResponse({
            version: "0.18.2",
            release_date: "2026.7.1",
            gateway_running: true,
            gateway_state: "running",
            gateway_platforms: { telegram: { state: "connected" } },
            active_sessions: 1,
          }),
        );
      }
      return Promise.resolve(createResponse({ error: "Not Found" }, 404));
    }) as IntegrationTestingInput["fetchAsync"];

    const integration = createHermesAgentIntegration([]);
    const result = await integration.callTestingAsync(fetchAsync);

    expect(result.success).toBe(true);
    expect(fetchAsync).toHaveBeenCalledTimes(2);
    expect(requestedPaths).toEqual(["/health", "/api/status"]);
  });

  test("testingAsync rejects an unrelated empty status response", async () => {
    const fetchAsync = vi.fn((url: Parameters<IntegrationTestingInput["fetchAsync"]>[0]) => {
      const path = getPathname(url);
      return Promise.resolve(path === "/api/status" ? createResponse({}) : createResponse({ error: "Not Found" }, 404));
    }) as IntegrationTestingInput["fetchAsync"];

    const integration = createHermesAgentIntegration([]);
    await expect(integration.callTestingAsync(fetchAsync)).rejects.toThrow();
  });

  test("testingAsync rejects a non-Hermes capabilities response", async () => {
    const fetchAsync = vi.fn((url: Parameters<IntegrationTestingInput["fetchAsync"]>[0]) => {
      const path = getPathname(url);
      if (path === "/health") {
        return Promise.resolve(createResponse({ status: "ok", platform: "hermes-agent", version: "0.19.0" }));
      }
      if (path === "/v1/capabilities") return Promise.resolve(createResponse({}));
      return Promise.resolve(createResponse({ error: "Not Found" }, 404));
    }) as IntegrationTestingInput["fetchAsync"];

    await expect(createHermesAgentIntegration().callTestingAsync(fetchAsync)).rejects.toThrow();
  });

  test("getOverviewAsync aggregates required and optional endpoint data", async () => {
    setupMockFetch({
      "/health": { status: "ok", platform: "hermes-agent", version: "0.19.0" },
      "/health/detailed": {
        status: "ready",
        version: "0.18.2",
        readiness: { status: "ready", checks: { config: { status: "ready" } } },
        gateway_state: "running",
        platforms: {
          telegram: { state: "connected", updated_at: "2026-01-01T00:00:00Z" },
        },
        active_agents: 2,
        gateway_busy: true,
        gateway_drainable: false,
        updated_at: "2026-01-01T00:00:00Z",
        pid: 1234,
      },
      "/v1/capabilities": {
        object: "hermes.api_server.capabilities",
        platform: "hermes-agent",
        model: "hermes-agent",
        auth: { type: "bearer", required: true },
        features: { run_status: true, jobs_admin: false },
      },
      "/api/sessions": {
        data: [
          {
            id: "session-1",
            source: "api_server",
            title: "Dashboard session",
            message_count: 3,
            tool_call_count: 1,
            input_tokens: 100,
            output_tokens: 50,
            last_active: 1_767_225_600,
          },
        ],
        has_more: true,
      },
      "/api/jobs": {
        jobs: [
          {
            id: "abc123",
            name: "Daily briefing",
            schedule: { kind: "cron", expr: "0 9 * * *", display: "0 9 * * *" },
            repeat: { times: null, completed: 4 },
            enabled: true,
          },
        ],
      },
      "/v1/toolsets": [{ name: "core", label: "Core", enabled: true, configured: true, tools: ["read_file"] }],
      "/v1/skills": {
        object: "list",
        data: [
          {
            name: "github-pr-workflow",
            description: "Review GitHub pull requests",
            category: "development",
            enabled: true,
            usage: 12,
          },
        ],
      },
    });

    const integration = createHermesAgentIntegration();
    const result = await integration.getOverviewAsync();

    expect(result.mode).toBe("apiServer");
    expect(result.health.gateway_state).toBe("running");
    expect(result.health.version).toBe("0.18.2");
    expect(result.health.gateway_busy).toBe(true);
    expect(result.health.readiness?.status).toBe("ready");
    expect(result.sessions).toHaveLength(1);
    expect(result.sessionsTotal).toBeNull();
    expect(result.sessionsHasMore).toBe(true);
    expect(result.sessions[0]?.last_active).toBe(1_767_225_600);
    expect(result.jobs).toHaveLength(1);
    expect(result.jobs[0]?.schedule).toBe("0 9 * * *");
    expect(result.toolsets).toHaveLength(1);
    expect(result.skills).toHaveLength(1);
    expect(result.skills[0]).toEqual({
      name: "github-pr-workflow",
      enabled: true,
      category: "development",
      usage: 12,
    });
    expect(result.dataAvailability).toEqual({ sessions: true, jobs: true, toolsets: true, skills: true });
    expect(mockFetchWithTrustedCertificates).toHaveBeenCalledWith(
      expect.any(URL),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: `Bearer ${TEST_API_KEY}` }),
      }),
    );
    const sessionsUrl = mockFetchWithTrustedCertificates.mock.calls
      .map(([url]) => getRequestUrl(url))
      .find((url) => url.pathname === "/api/sessions");
    expect(sessionsUrl?.searchParams.get("limit")).toBe("100");
    expect(sessionsUrl?.searchParams.get("order")).toBe("recent");
  });

  test("getOverviewAsync uses the dashboard updater's exact commits-behind count", async () => {
    mockFetchWithTrustedCertificates.mockImplementation((url) => {
      const parsedUrl = getRequestUrl(url);

      if (parsedUrl.hostname === "api.github.com") {
        return Promise.reject(new Error("GitHub fallback should not be used"));
      }

      if (parsedUrl.pathname === "/api/status") {
        return Promise.resolve(
          createResponse({
            version: "0.20.0",
            release_date: "2026.8.3",
            gateway_running: true,
            gateway_state: "running",
            gateway_platforms: {},
          }) as Awaited<ReturnType<typeof fetchWithTrustedCertificatesAsync>>,
        );
      }
      if (parsedUrl.pathname === "/") {
        return Promise.resolve(
          new Response('<script>window.__HERMES_SESSION_TOKEN__="test-token";</script>', {
            headers: { "content-type": "text/html" },
          }) as Awaited<ReturnType<typeof fetchWithTrustedCertificatesAsync>>,
        );
      }
      if (parsedUrl.pathname === "/api/hermes/update/check") {
        return Promise.resolve(
          createResponse({
            install_method: "git",
            current_version: "0.20.0",
            behind: 76,
            update_available: true,
            can_apply: true,
            update_command: "hermes update",
            message: null,
          }) as Awaited<ReturnType<typeof fetchWithTrustedCertificatesAsync>>,
        );
      }

      return Promise.resolve(
        createResponse({ error: "Not Found" }, 404) as Awaited<ReturnType<typeof fetchWithTrustedCertificatesAsync>>,
      );
    });

    const result = await createHermesAgentIntegration().getOverviewAsync();

    expect(result.update).toEqual({
      currentReleaseTag: "v2026.8.3",
      latestReleaseTag: "upstream main",
      hasNewRelease: true,
      commitsBehind: 76,
      releaseUrl: "https://github.com/NousResearch/hermes-agent/commits/main",
    });
    expect(
      mockFetchWithTrustedCertificates.mock.calls.some(([url]) => getRequestUrl(url).hostname === "api.github.com"),
    ).toBe(false);
    expect(mockFetchWithTrustedCertificates).toHaveBeenCalledWith(
      expect.objectContaining({ pathname: "/api/hermes/update/check" }),
      expect.objectContaining({
        headers: expect.objectContaining({ "X-Hermes-Session-Token": "test-token" }),
      }),
    );
  });

  test("getOverviewAsync ignores a negative dashboard commits-behind value", async () => {
    mockFetchWithTrustedCertificates.mockImplementation((url) => {
      const parsedUrl = getRequestUrl(url);

      if (parsedUrl.pathname === "/api/status") {
        return Promise.resolve(
          createResponse({
            version: "0.20.0",
            release_date: "2026.8.3",
            gateway_running: true,
            gateway_state: "running",
            gateway_platforms: {},
          }) as Awaited<ReturnType<typeof fetchWithTrustedCertificatesAsync>>,
        );
      }
      if (parsedUrl.pathname === "/") {
        return Promise.resolve(
          new Response('<script>window.__HERMES_SESSION_TOKEN__="test-token";</script>', {
            headers: { "content-type": "text/html" },
          }) as Awaited<ReturnType<typeof fetchWithTrustedCertificatesAsync>>,
        );
      }
      if (parsedUrl.pathname === "/api/hermes/update/check") {
        return Promise.resolve(
          createResponse({
            install_method: "git",
            current_version: "0.20.0",
            behind: -3,
            update_available: true,
            can_apply: false,
            update_command: null,
            message: null,
          }) as Awaited<ReturnType<typeof fetchWithTrustedCertificatesAsync>>,
        );
      }

      return Promise.resolve(
        createResponse({ error: "Not Found" }, 404) as Awaited<ReturnType<typeof fetchWithTrustedCertificatesAsync>>,
      );
    });

    const result = await createHermesAgentIntegration().getOverviewAsync();

    expect(result.update).toMatchObject({ hasNewRelease: false, commitsBehind: null });
  });

  test("getOverviewAsync honors the dashboard updater flag when the commit count is zero", async () => {
    mockFetchWithTrustedCertificates.mockImplementation((url) => {
      const parsedUrl = getRequestUrl(url);

      if (parsedUrl.pathname === "/api/status") {
        return Promise.resolve(
          createResponse({
            version: "0.20.0",
            release_date: "2026.8.3",
            gateway_running: true,
            gateway_state: "running",
            gateway_platforms: {},
          }) as Awaited<ReturnType<typeof fetchWithTrustedCertificatesAsync>>,
        );
      }
      if (parsedUrl.pathname === "/") {
        return Promise.resolve(
          new Response('<script>window.__HERMES_SESSION_TOKEN__="test-token";</script>', {
            headers: { "content-type": "text/html" },
          }) as Awaited<ReturnType<typeof fetchWithTrustedCertificatesAsync>>,
        );
      }
      if (parsedUrl.pathname === "/api/hermes/update/check") {
        return Promise.resolve(
          createResponse({ current_version: "0.20.0", behind: 0, update_available: true }) as Awaited<
            ReturnType<typeof fetchWithTrustedCertificatesAsync>
          >,
        );
      }

      return Promise.resolve(
        createResponse({ error: "Not Found" }, 404) as Awaited<ReturnType<typeof fetchWithTrustedCertificatesAsync>>,
      );
    });

    const result = await createHermesAgentIntegration().getOverviewAsync();

    expect(result.update).toMatchObject({ hasNewRelease: true, commitsBehind: 0 });
  });

  test("getOverviewAsync caches dashboard GitHub update checks", async () => {
    let latestReleaseCalls = 0;
    let compareCalls = 0;
    mockFetchWithTrustedCertificates.mockImplementation((url) => {
      const urlString = typeof url === "string" ? url : url instanceof Request ? url.url : url.toString();
      const parsedUrl = new URL(urlString);
      const path = parsedUrl.pathname;

      if (parsedUrl.hostname === "api.github.com") {
        if (path === "/repos/NousResearch/hermes-agent/releases/latest") {
          latestReleaseCalls += 1;
          return Promise.resolve(
            createResponse({
              tag_name: "v2099.1.1.2",
              html_url: "https://github.com/NousResearch/hermes-agent",
            }) as Awaited<ReturnType<typeof fetchWithTrustedCertificatesAsync>>,
          );
        }
        if (path === "/repos/NousResearch/hermes-agent/compare/v2099.1.1...v2099.1.1.2") {
          compareCalls += 1;
          return Promise.resolve(
            createResponse({ status: "ahead", ahead_by: 2 }) as Awaited<
              ReturnType<typeof fetchWithTrustedCertificatesAsync>
            >,
          );
        }
      }

      if (path === "/api/status") {
        return Promise.resolve(
          createResponse({
            version: "0.15.1",
            release_date: "2099.1.1",
            gateway_running: true,
            gateway_state: "running",
            gateway_platforms: { telegram: { state: "connected" } },
            active_sessions: 0,
          }) as Awaited<ReturnType<typeof fetchWithTrustedCertificatesAsync>>,
        );
      }
      if (path === "/") {
        return Promise.resolve(
          new Response('<script>window.__HERMES_SESSION_TOKEN__="test-token";</script>', {
            headers: { "content-type": "text/html" },
          }) as Awaited<ReturnType<typeof fetchWithTrustedCertificatesAsync>>,
        );
      }
      if (path === "/api/skills") {
        return Promise.resolve(
          createResponse([{ name: "hermes-agent", enabled: true }]) as Awaited<
            ReturnType<typeof fetchWithTrustedCertificatesAsync>
          >,
        );
      }
      if (path === "/api/sessions") {
        return Promise.resolve(
          createResponse({ sessions: [] }) as Awaited<ReturnType<typeof fetchWithTrustedCertificatesAsync>>,
        );
      }
      if (path === "/api/cron/jobs") {
        return Promise.resolve(createResponse([]) as Awaited<ReturnType<typeof fetchWithTrustedCertificatesAsync>>);
      }
      if (path === "/api/tools/toolsets") {
        return Promise.resolve(createResponse([]) as Awaited<ReturnType<typeof fetchWithTrustedCertificatesAsync>>);
      }

      return Promise.resolve(
        createResponse({ error: "Not Found" }, 404) as Awaited<ReturnType<typeof fetchWithTrustedCertificatesAsync>>,
      );
    });

    const integration = createHermesAgentIntegration();
    const firstResult = await integration.getOverviewAsync();
    const secondResult = await integration.getOverviewAsync();

    expect(firstResult.update?.commitsBehind).toBe(2);
    expect(firstResult.update?.hasNewRelease).toBe(true);
    expect(firstResult.update?.latestReleaseTag).toBe("v2099.1.1.2");
    expect(secondResult.update?.commitsBehind).toBe(2);
    expect(firstResult.mode).toBe("dashboard");
    expect(firstResult.dataAvailability).toEqual({ sessions: true, jobs: true, toolsets: true, skills: true });
    expect(latestReleaseCalls).toBe(1);
    expect(compareCalls).toBe(1);
    const dashboardSessionsUrl = mockFetchWithTrustedCertificates.mock.calls
      .map(([url]) => getRequestUrl(url))
      .find((url) => url.pathname === "/api/sessions");
    expect(dashboardSessionsUrl?.searchParams.get("limit")).toBe("100");
    expect(dashboardSessionsUrl?.searchParams.get("order")).toBe("recent");
  });

  test("getOverviewAsync aggregates activity and sessions across independently running profiles", async () => {
    mockFetchWithTrustedCertificates.mockImplementation((url) => {
      const parsedUrl = getRequestUrl(url);
      const profile = parsedUrl.searchParams.get("profile");

      if (parsedUrl.pathname === "/health") {
        return Promise.resolve(
          new Response("<!doctype html>", { headers: { "content-type": "text/html" } }) as Awaited<
            ReturnType<typeof fetchWithTrustedCertificatesAsync>
          >,
        );
      }
      if (parsedUrl.pathname === "/") {
        return Promise.resolve(
          new Response('<script>window.__HERMES_SESSION_TOKEN__="test-token";</script>', {
            headers: { "content-type": "text/html" },
          }) as Awaited<ReturnType<typeof fetchWithTrustedCertificatesAsync>>,
        );
      }
      if (parsedUrl.pathname === "/api/status") {
        const activity = profile === "icor-gamedev" ? 1 : 0;
        return Promise.resolve(
          createResponse({
            version: "0.20.0",
            release_date: "2026.8.3",
            gateway_running: true,
            gateway_state: "running",
            gateway_platforms: {},
            active_agents: activity,
            active_sessions: activity,
            gateway_busy: activity > 0,
            gateway_mode: "multiple",
            profiles: ["default", "icor-gamedev"],
            gateways: [{ profile: "default" }, { profile: "icor-gamedev" }],
          }) as Awaited<ReturnType<typeof fetchWithTrustedCertificatesAsync>>,
        );
      }
      if (parsedUrl.pathname === "/api/sessions") {
        const isActive = profile === "icor-gamedev";
        return Promise.resolve(
          createResponse({
            sessions: [
              {
                id: `session-${profile}`,
                title: profile,
                last_active: Date.now() / 1000,
                ended_at: isActive ? null : Date.now() / 1000,
                is_active: isActive,
              },
            ],
            total: 1,
            limit: 100,
            offset: 0,
          }) as Awaited<ReturnType<typeof fetchWithTrustedCertificatesAsync>>,
        );
      }
      if (parsedUrl.pathname === "/api/hermes/update/check") {
        return Promise.resolve(
          createResponse({ current_version: "0.20.0", behind: 0, update_available: false }) as Awaited<
            ReturnType<typeof fetchWithTrustedCertificatesAsync>
          >,
        );
      }
      if (["/api/skills", "/api/cron/jobs", "/api/tools/toolsets"].includes(parsedUrl.pathname)) {
        return Promise.resolve(createResponse([]) as Awaited<ReturnType<typeof fetchWithTrustedCertificatesAsync>>);
      }

      return Promise.resolve(
        createResponse({ error: "Not Found" }, 404) as Awaited<ReturnType<typeof fetchWithTrustedCertificatesAsync>>,
      );
    });

    const result = await createHermesAgentIntegration([]).getOverviewAsync();

    expect(result.health).toMatchObject({ active_agents: 1, active_sessions: 1, gateway_busy: true });
    expect(result.dashboardStatus).toMatchObject({ active_agents: 1, active_sessions: 1 });
    expect(result.sessions).toHaveLength(2);
    expect(result.sessionsTotal).toBe(2);
    expect(result.sessions.some((session) => session.is_active)).toBe(true);
    const sessionProfiles = mockFetchWithTrustedCertificates.mock.calls
      .map(([url]) => getRequestUrl(url))
      .filter((url) => url.pathname === "/api/sessions")
      .map((url) => url.searchParams.get("profile"));
    expect(sessionProfiles).toEqual(expect.arrayContaining(["default", "icor-gamedev"]));
  });

  test("getOverviewAsync bounds concurrent dashboard profile requests", async () => {
    const profiles = Array.from({ length: 9 }, (_, profileIndex) => `profile-${profileIndex}`);
    let activeStatusRequests = 0;
    let activeSessionRequests = 0;
    let maximumStatusRequests = 0;
    let maximumSessionRequests = 0;

    mockFetchWithTrustedCertificates.mockImplementation((url) => {
      const parsedUrl = getRequestUrl(url);
      const profile = parsedUrl.searchParams.get("profile");

      if (parsedUrl.pathname === "/health") {
        return Promise.resolve(
          new Response("<!doctype html>", { headers: { "content-type": "text/html" } }) as Awaited<
            ReturnType<typeof fetchWithTrustedCertificatesAsync>
          >,
        );
      }
      if (parsedUrl.pathname === "/") {
        return Promise.resolve(
          new Response('<script>window.__HERMES_SESSION_TOKEN__="test-token";</script>', {
            headers: { "content-type": "text/html" },
          }) as Awaited<ReturnType<typeof fetchWithTrustedCertificatesAsync>>,
        );
      }
      if (parsedUrl.pathname === "/api/status" && profile) {
        activeStatusRequests += 1;
        maximumStatusRequests = Math.max(maximumStatusRequests, activeStatusRequests);
        return Promise.resolve(
          createResponse({
            version: "0.20.0",
            gateway_running: true,
            gateway_state: "running",
            active_agents: 0,
            active_sessions: 0,
          }) as Awaited<ReturnType<typeof fetchWithTrustedCertificatesAsync>>,
        ).finally(() => {
          activeStatusRequests -= 1;
        });
      }
      if (parsedUrl.pathname === "/api/status") {
        return Promise.resolve(
          createResponse({
            version: "0.20.0",
            gateway_running: true,
            gateway_state: "running",
            profiles,
            gateways: profiles.map((gatewayProfile) => ({ profile: gatewayProfile })),
          }) as Awaited<ReturnType<typeof fetchWithTrustedCertificatesAsync>>,
        );
      }
      if (parsedUrl.pathname === "/api/sessions" && profile) {
        activeSessionRequests += 1;
        maximumSessionRequests = Math.max(maximumSessionRequests, activeSessionRequests);
        return Promise.resolve(
          createResponse({ sessions: [], total: 0, limit: 100, offset: 0 }) as Awaited<
            ReturnType<typeof fetchWithTrustedCertificatesAsync>
          >,
        ).finally(() => {
          activeSessionRequests -= 1;
        });
      }
      if (parsedUrl.pathname === "/api/hermes/update/check") {
        return Promise.resolve(
          createResponse({ current_version: "0.20.0", behind: 0, update_available: false }) as Awaited<
            ReturnType<typeof fetchWithTrustedCertificatesAsync>
          >,
        );
      }
      if (["/api/skills", "/api/cron/jobs", "/api/tools/toolsets"].includes(parsedUrl.pathname)) {
        return Promise.resolve(createResponse([]) as Awaited<ReturnType<typeof fetchWithTrustedCertificatesAsync>>);
      }

      return Promise.resolve(
        createResponse({ error: "Not Found" }, 404) as Awaited<ReturnType<typeof fetchWithTrustedCertificatesAsync>>,
      );
    });

    await createHermesAgentIntegration([]).getOverviewAsync();

    expect(maximumStatusRequests).toBeLessThanOrEqual(4);
    expect(maximumSessionRequests).toBeLessThanOrEqual(4);
    expect(
      mockFetchWithTrustedCertificates.mock.calls.filter(([url]) => {
        const requestUrl = getRequestUrl(url);
        return requestUrl.pathname === "/api/status" && requestUrl.searchParams.has("profile");
      }),
    ).toHaveLength(profiles.length);
    expect(
      mockFetchWithTrustedCertificates.mock.calls.filter(([url]) => {
        const requestUrl = getRequestUrl(url);
        return requestUrl.pathname === "/api/sessions" && requestUrl.searchParams.has("profile");
      }),
    ).toHaveLength(profiles.length);
  });

  test("getOverviewAsync marks merged sessions incomplete when one profile request fails", async () => {
    mockFetchWithTrustedCertificates.mockImplementation((url) => {
      const parsedUrl = getRequestUrl(url);
      const profile = parsedUrl.searchParams.get("profile");

      if (parsedUrl.pathname === "/health") {
        return Promise.resolve(
          new Response("<!doctype html>", { headers: { "content-type": "text/html" } }) as Awaited<
            ReturnType<typeof fetchWithTrustedCertificatesAsync>
          >,
        );
      }
      if (parsedUrl.pathname === "/") {
        return Promise.resolve(
          new Response('<script>window.__HERMES_SESSION_TOKEN__="test-token";</script>', {
            headers: { "content-type": "text/html" },
          }) as Awaited<ReturnType<typeof fetchWithTrustedCertificatesAsync>>,
        );
      }
      if (parsedUrl.pathname === "/api/status") {
        return Promise.resolve(
          createResponse({
            version: "0.20.0",
            release_date: "2026.8.3",
            gateway_running: true,
            gateway_state: "running",
            gateway_platforms: {},
            active_agents: profile === "default" ? 1 : 0,
            active_sessions: profile === "default" ? 1 : 0,
            gateway_mode: "multiple",
            profiles: ["default", "offline"],
            gateways: [{ profile: "default" }, { profile: "offline" }],
          }) as Awaited<ReturnType<typeof fetchWithTrustedCertificatesAsync>>,
        );
      }
      if (parsedUrl.pathname === "/api/sessions") {
        if (profile === "offline") {
          return Promise.resolve(
            createResponse({ error: "Gateway unavailable" }, 503) as Awaited<
              ReturnType<typeof fetchWithTrustedCertificatesAsync>
            >,
          );
        }

        return Promise.resolve(
          createResponse({
            sessions: [{ id: "session-default", last_active: Date.now() / 1000 }],
            total: 1,
            limit: 100,
            offset: 0,
          }) as Awaited<ReturnType<typeof fetchWithTrustedCertificatesAsync>>,
        );
      }
      if (parsedUrl.pathname === "/api/hermes/update/check") {
        return Promise.resolve(
          createResponse({ current_version: "0.20.0", behind: 0, update_available: false }) as Awaited<
            ReturnType<typeof fetchWithTrustedCertificatesAsync>
          >,
        );
      }
      if (["/api/skills", "/api/cron/jobs", "/api/tools/toolsets"].includes(parsedUrl.pathname)) {
        return Promise.resolve(createResponse([]) as Awaited<ReturnType<typeof fetchWithTrustedCertificatesAsync>>);
      }

      return Promise.resolve(
        createResponse({ error: "Not Found" }, 404) as Awaited<ReturnType<typeof fetchWithTrustedCertificatesAsync>>,
      );
    });

    const result = await createHermesAgentIntegration([]).getOverviewAsync();

    expect(result.sessions).toHaveLength(1);
    expect(result.sessionsTotal).toBeNull();
    expect(result.sessionsHasMore).toBe(true);
    expect(result.dataAvailability.sessions).toBe(true);
  });

  test("getOverviewAsync reports an up-to-date release without comparing commits", async () => {
    let compareCalls = 0;
    mockFetchWithTrustedCertificates.mockImplementation((url) => {
      const parsedUrl = getRequestUrl(url);

      if (parsedUrl.hostname === "api.github.com") {
        if (parsedUrl.pathname === "/repos/NousResearch/hermes-agent/releases/latest") {
          return Promise.resolve(
            createResponse({
              tag_name: "v2099.3.3",
              html_url: "https://github.com/NousResearch/hermes-agent",
            }) as Awaited<ReturnType<typeof fetchWithTrustedCertificatesAsync>>,
          );
        }

        compareCalls += 1;
        return Promise.resolve(
          createResponse({ status: "identical", ahead_by: 0 }) as Awaited<
            ReturnType<typeof fetchWithTrustedCertificatesAsync>
          >,
        );
      }

      if (parsedUrl.pathname === "/api/status") {
        return Promise.resolve(
          createResponse({
            version: "0.15.1",
            release_date: "2099.3.3",
            gateway_running: true,
            gateway_state: "running",
          }) as Awaited<ReturnType<typeof fetchWithTrustedCertificatesAsync>>,
        );
      }

      return Promise.resolve(
        createResponse({ error: "Not Found" }, 404) as Awaited<ReturnType<typeof fetchWithTrustedCertificatesAsync>>,
      );
    });

    const integration = createHermesAgentIntegration();
    const result = await integration.getOverviewAsync();

    expect(result.mode).toBe("dashboard");
    expect(result.update).toEqual({
      currentReleaseTag: "v2099.3.3",
      latestReleaseTag: "v2099.3.3",
      hasNewRelease: false,
      commitsBehind: 0,
      releaseUrl: "https://github.com/NousResearch/hermes-agent",
    });
    expect(compareCalls).toBe(0);
  });

  test("getOverviewAsync does not report an update when the local release is newer", async () => {
    mockFetchWithTrustedCertificates.mockImplementation((url) => {
      const parsedUrl = getRequestUrl(url);

      if (parsedUrl.hostname === "api.github.com") {
        if (parsedUrl.pathname === "/repos/NousResearch/hermes-agent/releases/latest") {
          return Promise.resolve(
            createResponse({
              tag_name: "v2099.4.1",
              html_url: "https://github.com/NousResearch/hermes-agent",
            }) as Awaited<ReturnType<typeof fetchWithTrustedCertificatesAsync>>,
          );
        }

        return Promise.resolve(
          createResponse({ status: "behind", ahead_by: 0 }) as Awaited<
            ReturnType<typeof fetchWithTrustedCertificatesAsync>
          >,
        );
      }

      if (parsedUrl.pathname === "/api/status") {
        return Promise.resolve(
          createResponse({
            version: "0.19.0",
            release_date: "2099.4.2",
            gateway_running: true,
            gateway_state: "running",
          }) as Awaited<ReturnType<typeof fetchWithTrustedCertificatesAsync>>,
        );
      }

      return Promise.resolve(
        createResponse({ error: "Not Found" }, 404) as Awaited<ReturnType<typeof fetchWithTrustedCertificatesAsync>>,
      );
    });

    const result = await createHermesAgentIntegration().getOverviewAsync();

    expect(result.update).toMatchObject({
      currentReleaseTag: "v2099.4.2",
      latestReleaseTag: "v2099.4.1",
      hasNewRelease: false,
      commitsBehind: 0,
    });
  });

  test("getOverviewAsync retries a failed GitHub update check instead of caching the rejection", async () => {
    let latestReleaseCalls = 0;
    mockFetchWithTrustedCertificates.mockImplementation((url) => {
      const parsedUrl = getRequestUrl(url);

      if (parsedUrl.hostname === "api.github.com") {
        latestReleaseCalls += 1;
        if (latestReleaseCalls === 1) return Promise.reject(new Error("Temporary GitHub failure"));
        return Promise.resolve(
          createResponse({
            tag_name: "v2099.5.1",
            html_url: "https://github.com/NousResearch/hermes-agent",
          }) as Awaited<ReturnType<typeof fetchWithTrustedCertificatesAsync>>,
        );
      }

      if (parsedUrl.pathname === "/api/status") {
        return Promise.resolve(
          createResponse({
            version: "0.19.0",
            release_date: "2099.5.1",
            gateway_running: true,
            gateway_state: "running",
          }) as Awaited<ReturnType<typeof fetchWithTrustedCertificatesAsync>>,
        );
      }

      return Promise.resolve(
        createResponse({ error: "Not Found" }, 404) as Awaited<ReturnType<typeof fetchWithTrustedCertificatesAsync>>,
      );
    });

    const integration = createHermesAgentIntegration();
    expect((await integration.getOverviewAsync()).update).toBeNull();
    expect((await integration.getOverviewAsync()).update).toMatchObject({ hasNewRelease: false });
    expect(latestReleaseCalls).toBe(2);
  });

  test("getOverviewAsync does not hide API authentication failures behind dashboard fallback", async () => {
    const requestedPaths: string[] = [];
    mockFetchWithTrustedCertificates.mockImplementation((url) => {
      const path = getPathname(url);
      requestedPaths.push(path);

      if (path === "/health") {
        return Promise.resolve(
          createResponse({ status: "ok", platform: "hermes-agent", version: "0.19.0" }) as Awaited<
            ReturnType<typeof fetchWithTrustedCertificatesAsync>
          >,
        );
      }
      if (path === "/health/detailed") {
        return Promise.resolve(
          createResponse({ status: "ready", platform: "hermes-agent", active_agents: 0 }) as Awaited<
            ReturnType<typeof fetchWithTrustedCertificatesAsync>
          >,
        );
      }
      if (path === "/v1/capabilities") {
        return Promise.resolve(
          createResponse({ error: "Invalid API key" }, 401) as Awaited<
            ReturnType<typeof fetchWithTrustedCertificatesAsync>
          >,
        );
      }
      if (path === "/api/status") {
        return Promise.resolve(
          createResponse({ version: "0.19.0", gateway_running: true }) as Awaited<
            ReturnType<typeof fetchWithTrustedCertificatesAsync>
          >,
        );
      }

      return Promise.resolve(
        createResponse({ error: "Not Found" }, 404) as Awaited<ReturnType<typeof fetchWithTrustedCertificatesAsync>>,
      );
    });

    await expect(createHermesAgentIntegration().getOverviewAsync()).rejects.toThrow();
    expect(requestedPaths).not.toContain("/api/status");
  });

  test("getOverviewAsync keeps optional collections empty when optional endpoints are unavailable", async () => {
    setupMockFetch({
      "/health": { status: "ok", platform: "hermes-agent", version: "0.19.0" },
      "/health/detailed": { status: "ok", gateway_state: "running" },
      "/v1/capabilities": {
        object: "hermes.api_server.capabilities",
        platform: "hermes-agent",
        model: "hermes-agent",
        auth: { type: "bearer", required: true },
        features: {},
      },
    });

    const integration = createHermesAgentIntegration();
    const result = await integration.getOverviewAsync();

    expect(result.sessions).toEqual([]);
    expect(result.sessionsTotal).toBeNull();
    expect(result.jobs).toEqual([]);
    expect(result.toolsets).toEqual([]);
    expect(result.skills).toEqual([]);
    expect(result.dataAvailability).toEqual({ sessions: false, jobs: false, toolsets: false, skills: false });
  });

  test("getOverviewAsync supports status-only dashboard mode without an API key", async () => {
    setupMockFetch({
      "/api/status": {
        version: "0.18.2",
        release_date: null,
        gateway_running: true,
        gateway_state: "running",
        gateway_platforms: { telegram: { state: "connected" } },
        active_sessions: 3,
        active_agents: 1,
        gateway_busy: true,
        gateway_drainable: false,
        profiles: ["default"],
        gateway_mode: "single",
        auth_required: true,
        auth_providers: ["basic"],
      },
    });

    const integration = createHermesAgentIntegration([]);
    const result = await integration.getOverviewAsync();

    expect(result.mode).toBe("dashboard");
    expect(result.health).toMatchObject({
      status: "ok",
      version: "0.18.2",
      gateway_state: "running",
      active_agents: 1,
      gateway_busy: true,
      gateway_drainable: false,
    });
    expect(result.dashboardStatus?.profiles).toEqual(["default"]);
    expect(result.dataAvailability).toEqual({ sessions: false, jobs: false, toolsets: false, skills: false });
  });

  test("getCapabilitiesAsync throws when API key is rejected", async () => {
    mockFetchWithTrustedCertificates.mockResolvedValue(
      createResponse({ error: { message: "Invalid API key" } }, 401) as Awaited<
        ReturnType<typeof fetchWithTrustedCertificatesAsync>
      >,
    );

    const integration = createHermesAgentIntegration();
    await expect(integration.getCapabilitiesAsync()).rejects.toThrow();
  });
});
