import {
  AssetMediaSize,
  AssetTypeEnum,
  AssetVisibility,
  getAlbumInfo,
  getAllAlbums,
  getMyUser,
  getServerStatistics,
  searchAssets,
  searchRandom,
  searchUsers,
} from "@immich/sdk";
import type { AlbumResponseDto, AssetResponseDto, MetadataSearchDto } from "@immich/sdk";

import { fetchWithTrustedCertificatesAsync } from "@homarr/core/infrastructure/http";
import { createLogger } from "@homarr/core/infrastructure/logs";
import { ImageProxy } from "@homarr/image-proxy";

import type { IntegrationHttpAuthentication } from "../http-auth";
import { apiKeyAuth } from "../http-auth";
import type { IntegrationInput, IntegrationTestingInput } from "../base/integration";
import { Integration } from "../base/integration";
import type { TestingResult } from "../base/test-connection/test-connection-service";

export interface ImmichServerStats {
  userCount: number;
  photoCount: number;
  videoCount: number;
  totalLibraryUsageInBytes: number;
}

export interface ImmichAlbum {
  id: string;
  albumName: string;
  assets: ImmichAsset[];
}

export interface ImmichAsset {
  id: string;
  thumbhash: string | null;
  fileModifiedAt: string;
  fileCreatedAt: string;
  updatedAt: string;
  type: "IMAGE" | "VIDEO" | "AUDIO" | "OTHER";
  publicLink: string;
}

const logger = createLogger({ module: "immich-integration" });
const carouselPhotoCount = 50;

export class ImmichIntegration extends Integration {
  public async getHttpAuthenticationAsync(): Promise<IntegrationHttpAuthentication> {
    return apiKeyAuth(this.integration);
  }

  constructor(integration: IntegrationInput) {
    super(integration);
  }

  public async getServerStatsAsync(): Promise<ImmichServerStats> {
    const [statistics, users] = await Promise.all([
      getServerStatistics(this.getRequestOptions()),
      searchUsers(this.getRequestOptions()),
    ]);
    return {
      photoCount: statistics.photos,
      userCount: users.length,
      totalLibraryUsageInBytes: statistics.usage,
      videoCount: statistics.videos,
    };
  }

  public async getAlbumAsync(albumId?: string): Promise<ImmichAlbum> {
    const requestOptions = this.getRequestOptions();

    if (!albumId) {
      const assets = await searchRandom(
        {
          randomSearchDto: {
            size: carouselPhotoCount,
            type: AssetTypeEnum.Image,
            visibility: AssetVisibility.Timeline,
          },
        },
        requestOptions,
      );

      return {
        id: "",
        albumName: "",
        assets: await this.createAssetsAsync(assets),
      };
    }

    const albumPromise = getAlbumInfo({ id: albumId }, requestOptions);
    const [album, albumAssets] = await Promise.all([albumPromise, this.searchAlbumAssetsAsync(albumId, albumPromise)]);
    return {
      albumName: album.albumName,
      assets: await this.createAssetsAsync(albumAssets),
      id: album.id,
    };
  }

  public async getAlbumPreviewAsync(albumId: string, randomizePhotos: boolean): Promise<ImmichAlbum> {
    const requestOptions = this.getRequestOptions();
    let assets: AssetResponseDto[] = [];
    if (randomizePhotos) {
      try {
        assets = await searchRandom(
          { randomSearchDto: { albumIds: [albumId], size: 1, type: AssetTypeEnum.Image } },
          requestOptions,
        );
      } catch {
        // Older Immich instances may reject album-scoped random search.
        // The first metadata page is still a valid preview for this album.
      }
    }
    if (assets.length === 0) {
      const result = await searchAssets(
        { metadataSearchDto: { albumIds: [albumId], type: AssetTypeEnum.Image, size: 1, withExif: false } },
        requestOptions,
      );
      assets = result.assets.items;
    }
    return { id: albumId, albumName: "", assets: await this.createAssetsAsync(assets.slice(0, 1)) };
  }

  public async getAlbumsAsync(): Promise<
    {
      id: string;
      albumName: string;
      assetCount: number;
    }[]
  > {
    const albums = await getAllAlbums({}, this.getRequestOptions());
    return albums.map((album) => ({ id: album.id, albumName: album.albumName, assetCount: album.assetCount }));
  }

  protected async testingAsync(input: IntegrationTestingInput): Promise<TestingResult> {
    const user = await getMyUser(this.getRequestOptions(input.fetchAsync));
    logger.debug(`Logged in as ${user.name} (${user.id})`);
    return { success: true };
  }

  private async searchAlbumAssetsAsync(
    albumId: string,
    albumPromise: Promise<AlbumResponseDto>,
  ): Promise<AssetResponseDto[]> {
    const requestOptions = this.getRequestOptions();
    const pageSize = 1000;
    const metadataSearchDto: MetadataSearchDto = {
      albumIds: [albumId],
      type: AssetTypeEnum.Image,
      size: pageSize,
      withExif: false,
    };
    const pages = new Map<number, ReturnType<typeof searchAssets>>();
    const getPage = (page: number) => {
      const existing = pages.get(page);
      if (existing) return existing;
      const pending = searchAssets({ metadataSearchDto: { ...metadataSearchDto, page } }, requestOptions);
      pages.set(page, pending);
      // A speculative page can fail before pagination needs to await it.
      void pending.catch(() => undefined);
      return pending;
    };
    getPage(1);
    // The count includes videos, so it is only a hint. Start at most four pages
    // together, then follow actual nextPage values to preserve the full album.
    void albumPromise
      .then(
        (album) => {
          const initialPages = Math.min(4, Math.ceil(album.assetCount / pageSize));
          for (let page = 2; page <= initialPages; page++) getPage(page);
        },
        () => undefined,
      )
      .catch(() => undefined);

    const assets: AssetResponseDto[] = [];
    let page: number | null = 1;
    do {
      const result = await getPage(page);
      assets.push(...result.assets.items);
      if (result.assets.nextPage === null) break;
      const nextPage = Number(result.assets.nextPage);
      if (!Number.isInteger(nextPage) || nextPage <= page) throw new Error("Immich returned invalid album pagination");
      page = nextPage;
    } while (page !== null);
    return assets;
  }

  private async createAssetsAsync(assets: AssetResponseDto[]): Promise<ImmichAsset[]> {
    const imageProxy = new ImageProxy();
    const publicLinks = await imageProxy.createImagesAsync(
      assets.map((asset) => this.url(`/api/assets/${asset.id}/thumbnail`, { size: AssetMediaSize.Preview }).toString()),
      { "x-api-key": this.getSecretValue("apiKey") },
    );
    return assets.map((asset, index) => {
      const publicLink = publicLinks[index];
      if (!publicLink) throw new Error("Image proxy registration returned no link for an asset");
      return {
        id: asset.id,
        type: asset.type,
        thumbhash: asset.thumbhash,
        fileCreatedAt: asset.fileCreatedAt,
        fileModifiedAt: asset.fileModifiedAt,
        updatedAt: asset.updatedAt,
        publicLink,
      };
    });
  }

  private getRequestOptions(fetchAsync = fetchWithTrustedCertificatesAsync) {
    return {
      // Every parallel integration call owns its endpoint and credentials.
      // SDK-wide defaults can be overwritten by another Immich instance.
      baseUrl: this.url("/api").toString(),
      headers: { "x-api-key": this.getSecretValue("apiKey") },
      // Undici and node types are not the same
      fetch: fetchAsync as unknown as typeof fetch,
    };
  }
}
