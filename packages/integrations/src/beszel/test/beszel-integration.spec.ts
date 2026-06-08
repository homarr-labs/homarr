// @vitest-environment node
import { beforeAll, describe, expect, test, vi } from "vitest";

vi.hoisted(() => {
  process.env.SKIP_ENV_VALIDATION = "true";
  process.env.SECRET_ENCRYPTION_KEY = "ff3f4f7ce30e870c9630de9e5d244ffa81101a24ed0dfe5f064beb53a7e684f1";
  process.env.ENABLE_DNS_CACHING = "false";
});

const BESZEL_URL = process.env.BESZEL_TEST_URL ?? "http://localhost:8090";
const BESZEL_EMAIL = process.env.BESZEL_TEST_EMAIL ?? "";
const BESZEL_PASSWORD = process.env.BESZEL_TEST_PASSWORD ?? "";

vi.mock("@homarr/redis", () => ({
  createGetSetChannel: () => ({
    getAsync: vi.fn().mockResolvedValue(null),
    setAsync: vi.fn().mockResolvedValue(undefined),
    removeAsync: vi.fn().mockResolvedValue(undefined),
  }),
}));

vi.mock("@homarr/core/infrastructure/logs", () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
  ErrorWithMetadata: class extends Error {},
}));

vi.mock("@homarr/core/infrastructure/http", () => ({
  fetchWithTrustedCertificatesAsync: (url: URL | string, init?: RequestInit) => fetch(url, init),
  createAxiosCertificateInstanceAsync: vi.fn().mockResolvedValue({}),
  createCertificateAgentAsync: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@homarr/core/infrastructure/certificates", () => ({
  getTrustedCertificateHostnamesAsync: vi.fn().mockResolvedValue([]),
  getAllTrustedCertificatesAsync: vi.fn().mockResolvedValue([]),
}));

import { BeszelIntegration } from "../beszel-integration";

function createBeszelIntegration() {
  return new BeszelIntegration({
    id: "test-beszel",
    name: "Test Beszel",
    url: BESZEL_URL,
    externalUrl: null,
    decryptedSecrets: [
      { kind: "username", value: BESZEL_EMAIL },
      { kind: "password", value: BESZEL_PASSWORD },
    ],
  });
}

const shouldRun = BESZEL_EMAIL && BESZEL_PASSWORD;

describe.skipIf(!shouldRun)("BeszelIntegration (real instance)", () => {
  let integration: BeszelIntegration;
  let systemId: string;

  beforeAll(() => {
    integration = createBeszelIntegration();
  });

  describe("getSystemsAsync", () => {
    test("returns an array of systems", async () => {
      const systems = await integration.getSystemsAsync();
      expect(systems).toBeInstanceOf(Array);
      expect(systems.length).toBeGreaterThan(0);
    });

    test("each system has required fields", async () => {
      const systems = await integration.getSystemsAsync();
      const system = systems[0];
      if (!system) {
        throw new Error("Expected at least one system");
      }
      systemId = system.id;

      expect(system.id).toBeDefined();
      expect(system.name).toBeDefined();
      expect(system.status).toMatch(/^(up|down|paused|pending)$/);
      expect(system.info).toBeDefined();
      expect(typeof system.info.cpu).toBe("number");
      expect(typeof system.info.mp).toBe("number");
      expect(typeof system.info.dp).toBe("number");
    });
  });

  describe("getSystemDetailsAsync", () => {
    test("returns system details with hardware info", async () => {
      const systems = await integration.getSystemsAsync();
      systemId = systems[0]?.id ?? "";

      const details = await integration.getSystemDetailsAsync(systemId);

      expect(details.hostname).toBeDefined();
      expect(details.cpu).toBeDefined();
      expect(typeof details.cores).toBe("number");
      expect(details.cores).toBeGreaterThan(0);
      expect(typeof details.memory).toBe("number");
      expect(details.memory).toBeGreaterThan(0);
      expect(details.os_name).toBeDefined();
    });
  });

  describe("getSystemStatsAsync", () => {
    test("returns time-series stats records", async () => {
      const systems = await integration.getSystemsAsync();
      systemId = systems[0]?.id ?? "";

      const stats = await integration.getSystemStatsAsync(systemId, "1m", 5);

      expect(stats).toBeInstanceOf(Array);
      if (stats.length === 0) return;

      const record = stats[0];
      expect(record?.stats).toBeDefined();
      expect(typeof record?.stats.cpu).toBe("number");
      expect(typeof record?.stats.mp).toBe("number");
      expect(typeof record?.stats.dp).toBe("number");
      expect(record?.created).toBeDefined();
    });
  });

  describe("getContainersAsync", () => {
    test("returns container list", async () => {
      const systems = await integration.getSystemsAsync();
      systemId = systems[0]?.id ?? "";

      const containers = await integration.getContainersAsync(systemId);
      expect(containers).toBeInstanceOf(Array);

      if (containers.length > 0) {
        const container = containers[0];
        expect(container?.name).toBeDefined();
        expect(container?.image).toBeDefined();
        expect(container?.status).toBeDefined();
        expect(typeof container?.cpu).toBe("number");
        expect(typeof container?.memory).toBe("number");
      }
    });
  });

  describe("alert CRUD", () => {
    let alertId: string;

    test("creates an alert", async () => {
      const systems = await integration.getSystemsAsync();
      systemId = systems[0]?.id ?? "";

      const alert = await integration.createAlertAsync(systemId, {
        name: "CPU",
        value: 90,
        min: 1,
      });

      expect(alert.id).toBeDefined();
      expect(alert.name).toBe("CPU");
      expect(alert.value).toBe(90);
      expect(alert.system).toBe(systemId);
      alertId = alert.id;
    });

    test("lists alerts including the created one", async () => {
      const alerts = await integration.getAlertsAsync(systemId);
      const found = alerts.find((a) => a.id === alertId);
      expect(found).toBeDefined();
      expect(found?.name).toBe("CPU");
    });

    test("updates alert threshold", async () => {
      const updated = await integration.updateAlertAsync(alertId, { value: 95 });
      expect(updated.value).toBe(95);
    });

    test("deletes alert", async () => {
      await integration.deleteAlertAsync(alertId);
      const alerts = await integration.getAlertsAsync(systemId);
      const found = alerts.find((a) => a.id === alertId);
      expect(found).toBeUndefined();
    });
  });

  describe("system actions", () => {
    test("pauses and resumes a system", async () => {
      const systems = await integration.getSystemsAsync();
      systemId = systems[0]?.id ?? "";

      await integration.pauseSystemAsync(systemId);
      const afterPause = await integration.getSystemsAsync();
      const paused = afterPause.find((s) => s.id === systemId);
      expect(paused?.status).toBe("paused");

      await integration.resumeSystemAsync(systemId);
      const afterResume = await integration.getSystemsAsync();
      const resumed = afterResume.find((s) => s.id === systemId);
      expect(resumed?.status).toMatch(/^(up|pending)$/);
    });
  });

  describe("authentication", () => {
    test("authenticates with valid credentials", async () => {
      const systems = await integration.getSystemsAsync();
      expect(systems.length).toBeGreaterThan(0);
    });

    test("fails with invalid credentials", async () => {
      const badIntegration = new BeszelIntegration({
        id: "test-bad",
        name: "Bad Beszel",
        url: BESZEL_URL,
        externalUrl: null,
        decryptedSecrets: [
          { kind: "username", value: "wrong@example.com" },
          { kind: "password", value: "wrongpassword" },
        ],
      });

      await expect(badIntegration.getSystemsAsync()).rejects.toThrow();
    });
  });
});
