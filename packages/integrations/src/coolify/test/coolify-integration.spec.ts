import { Response } from "undici";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { fetchWithTrustedCertificatesAsync } from "@homarr/core/infrastructure/http";

import { CoolifyIntegration } from "../coolify-integration";
import type {
  CoolifyApplication,
  CoolifyProject,
  CoolifyProjectWithEnvironments,
  CoolifyServer,
  CoolifyService,
} from "../coolify-types";

// Required mocks for server-side environment variables accessed during import
vi.mock("@homarr/common/env", () => ({
  env: { SECRET_ENCRYPTION_KEY: "0".repeat(64) },
}));

vi.mock("@homarr/core/infrastructure/logs/env", () => ({
  logsEnv: { LEVEL: "info" },
}));

vi.mock("@homarr/core/infrastructure/db/env", () => ({
  dbEnv: { DRIVER: "better-sqlite3" },
}));

vi.mock("@homarr/core/infrastructure/redis", () => ({
  createRedisClient: vi.fn(() => ({
    publish: vi.fn(),
    subscribe: vi.fn(),
    quit: vi.fn(),
  })),
}));

vi.mock("@homarr/core/infrastructure/http", () => ({
  fetchWithTrustedCertificatesAsync: vi.fn(),
}));

const TEST_API_KEY = "test-api-key-12345";
const TEST_URL = "https://coolify.example.com";

type MockResponseData = string | object | unknown[];

const mockFetchWithTrustedCertificates = vi.mocked(fetchWithTrustedCertificatesAsync);

const setupMockFetch = (responses: Record<string, MockResponseData>) => {
  mockFetchWithTrustedCertificates.mockImplementation((url) => {
    const urlString = url instanceof URL ? url.toString() : String(url);
    const urlObj = new URL(urlString);
    const path = urlObj.pathname;

    if (path in responses) {
      const data = responses[path];
      const body = typeof data === "string" ? data : JSON.stringify(data);
      return Promise.resolve(
        new Response(body, {
          status: 200,
          headers: { "content-type": "application/json" },
        }) as unknown as Awaited<ReturnType<typeof fetchWithTrustedCertificatesAsync>>,
      );
    }

    return Promise.resolve(
      new Response(JSON.stringify({ error: "Not Found" }), {
        status: 404,
        headers: { "content-type": "application/json" },
      }) as unknown as Awaited<ReturnType<typeof fetchWithTrustedCertificatesAsync>>,
    );
  });
};

const createCoolifyIntegration = () => {
  return new CoolifyIntegration({
    id: "test-coolify",
    name: "Test Coolify",
    url: TEST_URL,
    externalUrl: null,
    decryptedSecrets: [{ kind: "apiKey", value: TEST_API_KEY }],
  });
};

describe("CoolifyIntegration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getVersionAsync", () => {
    test("should return version string from Coolify API", async () => {
      setupMockFetch({
        "/api/v1/version": "4.0.0-beta.460",
      });

      const integration = createCoolifyIntegration();
      const result = await integration.getVersionAsync();

      expect(result).toBe("4.0.0-beta.460");
      expect(mockFetchWithTrustedCertificates).toHaveBeenCalled();
    });

    test("should throw error when API returns error", async () => {
      mockFetchWithTrustedCertificates.mockResolvedValue(
        new Response("Unauthorized", {
          status: 401,
          headers: { "content-type": "text/plain" },
        }) as unknown as Awaited<ReturnType<typeof fetchWithTrustedCertificatesAsync>>,
      );

      const integration = createCoolifyIntegration();
      await expect(integration.getVersionAsync()).rejects.toThrow();
    });
  });

  describe("listServersAsync", () => {
    test("should return list of servers", async () => {
      const servers: CoolifyServer[] = [
        {
          id: 1,
          uuid: "server-uuid-1",
          name: "Production Server",
          ip: "192.168.1.100",
          is_reachable: true,
          is_usable: true,
          settings: { is_build_server: false },
        },
        {
          id: 2,
          uuid: "server-uuid-2",
          name: "Build Server",
          ip: "192.168.1.101",
          is_reachable: true,
          is_usable: true,
          settings: { is_build_server: true },
        },
      ];

      setupMockFetch({
        "/api/v1/servers": servers,
      });

      const integration = createCoolifyIntegration();
      const result = await integration.listServersAsync();

      expect(result).toHaveLength(2);
      expect(result[0]?.name).toBe("Production Server");
      expect(result[1]?.settings?.is_build_server).toBe(true);
    });
  });

  describe("listApplicationsAsync", () => {
    test("should return list of applications", async () => {
      const applications: CoolifyApplication[] = [
        {
          id: 1,
          uuid: "app-uuid-1",
          name: "my-app",
          fqdn: "https://myapp.example.com",
          status: "running",
          updated_at: "2024-01-01T00:00:00Z",
        },
        {
          id: 2,
          uuid: "app-uuid-2",
          name: "another-app",
          fqdn: "https://another.example.com",
          status: "stopped",
          updated_at: "2024-01-01T00:00:00Z",
        },
      ];

      setupMockFetch({
        "/api/v1/applications": applications,
      });

      const integration = createCoolifyIntegration();
      const result = await integration.listApplicationsAsync();

      expect(result).toHaveLength(2);
      expect(result[0]?.status).toBe("running");
      expect(result[1]?.status).toBe("stopped");
    });
  });

  describe("listServicesAsync", () => {
    test("should return list of services", async () => {
      const services: CoolifyService[] = [
        {
          id: 1,
          uuid: "service-uuid-1",
          name: "postgresql",
          updated_at: "2024-01-01T00:00:00Z",
        },
      ];

      setupMockFetch({
        "/api/v1/services": services,
      });

      const integration = createCoolifyIntegration();
      const result = await integration.listServicesAsync();

      expect(result).toHaveLength(1);
      expect(result[0]?.name).toBe("postgresql");
    });
  });

  describe("listProjectsAsync", () => {
    test("should return list of projects", async () => {
      const projects: CoolifyProject[] = [
        {
          id: 1,
          uuid: "proj-uuid-1",
          name: "Production",
        },
      ];

      setupMockFetch({
        "/api/v1/projects": projects,
      });

      const integration = createCoolifyIntegration();
      const result = await integration.listProjectsAsync();

      expect(result).toHaveLength(1);
      expect(result[0]?.name).toBe("Production");
    });
  });

  describe("getInstanceInfoAsync", () => {
    test("should aggregate all instance data with project context", async () => {
      const projectWithEnvs: CoolifyProjectWithEnvironments = {
        id: 1,
        uuid: "proj-uuid-1",
        name: "Production",
        environments: [
          {
            id: 1,
            uuid: "env-uuid-1",
            name: "production",
            project_id: 1,
          },
        ],
      };

      setupMockFetch({
        "/api/v1/version": "4.0.0-beta.460",
        "/api/v1/applications": [
          {
            id: 1,
            uuid: "app-uuid-1",
            name: "my-app",
            status: "running",
            environment_id: 1,
            updated_at: "2024-01-01T00:00:00Z",
          },
        ],
        "/api/v1/services": [
          {
            id: 1,
            uuid: "service-uuid-1",
            name: "postgres",
            environment_id: 1,
            updated_at: "2024-01-01T00:00:00Z",
          },
        ],
        "/api/v1/projects": [
          {
            id: 1,
            uuid: "proj-uuid-1",
            name: "Production",
          },
        ],
        "/api/v1/servers": [
          {
            id: 1,
            uuid: "server-uuid-1",
            name: "Server 1",
            ip: "192.168.1.1",
            is_reachable: true,
            is_usable: true,
            settings: { is_build_server: false },
          },
        ],
        "/api/v1/projects/proj-uuid-1": projectWithEnvs,
      });

      const integration = createCoolifyIntegration();
      const result = await integration.getInstanceInfoAsync();

      expect(result.version).toBe("4.0.0-beta.460");
      expect(result.applications).toHaveLength(1);
      expect(result.services).toHaveLength(1);
      expect(result.servers).toHaveLength(1);
      expect(result.applications[0]?.projectName).toBe("Production");
      expect(result.applications[0]?.environmentName).toBe("production");
    });
  });

  describe("getHealthcheckAsync", () => {
    test("should return healthcheck status", async () => {
      setupMockFetch({
        "/api/v1/healthcheck": { status: "healthy" },
      });

      const integration = createCoolifyIntegration();
      const result = await integration.getHealthcheckAsync();

      expect(result.status).toBe("healthy");
    });
  });

  describe("getApplicationByUuidAsync", () => {
    test("should return application details by UUID", async () => {
      const application: CoolifyApplication = {
        id: 1,
        uuid: "app-uuid-1",
        name: "my-app",
        fqdn: "https://app.example.com",
        status: "running",
        updated_at: "2024-01-01T00:00:00Z",
      };

      setupMockFetch({
        "/api/v1/applications/app-uuid-1": application,
      });

      const integration = createCoolifyIntegration();
      const result = await integration.getApplicationByUuidAsync("app-uuid-1");

      expect(result.uuid).toBe("app-uuid-1");
      expect(result.name).toBe("my-app");
    });
  });
});
