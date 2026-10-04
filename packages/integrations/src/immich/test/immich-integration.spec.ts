// @vitest-environment node

import { beforeEach, describe, expect, test, vi } from "vitest";

import type { IntegrationSecret } from "../../base/types";
import { ImmichIntegration } from "../immich-integration";

const mocks = vi.hoisted(() => ({
  getAlbumInfo: vi.fn(),
  searchAssets: vi.fn(),
  searchRandom: vi.fn(),
  createImagesAsync: vi.fn<(urls: string[]) => Promise<string[]>>(),
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
  searchRandom: mocks.searchRandom,
  searchUsers: vi.fn(),
}));

vi.mock("@homarr/image-proxy", () => ({
  ImageProxy: class {
    createImagesAsync = mocks.createImagesAsync;
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
    mocks.searchRandom.mockReset();
    mocks.createImagesAsync.mockReset();
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
    mocks.createImagesAsync.mockImplementation(async (urls) => urls.map((url) => `proxied:${url}`));

    const album = await integration.getAlbumAsync("album-id");

    expect(mocks.searchAssets).toHaveBeenCalledTimes(2);
    expect(mocks.searchAssets.mock.calls.map(([input]) => input)).toStrictEqual([
      { metadataSearchDto: { albumIds: ["album-id"], type: "IMAGE", size: 1000, withExif: false, page: 1 } },
      { metadataSearchDto: { albumIds: ["album-id"], type: "IMAGE", size: 1000, withExif: false, page: 2 } },
    ]);
    expect(album.assets.map(({ id }) => id)).toStrictEqual(Array.from({ length: 12 }, (_, index) => `asset-${index}`));
    expect(mocks.createImagesAsync).toHaveBeenCalledTimes(1);
    expect(mocks.createImagesAsync.mock.calls[0]?.[0]).toHaveLength(12);
  });

  test("selects a single random photo from the requested album for its preview", async () => {
    mocks.searchRandom.mockResolvedValue([createAsset(7)]);
    mocks.createImagesAsync.mockImplementation(async (urls) => urls.map((url) => `proxied:${url}`));

    const preview = await integration.getAlbumPreviewAsync("album-id", true);

    expect(mocks.searchRandom.mock.calls[0]?.[0]).toStrictEqual({
      randomSearchDto: { albumIds: ["album-id"], size: 1, type: "IMAGE" },
    });
    expect(mocks.searchAssets).not.toHaveBeenCalled();
    expect(preview.assets.map(({ id }) => id)).toStrictEqual(["asset-7"]);
    expect(mocks.createImagesAsync.mock.calls[0]?.[0]).toHaveLength(1);
  });

  test("falls back to the album's first metadata photo when random search is unavailable", async () => {
    mocks.searchRandom.mockRejectedValue(new Error("Random search unavailable"));
    mocks.searchAssets.mockResolvedValue({ assets: { items: [createAsset(3)], nextPage: null } });
    mocks.createImagesAsync.mockImplementation(async (urls) => urls.map((url) => `proxied:${url}`));

    const preview = await integration.getAlbumPreviewAsync("album-id", true);

    expect(mocks.searchAssets.mock.calls[0]?.[0]).toStrictEqual({
      metadataSearchDto: { albumIds: ["album-id"], type: "IMAGE", size: 1, withExif: false },
    });
    expect(preview.assets.map(({ id }) => id)).toStrictEqual(["asset-3"]);
  });

  test("keeps the first album photo when randomization is off", async () => {
    mocks.searchAssets.mockResolvedValue({ assets: { items: [createAsset(2)], nextPage: "2" } });
    mocks.createImagesAsync.mockImplementation(async (urls) => urls.map((url) => `proxied:${url}`));

    const preview = await integration.getAlbumPreviewAsync("album-id", false);

    expect(mocks.searchRandom).not.toHaveBeenCalled();
    expect(preview.assets.map(({ id }) => id)).toStrictEqual(["asset-2"]);
    expect(mocks.searchAssets).toHaveBeenCalledTimes(1);
  });
});
