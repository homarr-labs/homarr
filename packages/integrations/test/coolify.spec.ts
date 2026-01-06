import { beforeAll, describe, expect, test, vi } from "vitest";

import { createDb } from "@homarr/db/test";

import type { CoolifyIntegration as CoolifyIntegrationType } from "../src";
import type {
  CoolifyApplication,
  CoolifyProject,
  CoolifyProjectWithEnvironments,
  CoolifyServer,
  CoolifyService,
} from "../src/coolify/coolify-types";

vi.stubEnv("SECRET_ENCRYPTION_KEY", "0".repeat(64));

vi.mock("@homarr/db", async (importActual) => {
  const actual = await importActual<typeof import("@homarr/db")>();
  return {
    ...actual,
    db: createDb(),
  };
});

vi.mock("@homarr/core/infrastructure/certificates", async (importActual) => {
  const actual = await importActual<typeof import("@homarr/core/infrastructure/certificates")>();
  return {
    ...actual,
    getTrustedCertificateHostnamesAsync: vi.fn().mockImplementation(() => {
      return Promise.resolve([]);
    }),
  };
});

let CoolifyIntegration: typeof CoolifyIntegrationType;

beforeAll(async () => {
  const module = await import("../src");
  CoolifyIntegration = module.CoolifyIntegration;
});

const TEST_API_KEY = "test-api-key-12345";
const TEST_URL = "https://coolify.example.com";

const createCoolifyIntegration = () => {
  return new CoolifyIntegration({
    id: "test-coolify",
    name: "Test Coolify",
    url: TEST_URL,
    externalUrl: null,
    decryptedSecrets: [{ kind: "apiKey", value: TEST_API_KEY }],
  });
};

const createMockFetch = (responses: Record<string, unknown>) => {
  return vi.fn().mockImplementation(async (url: string) => {
    const urlObj = new URL(url);
    const path = urlObj.pathname;

    if (path in responses) {
      const data = responses[path];
      if (typeof data === "string") {
        return {
          ok: true,
          status: 200,
          text: async () => data,
          json: async () => JSON.parse(data),
        };
      }
      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify(data),
        json: async () => data,
      };
    }

    return {
      ok: false,
      status: 404,
      statusText: "Not Found",
    };
  });
};

describe("CoolifyIntegration", () => {
  describe("getVersionAsync", () => {
    test("should return version string from Coolify API", async () => {
      const integration = createCoolifyIntegration();
      const mockFetch = createMockFetch({
        "/api/v1/version": "4.0.0-beta.460",
      });

      const result = await integration.getVersionAsync(mockFetch);

      expect(result).toBe("4.0.0-beta.460");
      expect(mockFetch).toHaveBeenCalled();
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
          created_at: "2025-01-01T00:00:00Z",
          updated_at: "2025-01-06T00:00:00Z",
          settings: { server_id: 1, is_build_server: false },
        },
        {
          id: 2,
          uuid: "server-uuid-2",
          name: "Build Server",
          ip: "192.168.1.101",
          is_reachable: true,
          is_usable: true,
          created_at: "2025-01-01T00:00:00Z",
          updated_at: "2025-01-06T00:00:00Z",
          settings: { server_id: 2, is_build_server: true },
        },
      ];
      const integration = createCoolifyIntegration();
      const mockFetch = createMockFetch({ "/api/v1/servers": servers });

      const result = await integration.listServersAsync(mockFetch);

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
          name: "my-nextjs-app",
          status: "running",
          fqdn: "https://app.example.com",
          environment_id: 1,
          created_at: "2025-01-01T00:00:00Z",
          updated_at: "2025-01-06T00:00:00Z",
        },
        {
          id: 2,
          uuid: "app-uuid-2",
          name: "my-api",
          status: "stopped",
          environment_id: 1,
          created_at: "2025-01-01T00:00:00Z",
          updated_at: "2025-01-05T00:00:00Z",
        },
      ];
      const integration = createCoolifyIntegration();
      const mockFetch = createMockFetch({ "/api/v1/applications": applications });

      const result = await integration.listApplicationsAsync(mockFetch);

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
          uuid: "svc-uuid-1",
          name: "postgres-db",
          status: "running",
          environment_id: 1,
          created_at: "2025-01-01T00:00:00Z",
          updated_at: "2025-01-06T00:00:00Z",
        },
      ];
      const integration = createCoolifyIntegration();
      const mockFetch = createMockFetch({ "/api/v1/services": services });

      const result = await integration.listServicesAsync(mockFetch);

      expect(result).toHaveLength(1);
      expect(result[0]?.name).toBe("postgres-db");
    });
  });

  describe("listProjectsAsync", () => {
    test("should return list of projects", async () => {
      const projects: CoolifyProject[] = [
        {
          id: 1,
          uuid: "proj-uuid-1",
          name: "My Project",
          created_at: "2025-01-01T00:00:00Z",
          updated_at: "2025-01-06T00:00:00Z",
        },
      ];
      const integration = createCoolifyIntegration();
      const mockFetch = createMockFetch({ "/api/v1/projects": projects });

      const result = await integration.listProjectsAsync(mockFetch);

      expect(result).toHaveLength(1);
      expect(result[0]?.name).toBe("My Project");
    });
  });

  describe("getInstanceInfoAsync", () => {
    test("should aggregate all instance data with project context", async () => {
      const projectWithEnv: CoolifyProjectWithEnvironments = {
        id: 1,
        uuid: "proj-uuid-1",
        name: "Production",
        created_at: "2025-01-01T00:00:00Z",
        updated_at: "2025-01-06T00:00:00Z",
        environments: [
          {
            id: 10,
            uuid: "env-uuid-1",
            name: "staging",
            project_id: 1,
            created_at: "2025-01-01T00:00:00Z",
            updated_at: "2025-01-06T00:00:00Z",
          },
        ],
      };

      const applications: CoolifyApplication[] = [
        {
          id: 1,
          uuid: "app-uuid-1",
          name: "my-app",
          status: "running",
          environment_id: 10,
          created_at: "2025-01-01T00:00:00Z",
          updated_at: "2025-01-06T00:00:00Z",
        },
      ];

      const services: CoolifyService[] = [
        {
          id: 1,
          uuid: "svc-uuid-1",
          name: "my-db",
          status: "running",
          environment_id: 10,
          created_at: "2025-01-01T00:00:00Z",
          updated_at: "2025-01-06T00:00:00Z",
        },
      ];

      const servers: CoolifyServer[] = [
        {
          id: 1,
          uuid: "srv-uuid-1",
          name: "Server 1",
          ip: "10.0.0.1",
          is_reachable: true,
          created_at: "2025-01-01T00:00:00Z",
          updated_at: "2025-01-06T00:00:00Z",
        },
      ];

      const integration = createCoolifyIntegration();
      const mockFetch = createMockFetch({
        "/api/v1/version": "4.0.0-beta.460",
        "/api/v1/applications": applications,
        "/api/v1/services": services,
        "/api/v1/projects": [{ id: 1, uuid: "proj-uuid-1", name: "Production" }],
        "/api/v1/projects/proj-uuid-1": projectWithEnv,
        "/api/v1/servers": servers,
      });

      const result = await integration.getInstanceInfoAsync(mockFetch);

      expect(result.version).toBe("4.0.0-beta.460");
      expect(result.servers).toHaveLength(1);
      expect(result.applications).toHaveLength(1);
      expect(result.services).toHaveLength(1);
      expect(result.applications[0]?.projectName).toBe("Production");
      expect(result.applications[0]?.environmentName).toBe("staging");
      expect(result.applications[0]?.environmentUuid).toBe("env-uuid-1");
    });
  });

  describe("getHealthcheckAsync", () => {
    test("should return healthcheck status", async () => {
      const integration = createCoolifyIntegration();
      const mockFetch = createMockFetch({
        "/api/v1/healthcheck": { status: "healthy" },
      });

      const result = await integration.getHealthcheckAsync(mockFetch);

      expect(result.status).toBe("healthy");
    });
  });

  describe("getApplicationByUuidAsync", () => {
    test("should return application details by UUID", async () => {
      const application: CoolifyApplication = {
        id: 1,
        uuid: "app-uuid-1",
        name: "my-app",
        status: "running",
        fqdn: "https://app.example.com",
        git_repository: "https://github.com/user/repo",
        git_branch: "main",
        created_at: "2025-01-01T00:00:00Z",
        updated_at: "2025-01-06T00:00:00Z",
      };
      const integration = createCoolifyIntegration();
      const mockFetch = createMockFetch({
        "/api/v1/applications/app-uuid-1": application,
      });

      const result = await integration.getApplicationByUuidAsync("app-uuid-1", mockFetch);

      expect(result.name).toBe("my-app");
      expect(result.git_repository).toBe("https://github.com/user/repo");
    });
  });
});
