// @vitest-environment node

import { beforeEach, describe, expect, test, vi } from "vitest";

import type { Session } from "@homarr/auth";
import { createId } from "@homarr/common";
import type { Database } from "@homarr/db";
import { integrations, integrationUserPermissions, users } from "@homarr/db/schema";
import { createDb } from "@homarr/db/test";
import type { IntegrationKind } from "@homarr/definitions";
import type {
  MediaRequest,
  MediaRequestStats,
  SpeedtestTrackerDashboardData,
  TracearrDashboardData,
  TraefikDashboardData,
  UpsSummary,
  UptimeKumaDashboardData,
} from "@homarr/integrations/types";
import type * as MediaRequestListHandlerModule from "@homarr/request-handler/media-request-list";

import { calendarRouter } from "../../widgets/calendar";
import { dnsHoleRouter } from "../../widgets/dns-hole";
import { downloadsRouter } from "../../widgets/downloads";
import { beszelRouter } from "../../widgets/beszel";
import { firewallRouter } from "../../widgets/firewall";
import { healthMonitoringRouter } from "../../widgets/health-monitoring";
import { indexerManagerRouter } from "../../widgets/indexer-manager";
import { mediaOrganizerRouter } from "../../widgets/media-organizer";
import { mediaRequestsRouter } from "../../widgets/media-requests";
import { mediaServerRouter } from "../../widgets/media-server";
import { networkControllerRouter } from "../../widgets/network-controller";
import { notificationsRouter } from "../../widgets/notifications";
import { speedtestTrackerRouter } from "../../widgets/speedtest-tracker";
import { tracearrRouter } from "../../widgets/tracearr";
import { traefikRouter } from "../../widgets/traefik";
import { upsRouter } from "../../widgets/ups";
import { uptimeKumaRouter } from "../../widgets/uptime-kuma";
import { vpnRouter } from "../../widgets/vpn";

vi.hoisted(() => {
  process.env.SKIP_ENV_VALIDATION = "true";
});

const createHandler = <T>(integration: { name: string }, data: T) => ({
  getDataAsync: async () => {
    if (integration.name === "Offline") {
      throw new Error(
        "GET http://admin:password@internal.example/private/path?token=secret returned\nprivate response body",
      );
    }
    return { data, timestamp: new Date() };
  },
});

vi.mock("@homarr/request-handler/calendar", () => ({
  calendarMonthRequestHandler: { handler: (integration: { name: string }) => createHandler(integration, []) },
}));

vi.mock("@homarr/request-handler/media-server", () => ({
  mediaServerRequestHandler: { handler: (integration: { name: string }) => createHandler(integration, []) },
}));

vi.mock("@homarr/request-handler/dns-hole", () => ({
  dnsHoleRequestHandler: {
    handler: (integration: { name: string }) =>
      createHandler(integration, {
        status: "enabled",
        domainsBeingBlocked: 10,
        adsBlockedToday: 2,
        adsBlockedTodayPercentage: 20,
        dnsQueriesToday: 10,
      }),
  },
}));

vi.mock("@homarr/request-handler/downloads", () => ({
  downloadClientRequestHandler: {
    handler: (integration: { name: string }) =>
      createHandler(integration, {
        items: [],
        status: { paused: false, rates: { down: 0, up: 0 }, types: ["torrent"] },
      }),
  },
}));

vi.mock("@homarr/request-handler/health-monitoring", () => ({
  systemInfoRequestHandler: {
    handler: (integration: { name: string }) =>
      createHandler(integration, {
        version: "1.0",
        cpuModelName: "CPU",
        cpuUtilization: 10,
        memUsedInBytes: 1,
        memAvailableInBytes: 2,
        uptime: 1,
        network: null,
        loadAverage: null,
        rebootRequired: false,
        availablePkgUpdates: 0,
        cpuTemp: undefined,
        fileSystem: [],
        smart: [],
        gpu: [],
      }),
  },
  clusterInfoRequestHandler: { handler: () => createHandler({ name: "Online" }, {}) },
}));

vi.mock("@homarr/request-handler/network-controller", () => ({
  networkControllerRequestHandler: {
    handler: (integration: { name: string }) =>
      createHandler(integration, {
        wanStatus: "enabled",
        www: { status: "enabled", latency: 5, ping: 6, uptime: 99 },
        wifi: { status: "enabled", users: 2, guests: 1 },
        lan: { status: "enabled", users: 3, guests: 0 },
        vpn: { status: "enabled", users: 1 },
      }),
  },
}));

vi.mock("@homarr/request-handler/media-organizer", () => ({
  mediaOrganizerRequestHandler: {
    handler: (integration: { name: string }) =>
      createHandler(integration, { missing: [], missingCount: 0, queued: [], queuedCount: 0 }),
  },
}));

vi.mock("@homarr/request-handler/beszel", () => ({
  beszelSystemsRequestHandler: { handler: (integration: { name: string }) => createHandler(integration, []) },
}));

vi.mock("@homarr/request-handler/firewall", () => ({
  firewallCpuRequestHandler: { handler: (integration: { name: string }) => createHandler(integration, { total: 1 }) },
  firewallInterfacesRequestHandler: { handler: (integration: { name: string }) => createHandler(integration, []) },
  firewallMemoryRequestHandler: {
    handler: (integration: { name: string }) => createHandler(integration, { used: 1, total: 2, percent: 50 }),
  },
  firewallVersionRequestHandler: {
    handler: (integration: { name: string }) => createHandler(integration, { version: "1.0" }),
  },
}));

vi.mock("@homarr/request-handler/indexer-manager", () => ({
  indexerManagerRequestHandler: { handler: (integration: { name: string }) => createHandler(integration, []) },
}));

vi.mock("@homarr/request-handler/notifications", () => ({
  notificationsRequestHandler: { handler: (integration: { name: string }) => createHandler(integration, []) },
}));

vi.mock("@homarr/request-handler/vpn", () => ({
  vpnSummaryHandler: { handler: (integration: { name: string }) => createHandler(integration, { connected: true }) },
}));

vi.mock("@homarr/request-handler/tracearr", () => ({
  tracearrRequestHandler: {
    handler: (integration: { name: string }) =>
      createHandler(integration, {
        stats: { activeStreams: 0, totalUsers: 1, totalSessions: 1, recentViolations: 0, timestamp: "now" },
        streams: {
          data: [],
          summary: { total: 0, transcodes: 0, directStreams: 0, directPlays: 0, totalBitrate: "0", byServer: [] },
        },
        violations: null,
        recentActivity: null,
      } satisfies TracearrDashboardData),
  },
}));

vi.mock("@homarr/request-handler/speedtest-tracker", () => ({
  speedtestTrackerRequestHandler: {
    handler: (integration: { name: string }) =>
      createHandler(integration, {
        latestResult: null,
        stats: null,
        recentResults: [],
      } satisfies SpeedtestTrackerDashboardData),
  },
}));

vi.mock("@homarr/request-handler/ups", () => ({
  upsSummariesRequestHandler: {
    handler: (integration: { name: string }) =>
      createHandler(integration, [
        {
          id: "healthy-ups",
          name: "Healthy UPS",
          manufacturer: null,
          model: null,
          serial: null,
          status: "online",
          batteryCharge: 100,
          batteryRuntime: 3600,
          batteryVoltage: null,
          load: 10,
          inputVoltage: null,
          outputVoltage: null,
          power: null,
          temperature: null,
        } satisfies UpsSummary,
      ]),
  },
}));

vi.mock("@homarr/request-handler/traefik", () => {
  const emptySummary = { total: 0, enabled: 0, warnings: 0, errors: 0 };
  return {
    traefikRequestHandler: {
      handler: (integration: { name: string }) =>
        createHandler(integration, {
          version: "3.0.0",
          entryPoints: [],
          resources: [],
          failedEndpoints: [],
          http: { routers: emptySummary, services: emptySummary, middlewares: emptySummary },
          tcp: { routers: emptySummary, services: emptySummary, middlewares: emptySummary },
          udp: { routers: emptySummary, services: emptySummary },
        } satisfies TraefikDashboardData),
    },
  };
});

vi.mock("@homarr/request-handler/uptime-kuma", () => ({
  uptimeKumaRequestHandler: {
    handler: (integration: { name: string }) =>
      createHandler(integration, {
        totalMonitors: 1,
        upCount: 1,
        downCount: 0,
        pausedCount: 0,
        averageUptimePercent: 100,
        monitors: [{ id: 1, name: "Healthy monitor", status: "up", uptimePercent24h: 100 }],
      } satisfies UptimeKumaDashboardData),
  },
}));

vi.mock("@homarr/request-handler/media-request-list", async (importOriginal) => {
  const actual = await importOriginal<typeof MediaRequestListHandlerModule>();
  return {
    ...actual,
    mediaRequestListRequestHandler: {
      handler: (integration: { name: string }) =>
        createHandler(integration, [
          {
            id: 42,
            name: "Healthy request",
            type: "movie",
            backdropImageUrl: "https://example.com/backdrop.jpg",
            posterImagePath: "https://example.com/poster.jpg",
            href: "https://example.com/request/42",
            createdAt: new Date("2026-08-01T12:00:00Z"),
            status: "pending",
            availability: "requested",
          } satisfies MediaRequest,
        ]),
    },
  };
});

vi.mock("@homarr/request-handler/media-request-stats", () => ({
  mediaRequestStatsRequestHandler: {
    handler: (integration: { name: string }) =>
      createHandler(integration, {
        stats: { total: 0, movie: 0, tv: 0, pending: 0, approved: 0, declined: 0, processing: 0, available: 0 },
        users: [
          {
            id: 7,
            displayName: "Healthy user",
            avatar: "https://example.com/avatar.jpg",
            requestCount: 3,
            link: "https://example.com/user/7",
          },
        ],
      } satisfies MediaRequestStats),
  },
}));

const createSession = (userId: string): Session => ({
  user: { id: userId, permissions: [], colorScheme: "light" },
  expires: new Date().toISOString(),
});

const setupAsync = async (kind: IntegrationKind, options: { allOffline?: boolean } = {}) => {
  const db = createDb();
  const userId = createId();
  const onlineId = createId();
  const offlineId = createId();
  await db.insert(users).values({ id: userId });
  await db.insert(integrations).values([
    { id: onlineId, kind, name: options.allOffline ? "Offline" : "Online", url: "https://online.example.com" },
    { id: offlineId, kind, name: "Offline", url: "https://offline.example.com" },
  ]);
  await db.insert(integrationUserPermissions).values([
    { integrationId: onlineId, userId, permission: "use" },
    { integrationId: offlineId, userId, permission: "use" },
  ]);
  return {
    db: db as Database,
    session: createSession(userId),
    integrationIds: [onlineId, offlineId],
    onlineId,
    offlineId,
  };
};

type IntegrationSetup = Awaited<ReturnType<typeof setupAsync>>;

const dashboardPartialFailureCases = [
  {
    kind: "tracearr" as const,
    payloadKey: "dashboard",
    fallbackValue: null,
    run: async (setup: IntegrationSetup) =>
      await tracearrRouter
        .createCaller({ db: setup.db, deviceType: undefined, session: setup.session })
        .getDashboard({ integrationIds: setup.integrationIds }),
  },
  {
    kind: "speedtestTracker" as const,
    payloadKey: "dashboard",
    fallbackValue: null,
    run: async (setup: IntegrationSetup) =>
      await speedtestTrackerRouter
        .createCaller({ db: setup.db, deviceType: undefined, session: setup.session })
        .getDashboard({ integrationIds: setup.integrationIds }),
  },
  {
    kind: "peaNut" as const,
    payloadKey: "summaries",
    fallbackValue: [],
    run: async (setup: IntegrationSetup) =>
      await upsRouter
        .createCaller({ db: setup.db, deviceType: undefined, session: setup.session })
        .getSummaries({ integrationIds: setup.integrationIds }),
  },
  {
    kind: "traefik" as const,
    payloadKey: "dashboard",
    fallbackValue: null,
    run: async (setup: IntegrationSetup) =>
      await traefikRouter
        .createCaller({ db: setup.db, deviceType: undefined, session: setup.session })
        .getDashboard({ integrationIds: setup.integrationIds }),
  },
  {
    kind: "uptimeKuma" as const,
    payloadKey: "dashboard",
    fallbackValue: null,
    run: async (setup: IntegrationSetup) =>
      await uptimeKumaRouter
        .createCaller({ db: setup.db, deviceType: undefined, session: setup.session })
        .getDashboard({ integrationIds: setup.integrationIds }),
  },
] as const;

beforeEach(() => vi.clearAllMocks());

describe("partial integration failures", () => {
  test("calendar and media server retain a failed integration record", async () => {
    const calendar = await setupAsync("sonarr");
    const calendarResults = await calendarRouter
      .createCaller({ db: calendar.db, deviceType: undefined, session: calendar.session })
      .findAllEvents({
        integrationIds: calendar.integrationIds,
        year: 2026,
        month: 7,
        releaseType: [],
        showUnmonitored: false,
      });
    expect(calendarResults).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          integration: expect.objectContaining({ id: calendar.offlineId }),
          error: "INTEGRATION_REQUEST_FAILED",
        }),
      ]),
    );
    expect(JSON.stringify(calendarResults)).not.toContain("secret");

    const mediaServer = await setupAsync("plex");
    const streamResults = await mediaServerRouter
      .createCaller({ db: mediaServer.db, deviceType: undefined, session: mediaServer.session })
      .getCurrentStreams({ integrationIds: mediaServer.integrationIds, showOnlyPlaying: false });
    expect(streamResults).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          integrationId: mediaServer.offlineId,
          sessions: [],
          error: "INTEGRATION_REQUEST_FAILED",
        }),
      ]),
    );
    expect(JSON.stringify(streamResults)).not.toContain("secret");
  });

  test("DNS widgets retain source ownership for partial failures", async () => {
    const dnsHole = await setupAsync("piHole");
    const results = await dnsHoleRouter
      .createCaller({ db: dnsHole.db, deviceType: undefined, session: dnsHole.session })
      .summary({ integrationIds: dnsHole.integrationIds });

    expect(results).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          integrationId: dnsHole.onlineId,
          summary: expect.objectContaining({ status: "enabled" }),
        }),
        expect.objectContaining({
          integrationId: dnsHole.offlineId,
          integrationName: "Offline",
          summary: null,
          error: "INTEGRATION_REQUEST_FAILED",
        }),
      ]),
    );
    expect(JSON.stringify(results)).not.toContain("secret");
  });

  test("downloads retain source ownership for partial failures", async () => {
    const downloads = await setupAsync("qBittorrent");
    const results = await downloadsRouter
      .createCaller({ db: downloads.db, deviceType: undefined, session: downloads.session })
      .getJobsAndStatuses({ integrationIds: downloads.integrationIds, limitPerIntegration: 50 });

    expect(results).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ integrationId: downloads.onlineId, data: expect.objectContaining({ items: [] }) }),
        expect.objectContaining({
          integrationId: downloads.offlineId,
          integrationName: "Offline",
          data: null,
          error: "INTEGRATION_REQUEST_FAILED",
        }),
      ]),
    );
    expect(JSON.stringify(results)).not.toContain("secret");
  });

  test("system health retains source ownership for partial failures", async () => {
    const health = await setupAsync("glances");
    const results = await healthMonitoringRouter
      .createCaller({ db: health.db, deviceType: undefined, session: health.session })
      .getSystemHealthStatus({ integrationIds: health.integrationIds });

    expect(results).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          integrationId: health.onlineId,
          healthInfo: expect.objectContaining({ version: "1.0" }),
        }),
        expect.objectContaining({
          integrationId: health.offlineId,
          integrationName: "Offline",
          healthInfo: null,
          error: "INTEGRATION_REQUEST_FAILED",
        }),
      ]),
    );
    expect(JSON.stringify(results)).not.toContain("secret");
  });

  test("network controllers retain source ownership for partial failures", async () => {
    const network = await setupAsync("unifiController");
    const results = await networkControllerRouter
      .createCaller({ db: network.db, deviceType: undefined, session: network.session })
      .summary({ integrationIds: network.integrationIds });

    expect(results).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          integrationId: network.onlineId,
          summary: expect.objectContaining({ wanStatus: "enabled" }),
        }),
        expect.objectContaining({
          integrationId: network.offlineId,
          integrationName: "Offline",
          summary: null,
          error: "INTEGRATION_REQUEST_FAILED",
        }),
      ]),
    );
    expect(JSON.stringify(results)).not.toContain("secret");
  });

  test("dashboard widgets preserve healthy sources and expose sanitized failed-source envelopes", async () => {
    for (const testCase of dashboardPartialFailureCases) {
      const setup = await setupAsync(testCase.kind);
      const results = await testCase.run(setup);

      expect(results).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            integrationId: setup.onlineId,
            integrationName: "Online",
            [testCase.payloadKey]: expect.anything(),
          }),
          expect.objectContaining({
            integrationId: setup.offlineId,
            integrationName: "Offline",
            [testCase.payloadKey]: testCase.fallbackValue,
            error: "INTEGRATION_REQUEST_FAILED",
          }),
        ]),
      );
      expect(JSON.stringify(results)).not.toMatch(/internal\.example|token=secret|\/private\/|response body|password/i);
    }
  });

  test("dashboard widgets reject total integration failure instead of returning fallback-only data", async () => {
    for (const testCase of dashboardPartialFailureCases) {
      const setup = await setupAsync(testCase.kind, { allOffline: true });

      await expect(testCase.run(setup)).rejects.toMatchObject({
        code: "INTERNAL_SERVER_ERROR",
        message: "All integration queries failed",
      });
    }
  });

  test("media request responses expose failed integrations without dropping successful data", async () => {
    const mediaRequests = await setupAsync("overseerr");
    const caller = mediaRequestsRouter.createCaller({
      db: mediaRequests.db,
      deviceType: undefined,
      session: mediaRequests.session,
    });

    const latest = await caller.getLatestRequests({
      integrationIds: mediaRequests.integrationIds,
      statuses: ["pending"],
      recentDays: 0,
    });
    expect(latest.requests).toEqual([
      expect.objectContaining({
        id: 42,
        name: "Healthy request",
        integrationId: mediaRequests.onlineId,
        integration: expect.objectContaining({ id: mediaRequests.onlineId }),
      }),
    ]);
    expect(latest.failedIntegrations).toEqual([
      expect.objectContaining({ integrationId: mediaRequests.offlineId, error: "INTEGRATION_REQUEST_FAILED" }),
    ]);
    expect(JSON.stringify(latest)).not.toContain("secret");

    const stats = await caller.getStats({ integrationIds: mediaRequests.integrationIds });
    expect(stats.failedIntegrations).toEqual([
      expect.objectContaining({ integrationId: mediaRequests.offlineId, error: "INTEGRATION_REQUEST_FAILED" }),
    ]);
    expect(JSON.stringify(stats)).not.toContain("secret");
    expect(stats.stats).toHaveLength(1);
    expect(stats.users).toEqual([
      expect.objectContaining({
        id: 7,
        displayName: "Healthy user",
        integration: expect.objectContaining({ id: mediaRequests.onlineId }),
      }),
    ]);
  });

  test("aggregate widget payloads never expose sensitive partial-failure details", async () => {
    const cases = [
      {
        kind: "sonarr" as const,
        run: async (setup: Awaited<ReturnType<typeof setupAsync>>) =>
          await mediaOrganizerRouter
            .createCaller({ db: setup.db, deviceType: undefined, session: setup.session })
            .getData({ integrationIds: setup.integrationIds, pageSize: 10 }),
      },
      {
        kind: "beszel" as const,
        run: async (setup: Awaited<ReturnType<typeof setupAsync>>) =>
          await beszelRouter
            .createCaller({ db: setup.db, deviceType: undefined, session: setup.session })
            .getSystems({ integrationIds: setup.integrationIds }),
      },
      {
        kind: "opnsense" as const,
        run: async (setup: Awaited<ReturnType<typeof setupAsync>>) =>
          await firewallRouter
            .createCaller({ db: setup.db, deviceType: undefined, session: setup.session })
            .getFirewallCpuStatus({ integrationIds: setup.integrationIds }),
      },
      {
        kind: "prowlarr" as const,
        run: async (setup: Awaited<ReturnType<typeof setupAsync>>) =>
          await indexerManagerRouter
            .createCaller({ db: setup.db, deviceType: undefined, session: setup.session })
            .getIndexersStatus({ integrationIds: setup.integrationIds }),
      },
      {
        kind: "ntfy" as const,
        run: async (setup: Awaited<ReturnType<typeof setupAsync>>) =>
          await notificationsRouter
            .createCaller({ db: setup.db, deviceType: undefined, session: setup.session })
            .getNotifications({ integrationIds: setup.integrationIds }),
      },
      {
        kind: "gluetun" as const,
        run: async (setup: Awaited<ReturnType<typeof setupAsync>>) =>
          await vpnRouter
            .createCaller({ db: setup.db, deviceType: undefined, session: setup.session })
            .getSummaries({ integrationIds: setup.integrationIds }),
      },
    ];

    for (const testCase of cases) {
      const setup = await setupAsync(testCase.kind);
      const payload = JSON.stringify(await testCase.run(setup));
      expect(payload).toContain("INTEGRATION_REQUEST_FAILED");
      expect(payload).not.toMatch(/internal\.example|token=secret|\/private\/|response body|password/i);
    }
  });
});
