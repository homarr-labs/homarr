import { describe, expect, mock, test } from "bun:test";

import type { ORPCClient } from "@homarr/api/orpc";

import { getBoardWidgetData, projectWidgetDisplay, safeWidgetLink } from "./widget-data";
import type { BoardWidgetSource } from "./widget-data";

const source = (
  kind: string,
  options: Record<string, unknown> = {},
  integrationIds = ["allowed"],
): BoardWidgetSource => ({
  kind,
  options,
  integrationIds,
  itemId: "placed-item",
  boardId: "shared-board",
});
const client = (value: unknown) => value as ORPCClient;

describe("board widget publication", () => {
  test("serves built-in notebook data without creating an owner API client", async () => {
    const caller = mock(() => {
      throw new Error("Must stay lazy");
    });
    expect(await getBoardWidgetData(source("notebook", { content: "<p>Shared note</p>" }), { caller })).toEqual({
      status: "ready",
      data: { format: "text", content: "Shared note" },
    });
    expect(caller).not.toHaveBeenCalled();
  });

  test("dispatches only a fixed read with persisted integration IDs", async () => {
    const summary = mock(async () => ({ count: 12, password: "hidden", integrationUrl: "http://private" }));
    const result = await getBoardWidgetData(
      source("dnsHoleControls", { integrationIds: ["foreign"], path: "dnsHole.disable" }),
      { caller: client({ widget: { dnsHole: { summary } } }) },
    );
    expect(summary).toHaveBeenCalledWith({ integrationIds: ["allowed"] }, { signal: undefined });
    expect(result).toEqual({ status: "ready", data: { count: 12 } });
  });

  test("scopes Beszel statistics to the selected discovered system and disables hidden Docker data", async () => {
    const getSystems = mock(async () => [{ integrationId: "allowed", systems: [{ id: "chosen" }, { id: "other" }] }]);
    const getSystemStats = mock(async () => ({ systemStats: [1], containerStats: [{ name: "private" }] }));
    const api = client({ widget: { beszel: { getSystems, getSystemStats } } });
    const result = await getBoardWidgetData(
      source("beszelSystemStats", { systemId: "allowed:chosen", timePeriod: "24h", showDockerCpu: false }),
      { caller: api },
    );
    expect(getSystemStats).toHaveBeenCalledWith(
      { integrationIds: ["allowed"], systemId: "chosen", timePeriod: "24h", includeDocker: false },
      { signal: undefined },
    );
    expect(result).toEqual({ status: "ready", data: { systemStats: [1], containerStats: [], systemId: "chosen" } });
    getSystemStats.mockClear();
    expect(
      (await getBoardWidgetData(source("beszelSystemStats", { systemId: "foreign:chosen" }), { caller: api })).status,
    ).toBe("unconfigured");
    expect(getSystemStats).not.toHaveBeenCalled();
  });

  test("does not resolve ambiguous legacy Beszel IDs to an arbitrary integration", async () => {
    const getSystemStats = mock(async () => ({}));
    const getSystems = mock(async () => [
      { integrationId: "first", systems: [{ id: "same" }] },
      { integrationId: "second", systems: [{ id: "same" }] },
    ]);
    const result = await getBoardWidgetData(source("beszelSystemStats", { systemId: "same" }, ["first", "second"]), {
      caller: client({ widget: { beszel: { getSystems, getSystemStats } } }),
    });
    expect(result.status).toBe("unconfigured");
    expect(getSystemStats).not.toHaveBeenCalled();
  });

  test("uses only the saved Immich album and removes unbound local media capabilities", async () => {
    const getAlbum = mock(async () => ({
      albumName: "Published album",
      assets: [{ id: "photo", url: "/api/image-proxy/private-capability" }],
    }));
    const result = await getBoardWidgetData(
      source("immich-albumCarousel", { albumId: "published-album", integrationId: "foreign" }),
      { caller: client({ widget: { immich: { getAlbum } } }) },
    );
    expect(getAlbum).toHaveBeenCalledWith(
      { integrationId: "allowed", albumId: "published-album" },
      { signal: undefined },
    );
    expect(result).toEqual({
      status: "ready",
      data: { albumName: "Published album", assets: [{ id: "photo", url: null }] },
    });
  });

  test("replaces only exact native image capabilities through the share-bound media mapper", async () => {
    const getAlbum = mock(async () => ({
      assets: [
        { publicLink: "/api/image-proxy/opaque-image" },
        { publicLink: "/api/image-proxy/opaque-image?token=private" },
        { publicLink: "/api/other/opaque-image" },
      ],
    }));
    const mediaPath = mock(async () => "/remote/boards/shared-board/media/signed-token");
    const result = await getBoardWidgetData(source("immich-albumCarousel", { albumId: "selected" }), {
      caller: client({ widget: { immich: { getAlbum } } }),
      mediaPath,
    });
    expect(mediaPath).toHaveBeenCalledTimes(1);
    expect(mediaPath).toHaveBeenCalledWith("/api/image-proxy/opaque-image");
    expect(result).toEqual({
      status: "ready",
      data: {
        assets: [
          { publicLink: "/remote/boards/shared-board/media/signed-token" },
          { publicLink: null },
          { publicLink: null },
        ],
      },
    });
  });

  test("refreshes and publishes only visible configured statistics from attached integrations", async () => {
    const displaySnapshot = mock(async () => ({
      values: { visible: 7, hidden: "private", unselected: "private" },
      updatedAt: 123,
    }));
    const result = await getBoardWidgetData(
      source("stats", {
        entries: [
          { id: "selected", integrationId: "allowed", metric: "visible", label: "Selected" },
          { id: "hidden", integrationId: "allowed", metric: "hidden", hidden: true },
          { id: "foreign", integrationId: "foreign", metric: "private" },
        ],
      }),
      { caller: client({ widget: { stats: { displaySnapshot } } }) },
    );
    expect(displaySnapshot).toHaveBeenCalledTimes(1);
    expect(displaySnapshot).toHaveBeenCalledWith({ integrationId: "allowed" }, { signal: undefined });
    expect(result).toEqual({
      status: "ready",
      data: {
        entries: [{ id: "selected", label: "Selected", metric: "visible", value: 7, updatedAt: 123 }],
        cacheOnly: false,
      },
    });
  });

  test("uses the dedicated Custom Widget share read for the actual placed item", async () => {
    const getShareData = mock(async () => ({
      data: { safe: { count: 4, token: "hidden" } },
      status: { safe: { ok: true } },
      template: "hidden",
      configuration: { password: "hidden" },
    }));
    const result = await getBoardWidgetData(source("customApi", { itemId: "foreign", definitionId: "foreign" }), {
      caller: client({ widget: { customApi: { getShareData } } }),
    });
    expect(getShareData).toHaveBeenCalledWith({ itemId: "placed-item" }, { signal: undefined });
    expect(result).toEqual({ status: "ready", data: { data: { safe: { count: 4 } }, status: { safe: { ok: true } } } });
  });

  test("requires explicit Docker endpoints and projects selected containers without environment or labels", async () => {
    const getContainers = mock(async () => ({
      containers: [
        {
          id: "wanted",
          endpointId: "first",
          name: "safe",
          state: "running",
          env: ["PASSWORD=hidden"],
          labels: { token: "hidden" },
        },
        { id: "foreign", endpointId: "second", name: "safe", state: "running" },
        { id: "filtered", endpointId: "first", name: "other", state: "running" },
      ],
      timestamp: 123,
    }));
    const api = client({ docker: { getContainers } });
    expect((await getBoardWidgetData(source("dockerContainers", {}), { caller: api })).status).toBe("unconfigured");
    expect(getContainers).not.toHaveBeenCalled();
    const result = await getBoardWidgetData(
      source("dockerContainers", { endpointIds: ["first"], containerFilter: ["safe"], filterIsWhitelist: true }),
      { caller: api },
    );
    expect(getContainers).toHaveBeenCalledWith({ endpointIds: ["first"] }, { signal: undefined });
    expect(JSON.stringify(result)).not.toContain("hidden");
    expect(JSON.stringify(result)).not.toContain("foreign");
    expect(JSON.stringify(result)).not.toContain("filtered");
    expect(JSON.stringify(result)).toContain("wanted");
  });

  test("removes credential fields, URL credentials and signed query parameters at every depth", () => {
    const result = projectWidgetDisplay({
      safe: 12,
      sources: { source: "private" },
      headers: { Authorization: "private" },
      username: "private",
      password: "private",
      requestCapabilities: ["private"],
      template: "private",
      options: { key: "private" },
      nested: [
        {
          url: "https://user:password@example.com",
          link: "https://example.com?access_token=private",
          note: "Bearer private",
        },
      ],
    });
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain("private");
    expect(serialized).not.toContain("password");
    expect(result).toMatchObject({ safe: 12 });
    expect(safeWidgetLink("https://example.com/path")).toBe("https://example.com/path");
    expect(safeWidgetLink("javascript:alert(1)")).toBeNull();
    expect(safeWidgetLink("https://user:password@example.com")).toBeNull();
    expect(safeWidgetLink("https://example.com?%74oken=private")).toBeNull();
  });

  test("never invokes Assistant or action-only widgets and hides upstream exception details", async () => {
    const caller = mock(() => {
      throw new Error("password=private https://user:private@example.com");
    });
    expect((await getBoardWidgetData(source("assistant"), { caller })).status).toBe("unsupported");
    expect((await getBoardWidgetData(source("smartHome-executeAutomation"), { caller })).status).toBe("unsupported");
    expect(caller).not.toHaveBeenCalled();
    const result = await getBoardWidgetData(source("dnsHoleSummary"), { caller });
    expect(result).toEqual({ status: "unavailable", reason: "Widget data is temporarily unavailable." });
    expect(JSON.stringify(result)).not.toContain("private");
  });
});
