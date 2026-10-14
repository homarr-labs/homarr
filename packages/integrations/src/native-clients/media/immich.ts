import type { ImmichAlbum, ImmichServerStats } from "../../immich/immich-integration";
import type { TestingResult } from "../../base/test-connection/test-connection-service";
import { apiKeyAuth } from "../../http-auth";
import { MediaClientHoldError, MediaHttpClient } from "./http";
import type { MediaHttpOperation, MediaPublic } from "./http";

export class ImmichMediaClient extends MediaHttpClient implements MediaPublic<"immich"> {
  override async getHttpAuthenticationAsync() {
    this.resources.context.signal.throwIfAborted();
    return apiKeyAuth(this.integration);
  }

  override async testConnectionAsync(): Promise<TestingResult> {
    throw new MediaClientHoldError("sdk-fetch-compatibility");
  }

  protected async testingAsync(_http: MediaHttpOperation): Promise<TestingResult> {
    throw new MediaClientHoldError("sdk-fetch-compatibility");
  }

  async getServerStatsAsync(): Promise<ImmichServerStats> {
    throw new MediaClientHoldError("sdk-fetch-compatibility");
  }

  async getAlbumAsync(_albumId?: string): Promise<ImmichAlbum> {
    throw new MediaClientHoldError("image-registration");
  }

  async getAlbumPreviewAsync(_albumId: string, _randomizePhotos: boolean): Promise<ImmichAlbum> {
    throw new MediaClientHoldError("image-registration");
  }

  async getAlbumsAsync(): Promise<{ id: string; albumName: string; assetCount: number }[]> {
    throw new MediaClientHoldError("sdk-fetch-compatibility");
  }
}
