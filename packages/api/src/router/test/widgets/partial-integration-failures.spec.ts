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
import { mediaRequestsRouter } from "../../widgets/media-requests";
import { mediaServerRouter } from "../../widgets/media-server";

vi.hoisted(() => {
  process.env.SKIP_ENV_VALIDATION = "true";
});

const createHandler = <T>(integration: { name: string }, data: T) => ({
  getDataAsync: async () => {
    if (integration.name === "Offline") throw new Error("offline");
    return { data, timestamp: new Date() };
  },
});

vi.mock("@homarr/request-handler/calendar", () => ({
  calendarMonthRequestHandler: { handler: (integration: { name: string }) => createHandler(integration, []) },
}));

vi.mock("@homarr/request-handler/media-server", () => ({
  mediaServerRequestHandler: { handler: (integration: { name: string }) => createHandler(integration, []) },
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
        expect.objectContaining({ integration: expect.objectContaining({ id: calendar.offlineId }), error: "offline" }),
      ]),
    );

    const mediaServer = await setupAsync("plex");
    const streamResults = await mediaServerRouter
      .createCaller({ db: mediaServer.db, deviceType: undefined, session: mediaServer.session })
      .getCurrentStreams({ integrationIds: mediaServer.integrationIds, showOnlyPlaying: false });
    expect(streamResults).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ integrationId: mediaServer.offlineId, sessions: [], error: "offline" }),
      ]),
    );
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
      expect.objectContaining({ integrationId: mediaRequests.offlineId, error: "offline" }),
    ]);

    const stats = await caller.getStats({ integrationIds: mediaRequests.integrationIds });
    expect(stats.failedIntegrations).toEqual([
      expect.objectContaining({ integrationId: mediaRequests.offlineId, error: "offline" }),
    ]);
    expect(stats.stats).toHaveLength(1);
    expect(stats.users).toEqual([
      expect.objectContaining({
        id: 7,
        displayName: "Healthy user",
        integration: expect.objectContaining({ id: mediaRequests.onlineId }),
      }),
    ]);
  });
});
