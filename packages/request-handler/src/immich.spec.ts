import { beforeEach, describe, expect, test, vi } from "vitest";

import { immichAlbumsRequestHandler } from "./immich";

const mocks = vi.hoisted(() => ({
  createIntegrationAsync: vi.fn(),
}));

vi.mock("@homarr/integrations/factory", () => ({
  createIntegrationAsync: mocks.createIntegrationAsync,
}));

const integration = {
  id: "immich-integration",
  kind: "immich",
} as Parameters<typeof immichAlbumsRequestHandler.handler>[0];

const albums = [
  { id: "upstream-first", albumName: "Zebra", assetCount: 1 },
  { id: "second-b", albumName: "Beta", assetCount: 10 },
  { id: "second-a", albumName: "Alpha", assetCount: 10 },
];

describe("immichAlbumsRequestHandler", () => {
  beforeEach(() => {
    immichAlbumsRequestHandler.invalidateCache();
    mocks.createIntegrationAsync.mockReset();
  });

  test("sorts deterministically before caching a limited response", async () => {
    const getAlbumsAsync = vi.fn().mockResolvedValue([...albums]);
    mocks.createIntegrationAsync.mockResolvedValue({ getAlbumsAsync });

    const first = await immichAlbumsRequestHandler.handler(integration, { limit: 2 }).getDataAsync();
    const cached = await immichAlbumsRequestHandler.handler(integration, { limit: 2 }).getDataAsync();

    expect(first.data.map(({ id }) => id)).toStrictEqual(["second-a", "second-b"]);
    expect(cached.data).toStrictEqual(first.data);
    expect(getAlbumsAsync).toHaveBeenCalledOnce();
  });

  test("preserves upstream order when no limit is requested", async () => {
    const getAlbumsAsync = vi.fn().mockResolvedValue([...albums]);
    mocks.createIntegrationAsync.mockResolvedValue({ getAlbumsAsync });

    const result = await immichAlbumsRequestHandler.handler(integration, {}).getDataAsync();

    expect(result.data).toStrictEqual(albums);
  });
});
