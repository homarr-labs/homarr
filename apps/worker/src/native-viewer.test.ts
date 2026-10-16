import { describe, expect, test } from "bun:test";

import { createNativeViewerPolicy, projectNativeViewerValue } from "./native-viewer";
import type { ViewerBoard, ViewerItem } from "./native-viewer";

const item = (kind: string, options: Record<string, unknown> = {}, integrationIds = ["selected"]): ViewerItem => ({
  id: "placed-item",
  boardId: "shared",
  kind,
  options,
  integrationIds,
});
const board = (...items: ViewerItem[]): ViewerBoard => ({ id: "shared", name: "Shared board", items });
const query = (path: string, input?: unknown) => ({ path, kind: "query" as const, input });

describe("native viewer publication boundary", () => {
  test("normal board reads retain layouts while unrelated public dashboards stay outside the share", () => {
    const policy = createNativeViewerPolicy([board(item("clock"))]);
    expect(() => policy.authorize(query("board.getBoardByName", { name: "sHaReD bOaRd" }))).not.toThrow();
    expect(() => policy.authorize(query("board.getBoardByName", { name: "Other public board" }))).toThrow();
    const payload = { id: "shared", layouts: [{ id: "base" }], items: [{ id: "clock" }] };
    expect(projectNativeViewerValue(policy, query("board.getBoardByName"), payload)).toEqual(payload);
    expect(projectNativeViewerValue(policy, query("board.getAllBoards"), [{ id: "other" }, { id: "shared" }])).toEqual([
      { id: "shared" },
    ]);
    expect(() => projectNativeViewerValue(policy, query("board.getHomeBoard"), { id: "other" })).toThrow();
  });

  test("an integration on the board cannot authorize unrelated widget APIs or mutations", () => {
    const policy = createNativeViewerPolicy([board(item("dnsHoleSummary"))]);
    expect(() => policy.authorize(query("widget.dnsHole.summary", { integrationIds: ["selected"] }))).not.toThrow();
    for (const request of [
      query("widget.dnsHole.summary", { integrationIds: ["private"] }),
      query("integration.byId", { id: "selected" }),
      query("integration.request", { integrationId: "selected", path: "/secrets" }),
      query("widget.stats.snapshot", { integrationId: "selected" }),
      { path: "widget.dnsHole.disable", kind: "mutation" as const, input: { integrationIds: ["selected"] } },
    ])
      expect(() => policy.authorize(request)).toThrow();
  });

  test("saved album, entity, note and website selectors cannot be replaced", () => {
    const cases = [
      {
        widget: item("immich-albumCarousel", { albumId: "family" }),
        path: "widget.immich.getAlbum",
        field: "albumId",
        expected: "family",
      },
      {
        widget: item("smartHome-entityState", { entityId: "light.living" }),
        path: "widget.smartHome.entityDetails",
        field: "entityId",
        expected: "light.living",
      },
      {
        widget: item("anchorNote", { noteId: "published-note" }),
        path: "widget.anchorNotes.getNote",
        field: "noteId",
        expected: "published-note",
      },
      {
        widget: item("umami", { websiteId: "published-site" }),
        path: "widget.umami.getActiveVisitors",
        field: "websiteId",
        expected: "published-site",
      },
    ];
    for (const entry of cases) {
      const policy = createNativeViewerPolicy([board(entry.widget)]);
      expect(() =>
        policy.authorize(query(entry.path, { integrationId: "selected", [entry.field]: entry.expected })),
      ).not.toThrow();
      expect(() =>
        policy.authorize(query(entry.path, { integrationId: "selected", [entry.field]: "private" })),
      ).toThrow();
    }
  });

  test("requests cannot combine integrations across differently configured widgets", () => {
    const first = item("umami", { websiteId: "first-site", timeFrame: "24h" }, ["first"]);
    const second = { ...item("umami", { websiteId: "second-site", timeFrame: "24h" }, ["second"]), id: "second-item" };
    const policy = createNativeViewerPolicy([board(first, second)]);
    expect(() =>
      policy.authorize(
        query("widget.umami.getVisitorStats", {
          integrationIds: ["first", "second"],
          websiteId: "first-site",
          timeFrame: "24h",
        }),
      ),
    ).toThrow();
    expect(() =>
      policy.authorize(
        query("widget.umami.getVisitorStats", { integrationIds: ["first"], websiteId: "first-site", timeFrame: "24h" }),
      ),
    ).not.toThrow();
  });

  test("the normal Custom JSX runtime gets only a placed widget, never definition authoring", () => {
    const policy = createNativeViewerPolicy([board(item("customApi", { definitionId: "published" }))]);
    expect(() => policy.authorize(query("widget.customApi.getData", { itemId: "placed-item" }))).not.toThrow();
    expect(() =>
      policy.authorize(
        query("widget.customApi.queryRequest", { itemId: "placed-item", requestId: "published-query", params: {} }),
      ),
    ).not.toThrow();
    expect(() => policy.authorize(query("widget.customApi.getData", { itemId: "private-item" }))).toThrow();
    expect(() => policy.authorize(query("customWidget.readTemplate", { id: "published" }))).toThrow();
    expect(() =>
      policy.authorize({
        path: "widget.customApi.executeAction",
        kind: "mutation",
        input: { itemId: "placed-item", requestId: "delete" },
      }),
    ).toThrow();
  });

  test("statistics preserve the normal component shape while hiding unselected metrics", () => {
    const policy = createNativeViewerPolicy([
      board(
        item("stats", {
          entries: [
            { integrationId: "selected", metric: "cpu", hidden: false },
            { integrationId: "selected", metric: "passwordHint", hidden: true },
          ],
        }),
      ),
    ]);
    expect(() => policy.authorize(query("widget.stats.catalog", { integrationId: "selected" }))).not.toThrow();
    expect(
      projectNativeViewerValue(policy, query("widget.stats.snapshot", { integrationId: "selected" }), {
        updatedAt: 123,
        values: { cpu: 42, passwordHint: "private", unrelated: 100 },
      }),
    ).toEqual({ updatedAt: 123, values: { cpu: 42 } });
    expect(
      projectNativeViewerValue(policy, query("widget.stats.catalog", { integrationId: "selected" }), {
        name: "Server",
        metrics: [{ key: "cpu" }, { key: "passwordHint" }],
      }),
    ).toEqual({ name: "Server", metrics: [{ key: "cpu" }] });
    expect(() =>
      policy.authorize({
        path: "widget.stats.refresh",
        kind: "mutation",
        input: { integrationId: "selected", force: false },
      }),
    ).not.toThrow();
    expect(() =>
      policy.authorize({
        path: "widget.stats.refresh",
        kind: "mutation",
        input: { integrationId: "private", force: true },
      }),
    ).toThrow();
  });

  test("a selected Beszel system does not disclose other systems or Docker data", () => {
    const policy = createNativeViewerPolicy([
      board(item("beszelSystemStats", { systemId: "selected:public", timePeriod: "1h", showDockerCpu: false })),
    ]);
    const systems = [
      {
        integrationId: "selected",
        systems: [
          { id: "public", name: "Published" },
          { id: "private", name: "Private" },
        ],
      },
    ];
    expect(
      projectNativeViewerValue(policy, query("widget.beszel.getSystems", { integrationIds: ["selected"] }), systems),
    ).toEqual([{ integrationId: "selected", systems: [{ id: "public", name: "Published" }] }]);
    expect(() =>
      policy.authorize(
        query("widget.beszel.getSystemStats", {
          integrationIds: ["selected"],
          systemId: "public",
          timePeriod: "1h",
          includeDocker: false,
        }),
      ),
    ).not.toThrow();
    expect(() =>
      policy.authorize(
        query("widget.beszel.getSystemStats", {
          integrationIds: ["selected"],
          systemId: "private",
          timePeriod: "1h",
          includeDocker: false,
        }),
      ),
    ).toThrow();
    expect(() =>
      policy.authorize(
        query("widget.beszel.getSystemStats", {
          integrationIds: ["selected"],
          systemId: "public",
          timePeriod: "1h",
          includeDocker: true,
        }),
      ),
    ).toThrow();
  });

  test("default first-system selection is issued by a worker result, not chosen by the viewer", () => {
    const policy = createNativeViewerPolicy([board(item("beszelSystemStats", { systemId: "", timePeriod: "1m" }))]);
    const request = {
      path: "widget.beszel.subscribeSystemStats",
      kind: "subscription" as const,
      input: { integrationIds: ["selected"], systemId: "first" },
    };
    expect(() => policy.authorize(request)).toThrow();
    expect(
      projectNativeViewerValue(policy, query("widget.beszel.getSystems", { integrationIds: ["selected"] }), [
        { integrationId: "selected", systems: [{ id: "first" }, { id: "second" }] },
      ]),
    ).toEqual([{ integrationId: "selected", systems: [{ id: "first" }] }]);
    expect(() => policy.authorize(request)).not.toThrow();
    expect(() => policy.authorize({ ...request, input: { ...request.input, systemId: "second" } })).toThrow();
  });

  test("weather, feeds, Docker endpoints and app IDs come from saved board data", () => {
    const policy = createNativeViewerPolicy([
      board(
        item("weather", { location: { latitude: 45, longitude: 10 } }),
        item("rssFeed", { feedUrls: ["https://example.com/feed"], maximumAmountPosts: 20, descriptionMaxLength: 250 }),
        item("dockerContainers", { endpointIds: ["published-docker"] }),
        item("app", { appId: "published-app" }),
      ),
    ]);
    expect(() => policy.authorize(query("widget.weather.atLocation", { latitude: 45, longitude: 10 }))).not.toThrow();
    expect(() => policy.authorize(query("widget.weather.atLocation", { latitude: 46, longitude: 10 }))).toThrow();
    expect(() =>
      policy.authorize(
        query("widget.rssFeed.getFeeds", {
          urls: ["https://private/feed"],
          maximumAmountPosts: 20,
          descriptionMaxLength: 250,
        }),
      ),
    ).toThrow();
    expect(() => policy.authorize(query("docker.getContainers", { endpointIds: [] }))).toThrow();
    expect(() => policy.authorize(query("docker.getContainers", { endpointIds: ["private-docker"] }))).toThrow();
    expect(() => policy.authorize(query("app.byIds", ["published-app"]))).not.toThrow();
    expect(() => policy.authorize(query("app.byIds", ["private-app"]))).toThrow();
  });

  test("credential-bearing feed URLs stay on the worker while the native widget reads its placed item", () => {
    const feed = "https://username:private-password@example.com/feed?token=private-token&limit=10";
    const published = "https://example.com/feed?limit=10";
    const policy = createNativeViewerPolicy([board(item("rssFeed", { feedUrls: [feed], maximumAmountPosts: 20 }))]);
    const value = projectNativeViewerValue(policy, query("board.getBoardByName"), {
      id: "shared",
      items: [{ options: { feedUrls: [feed] } }],
    });
    expect(value).toEqual({ id: "shared", items: [{ options: { feedUrls: [published] } }] });
    const input = { itemId: "placed-item", urls: [published], maximumAmountPosts: 20, descriptionMaxLength: 250 };
    expect(() => policy.authorize(query("widget.rssFeed.getFeeds", input))).not.toThrow();
    expect(() => policy.authorize(query("widget.rssFeed.getFeeds", { ...input, itemId: "private-item" }))).toThrow();
    expect(() =>
      policy.authorize(query("widget.rssFeed.getFeeds", { ...input, urls: ["https://private-api.invalid"] })),
    ).toThrow();
    expect(
      projectNativeViewerValue(policy, query("widget.rssFeed.getFeeds", input), {
        entries: [{ id: "one", feedUrl: feed }],
      }),
    ).toEqual({ entries: [{ id: "one", feedUrl: published }] });
  });

  test("published container and volume selections filter returned native payloads", () => {
    const policy = createNativeViewerPolicy([
      board(
        item("dockerContainers", {
          endpointIds: ["selected"],
          containerFilter: ["public-*"],
          filterAllowWildcards: true,
          filterIsWhitelist: true,
        }),
        item("systemDisks", { visibleStorageVolumes: ["selected:public-volume"] }),
      ),
    ]);
    expect(
      projectNativeViewerValue(policy, query("docker.getContainers", { endpointIds: ["selected"] }), {
        timestamp: 1,
        endpoints: [{ id: "selected" }, { id: "private" }],
        containers: [
          { endpointId: "selected", name: "public-app" },
          { endpointId: "selected", name: "private-app" },
          { endpointId: "private", name: "public-other" },
        ],
      }),
    ).toEqual({
      timestamp: 1,
      endpoints: [{ id: "selected" }],
      containers: [{ endpointId: "selected", name: "public-app" }],
    });
    expect(
      projectNativeViewerValue(
        policy,
        query("widget.healthMonitoring.getSystemHealthStatus", { integrationIds: ["selected"] }),
        [
          {
            integrationId: "selected",
            healthInfo: { fileSystem: [{ deviceName: "public-volume" }, { deviceName: "private-volume" }], smart: [] },
          },
        ],
      ),
    ).toEqual([
      { integrationId: "selected", healthInfo: { fileSystem: [{ deviceName: "public-volume" }], smart: [] } },
    ]);
  });
});
