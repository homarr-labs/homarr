// @vitest-environment node

import { beforeEach, describe, expect, test, vi } from "vitest";

import type { Session } from "@homarr/auth";
import { createId } from "@homarr/common";
import type { Database } from "@homarr/db";
import { integrations, integrationUserPermissions, users } from "@homarr/db/schema";
import { createDb } from "@homarr/db/test";
import type { IntegrationKind } from "@homarr/definitions";
import type { MediaRequest, MediaRequestStats } from "@homarr/integrations/types";
import type * as MediaRequestListHandlerModule from "@homarr/request-handler/media-request-list";

import { calendarRouter } from "../../widgets/calendar";
import { beszelRouter } from "../../widgets/beszel";
import { firewallRouter } from "../../widgets/firewall";
import { indexerManagerRouter } from "../../widgets/indexer-manager";
import { mediaOrganizerRouter } from "../../widgets/media-organizer";
import { mediaRequestsRouter } from "../../widgets/media-requests";
import { mediaServerRouter } from "../../widgets/media-server";
import { notificationsRouter } from "../../widgets/notifications";
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

const setupAsync = async (kind: IntegrationKind) => {
  const db = createDb();
  const userId = createId();
  const onlineId = createId();
  const offlineId = createId();
  await db.insert(users).values({ id: userId });
  await db.insert(integrations).values([
    { id: onlineId, kind, name: "Online", url: "https://online.example.com" },
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
