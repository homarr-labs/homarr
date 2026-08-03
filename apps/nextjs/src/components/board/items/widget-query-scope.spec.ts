import type { QueryKey } from "@tanstack/react-query";
import { describe, expect, test } from "vitest";

import type { NormalizedWidgetQuery, WidgetDefinition, WidgetQueryMatcherScope } from "@homarr/widgets";
import { getWidgetQueryKeys, widgetImports } from "@homarr/widgets";

import { matchesWidgetItemQuery } from "./widget-query-scope";

type WidgetKind = keyof typeof widgetImports;
const allPhotosAlbumId = "all";

const createScope = (overrides: Partial<WidgetQueryMatcherScope> = {}): WidgetQueryMatcherScope => ({
  itemId: "item-1",
  boardId: "board-1",
  integrationIds: ["integration-1"],
  options: {},
  runtimeQueries: [],
  ...overrides,
});

const matches = (kind: WidgetKind, path: readonly string[], input: unknown, scope: WidgetQueryMatcherScope) => {
  const definition = widgetImports[kind].definition as WidgetDefinition & { kind: string };
  const queryKey: QueryKey = [path, { input, type: "query" }];
  return matchesWidgetItemQuery(queryKey, getWidgetQueryKeys(definition), scope, definition.queryMatcher);
};

describe("matchesWidgetItemQuery", () => {
  test("matches only the current Custom API definition", () => {
    const scope = createScope({ options: { definitionId: "definition-1" } });
    const input = { boardId: "board-1", itemId: "item-1", definitionId: "definition-1" };

    expect(matches("customApi", ["widget", "customApi", "getData"], input, scope)).toBe(true);
    expect(
      matches("customApi", ["widget", "customApi", "getData"], { ...input, definitionId: "definition-2" }, scope),
    ).toBe(false);
    expect(matches("customApi", ["widget", "customApi", "getData"], { ...input, itemId: "item-2" }, scope)).toBe(
      false,
    );
    expect(matches("customApi", ["widget", "customApi", "getData"], { ...input, boardId: "board-2" }, scope)).toBe(
      false,
    );
  });

  test("owns only the active compact or advanced Media Missing page size", () => {
    const path = ["widget", "mediaOrganizer", "getData"];
    const compactInput = { integrationIds: ["radarr-1"], pageSize: 20 };
    const advancedInput = { integrationIds: ["radarr-1"], pageSize: 50 };
    const compactScope = createScope({
      integrationIds: ["radarr-1"],
      runtimeQueries: [{ path, input: compactInput }],
    });
    const advancedScope = createScope({
      integrationIds: ["radarr-1"],
      runtimeQueries: [{ path, input: advancedInput }],
    });

    expect(matches("mediaMissing", path, compactInput, compactScope)).toBe(true);
    expect(matches("mediaMissing", path, advancedInput, compactScope)).toBe(false);
    expect(matches("mediaMissing", path, advancedInput, advancedScope)).toBe(true);
    expect(matches("mediaMissing", path, compactInput, advancedScope)).toBe(false);
  });

  test("owns every Releases batch by item id", () => {
    const scope = createScope({ itemId: "release-item" });
    const path = ["widget", "releases", "getLatest"];

    expect(matches("releases", path, { itemId: "release-item", repositories: [{ id: "one" }] }, scope)).toBe(true);
    expect(matches("releases", path, { itemId: "sibling-item", repositories: [{ id: "one" }] }, scope)).toBe(false);
  });

  test("normalizes Immich's all-photos sentinel and separates Immich widget kinds", () => {
    const carouselScope = createScope({
      integrationIds: ["immich-1"],
      options: { albumId: allPhotosAlbumId },
    });
    const serverStatsQuery: NormalizedWidgetQuery = {
      path: ["widget", "immich", "getServerStats"],
      input: { integrationId: "immich-1" },
    };
    const albumsQuery: NormalizedWidgetQuery = {
      path: ["widget", "immich", "getAlbums"],
      input: { integrationId: "immich-1" },
    };
    const compactServerScope = createScope({
      integrationIds: ["immich-1"],
      runtimeQueries: [serverStatsQuery],
    });
    const advancedServerScope = createScope({
      integrationIds: ["immich-1"],
      runtimeQueries: [serverStatsQuery, albumsQuery],
    });

    expect(
      matches("immich-albumCarousel", ["widget", "immich", "getAlbum"], { integrationId: "immich-1" }, carouselScope),
    ).toBe(true);
    expect(
      matches(
        "immich-albumCarousel",
        ["widget", "immich", "getAlbum"],
        { integrationId: "immich-1", albumId: "album-2" },
        carouselScope,
      ),
    ).toBe(false);
    expect(
      matches(
        "immich-albumCarousel",
        ["widget", "immich", "getServerStats"],
        { integrationId: "immich-1" },
        carouselScope,
      ),
    ).toBe(false);
    expect(matches("immich-serverStats", serverStatsQuery.path, serverStatsQuery.input, compactServerScope)).toBe(true);
    expect(matches("immich-serverStats", albumsQuery.path, albumsQuery.input, compactServerScope)).toBe(false);
    expect(matches("immich-serverStats", albumsQuery.path, albumsQuery.input, advancedServerScope)).toBe(true);
    expect(
      matches("immich-serverStats", ["widget", "immich", "getAlbum"], albumsQuery.input, advancedServerScope),
    ).toBe(false);
  });

  test("uses the resolved Beszel integration, system, and includeDocker input", () => {
    const runtimeQuery: NormalizedWidgetQuery = {
      path: ["widget", "beszel", "getSystemStats"],
      input: {
        integrationIds: ["beszel-2"],
        systemId: "system-2",
        timePeriod: "1h",
        includeDocker: true,
      },
    };
    const scope = createScope({
      integrationIds: ["beszel-1", "beszel-2"],
      options: { systemId: "beszel-2:system-2", timePeriod: "1h", showDockerCpu: true },
      runtimeQueries: [runtimeQuery],
    });

    expect(matches("beszelSystemStats", runtimeQuery.path, runtimeQuery.input, scope)).toBe(true);
    expect(
      matches(
        "beszelSystemStats",
        runtimeQuery.path,
        { ...(runtimeQuery.input as Record<string, unknown>), includeDocker: false },
        scope,
      ),
    ).toBe(false);
    expect(
      matches(
        "beszelSystemStats",
        runtimeQuery.path,
        { ...(runtimeQuery.input as Record<string, unknown>), systemId: "system-1" },
        scope,
      ),
    ).toBe(false);
  });

  test("separates Beszel procedure families while retaining shared getSystems ownership", () => {
    const scope = createScope({
      integrationIds: ["beszel-1"],
      options: { showHistory: true, maxHistoryItems: 10 },
    });
    const systemsInput = { integrationIds: ["beszel-1"] };
    const alertsInput = { integrationIds: ["beszel-1"], includeHistory: true, maxHistoryItems: 10 };

    expect(matches("beszelSystemGrid", ["widget", "beszel", "getSystems"], systemsInput, scope)).toBe(true);
    expect(matches("beszelSystemTable", ["widget", "beszel", "getSystems"], systemsInput, scope)).toBe(true);
    expect(matches("beszelAlerts", ["widget", "beszel", "getSystems"], systemsInput, scope)).toBe(false);
    expect(matches("beszelAlerts", ["widget", "beszel", "getAlerts"], alertsInput, scope)).toBe(true);
    expect(matches("beszelSystemGrid", ["widget", "beszel", "getAlerts"], alertsInput, scope)).toBe(false);
  });

  test("owns only the active Beszel table detail query", () => {
    const activeQuery: NormalizedWidgetQuery = {
      path: ["widget", "beszel", "getSystemStats"],
      input: {
        integrationIds: ["beszel-1"],
        systemId: "system-1",
        timePeriod: "1h",
        includeDocker: false,
      },
    };
    const scope = createScope({ integrationIds: ["beszel-1"], runtimeQueries: [activeQuery] });

    expect(matches("beszelSystemTable", activeQuery.path, activeQuery.input, scope)).toBe(true);
    expect(
      matches(
        "beszelSystemTable",
        activeQuery.path,
        { ...(activeQuery.input as Record<string, unknown>), systemId: "system-2" },
        scope,
      ),
    ).toBe(false);
    expect(matches("beszelSystemGrid", activeQuery.path, activeQuery.input, scope)).toBe(false);
  });

  test("owns only Umami queries registered for the active view and layout", () => {
    const eventQuery: NormalizedWidgetQuery = {
      path: ["widget", "umami", "getMultiEventTimeSeries"],
      input: { integrationId: "umami-1", websiteId: "site-1", timeFrame: "24h", eventNames: ["signup", "view"] },
    };
    const topPagesQuery: NormalizedWidgetQuery = {
      path: ["widget", "umami", "getTopPages"],
      input: { integrationId: "umami-1", websiteId: "site-1", timeFrame: "24h", limit: 5 },
    };
    const eventsScope = createScope({ runtimeQueries: [eventQuery] });
    const advancedScope = createScope({ runtimeQueries: [eventQuery, topPagesQuery] });

    expect(matches("umami", eventQuery.path, eventQuery.input, eventsScope)).toBe(true);
    expect(
      matches(
        "umami",
        eventQuery.path,
        { integrationId: "umami-1", websiteId: "site-1", timeFrame: "24h", eventNames: ["view", "signup"] },
        eventsScope,
      ),
    ).toBe(false);
    expect(matches("umami", topPagesQuery.path, topPagesQuery.input, eventsScope)).toBe(false);
    expect(matches("umami", topPagesQuery.path, topPagesQuery.input, advancedScope)).toBe(true);
  });

  test("maps Media Request status filters and separates list from stats", () => {
    const listScope = createScope({
      integrationIds: ["request-1"],
      options: { statusFilter: [], recentDays: 30, linksTargetNewTab: true },
    });
    const allStatuses = ["pending", "approved", "declined", "failed", "completed"];

    expect(
      matches(
        "mediaRequests-requestList",
        ["widget", "mediaRequests", "getLatestRequests"],
        { integrationIds: ["request-1"], statuses: allStatuses, recentDays: 30 },
        listScope,
      ),
    ).toBe(true);
    expect(
      matches(
        "mediaRequests-requestList",
        ["widget", "mediaRequests", "getLatestRequests"],
        { integrationIds: ["request-1"], statuses: ["pending"], recentDays: 30 },
        listScope,
      ),
    ).toBe(false);
    expect(
      matches(
        "mediaRequests-requestList",
        ["widget", "mediaRequests", "getStats"],
        { integrationIds: ["request-1"] },
        listScope,
      ),
    ).toBe(false);
    expect(
      matches(
        "mediaRequests-requestStats",
        ["widget", "mediaRequests", "getStats"],
        { integrationIds: ["request-1"] },
        listScope,
      ),
    ).toBe(true);
  });

  test("separates Audio Stats stream details from Media Server filters", () => {
    const statsQuery: NormalizedWidgetQuery = {
      path: ["widget", "audioStats", "getStats"],
      input: { integrationId: "audio-1" },
    };
    const streamsQuery: NormalizedWidgetQuery = {
      path: ["widget", "mediaServer", "getCurrentStreams"],
      input: { integrationIds: ["audio-1"], showOnlyPlaying: false },
    };
    const compactAudioScope = createScope({ integrationIds: ["audio-1"], runtimeQueries: [statsQuery] });
    const advancedAudioScope = createScope({
      integrationIds: ["audio-1"],
      runtimeQueries: [statsQuery, streamsQuery],
    });
    const mediaScope = createScope({ integrationIds: ["audio-1"], options: { showOnlyPlaying: true } });

    expect(matches("audioStats", statsQuery.path, statsQuery.input, compactAudioScope)).toBe(true);
    expect(matches("audioStats", streamsQuery.path, streamsQuery.input, compactAudioScope)).toBe(false);
    expect(matches("audioStats", streamsQuery.path, streamsQuery.input, advancedAudioScope)).toBe(true);
    expect(
      matches(
        "audioStats",
        streamsQuery.path,
        { integrationIds: ["audio-1"], showOnlyPlaying: true },
        advancedAudioScope,
      ),
    ).toBe(false);
    expect(
      matches("mediaServer", streamsQuery.path, { integrationIds: ["audio-1"], showOnlyPlaying: true }, mediaScope),
    ).toBe(true);
    expect(matches("mediaServer", streamsQuery.path, streamsQuery.input, mediaScope)).toBe(false);
  });

  test("uses each Calendar instance's registered month", () => {
    const path = ["widget", "calendar", "findAllEvents"];
    const januaryInput = {
      integrationIds: ["calendar-1"],
      month: 0,
      year: 2026,
      releaseType: [],
      showUnmonitored: false,
    };
    const februaryInput = { ...januaryInput, month: 1 };
    const januaryScope = createScope({ runtimeQueries: [{ path, input: januaryInput }] });
    const februaryScope = createScope({ runtimeQueries: [{ path, input: februaryInput }] });

    expect(matches("calendar", path, januaryInput, januaryScope)).toBe(true);
    expect(matches("calendar", path, februaryInput, januaryScope)).toBe(false);
    expect(matches("calendar", path, februaryInput, februaryScope)).toBe(true);
  });

  test("uses each Media Transcoding instance's registered page and geometry-derived page size", () => {
    const path = ["widget", "mediaTranscoding", "getDataAsync"];
    const firstPage = { integrationId: "transcode-1", pageSize: 8, page: 1 };
    const secondPage = { integrationId: "transcode-1", pageSize: 12, page: 2 };
    const firstScope = createScope({ runtimeQueries: [{ path, input: firstPage }] });
    const secondScope = createScope({ runtimeQueries: [{ path, input: secondPage }] });

    expect(matches("mediaTranscoding", path, firstPage, firstScope)).toBe(true);
    expect(matches("mediaTranscoding", path, secondPage, firstScope)).toBe(false);
    expect(matches("mediaTranscoding", path, secondPage, secondScope)).toBe(true);
  });

  test("matches only the Downloads query with the current integrations and limit", () => {
    const scope = createScope({
      integrationIds: ["sabnzbd-1", "qbittorrent-1"],
      options: { limitPerIntegration: 25 },
    });
    const path = ["widget", "downloads", "getJobsAndStatuses"];

    expect(
      matches("downloads", path, { integrationIds: ["sabnzbd-1", "qbittorrent-1"], limitPerIntegration: 25 }, scope),
    ).toBe(true);
    expect(matches("downloads", path, { integrationIds: ["sabnzbd-1"], limitPerIntegration: 25 }, scope)).toBe(false);
    expect(
      matches("downloads", path, { integrationIds: ["sabnzbd-1", "qbittorrent-1"], limitPerIntegration: 50 }, scope),
    ).toBe(false);
    expect(
      matches("downloads", ["widget", "downloads", "pause"], { integrationIds: ["sabnzbd-1", "qbittorrent-1"] }, scope),
    ).toBe(false);
  });

  test("matches only the active Stock Price symbol and time frame", () => {
    const scope = createScope({ options: { stock: "AAPL", timeRange: "1mo", timeInterval: "1d" } });
    const path = ["widget", "stockPrice", "getPriceHistory"];

    expect(matches("stockPrice", path, { stock: "AAPL", timeRange: "1mo", timeInterval: "1d" }, scope)).toBe(true);
    expect(matches("stockPrice", path, { stock: "MSFT", timeRange: "1mo", timeInterval: "1d" }, scope)).toBe(false);
    expect(matches("stockPrice", path, { stock: "AAPL", timeRange: "5d", timeInterval: "1d" }, scope)).toBe(false);
  });

  test("matches Weather by the coordinates sent to the location procedure", () => {
    const scope = createScope({
      options: { location: { name: "Paris", latitude: 48.85341, longitude: 2.3488 } },
    });
    const path = ["widget", "weather", "atLocation"];

    expect(matches("weather", path, { latitude: 48.85341, longitude: 2.3488 }, scope)).toBe(true);
    expect(matches("weather", path, { latitude: 51.5072, longitude: -0.1276 }, scope)).toBe(false);
    expect(
      matches("weather", ["widget", "weather", "forecast"], { latitude: 48.85341, longitude: 2.3488 }, scope),
    ).toBe(false);
  });

  test("matches Clock weather only when enabled and at its configured coordinates", () => {
    const path = ["widget", "weather", "atLocation"];
    const location = { name: "Brisbane", latitude: -27.4698, longitude: 153.0251 };
    const enabledScope = createScope({ options: { showWeather: true, weatherLocation: location } });
    const disabledScope = createScope({ options: { showWeather: false, weatherLocation: location } });

    expect(matches("clock", path, { latitude: -27.4698, longitude: 153.0251 }, enabledScope)).toBe(true);
    expect(matches("clock", path, { latitude: 48.85341, longitude: 2.3488 }, enabledScope)).toBe(false);
    expect(matches("clock", path, { latitude: -27.4698, longitude: 153.0251 }, disabledScope)).toBe(false);
  });

  test("matches Minecraft Server Status by the full input passed to useQuery", () => {
    const scope = createScope({
      options: { title: "Survival", domain: "play.example.com", isBedrockServer: false },
    });
    const path = ["widget", "minecraft", "getServerStatus"];

    expect(
      matches(
        "minecraftServerStatus",
        path,
        { title: "Survival", domain: "play.example.com", isBedrockServer: false },
        scope,
      ),
    ).toBe(true);
    expect(
      matches(
        "minecraftServerStatus",
        path,
        { title: "Creative", domain: "play.example.com", isBedrockServer: false },
        scope,
      ),
    ).toBe(false);
    expect(
      matches(
        "minecraftServerStatus",
        path,
        { title: "Survival", domain: "bedrock.example.com", isBedrockServer: true },
        scope,
      ),
    ).toBe(false);
  });

  test("matches Notifications by integrations and the full input passed to useQuery", () => {
    const scope = createScope({ integrationIds: ["ntfy-1"], options: { hideLogos: true } });
    const path = ["widget", "notifications", "getNotifications"];

    expect(matches("notifications", path, { hideLogos: true, integrationIds: ["ntfy-1"] }, scope)).toBe(true);
    expect(matches("notifications", path, { hideLogos: false, integrationIds: ["ntfy-1"] }, scope)).toBe(false);
    expect(matches("notifications", path, { hideLogos: true, integrationIds: ["gotify-1"] }, scope)).toBe(false);
    expect(
      matches("notifications", ["widget", "notifications", "dismiss"], { integrationIds: ["ntfy-1"] }, scope),
    ).toBe(false);
  });

  test("keeps renamed RSS input fields item-specific", () => {
    const scope = createScope({
      integrationIds: [],
      options: { feedUrls: ["https://feed.example/rss"], maximumAmountPosts: 100 },
    });
    const path = ["widget", "rssFeed", "getFeeds"];

    expect(matches("rssFeed", path, { urls: ["https://feed.example/rss"], maximumAmountPosts: 100 }, scope)).toBe(true);
    expect(matches("rssFeed", path, { urls: ["https://other.example/rss"], maximumAmountPosts: 100 }, scope)).toBe(
      false,
    );
  });

  test("generic fallback ignores transformed non-identity inputs", () => {
    const scope = createScope({ integrationIds: ["integration-1"], options: { pageSize: 10 } });
    const definitionKeys = [[["widget", "example"]]] as const;

    expect(
      matchesWidgetItemQuery(
        [["widget", "example", "getData"], { input: { integrationIds: ["integration-1"], pageSize: 50 } }],
        definitionKeys,
        scope,
      ),
    ).toBe(true);
  });
});
