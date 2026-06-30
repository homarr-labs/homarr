// @vitest-environment node

import type { StartedTestContainer } from "testcontainers";
import { GenericContainer, Wait } from "testcontainers";
import { beforeAll, beforeEach, afterAll, describe, expect, test, vi } from "vitest";

import { createDb } from "@homarr/db/test";

import type { IntegrationInput } from "../src/base/integration";
import type { SessionStore } from "../src/base/session-store";
import { TestConnectionError } from "../src/base/test-connection/test-connection-error";
import { createTechnitiumDnsIntegrationAsync } from "../src/technitium/technitium-integration-factory";
import { TechnitiumDnsIntegration } from "../src/technitium/technitium-integration";
import type { TechnitiumVersion } from "../src/technitium/technitium-types";

// ─── module mocks ────────────────────────────────────────────────────────────

vi.mock("@homarr/db", async (importActual) => {
  // eslint-disable-next-line @typescript-eslint/consistent-type-imports
  const actual = await importActual<typeof import("@homarr/db")>();
  return { ...actual, db: createDb() };
});

vi.mock("@homarr/core/infrastructure/certificates", async (importActual) => {
  // eslint-disable-next-line @typescript-eslint/consistent-type-imports
  const actual = await importActual<typeof import("@homarr/core/infrastructure/certificates")>();
  return {
    ...actual,
    getTrustedCertificateHostnamesAsync: vi.fn().mockImplementation(() => Promise.resolve([])),
  };
});

// Stateful in-memory session store keyed by integration id.
type StoredSession = { token: string; version: TechnitiumVersion };
const sessionState: Record<string, StoredSession | null> = {};

vi.mock("../src/base/session-store", () => ({
  createSessionStore: (integration: { id: string }) =>
    ({
      async getAsync() {
        return sessionState[integration.id] ?? null;
      },
      async setAsync(value: StoredSession) {
        sessionState[integration.id] = value;
      },
      async clearAsync() {
        sessionState[integration.id] = null;
      },
    }) satisfies SessionStore<{ token: string }>,
}));

// ─── version matrix ───────────────────────────────────────────────────────────
//
// We test three representative versions:
//   latest  → v15 (current API: Bearer auth, new path layout)
//   14.3.0  → v14 (last legacy release, most likely to be in production)
//   11.5.3  → v11 (oldest supported, sanity-checks long-term legacy stability)
//
// v12 and v13 use the same legacy API as v14 so a separate run adds no new coverage.

type VersionEntry = {
  tag: string;
  apiVersion: TechnitiumVersion;
};

const VERSIONS: VersionEntry[] = [
  { tag: "latest", apiVersion: "v15" },
  { tag: "14.3.0", apiVersion: "legacy" },
  { tag: "11.5.3", apiVersion: "legacy" },
];

// ─── helpers ─────────────────────────────────────────────────────────────────

const DEFAULT_USERNAME = "admin";
const DEFAULT_PASSWORD = "admin";
const INTEGRATION_ID = "test-technitium";

const makeInput = (
  baseUrl: string,
  auth: { kind: "credentials"; password?: string } | { kind: "apiKey"; value: string },
): IntegrationInput => ({
  id: INTEGRATION_ID,
  name: "Technitium DNS",
  url: baseUrl,
  externalUrl: null,
  decryptedSecrets:
    auth.kind === "credentials"
      ? [
          { kind: "username", value: DEFAULT_USERNAME },
          { kind: "password", value: auth.password ?? DEFAULT_PASSWORD },
        ]
      : [{ kind: "apiKey", value: auth.value }],
});

// Fetch an API token appropriate for the server version.
// v15 has a dedicated createToken endpoint; legacy reuses the session token from login.
async function fetchApiToken(baseUrl: string, apiVersion: TechnitiumVersion): Promise<string> {
  if (apiVersion === "v15") {
    // v15 exposes a dedicated endpoint for non-expiring API tokens.
    const res = await fetch(
      `${baseUrl}/api/user/createToken?user=${DEFAULT_USERNAME}&pass=${DEFAULT_PASSWORD}&tokenName=homarr-test`,
    );
    return ((await res.json()) as { token: string }).token;
  }
  // Legacy: /api/user/login exists on all tested versions (v11–v14) and returns a session
  // token that can be used as a long-lived API key via the ?token= query parameter.
  const res = await fetch(`${baseUrl}/api/user/login?user=${DEFAULT_USERNAME}&pass=${DEFAULT_PASSWORD}`);
  return ((await res.json()) as { token: string }).token;
}

// ─── parallel container pool ─────────────────────────────────────────────────
//
// All containers start in parallel so total wait ≈ slowest single startup (~30s),
// not the sum of all startups.

type ContainerEntry = {
  container: StartedTestContainer;
  baseUrl: string;
  apiToken: string;
};

const pool: Record<string, ContainerEntry> = {};

beforeAll(async () => {
  await Promise.all(
    VERSIONS.map(async ({ tag, apiVersion }) => {
      const container = await new GenericContainer(`technitium/dns-server:${tag}`)
        .withExposedPorts(5380)
        // Explicitly set the admin password so all versions use the same credentials.
        // Without this, older versions may generate a random password on first run.
        .withEnvironment({ DNS_SERVER_ADMIN_PASSWORD: DEFAULT_PASSWORD })
        .withWaitStrategy(Wait.forLogMessage("Technitium DNS Server was started successfully."))
        .start();
      const baseUrl = `http://${container.getHost()}:${container.getMappedPort(5380)}`;
      const apiToken = await fetchApiToken(baseUrl, apiVersion);
      pool[tag] = { container, baseUrl, apiToken };
    }),
  );
}, 120_000);

afterAll(async () => {
  await Promise.all(Object.values(pool).map(({ container }) => container.stop()));
});

// ─── version-parameterised suites ────────────────────────────────────────────

describe.each(VERSIONS)("Technitium DNS $tag ($apiVersion)", ({ tag, apiVersion }) => {
  let baseUrl: string;
  let apiToken: string;

  beforeAll(() => {
    const entry = pool[tag];
    if (!entry) throw new Error(`Container pool entry for ${tag} was not initialized`);
    ({ baseUrl, apiToken } = entry);
  });

  beforeEach(() => {
    sessionState[INTEGRATION_ID] = null;
  });

  // ── factory ────────────────────────────────────────────────────────────────

  describe("createTechnitiumDnsIntegrationAsync (factory)", () => {
    test("factory creates a working integration (auto-detects version)", async () => {
      const integration = await createTechnitiumDnsIntegrationAsync(makeInput(baseUrl, { kind: "credentials" }));

      const result = await integration.getSummaryAsync();

      expect(result.status).toBe("enabled");
      expect(result.dnsQueriesToday).toBeGreaterThanOrEqual(0);
    }, 20_000);
  });

  // ── getSummaryAsync ────────────────────────────────────────────────────────

  describe("getSummaryAsync", () => {
    test("returns valid summary with credentials", async () => {
      const integration = new TechnitiumDnsIntegration(makeInput(baseUrl, { kind: "credentials" }));

      const result = await integration.getSummaryAsync();

      expect(result.dnsQueriesToday).toBeGreaterThanOrEqual(0);
      expect(result.adsBlockedToday).toBeGreaterThanOrEqual(0);
      expect(result.adsBlockedTodayPercentage).toBeGreaterThanOrEqual(0);
      expect(result.domainsBeingBlocked).toBeGreaterThanOrEqual(0);
      expect(result.status).toBe("enabled");
    }, 20_000);

    test("returns valid summary with API key", async () => {
      const integration = new TechnitiumDnsIntegration(
        makeInput(baseUrl, { kind: "apiKey", value: apiToken }),
        apiVersion,
      );

      const result = await integration.getSummaryAsync();

      expect(result.status).toBe("enabled");
      expect(result.dnsQueriesToday).toBeGreaterThanOrEqual(0);
    }, 20_000);

    test("domainsBeingBlocked is a non-negative number (blockedZones + blockListZones)", async () => {
      const integration = new TechnitiumDnsIntegration(makeInput(baseUrl, { kind: "credentials" }));

      const result = await integration.getSummaryAsync();

      expect(typeof result.domainsBeingBlocked).toBe("number");
      expect(result.domainsBeingBlocked).toBeGreaterThanOrEqual(0);
    }, 20_000);
  });

  // ── session caching ────────────────────────────────────────────────────────

  describe("session caching", () => {
    test("login is performed once and token is cached for subsequent calls", async () => {
      const integration = new TechnitiumDnsIntegration(makeInput(baseUrl, { kind: "credentials" }));

      await integration.getSummaryAsync();
      const tokenAfterFirst = sessionState[INTEGRATION_ID]?.token;
      expect(tokenAfterFirst).toBeDefined();

      await integration.getSummaryAsync();
      const tokenAfterSecond = sessionState[INTEGRATION_ID]?.token;

      expect(tokenAfterSecond).toBe(tokenAfterFirst);
    }, 20_000);

    test("recovers from an expired/invalid stored token by re-logging in", async () => {
      // Plant a bad token with the correct version so it hits the right API path before failing
      sessionState[INTEGRATION_ID] = {
        token: "deliberately-invalid-token",
        version: apiVersion,
      };

      const integration = new TechnitiumDnsIntegration(makeInput(baseUrl, { kind: "credentials" }), apiVersion);

      const result = await integration.getSummaryAsync();

      expect(result.status).toBe("enabled");
      expect(sessionState[INTEGRATION_ID]).not.toBeNull();
      expect(sessionState[INTEGRATION_ID]?.token).not.toBe("deliberately-invalid-token");
    }, 20_000);
  });

  // ── blocking state changes ─────────────────────────────────────────────────

  describe("blocking state changes", () => {
    test("disableAsync permanently disables blocking", async () => {
      const integration = new TechnitiumDnsIntegration(makeInput(baseUrl, { kind: "credentials" }));

      await integration.disableAsync();
      const result = await integration.getSummaryAsync();

      expect(result.status).toBe("disabled");

      await integration.enableAsync(); // restore
    }, 20_000);

    test("enableAsync re-enables blocking after permanent disable", async () => {
      const integration = new TechnitiumDnsIntegration(makeInput(baseUrl, { kind: "credentials" }));

      await integration.disableAsync();
      await integration.enableAsync();
      const result = await integration.getSummaryAsync();

      expect(result.status).toBe("enabled");
    }, 20_000);

    test("disableAsync with duration temporarily disables blocking", async () => {
      const integration = new TechnitiumDnsIntegration(makeInput(baseUrl, { kind: "credentials" }));

      await integration.disableAsync(120); // 120s → 2 min
      const result = await integration.getSummaryAsync();

      expect(result.status).toBe("disabled");

      await integration.enableAsync(); // restore
    }, 20_000);

    test("disableAsync with small duration (1s) rounds up to 1 minute and disables", async () => {
      const integration = new TechnitiumDnsIntegration(makeInput(baseUrl, { kind: "credentials" }));

      await integration.disableAsync(1);
      const result = await integration.getSummaryAsync();

      expect(result.status).toBe("disabled");

      await integration.enableAsync(); // restore
    }, 20_000);

    test("enableAsync cancels an active timed disable immediately", async () => {
      const integration = new TechnitiumDnsIntegration(makeInput(baseUrl, { kind: "credentials" }));

      await integration.disableAsync(600); // 10 minutes
      await integration.enableAsync();
      const result = await integration.getSummaryAsync();

      expect(result.status).toBe("enabled");
    }, 20_000);
  });

  // ── testConnectionAsync ────────────────────────────────────────────────────

  describe("testConnectionAsync", () => {
    test("succeeds with valid credentials", async () => {
      const result = await new TechnitiumDnsIntegration(
        makeInput(baseUrl, { kind: "credentials" }),
      ).testConnectionAsync();
      expect(result.success).toBe(true);
    }, 20_000);

    test("succeeds with valid API key", async () => {
      const result = await new TechnitiumDnsIntegration(
        makeInput(baseUrl, { kind: "apiKey", value: apiToken }),
        apiVersion,
      ).testConnectionAsync();
      expect(result.success).toBe(true);
    }, 20_000);

    test("fails with wrong password — returns authorization error", async () => {
      const integration = new TechnitiumDnsIntegration(
        makeInput(baseUrl, {
          kind: "credentials",
          password: "wrong-password",
        }),
      );

      const result = await integration.testConnectionAsync();

      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.error).toBeInstanceOf(TestConnectionError);
      expect(result.error.type).toBe("authorization");
    }, 20_000);

    test("fails with invalid API key — returns authorization error", async () => {
      const result = await new TechnitiumDnsIntegration(
        makeInput(baseUrl, { kind: "apiKey", value: "invalid-api-key-xyz" }),
        apiVersion,
      ).testConnectionAsync();

      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.error).toBeInstanceOf(TestConnectionError);
      expect(result.error.type).toBe("authorization");
    }, 20_000);
  });
});
