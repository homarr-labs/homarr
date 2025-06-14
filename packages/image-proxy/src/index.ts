import bcrypt from "bcrypt";

import { fetchWithTrustedCertificatesAsync } from "@homarr/certificates/server";
import { createId } from "@homarr/common";
import { decryptSecret, encryptSecret } from "@homarr/common/server";
import { logger } from "@homarr/log";
import { createGetSetChannel } from "@homarr/redis";

const createHashChannel = (hash: `${string}.${string}`) => createGetSetChannel<string>(`image-proxy:hash:${hash}`);
const createUrlByIdChannel = (id: string) =>
  createGetSetChannel<{
    url: `${string}.${string}`;
    headers: `${string}.${string}`;
  }>(`image-proxy:url:${id}`);
const saltChannel = createGetSetChannel<string>("image-proxy:salt");

export class ImageProxy {
  private static salt: string | null = null;
  private async getOrCreateSaltAsync(): Promise<string> {
    if (ImageProxy.salt) return ImageProxy.salt;
    const existingSalt = await saltChannel.getAsync();
    if (existingSalt) {
      ImageProxy.salt = existingSalt;
      return existingSalt;
    }

    const salt = await bcrypt.genSalt(10);
    ImageProxy.salt = salt;
    await saltChannel.setAsync(salt);
    return salt;
  }

  public async createImageAsync(url: string, headers?: Record<string, string>): Promise<string> {
    const existingId = await this.getExistingIdAsync(url, headers);
    if (existingId) {
      return this.createImageUrl(existingId);
    }

    const id = createId();
    await this.storeImageAsync(id, url, headers);

    return this.createImageUrl(id);
  }

  public async forwardImageAsync(id: string): Promise<Blob | null> {
    const urlAndHeaders = await this.getImageUrlAndHeadersAsync(id);
    if (!urlAndHeaders) return null;

    const response = await fetchWithTrustedCertificatesAsync(urlAndHeaders.url, {
      headers: urlAndHeaders.headers ?? {},
    });
    if (!response.ok) {
      logger.error(`Failed to fetch image for id=${id}: ${response.status}`);
      return null;
    }

    return (await response.blob()) as Blob;
  }

  private createImageUrl(id: string): string {
    return `/api/image-proxy/${id}`;
  }

  private async getImageUrlAndHeadersAsync(id: string) {
    const urlHeaderChannel = createUrlByIdChannel(id);
    const urlHeader = await urlHeaderChannel.getAsync();
    if (!urlHeader) return null;

    return {
      url: decryptSecret(urlHeader.url),
      headers: JSON.parse(decryptSecret(urlHeader.headers)) as Record<string, string> | null,
    };
  }

  private async getExistingIdAsync(url: string, headers: Record<string, string> | undefined): Promise<string | null> {
    const salt = await this.getOrCreateSaltAsync();
    const urlHash = await bcrypt.hash(url, salt);
    const headerHash = await bcrypt.hash(JSON.stringify(headers ?? null), salt);

    const channel = createHashChannel(`${urlHash}.${headerHash}`);
    return await channel.getAsync();
  }

  private async storeImageAsync(id: string, url: string, headers: Record<string, string> | undefined): Promise<void> {
    const salt = await this.getOrCreateSaltAsync();
    const urlHash = await bcrypt.hash(url, salt);
    const headerHash = await bcrypt.hash(JSON.stringify(headers ?? null), salt);

    const hashChannel = createHashChannel(`${urlHash}.${headerHash}`);
    const urlHeaderChannel = createUrlByIdChannel(id);
    await urlHeaderChannel.setAsync({
      url: encryptSecret(url),
      headers: encryptSecret(JSON.stringify(headers ?? null)),
    });
    await hashChannel.setAsync(id);
  }
}
