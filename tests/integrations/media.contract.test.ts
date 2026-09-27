import { expect, test } from "vitest";

import { JellyfinIntegration } from "../../packages/integrations/src/jellyfin/jellyfin-integration";
import { RadarrIntegration } from "../../packages/integrations/src/media-organizer/radarr/radarr-integration";
import { SonarrIntegration } from "../../packages/integrations/src/media-organizer/sonarr/sonarr-integration";
import { NextcloudIntegration } from "../../packages/integrations/src/nextcloud/nextcloud.integration";
import responses from "../fixtures/media/responses.json";
import { startHttpService } from "../support/http-service";

test("Sonarr reads a bounded missing page and download queue through a proxy prefix", async () => {
  const service = await startHttpService([
    {
      method: "GET",
      path: "/sonarr/api/v3/wanted/missing",
      headers: { "x-api-key": "sonarr-test-key" },
      query: { page: "1", pageSize: "2", sortKey: "airDateUtc", sortDirection: "ascending", includeSeries: "true" },
      response: { body: responses.sonarrMissing },
    },
    {
      method: "GET",
      path: "/sonarr/api/v3/queue",
      headers: { "x-api-key": "sonarr-test-key" },
      query: { page: "1", pageSize: "2", includeSeries: "true", includeEpisode: "true" },
      response: { body: responses.sonarrQueue },
    },
  ]);
  try {
    const sonarr = new SonarrIntegration({
      id: "sonarr",
      kind: "sonarr",
      name: "Sonarr",
      url: `${service.origin}/sonarr/`,
      externalUrl: "https://media.example.invalid/tv",
      decryptedSecrets: [{ kind: "apiKey", value: "sonarr-test-key" }],
    });
    expect(await sonarr.getMissingAsync(2)).toEqual({
      totalCount: 31,
      items: [
        {
          id: 71,
          title: "The Signal",
          type: "episode",
          seasonNumber: 2,
          episodeNumber: 3,
          seriesTitle: "Night Sky",
          year: 2022,
          imageUrl: "https://images.example.invalid/night-sky.jpg",
          link: "https://media.example.invalid/tv/series/night-sky",
        },
      ],
    });
    expect(await sonarr.getMediaQueueAsync(2)).toEqual({
      totalCount: 4,
      items: [
        {
          id: 81,
          title: "The Signal",
          type: "episode",
          status: "downloading",
          timeLeft: "00:02:00",
          percentComplete: 75,
          seasonNumber: 2,
          episodeNumber: 3,
          seriesTitle: "Night Sky",
          imageUrl: null,
          link: "https://media.example.invalid/tv/series/night-sky",
        },
      ],
    });
    await service.assertComplete();
  } finally {
    await service.close();
  }
});

test("Radarr preserves separate release dates and truthful downloaded library totals", async () => {
  const service = await startHttpService([
    {
      method: "GET",
      path: "/radarr/api/v3/calendar",
      headers: { "x-api-key": "radarr-test-key" },
      query: { start: "2025-05-01T00:00:00.000Z", end: "2025-06-01T00:00:00.000Z", unmonitored: "false" },
      response: { body: responses.radarrCalendar },
    },
    {
      method: "GET",
      path: "/radarr/api/v3/movie",
      headers: { "x-api-key": "radarr-test-key" },
      response: { body: responses.radarrLibrary },
    },
  ]);
  try {
    const radarr = new RadarrIntegration({
      id: "radarr",
      kind: "radarr",
      name: "Radarr",
      url: `${service.origin}/radarr`,
      externalUrl: "https://media.example.invalid/movies",
      decryptedSecrets: [{ kind: "apiKey", value: "radarr-test-key" }],
    });
    const events = await radarr.getCalendarEventsAsync(
      new Date("2025-05-01T00:00:00Z"),
      new Date("2025-06-01T00:00:00Z"),
      false,
    );
    expect(
      events.map((event) => ({
        title: event.title,
        start: event.startDate,
        release: event.metadata,
        links: event.links.map((link) => link.href),
      })),
    ).toEqual([
      {
        title: "Orbit",
        start: new Date("2025-05-02T00:00:00Z"),
        release: { type: "radarr", releaseType: "inCinemas" },
        links: ["https://media.example.invalid/movies/movie/orbit-2025", "https://www.imdb.com/title/tt1234567/"],
      },
      {
        title: "Orbit",
        start: new Date("2025-05-23T00:00:00Z"),
        release: { type: "radarr", releaseType: "digitalRelease" },
        links: ["https://media.example.invalid/movies/movie/orbit-2025", "https://www.imdb.com/title/tt1234567/"],
      },
    ]);
    expect(await radarr.getLibraryStatsAsync()).toEqual({
      movies: 3,
      monitored: 2,
      downloaded: 2,
      storage: 6000000000,
    });
    await service.assertComplete();
  } finally {
    await service.close();
  }
});

test("Jellyfin SDK authenticates and reports only real playback with correct time and bitrate units", async () => {
  const service = await startHttpService([
    {
      method: "GET",
      path: "/jellyfin/Sessions",
      headers: {
        authorization:
          'MediaBrowser Client="Homarr", Device="Homarr", DeviceId="homarr", Version="0.0.1", Token="jellyfin-test-key"',
      },
      response: { body: responses.jellyfinSessions },
    },
  ]);
  try {
    const jellyfin = new JellyfinIntegration({
      id: "jellyfin",
      kind: "jellyfin",
      name: "Jellyfin",
      url: `${service.origin}/jellyfin`,
      externalUrl: "https://media.example.invalid/jellyfin",
      decryptedSecrets: [{ kind: "apiKey", value: "jellyfin-test-key" }],
    });
    const sessions = await jellyfin.getCurrentSessionsAsync({ showOnlyPlaying: true });
    expect(sessions).toHaveLength(1);
    expect(sessions[0]).toMatchObject({
      sessionId: "living-room",
      sessionName: "Jellyfin TV (Living room)",
      user: {
        userId: "viewer-1",
        username: "Alice",
        profilePictureUrl: "https://media.example.invalid/jellyfin/Users/viewer-1/Images/Primary",
      },
      currentlyPlaying: {
        type: "video",
        name: "Night Sky",
        seasonNumber: 2,
        episodeNumber: 3,
        episodeName: "The Signal",
        location: "lan",
        playback: { state: "paused", positionMs: 120000, durationMs: 1800000 },
        metadata: {
          bitrateKbps: 8200,
          video: { resolution: { width: 1920, height: 1080 } },
          transcoding: { isVideoDirect: true, isAudioDirect: true, containerChanged: false },
        },
      },
    });
    await service.assertComplete();
  } finally {
    await service.close();
  }
});

test("Nextcloud refreshes OCS notifications and surfaces rejected credentials", async () => {
  const service = await startHttpService([
    {
      method: "GET",
      path: "/cloud/ocs/v2.php/apps/notifications/api/v2/notifications",
      query: { format: "json" },
      headers: { authorization: "Basic YWxpY2U6YXBwLXBhc3N3b3Jk", "ocs-apirequest": "true" },
      response: { body: responses.nextcloudNotifications },
    },
    {
      method: "GET",
      path: "/cloud/ocs/v2.php/apps/notifications/api/v2/notifications",
      query: { format: "json" },
      headers: { authorization: "Basic YWxpY2U6YXBwLXBhc3N3b3Jk", "ocs-apirequest": "true" },
      response: { body: responses.nextcloudEmpty },
    },
    {
      method: "GET",
      path: "/cloud/ocs/v2.php/apps/notifications/api/v2/notifications",
      query: { format: "json" },
      headers: { authorization: "Basic YWxpY2U6YXBwLXBhc3N3b3Jk", "ocs-apirequest": "true" },
      response: {
        status: 401,
        body: { ocs: { meta: { status: "failure", statuscode: 997, message: "Unauthorised" }, data: [] } },
      },
    },
  ]);
  try {
    const nextcloud = new NextcloudIntegration({
      id: "nextcloud",
      kind: "nextcloud",
      name: "Nextcloud",
      url: `${service.origin}/cloud/`,
      externalUrl: null,
      decryptedSecrets: [
        { kind: "username", value: "alice" },
        { kind: "password", value: "app-password" },
      ],
    });
    expect(await nextcloud.getNotificationsAsync()).toEqual([
      {
        id: "17",
        time: new Date("2025-05-02T10:30:00Z"),
        title: "Review shared folder",
        body: "Alice shared Project notes with you.",
      },
    ]);
    expect(await nextcloud.getNotificationsAsync()).toEqual([]);
    await expect(nextcloud.getNotificationsAsync()).rejects.toMatchObject({
      name: "IntegrationResponseError",
      cause: { statusCode: 401 },
    });
    await service.assertComplete();
  } finally {
    await service.close();
  }
});
