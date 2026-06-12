// @vitest-environment node

import { beforeEach, describe, expect, test, vi } from "vitest";

import { createDb } from "@homarr/db/test";
import { fetchWithTrustedCertificatesAsync } from "@homarr/core/infrastructure/http";

import type { IntegrationInput } from "../src/base/integration";
import { IntegrationError } from "../src/base/errors/integration-error";
import type { SessionStore } from "../src/base/session-store";
import { TechnitiumDnsIntegration } from "../src/technitium/technitium-integration";
import { apiPaths } from "../src/technitium/technitium-types";
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
    getTrustedCertificateHostnamesAsync: vi.fn().mockResolvedValue([]),
  };
});

vi.mock("@homarr/core/infrastructure/http", () => ({
  fetchWithTrustedCertificatesAsync: vi.fn(),
  createCertificateAgentAsync: vi.fn().mockResolvedValue({ dispatch: vi.fn() }),
  createAxiosCertificateInstanceAsync: vi.fn().mockResolvedValue({}),
}));

type StoredSession = { token: string; version: TechnitiumVersion };

// Stateful session store shared across tests — reset in beforeEach
let sessionData: StoredSession | null = null;
let sessionClearCount = 0;

vi.mock("../src/base/session-store", () => ({
  createSessionStore: () =>
    ({
      async getAsync() {
        return sessionData;
      },
      async setAsync(value: StoredSession) {
        sessionData = value;
      },
      async clearAsync() {
        sessionData = null;
        sessionClearCount++;
      },
    }) satisfies SessionStore<StoredSession>,
}));

// ─── helpers ─────────────────────────────────────────────────────────────────

const mockFetch = vi.mocked(fetchWithTrustedCertificatesAsync);

const BASE_URL = "http://technitium.local:5380";
const STORED_TOKEN = "stored-session-token";
const FRESH_TOKEN = "fresh-session-token";
const API_KEY = "my-api-key";

// Cast lives here so call sites don't need `as never`.
function makeResponse(body: unknown) {
  return {
    ok: true,
    status: 200,
    url: BASE_URL,
    json: () => Promise.resolve(body),
  } as never;
}

function makeInput(
  auth: { kind: "apiKey"; value: string } | { kind: "credentials"; username?: string; password?: string },
): IntegrationInput {
  return {
    id: "test-technitium",
    name: "Technitium DNS",
    url: BASE_URL,
    externalUrl: null,
    decryptedSecrets:
      auth.kind === "apiKey"
        ? [{ kind: "apiKey", value: auth.value }]
        : [
            { kind: "username", value: auth.username ?? "admin" },
            { kind: "password", value: auth.password ?? "admin" },
          ],
  };
}

const okLoginBody = { status: "ok", token: FRESH_TOKEN, info: { version: "15.2.0" } };
const okLoginBodyLegacy = { status: "ok", token: FRESH_TOKEN, info: { version: "14.3.0" } };

const okStatsBody = {
  status: "ok",
  response: {
    stats: {
      totalQueries: 1000,
      totalBlocked: 200,
      blockedZones: 5,
      blockListZones: 300000,
    },
  },
};

const okSettingsEnabledBody = {
  status: "ok",
  response: { enableBlocking: true },
};

// Use resetAllMocks so the mockResolvedValueOnce queue is cleared between tests.
// Pre-populate version cache so API key tests don't trigger the one-time detectVersionAsync probe.
beforeEach(() => {
  vi.resetAllMocks();
  sessionData = { token: "", version: "v15" };
  sessionClearCount = 0;
});

// ─── getSummaryAsync ─────────────────────────────────────────────────────────

// Happy-path helper: queues the default stats+settings mocks and runs getSummaryAsync.
function getSummaryWithDefaults() {
  mockFetch.mockResolvedValueOnce(makeResponse(okStatsBody)).mockResolvedValueOnce(makeResponse(okSettingsEnabledBody));
  return new TechnitiumDnsIntegration(makeInput({ kind: "apiKey", value: API_KEY }), "v15").getSummaryAsync();
}

describe("getSummaryAsync", () => {
  describe("data mapping", () => {
    test("maps totalBlocked → adsBlockedToday", async () => {
      const result = await getSummaryWithDefaults();
      expect(result.adsBlockedToday).toBe(200);
    });

    test("maps totalQueries → dnsQueriesToday", async () => {
      const result = await getSummaryWithDefaults();
      expect(result.dnsQueriesToday).toBe(1000);
    });

    test("domainsBeingBlocked = blockedZones + blockListZones", async () => {
      const result = await getSummaryWithDefaults();
      expect(result.domainsBeingBlocked).toBe(5 + 300000);
    });

    test("adsBlockedTodayPercentage = totalBlocked / totalQueries * 100", async () => {
      const result = await getSummaryWithDefaults();
      expect(result.adsBlockedTodayPercentage).toBeCloseTo(20); // 200/1000*100
    });

    test("adsBlockedTodayPercentage is 0 when totalQueries is 0 (division-by-zero guard)", async () => {
      const zeroStats = {
        status: "ok",
        response: { stats: { totalQueries: 0, totalBlocked: 0, blockedZones: 0, blockListZones: 0 } },
      };
      mockFetch
        .mockResolvedValueOnce(makeResponse(zeroStats))
        .mockResolvedValueOnce(makeResponse(okSettingsEnabledBody));

      const result = await new TechnitiumDnsIntegration(
        makeInput({ kind: "apiKey", value: API_KEY }),
        "v15",
      ).getSummaryAsync();

      expect(result.adsBlockedTodayPercentage).toBe(0);
    });
  });

  describe("blocking status", () => {
    test("status is 'enabled' when enableBlocking=true and no timer", async () => {
      mockFetch
        .mockResolvedValueOnce(makeResponse(okStatsBody))
        .mockResolvedValueOnce(makeResponse(okSettingsEnabledBody));

      const result = await new TechnitiumDnsIntegration(
        makeInput({ kind: "apiKey", value: API_KEY }),
        "v15",
      ).getSummaryAsync();

      expect(result.status).toBe("enabled");
    });

    test("status is 'disabled' when enableBlocking=false (permanent disable)", async () => {
      const settings = { status: "ok", response: { enableBlocking: false } };
      mockFetch.mockResolvedValueOnce(makeResponse(okStatsBody)).mockResolvedValueOnce(makeResponse(settings));

      const result = await new TechnitiumDnsIntegration(
        makeInput({ kind: "apiKey", value: API_KEY }),
        "v15",
      ).getSummaryAsync();

      expect(result.status).toBe("disabled");
    });

    test("status is 'disabled' when enableBlocking=false with a future temporaryDisableBlockingTill (timed disable)", async () => {
      const futureTill = new Date(Date.now() + 5 * 60 * 1000).toISOString();
      const settings = { status: "ok", response: { enableBlocking: false, temporaryDisableBlockingTill: futureTill } };
      mockFetch.mockResolvedValueOnce(makeResponse(okStatsBody)).mockResolvedValueOnce(makeResponse(settings));

      const result = await new TechnitiumDnsIntegration(
        makeInput({ kind: "apiKey", value: API_KEY }),
        "v15",
      ).getSummaryAsync();

      expect(result.status).toBe("disabled");
    });

    test("status is 'enabled' when enableBlocking=true with a past temporaryDisableBlockingTill", async () => {
      const pastTill = new Date(Date.now() - 60 * 1000).toISOString();
      const settings = { status: "ok", response: { enableBlocking: true, temporaryDisableBlockingTill: pastTill } };
      mockFetch.mockResolvedValueOnce(makeResponse(okStatsBody)).mockResolvedValueOnce(makeResponse(settings));

      const result = await new TechnitiumDnsIntegration(
        makeInput({ kind: "apiKey", value: API_KEY }),
        "v15",
      ).getSummaryAsync();

      expect(result.status).toBe("enabled");
    });

    test("status is undefined when settings are unavailable (permission denied)", async () => {
      const denied = { status: "error", errorMessage: "Access was denied." };
      mockFetch.mockResolvedValueOnce(makeResponse(okStatsBody)).mockResolvedValueOnce(makeResponse(denied));

      const result = await new TechnitiumDnsIntegration(
        makeInput({ kind: "apiKey", value: API_KEY }),
        "v15",
      ).getSummaryAsync();

      expect(result.status).toBeUndefined();
    });
  });

  describe("error propagation", () => {
    test("throws when stats returns invalid-token", async () => {
      mockFetch
        .mockResolvedValueOnce(makeResponse({ status: "invalid-token" }))
        .mockResolvedValueOnce(makeResponse(okSettingsEnabledBody));

      await expect(
        new TechnitiumDnsIntegration(makeInput({ kind: "apiKey", value: API_KEY }), "v15").getSummaryAsync(),
      ).rejects.toBeInstanceOf(IntegrationError);
    });

    test("throws when stats returns error status", async () => {
      mockFetch
        .mockResolvedValueOnce(makeResponse({ status: "error", errorMessage: "Something went wrong" }))
        .mockResolvedValueOnce(makeResponse(okSettingsEnabledBody));

      await expect(
        new TechnitiumDnsIntegration(makeInput({ kind: "apiKey", value: API_KEY }), "v15").getSummaryAsync(),
      ).rejects.toBeInstanceOf(IntegrationError);
    });

    test("throws when settings return invalid-token (not silently degraded)", async () => {
      mockFetch
        .mockResolvedValueOnce(makeResponse(okStatsBody))
        .mockResolvedValueOnce(makeResponse({ status: "invalid-token" }));

      await expect(
        new TechnitiumDnsIntegration(makeInput({ kind: "apiKey", value: API_KEY }), "v15").getSummaryAsync(),
      ).rejects.toBeInstanceOf(IntegrationError);
    });
  });

  describe("version routing", () => {
    test("all versions hit /api/dashboard/stats/get", async () => {
      for (const version of ["v15", "legacy"] as const) {
        vi.resetAllMocks();
        sessionData = { token: "", version };
        mockFetch
          .mockResolvedValueOnce(makeResponse(okStatsBody))
          .mockResolvedValueOnce(makeResponse(okSettingsEnabledBody));

        await new TechnitiumDnsIntegration(makeInput({ kind: "apiKey", value: API_KEY }), version).getSummaryAsync();

        expect(mockFetch.mock.calls.some((c) => String(c[0]).includes(apiPaths.stats))).toBe(true);
      }
    });
  });
});

// ─── enableAsync ─────────────────────────────────────────────────────────────

describe("enableAsync", () => {
  test("sends enableBlocking=true to settingsSet endpoint", async () => {
    mockFetch.mockResolvedValueOnce(makeResponse({ status: "ok" }));

    await new TechnitiumDnsIntegration(makeInput({ kind: "apiKey", value: API_KEY }), "v15").enableAsync();

    const url = String(mockFetch.mock.calls[0]?.[0]);
    expect(url).toContain(apiPaths.settingsSet);
    expect(url).toContain("enableBlocking=true");
  });

  test("throws on error status", async () => {
    mockFetch.mockResolvedValueOnce(makeResponse({ status: "error", errorMessage: "Denied" }));

    await expect(
      new TechnitiumDnsIntegration(makeInput({ kind: "apiKey", value: API_KEY }), "v15").enableAsync(),
    ).rejects.toBeInstanceOf(IntegrationError);
  });

  test("throws and clears store on invalid-token (credentials auth)", async () => {
    sessionData = { token: STORED_TOKEN, version: "v15" };
    mockFetch.mockResolvedValueOnce(makeResponse({ status: "invalid-token" }));

    await expect(
      new TechnitiumDnsIntegration(makeInput({ kind: "credentials" }), "v15").enableAsync(),
    ).rejects.toBeInstanceOf(IntegrationError);

    expect(sessionClearCount).toBeGreaterThan(0);
    expect(sessionData).toBeNull();
  });

  test("throws but does NOT clear store on invalid-token (apiKey auth)", async () => {
    mockFetch.mockResolvedValueOnce(makeResponse({ status: "invalid-token" }));

    await expect(
      new TechnitiumDnsIntegration(makeInput({ kind: "apiKey", value: API_KEY }), "v15").enableAsync(),
    ).rejects.toBeInstanceOf(IntegrationError);

    expect(sessionClearCount).toBe(0);
  });
});

// ─── disableAsync ─────────────────────────────────────────────────────────────

describe("disableAsync", () => {
  test("duration=0 sends enableBlocking=false to settingsSet (permanent disable)", async () => {
    mockFetch.mockResolvedValueOnce(makeResponse({ status: "ok" }));

    await new TechnitiumDnsIntegration(makeInput({ kind: "apiKey", value: API_KEY }), "v15").disableAsync(0);

    const url = String(mockFetch.mock.calls[0]?.[0]);
    expect(url).toContain(apiPaths.settingsSet);
    expect(url).toContain("enableBlocking=false");
    expect(url).not.toContain("temporaryDisable");
  });

  test("duration>0 hits temporaryDisableBlocking, NOT settingsSet", async () => {
    mockFetch.mockResolvedValueOnce(makeResponse({ status: "ok" }));

    await new TechnitiumDnsIntegration(makeInput({ kind: "apiKey", value: API_KEY }), "v15").disableAsync(120);

    const url = String(mockFetch.mock.calls[0]?.[0]);
    expect(url).toContain(apiPaths.temporaryDisable);
    expect(url).not.toContain("enableBlocking");
  });

  test.each([
    [60, 1],
    [120, 2],
    [1, 1], // 1s rounds up to 1 min
    [59, 1], // 59s rounds up to 1 min
    [61, 2], // 61s rounds up to 2 min
    [3600, 60], // 1 hour = 60 min
  ])("duration=%is → minutes=%i sent to temporaryDisableBlocking", async (durationSec, expectedMin) => {
    mockFetch.mockResolvedValueOnce(makeResponse({ status: "ok" }));

    await new TechnitiumDnsIntegration(makeInput({ kind: "apiKey", value: API_KEY }), "v15").disableAsync(durationSec);

    expect(String(mockFetch.mock.calls[0]?.[0])).toContain(`minutes=${expectedMin}`);
  });
});

// ─── token acquisition ────────────────────────────────────────────────────────

describe("token acquisition", () => {
  test("apiKey is sent as Bearer header — session store is never touched", async () => {
    sessionData = { token: "should-not-be-used", version: "v15" };
    mockFetch
      .mockResolvedValueOnce(makeResponse(okStatsBody))
      .mockResolvedValueOnce(makeResponse(okSettingsEnabledBody));

    await new TechnitiumDnsIntegration(makeInput({ kind: "apiKey", value: API_KEY }), "v15").getSummaryAsync();

    for (const call of mockFetch.mock.calls) {
      const headers = call[1]?.headers as Record<string, string> | undefined;
      expect(headers?.["Authorization"]).toBe(`Bearer ${API_KEY}`);
    }
  });

  test("empty apiKey falls back to credentials — login is called", async () => {
    sessionData = null; // cold store — credentials need to login
    // Realistic scenario: apiKey secret exists but is empty, credentials are also configured
    const input: IntegrationInput = {
      id: "test-technitium",
      name: "Technitium DNS",
      url: BASE_URL,
      externalUrl: null,
      decryptedSecrets: [
        { kind: "apiKey", value: "" },
        { kind: "username", value: "admin" },
        { kind: "password", value: "admin" },
      ],
    };
    mockFetch
      .mockResolvedValueOnce(makeResponse(okLoginBody))
      .mockResolvedValueOnce(makeResponse(okStatsBody))
      .mockResolvedValueOnce(makeResponse(okSettingsEnabledBody));

    await new TechnitiumDnsIntegration(input, "v15").getSummaryAsync();

    expect(mockFetch.mock.calls.some((c) => String(c[0]).includes(apiPaths.login))).toBe(true);
  });

  test("warm session store is used — no login call", async () => {
    sessionData = { token: STORED_TOKEN, version: "v15" };
    mockFetch
      .mockResolvedValueOnce(makeResponse(okStatsBody))
      .mockResolvedValueOnce(makeResponse(okSettingsEnabledBody));

    await new TechnitiumDnsIntegration(makeInput({ kind: "credentials" }), "v15").getSummaryAsync();

    expect(mockFetch.mock.calls.every((c) => !String(c[0]).includes("login"))).toBe(true);
  });

  test("cold session store triggers login and caches the token", async () => {
    sessionData = null; // cold store — override beforeEach version cache
    mockFetch
      .mockResolvedValueOnce(makeResponse(okLoginBody))
      .mockResolvedValueOnce(makeResponse(okStatsBody))
      .mockResolvedValueOnce(makeResponse(okSettingsEnabledBody));

    await new TechnitiumDnsIntegration(makeInput({ kind: "credentials" }), "v15").getSummaryAsync();

    expect(mockFetch.mock.calls.some((c) => String(c[0]).includes(apiPaths.login))).toBe(true);
    expect((sessionData as { token: string } | null)?.token).toBe(FRESH_TOKEN);
  });

  test("login failure throws", async () => {
    sessionData = null; // cold store — override beforeEach version cache
    mockFetch.mockResolvedValueOnce(makeResponse({ status: "error", errorMessage: "Invalid credentials" }));

    await expect(
      new TechnitiumDnsIntegration(makeInput({ kind: "credentials" }), "v15").getSummaryAsync(),
    ).rejects.toBeInstanceOf(IntegrationError);
  });

  test("stats invalid-token clears store (credentials auth)", async () => {
    sessionData = { token: STORED_TOKEN, version: "v15" };
    mockFetch
      .mockResolvedValueOnce(makeResponse({ status: "invalid-token" }))
      .mockResolvedValueOnce(makeResponse(okSettingsEnabledBody));

    await expect(
      new TechnitiumDnsIntegration(makeInput({ kind: "credentials" }), "v15").getSummaryAsync(),
    ).rejects.toBeInstanceOf(IntegrationError);

    expect(sessionData).toBeNull();
  });

  test("stats invalid-token does NOT clear store (apiKey auth)", async () => {
    mockFetch
      .mockResolvedValueOnce(makeResponse({ status: "invalid-token" }))
      .mockResolvedValueOnce(makeResponse(okSettingsEnabledBody));

    await expect(
      new TechnitiumDnsIntegration(makeInput({ kind: "apiKey", value: API_KEY }), "v15").getSummaryAsync(),
    ).rejects.toBeInstanceOf(IntegrationError);

    expect(sessionClearCount).toBe(0);
  });
});

// ─── version-specific request format ─────────────────────────────────────────

describe("request format per version", () => {
  test("v15 sends token as Authorization: Bearer header", async () => {
    sessionData = { token: STORED_TOKEN, version: "v15" };
    mockFetch
      .mockResolvedValueOnce(makeResponse(okStatsBody))
      .mockResolvedValueOnce(makeResponse(okSettingsEnabledBody));

    await new TechnitiumDnsIntegration(makeInput({ kind: "credentials" }), "v15").getSummaryAsync();

    const statsCall = mockFetch.mock.calls.find((c) => String(c[0]).includes("stats"));
    const headers = statsCall?.[1]?.headers as Record<string, string> | undefined;
    expect(headers?.["Authorization"]).toBe(`Bearer ${STORED_TOKEN}`);
    expect(String(statsCall?.[0])).not.toContain("token=");
  });

  test("legacy sends token as ?token= query param, not in header", async () => {
    sessionData = { token: STORED_TOKEN, version: "legacy" };
    mockFetch
      .mockResolvedValueOnce(makeResponse(okStatsBody))
      .mockResolvedValueOnce(makeResponse(okSettingsEnabledBody));

    await new TechnitiumDnsIntegration(makeInput({ kind: "credentials" }), "legacy").getSummaryAsync();

    const statsCall = mockFetch.mock.calls.find((c) => String(c[0]).includes(apiPaths.stats));
    const headers = statsCall?.[1]?.headers as Record<string, string> | undefined;
    expect(headers?.["Authorization"]).toBeUndefined();
    expect(String(statsCall?.[0])).toContain(`token=${STORED_TOKEN}`);
  });

  test("login uses /api/user/login", async () => {
    sessionData = null; // cold store — override beforeEach version cache
    mockFetch
      .mockResolvedValueOnce(makeResponse(okLoginBody))
      .mockResolvedValueOnce(makeResponse(okStatsBody))
      .mockResolvedValueOnce(makeResponse(okSettingsEnabledBody));

    await new TechnitiumDnsIntegration(makeInput({ kind: "credentials" }), "v15").getSummaryAsync();

    expect(mockFetch.mock.calls[0]?.[0].toString()).toContain(apiPaths.login);
  });

  test("fallback login uses /api/login when primary path returns 404", async () => {
    sessionData = null; // cold store — override beforeEach version cache
    mockFetch
      .mockResolvedValueOnce({ status: 404, json: () => Promise.resolve({}) } as never) // primary login → 404
      .mockResolvedValueOnce(makeResponse(okLoginBodyLegacy)) // fallback login
      .mockResolvedValueOnce(makeResponse(okStatsBody))
      .mockResolvedValueOnce(makeResponse(okSettingsEnabledBody));

    await new TechnitiumDnsIntegration(makeInput({ kind: "credentials" }), "v15").getSummaryAsync();

    // Call 0 is the primary probe (404), call 1 is the fallback /api/login
    expect(mockFetch.mock.calls[1]?.[0].toString()).toContain("/api/login");
  });

  test("all versions use /api/settings/get", async () => {
    for (const version of ["v15", "legacy"] as const) {
      vi.resetAllMocks();
      sessionData = { token: "", version };
      mockFetch
        .mockResolvedValueOnce(makeResponse(okStatsBody))
        .mockResolvedValueOnce(makeResponse(okSettingsEnabledBody));

      await new TechnitiumDnsIntegration(makeInput({ kind: "apiKey", value: API_KEY }), version).getSummaryAsync();

      expect(mockFetch.mock.calls.some((c) => String(c[0]).includes(apiPaths.settingsGet))).toBe(true);
    }
  });
});

// ─── withTokenRetryAsync ─────────────────────────────────────────────────────

describe("withTokenRetryAsync (retry on token expiry)", () => {
  test("retries getSummaryAsync once after invalid-token and succeeds", async () => {
    sessionData = { token: STORED_TOKEN, version: "v15" };
    // Sequential: stats fails → settings never runs → re-login → stats ok → settings ok
    mockFetch
      .mockResolvedValueOnce(makeResponse({ status: "invalid-token" })) // stats attempt 1
      .mockResolvedValueOnce(makeResponse(okLoginBody)) // re-login
      .mockResolvedValueOnce(makeResponse(okStatsBody)) // stats attempt 2
      .mockResolvedValueOnce(makeResponse(okSettingsEnabledBody)); // settings attempt 2

    const result = await new TechnitiumDnsIntegration(makeInput({ kind: "credentials" }), "v15").getSummaryAsync();

    expect(result.adsBlockedToday).toBe(200);
    expect((sessionData as { token: string } | null)?.token).toBe(FRESH_TOKEN);
  });

  test("retry uses the fresh token, not the expired one", async () => {
    sessionData = { token: STORED_TOKEN, version: "v15" };
    // Sequential: stats(1)→invalid-token, login, stats(2)→ok, settings(2)→ok
    mockFetch
      .mockResolvedValueOnce(makeResponse({ status: "invalid-token" })) // stats attempt 1
      .mockResolvedValueOnce(makeResponse(okLoginBody)) // re-login
      .mockResolvedValueOnce(makeResponse(okStatsBody)) // stats attempt 2
      .mockResolvedValueOnce(makeResponse(okSettingsEnabledBody)); // settings attempt 2

    await new TechnitiumDnsIntegration(makeInput({ kind: "credentials" }), "v15").getSummaryAsync();

    // Retry calls are: stats attempt 2 (index 2) + settings attempt 2 (index 3)
    const retryCalls = mockFetch.mock.calls.slice(2); // skip stats(1) and re-login
    for (const call of retryCalls) {
      const headers = call[1]?.headers as Record<string, string> | undefined;
      expect(headers?.["Authorization"]).toBe(`Bearer ${FRESH_TOKEN}`);
    }
  });

  test("does not retry more than once — second invalid-token throws", async () => {
    sessionData = { token: STORED_TOKEN, version: "v15" };
    // Sequential: stats(1)→invalid-token, login, stats(2)→invalid-token → throws
    mockFetch
      .mockResolvedValueOnce(makeResponse({ status: "invalid-token" })) // stats attempt 1
      .mockResolvedValueOnce(makeResponse(okLoginBody)) // re-login
      .mockResolvedValueOnce(makeResponse({ status: "invalid-token" })); // stats attempt 2 still fails

    await expect(
      new TechnitiumDnsIntegration(makeInput({ kind: "credentials" }), "v15").getSummaryAsync(),
    ).rejects.toBeInstanceOf(IntegrationError);
  });

  test("settings invalid-token triggers full retry (both stats and settings re-run)", async () => {
    sessionData = { token: STORED_TOKEN, version: "v15" };
    mockFetch
      .mockResolvedValueOnce(makeResponse(okStatsBody)) // stats attempt 1
      .mockResolvedValueOnce(makeResponse({ status: "invalid-token" })) // settings attempt 1
      .mockResolvedValueOnce(makeResponse(okLoginBody)) // re-login
      .mockResolvedValueOnce(makeResponse(okStatsBody)) // stats attempt 2
      .mockResolvedValueOnce(makeResponse(okSettingsEnabledBody)); // settings attempt 2

    const result = await new TechnitiumDnsIntegration(makeInput({ kind: "credentials" }), "v15").getSummaryAsync();

    expect(result.status).toBe("enabled");
    expect(mockFetch.mock.calls).toHaveLength(5); // verify 5 requests total (2+1+2)
  });

  test("settings permission denied ('error') does NOT trigger retry", async () => {
    mockFetch
      .mockResolvedValueOnce(makeResponse(okStatsBody))
      .mockResolvedValueOnce(makeResponse({ status: "error", errorMessage: "Access was denied." }));

    const result = await new TechnitiumDnsIntegration(
      makeInput({ kind: "apiKey", value: API_KEY }),
      "v15",
    ).getSummaryAsync();

    expect(result.status).toBeUndefined(); // graceful degradation
    expect(mockFetch.mock.calls).toHaveLength(2); // exactly 2 calls, no retry
  });

  test("retries enableAsync once after invalid-token and succeeds", async () => {
    sessionData = { token: STORED_TOKEN, version: "v15" };
    mockFetch
      .mockResolvedValueOnce(makeResponse({ status: "invalid-token" })) // attempt 1
      .mockResolvedValueOnce(makeResponse(okLoginBody)) // re-login
      .mockResolvedValueOnce(makeResponse({ status: "ok" })); // attempt 2

    await new TechnitiumDnsIntegration(makeInput({ kind: "credentials" }), "v15").enableAsync();

    expect(mockFetch.mock.calls).toHaveLength(3);
  });

  test("apiKey invalid-token is NOT retried — throws immediately", async () => {
    mockFetch.mockResolvedValueOnce(makeResponse({ status: "invalid-token" }));

    await expect(
      new TechnitiumDnsIntegration(makeInput({ kind: "apiKey", value: API_KEY }), "v15").enableAsync(),
    ).rejects.toBeInstanceOf(IntegrationError);

    expect(mockFetch.mock.calls).toHaveLength(1); // only the one failed call, no re-login
  });
});

// ─── login URL format ────────────────────────────────────────────────────────

describe("login URL format", () => {
  test("login URL includes user, pass and includeInfo=true parameters", async () => {
    sessionData = null; // cold store — override beforeEach version cache
    mockFetch
      .mockResolvedValueOnce(makeResponse(okLoginBody))
      .mockResolvedValueOnce(makeResponse(okStatsBody))
      .mockResolvedValueOnce(makeResponse(okSettingsEnabledBody));

    const input = makeInput({ kind: "credentials", username: "myuser", password: "mypass" });
    await new TechnitiumDnsIntegration(input, "v15").getSummaryAsync();

    const loginUrl = String(mockFetch.mock.calls[0]?.[0]);
    expect(loginUrl).toContain("user=myuser");
    expect(loginUrl).toContain("pass=mypass");
    expect(loginUrl).toContain("includeInfo=true");
  });

  test("fallback /api/login carries same parameters as primary path", async () => {
    sessionData = null; // cold store — override beforeEach version cache
    mockFetch
      .mockResolvedValueOnce({ status: 404, json: () => Promise.resolve({}) } as never) // primary → 404
      .mockResolvedValueOnce(makeResponse(okLoginBodyLegacy)) // fallback login
      .mockResolvedValueOnce(makeResponse(okStatsBody))
      .mockResolvedValueOnce(makeResponse(okSettingsEnabledBody));

    const input = makeInput({ kind: "credentials", username: "admin", password: "secret" });
    await new TechnitiumDnsIntegration(input, "v15").getSummaryAsync();

    // Call 1 is the fallback login (call 0 was the primary that got 404)
    const loginUrl = String(mockFetch.mock.calls[1]?.[0]);
    expect(loginUrl).toContain("/api/login");
    expect(loginUrl).toContain("user=admin");
    expect(loginUrl).toContain("pass=secret");
    expect(loginUrl).toContain("includeInfo=true");
  });
});

// ─── auth mechanism per version ──────────────────────────────────────────────
// All versions share the same API paths; only the auth mechanism differs.
describe("auth mechanism per version", () => {
  test("all versions use /api/settings/set for enableAsync and permanent disableAsync", async () => {
    for (const version of ["v15", "legacy"] as const) {
      for (const call of [
        () => new TechnitiumDnsIntegration(makeInput({ kind: "apiKey", value: API_KEY }), version).enableAsync(),
        () => new TechnitiumDnsIntegration(makeInput({ kind: "apiKey", value: API_KEY }), version).disableAsync(0),
      ]) {
        vi.resetAllMocks();
        sessionData = { token: "", version };
        mockFetch.mockResolvedValueOnce(makeResponse({ status: "ok" }));
        await call();
        expect(String(mockFetch.mock.calls[0]?.[0])).toContain(apiPaths.settingsSet);
      }
    }
  });

  test("disableAsync() with no argument defaults to permanent disable", async () => {
    mockFetch.mockResolvedValueOnce(makeResponse({ status: "ok" }));

    await new TechnitiumDnsIntegration(makeInput({ kind: "apiKey", value: API_KEY }), "v15").disableAsync();

    const url = String(mockFetch.mock.calls[0]?.[0]);
    expect(url).toContain("enableBlocking=false");
    expect(url).not.toContain("minutes=");
  });

  test("all versions use /api/settings/temporaryDisableBlocking for timed disableAsync", async () => {
    for (const version of ["v15", "legacy"] as const) {
      vi.resetAllMocks();
      sessionData = { token: "", version };
      mockFetch.mockResolvedValueOnce(makeResponse({ status: "ok" }));

      await new TechnitiumDnsIntegration(makeInput({ kind: "apiKey", value: API_KEY }), version).disableAsync(60);

      expect(String(mockFetch.mock.calls[0]?.[0])).toContain(apiPaths.temporaryDisable);
    }
  });

  test("v15 auth uses Bearer header, legacy auth uses ?token= param", async () => {
    for (const [version, expectBearer] of [
      ["v15", true],
      ["legacy", false],
    ] as const) {
      vi.resetAllMocks();
      sessionData = { token: "", version };
      mockFetch.mockResolvedValueOnce(makeResponse({ status: "ok" }));

      await new TechnitiumDnsIntegration(makeInput({ kind: "apiKey", value: API_KEY }), version).enableAsync();

      const url = String(mockFetch.mock.calls[0]?.[0]);
      const headers = mockFetch.mock.calls[0]?.[1]?.headers as Record<string, string> | undefined;
      if (expectBearer) {
        expect(headers?.["Authorization"]).toContain("Bearer");
        expect(url).not.toContain("token=");
      } else {
        expect(headers?.["Authorization"]).toBeUndefined();
        expect(url).toContain(`token=${API_KEY}`);
      }
    }
  });
});

// ─── testingAsync (session cleanup) ──────────────────────────────────────────

// Calls the protected testingAsync directly with a custom fetchAsync.
function callTestingAsync(integration: TechnitiumDnsIntegration, fetchAsync: typeof fetchWithTrustedCertificatesAsync) {
  return (
    integration as unknown as {
      testingAsync: (input: { fetchAsync: typeof fetchWithTrustedCertificatesAsync }) => Promise<unknown>;
    }
  ).testingAsync({ fetchAsync });
}

describe("testingAsync (session cleanup)", () => {
  test("credentials auth calls logout endpoint after successful test", async () => {
    sessionData = null;
    const fetchMock = vi.fn();
    fetchMock
      .mockResolvedValueOnce(makeResponse(okLoginBody)) // resolveTokenAsync login
      .mockResolvedValueOnce(makeResponse({ status: "ok" })) // stats check
      .mockResolvedValueOnce(makeResponse({ status: "ok" })); // logout

    const integration = new TechnitiumDnsIntegration(makeInput({ kind: "credentials" }), "v15");
    const result = await callTestingAsync(integration, fetchMock);

    const urls = fetchMock.mock.calls.map((c) => String(c[0]));
    expect(urls.some((u) => u.includes(apiPaths.logout))).toBe(true);
    expect(sessionData).toBeNull();
    expect(result).toMatchObject({ success: true });
  });

  test("API key auth does NOT call logout endpoint (warm session cache)", async () => {
    // session already has version cached — no probe needed
    const fetchMock = vi.fn();
    fetchMock.mockResolvedValueOnce(makeResponse({ status: "ok" })); // stats check only

    const integration = new TechnitiumDnsIntegration(makeInput({ kind: "apiKey", value: API_KEY }), "v15");
    const result = await callTestingAsync(integration, fetchMock);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const url = String(fetchMock.mock.calls[0]?.[0]);
    expect(url).not.toContain("/logout");
    expect(sessionData).toBeNull();
    expect(result).toMatchObject({ success: true });
  });

  test("API key auth with cold session: detectVersionAsync probe runs via module-level fetch, not fetchAsync", async () => {
    // Cold store — detectVersionAsync should fire via fetchWithTrustedCertificatesAsync (not fetchMock)
    sessionData = null;
    const fetchMock = vi.fn();
    fetchMock.mockResolvedValueOnce(makeResponse({ status: "ok" })); // stats check

    // detectVersionAsync uses the global mockFetch (fetchWithTrustedCertificatesAsync)
    mockFetch.mockResolvedValueOnce(makeResponse({ status: "ok" })); // version probe → v15

    const integration = new TechnitiumDnsIntegration(makeInput({ kind: "apiKey", value: API_KEY }), "v15");
    const result = await callTestingAsync(integration, fetchMock);

    expect(result).toMatchObject({ success: true });
    // fetchMock (the injected fetchAsync) was only called for the stats check, not the probe
    expect(fetchMock).toHaveBeenCalledTimes(1);
    // The global mockFetch handled the version probe
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  test("logout failure does not fail the connection test", async () => {
    sessionData = null;
    const fetchMock = vi.fn();
    fetchMock
      .mockResolvedValueOnce(makeResponse(okLoginBody)) // resolveTokenAsync login
      .mockResolvedValueOnce(makeResponse({ status: "ok" })) // stats check
      .mockRejectedValueOnce(new Error("network error")); // logout fails

    const integration = new TechnitiumDnsIntegration(makeInput({ kind: "credentials" }), "v15");
    const result = await callTestingAsync(integration, fetchMock);

    expect(fetchMock).toHaveBeenCalledTimes(3); // login + stats + logout (attempted)
    expect(result).toMatchObject({ success: true });
    expect(sessionData).toBeNull(); // store still cleared even when logout fails
  });

  test("legacy server: auth version updated to legacy so ?token= is used instead of Bearer", async () => {
    sessionData = null;
    const fetchMock = vi.fn();
    fetchMock
      .mockResolvedValueOnce({ status: 404, json: () => Promise.resolve({}) } as never) // primary login → 404
      .mockResolvedValueOnce(makeResponse(okLoginBodyLegacy)) // fallback login → legacy
      .mockResolvedValueOnce(makeResponse({ status: "ok" })) // stats check
      .mockResolvedValueOnce(makeResponse({ status: "ok" })); // logout

    const integration = new TechnitiumDnsIntegration(makeInput({ kind: "credentials" }), "v15");
    const result = await callTestingAsync(integration, fetchMock);

    expect(result).toMatchObject({ success: true });
    // All versions use the same paths; the distinction is auth method
    expect(fetchMock.mock.calls.some((c) => String(c[0]).includes(apiPaths.stats))).toBe(true);
    expect(fetchMock.mock.calls.some((c) => String(c[0]).includes(apiPaths.logout))).toBe(true);
    // Stats and logout must use ?token= param, not Bearer (legacy auth)
    const statsCall = fetchMock.mock.calls.find((c) => String(c[0]).includes(apiPaths.stats));
    expect(String(statsCall?.[0])).toContain("token=");
    expect((statsCall?.[1]?.headers as Record<string, string> | undefined)?.["Authorization"]).toBeUndefined();
  });
});
