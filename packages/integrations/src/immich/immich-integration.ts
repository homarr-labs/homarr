import { z } from "zod/v4";

import { ResponseError } from "@homarr/common/server";
import { fetchWithTrustedCertificatesAsync } from "@homarr/core/infrastructure/http";

import type { IntegrationInput, IntegrationTestingInput } from "../base/integration";
import { Integration } from "../base/integration";
import type { SessionStore } from "../base/session-store";
import { createSessionStore } from "../base/session-store";
import { TestConnectionError } from "../base/test-connection/test-connection-error";
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
  resized: boolean;
  thumbhash: string | null;
  fileModifiedAt: string;
  fileCreatedAt: string;
  updatedAt: string;
  isReadOnly: boolean;
  type: "IMAGE" | "VIDEO" | "AUDIO" | "OTHER";
}

export class ImmichIntegration extends Integration {
  private readonly sessionStore: SessionStore<Record<string, unknown>>;

  constructor(integration: IntegrationInput) {
    super(integration);
    this.sessionStore = createSessionStore(integration);
  }

  public async getServerStatsAsync(): Promise<ImmichServerStats> {
    const response = await fetchWithTrustedCertificatesAsync(this.url("/api/server/stats"), {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new ResponseError(response);
    }

    const data = await response.json();
    return serverStatsSchema.parseAsync(data);
  }

  public async getAlbumAsync(albumId: string): Promise<ImmichAlbum> {
    const response = await fetchWithTrustedCertificatesAsync(this.url(`/api/albums/${albumId}`), {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new ResponseError(response);
    }

    const data = await response.json();
    return albumSchema.parseAsync(data);
  }

  public async getAlbumsAsync(): Promise<
    Array<{
      id: string;
      albumName: string;
      assetCount: number;
    }>
  > {
    const response = await fetchWithTrustedCertificatesAsync(this.url("/api/albums?shared=false"), {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new ResponseError(response);
    }

    const data = await response.json();
    return z
      .array(
        z.object({
          id: z.string(),
          albumName: z.string(),
          assetCount: z.number(),
        }),
      )
      .parseAsync(data);
  }

  private getAuthHeaders() {
    const apiKey = this.getSecrets().find((secret) => secret.kind === "apiKey");
    if (!apiKey) {
      throw new Error("Immich API key not found");
    }
    return {
      "x-api-key": apiKey.value,
      "User-Agent": "Homarr",
    };
  }

  protected async testingAsync(_: IntegrationTestingInput): Promise<TestingResult> {
    const response = await fetchWithTrustedCertificatesAsync(this.url("/api/server/stats"), {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      return TestConnectionError.StatusResult(response);
    }

    return { success: true };
  }
}

const serverStatsSchema = z.object({
  photos: z.number().int(),
  videos: z.number().int(),
  usage: z.number().int(),
  usageByUser: z.array(z.object({}).passthrough()),
});

const assetSchema = z.object({
  id: z.string(),
  deviceAssetId: z.string(),
  originalPath: z.string(),
  resized: z.boolean(),
  thumbhash: z.string().nullable(),
  fileModifiedAt: z.string(),
  fileCreatedAt: z.string(),
  updatedAt: z.string(),
  isReadOnly: z.boolean(),
  type: z.enum(["IMAGE", "VIDEO", "AUDIO", "OTHER"]),
});

const albumSchema = z.object({
  id: z.string(),
  albumName: z.string(),
  assets: z.array(assetSchema),
});
