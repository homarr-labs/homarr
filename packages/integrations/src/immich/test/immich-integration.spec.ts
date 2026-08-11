// @vitest-environment node

import { beforeEach, describe, expect, test, vi } from "vitest";

import type { IntegrationSecret } from "../../base/types";
import { ImmichIntegration } from "../immich-integration";

const mocks = vi.hoisted(() => ({
  getAlbumInfo: vi.fn(),
  searchAssets: vi.fn(),
  createImageAsync: vi.fn<(url: string) => Promise<string>>(),
}));

vi.mock("@immich/sdk", () => ({
  AssetMediaSize: { Preview: "preview" },
  AssetTypeEnum: { Image: "IMAGE" },
  AssetVisibility: { Timeline: "timeline" },
  getAlbumInfo: mocks.getAlbumInfo,
  getAllAlbums: vi.fn(),
  getMyUser: vi.fn(),
  getServerStatistics: vi.fn(),
  init: vi.fn(),
  searchAssets: mocks.searchAssets,
  searchRandom: vi.fn(),
  searchUsers: vi.fn(),
}));

vi.mock("@homarr/image-proxy", () => ({
  ImageProxy: class {
    createImageAsync = mocks.createImageAsync;
  },
}));

const secrets: IntegrationSecret[] = [{ kind: "apiKey", value: "immich-token" }];
const integration = new ImmichIntegration({
  id: "test-immich",
  name: "Test Immich",
  url: "https://immich.example.com",
  externalUrl: null,
  decryptedSecrets: secrets,
});

const createAsset = (index: number) => ({
  id: `asset-${index}`,
  type: "IMAGE",
  thumbhash: null,
  fileCreatedAt: "2026-01-01T00:00:00.000Z",
  fileModifiedAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
});

describe("ImmichIntegration.getAlbumAsync", () => {
  beforeEach(() => {
    mocks.getAlbumInfo.mockReset();
    mocks.searchAssets.mockReset();
    mocks.createImageAsync.mockClear();
  });

  test("keeps every image across paginated album results", async () => {
    mocks.getAlbumInfo.mockResolvedValue({ id: "album-id", albumName: "Large album" });
    mocks.searchAssets
      .mockResolvedValueOnce({
        assets: {
          items: Array.from({ length: 6 }, (_, index) => createAsset(index)),
          nextPage: "2",
        },
      })
      .mockResolvedValueOnce({
        assets: {
          items: Array.from({ length: 6 }, (_, index) => createAsset(index + 6)),
          nextPage: null,
        },
      });
    mocks.createImageAsync.mockImplementation(async (url) => `proxied:${url}`);

    const album = await integration.getAlbumAsync("album-id");

    expect(mocks.searchAssets).toHaveBeenCalledTimes(2);
    expect(mocks.searchAssets.mock.calls.map(([input]) => input)).toStrictEqual([
      { metadataSearchDto: { albumIds: ["album-id"], type: "IMAGE" } },
      { metadataSearchDto: { albumIds: ["album-id"], type: "IMAGE", page: 2 } },
    ]);
    expect(album.assets.map(({ id }) => id)).toStrictEqual(Array.from({ length: 12 }, (_, index) => `asset-${index}`));
    expect(mocks.createImageAsync).toHaveBeenCalledTimes(12);
  });
});
