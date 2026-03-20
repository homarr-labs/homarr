import { getAlbumInfo, getAllAlbums, getMyUser, getServerStatistics, init, searchUsers } from "@immich/sdk";

import { fetchWithTrustedCertificatesAsync } from "@homarr/core/infrastructure/http";
import { createLogger } from "@homarr/core/infrastructure/logs";
import { ImageProxy } from "@homarr/image-proxy";

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
  deviceAssetId: string;
  originalPath: string;
  thumbhash: string | null;
  fileModifiedAt: string;
  fileCreatedAt: string;
  updatedAt: string;
  type: "IMAGE" | "VIDEO" | "AUDIO" | "OTHER";
  publicLink: string;
}

const logger = createLogger({ module: "immich-integration" });

export class ImmichIntegration extends Integration {
  constructor(integration: IntegrationInput) {
    super(integration);
  }

  public async getServerStatsAsync(): Promise<ImmichServerStats> {
    this.initClient();
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

  public async getAlbumAsync(albumId: string): Promise<ImmichAlbum> {
    this.initClient();
    const album = await getAlbumInfo({ id: albumId }, this.getRequestOptions());
    const imageProxy = new ImageProxy();
    return {
      albumName: album.albumName,
      assets: await Promise.all(
        album.assets.map(async (asset) => {
          const publicLink = await imageProxy.createImageAsync(
            this.url(`/api/assets/${asset.id}/original`).toString(),
            {
              "x-api-key": this.getSecretValue("apiKey"),
            },
          );
          return {
            id: asset.id,
            type: asset.type,
            deviceAssetId: asset.deviceAssetId,
            thumbhash: asset.thumbhash,
            fileCreatedAt: asset.fileCreatedAt,
            fileModifiedAt: asset.fileModifiedAt,
            originalPath: asset.originalPath,
            updatedAt: asset.updatedAt,
            publicLink,
          };
        }),
      ),
      id: album.id,
    };
  }

  public async getAlbumsAsync(): Promise<
    {
      id: string;
      albumName: string;
      assetCount: number;
    }[]
  > {
    this.initClient();
    const albums = await getAllAlbums({}, this.getRequestOptions());
    return albums.map((album) => ({ id: album.id, albumName: album.albumName, assetCount: album.assetCount }));
  }

  protected async testingAsync(_: IntegrationTestingInput): Promise<TestingResult> {
    this.initClient();
    const user = await getMyUser(this.getRequestOptions());
    logger.debug(`Logged in as ${user.name} (${user.id})`);
    return { success: true };
  }

  private getRequestOptions() {
    return {
      fetch: fetchWithTrustedCertificatesAsync,
    };
  }

  /**
   * Sets the credentials and prepares the client for calls.
   * Must be called before any other functions.
   * @private
   */
  private initClient() {
    init({ baseUrl: this.url("/api").toString(), apiKey: this.getSecretValue("apiKey") });
  }
}
