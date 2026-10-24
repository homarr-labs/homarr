import { createHmac, hkdfSync, randomUUID } from "node:crypto";
import { setImmediate } from "node:timers/promises";

import { createId, formatBytes } from "@homarr/common";
import { env } from "@homarr/common/env";
import {
  createKeyedFingerprint,
  decryptSecret,
  encryptSecret,
  readBoundedResponseAsync,
  verifyKeyedFingerprint,
} from "@homarr/common/server";
import { cancelBodyAsync, fetchGuardedAsync } from "@homarr/core/infrastructure/http";
import { createLogger } from "@homarr/core/infrastructure/logs";
import { ErrorWithMetadata } from "@homarr/core/infrastructure/logs/error";
import { createGetSetChannel } from "@homarr/redis";

const logger = createLogger({ module: "imageProxy" });

export const IMAGE_PROXY_REDIS_TTL_SECONDS = 86400;
export const IMAGE_PROXY_MAX_BYTES = 32 * 1024 * 1024;
export const IMAGE_PROXY_TIMEOUT_MS = 10_000;

const createHmacChannel = (hmac: `${string}.${string}`) => createGetSetChannel<string>(`image-proxy:hmac:${hmac}`);
const createUrlByIdChannel = (id: string) =>
  createGetSetChannel<{
    url: `${string}.${string}`;
    headers: `${string}.${string}`;
  }>(`image-proxy:url:${id}`);

export type ForwardImageResult =
  | { image: ArrayBuffer; contentType: string | null }
  | { error: "not-found" }
  | { error: "upstream-error"; statusCode: number }
  | { error: "fetch-error" };

export class ImageProxy {
  private static hmacKey: Buffer<ArrayBuffer> | null = null;

  /**
   * Generate secure key for image-proxy from encryption key
   */
  private static getHmacKey(): Buffer<ArrayBuffer> {
    this.hmacKey ??= Buffer.from(hkdfSync("sha256", env.SECRET_ENCRYPTION_KEY, "", "image-proxy", 32));
    return this.hmacKey;
  }

  public async createImageAsync(
    url: string,
    headers?: Record<string, string>,
    options?: { persistent?: boolean },
  ): Promise<string> {
    if (options?.persistent) {
      if (headers) throw new Error("Persistent image URLs cannot contain integration headers");
      // App icons are saved in the database, unlike periodically refreshed integration
      // images. A signed, encrypted source survives Redis expiry and server restarts.
      const encryptedUrl = encryptSecret(url);
      const signature = createKeyedFingerprint(`image-proxy:persistent:${encryptedUrl}`);
      return this.createImageUrl(`persistent.${signature}.${encryptedUrl}`);
    }

    const existingId = await this.getExistingIdAsync(url, headers);
    if (existingId) {
      logger.debug("Image already exists in the proxy", {
        id: existingId,
        url: this.redactUrl(url),
        headers: this.redactHeaders(headers ?? null),
      });
      return this.createImageUrl(existingId);
    }

    const id = createId();
    await this.storeImageAsync(id, url, headers);

    return this.createImageUrl(id);
  }

  public async createImagesAsync(urls: string[], headers?: Record<string, string>): Promise<string[]> {
    // Album assets share credentials. Hash/encrypt that immutable value once,
    // and bound each registration batch so it cannot monopolize rendering.
    const headerValue = JSON.stringify(headers ?? null);
    const headerHash = this.hashSecret(headerValue);
    const encryptedHeaders = encryptSecret(headerValue);
    const links: string[] = [];
    for (let index = 0; index < urls.length; index += 128) {
      const batch = await Promise.all(
        urls.slice(index, index + 128).map(async (url) => {
          const urlHash = this.hashSecret(url);
          const hashChannel = createHmacChannel(`${urlHash}.${headerHash}`);
          const existingId = await hashChannel.getAsync();
          if (existingId) return this.createImageUrl(existingId);
          const id = randomUUID();
          await createUrlByIdChannel(id).setAsync(
            { url: encryptSecret(url), headers: encryptedHeaders },
            { ttlSeconds: IMAGE_PROXY_REDIS_TTL_SECONDS },
          );
          await hashChannel.setAsync(id, { ttlSeconds: IMAGE_PROXY_REDIS_TTL_SECONDS });
          return this.createImageUrl(id);
        }),
      );
      links.push(...batch);
      if (index + 128 < urls.length) await setImmediate();
    }
    return links;
  }

  public async forwardImageAsync(id: string, requestSignal?: AbortSignal): Promise<ForwardImageResult> {
    const urlAndHeaders = await this.getImageUrlAndHeadersAsync(id);
    if (!urlAndHeaders) {
      return { error: "not-found" };
    }

    const proxyUrl = this.createImageUrl(id);
    const controller = new AbortController();
    const signal = requestSignal ? AbortSignal.any([controller.signal, requestSignal]) : controller.signal;
    const deadline = setTimeout(
      () => controller.abort(new DOMException("Image forwarding deadline exceeded", "TimeoutError")),
      IMAGE_PROXY_TIMEOUT_MS,
    );
    try {
      signal.throwIfAborted();
      // Page-declared icons are untrusted on every fetch, including redirects and DNS
      // changes. Existing integration images retain loopback and HTTP proxy support
      // only on their registered origin; redirects elsewhere lose credentials and trust.
      return await fetchGuardedAsync(
        new URL(urlAndHeaders.url),
        {
          headers: urlAndHeaders.headers ?? undefined,
          trustedOrigin: urlAndHeaders.trustedOrigin,
          timeout: IMAGE_PROXY_TIMEOUT_MS,
          signal,
        },
        async (response) => {
          if (!response.ok) {
            await cancelBodyAsync(response);
            logger.error(
              new ErrorWithMetadata("Failed to fetch image", {
                id,
                url: this.redactUrl(urlAndHeaders.url),
                headers: this.redactHeaders(urlAndHeaders.headers),
                proxyUrl,
                statusCode: response.status,
              }),
            );
            return { error: "upstream-error", statusCode: response.status };
          }

          const body = await readBoundedResponseAsync(response, IMAGE_PROXY_MAX_BYTES, "Image", signal);
          const image = body?.buffer ?? new ArrayBuffer(0);
          logger.debug("Forwarding image succeeded", {
            id,
            url: this.redactUrl(urlAndHeaders.url),
            headers: this.redactHeaders(urlAndHeaders.headers),
            proxyUrl,
            size: formatBytes(image.byteLength),
          });

          return { image, contentType: response.headers.get("content-type") };
        },
      );
    } catch (error) {
      logger.error(
        new ErrorWithMetadata(
          "Failed to forward image",
          {
            id,
            url: this.redactUrl(urlAndHeaders.url),
            headers: this.redactHeaders(urlAndHeaders.headers),
            proxyUrl,
          },
          { cause: error },
        ),
      );
      return { error: "fetch-error" };
    } finally {
      clearTimeout(deadline);
      controller.abort();
    }
  }

  private createImageUrl(id: string): string {
    return `/api/image-proxy/${id}`;
  }

  private async getImageUrlAndHeadersAsync(id: string) {
    if (id.startsWith("persistent.")) {
      const parts = /^persistent\.([a-f0-9]{64})\.([a-f0-9]+)\.([a-f0-9]{32})$/.exec(id);
      if (!parts) return null;
      const [, signature = "", ciphertext = "", initializationVector = ""] = parts;
      const encryptedUrl = `${ciphertext}.${initializationVector}` as const;
      if (!verifyKeyedFingerprint(`image-proxy:persistent:${encryptedUrl}`, signature)) return null;
      try {
        return { url: decryptSecret(encryptedUrl), headers: null, trustedOrigin: undefined };
      } catch {
        return null;
      }
    }

    const urlHeaderChannel = createUrlByIdChannel(id);
    const urlHeader = await urlHeaderChannel.getAsync();
    if (!urlHeader) {
      logger.warn("Image not found in the proxy", { id });
      return null;
    }

    const url = decryptSecret(urlHeader.url);
    return {
      url,
      headers: JSON.parse(decryptSecret(urlHeader.headers)) as Record<string, string> | null,
      trustedOrigin: new URL(url).origin,
    };
  }

  private async getExistingIdAsync(url: string, headers: Record<string, string> | undefined): Promise<string | null> {
    const urlHash = this.hashSecret(url);
    const headerHash = this.hashSecret(JSON.stringify(headers ?? null));

    const channel = createHmacChannel(`${urlHash}.${headerHash}`);
    return await channel.getAsync();
  }

  private async storeImageAsync(id: string, url: string, headers: Record<string, string> | undefined): Promise<void> {
    const urlHash = this.hashSecret(url);
    const headerHash = this.hashSecret(JSON.stringify(headers ?? null));

    const hashChannel = createHmacChannel(`${urlHash}.${headerHash}`);
    const urlHeaderChannel = createUrlByIdChannel(id);
    await urlHeaderChannel.setAsync(
      {
        url: encryptSecret(url),
        headers: encryptSecret(JSON.stringify(headers ?? null)),
      },
      { ttlSeconds: IMAGE_PROXY_REDIS_TTL_SECONDS },
    );
    await hashChannel.setAsync(id, { ttlSeconds: IMAGE_PROXY_REDIS_TTL_SECONDS });

    logger.debug("Stored image in the proxy", {
      id,
      url: this.redactUrl(url),
      headers: this.redactHeaders(headers ?? null),
    });
  }

  private hashSecret(value: string): string {
    return createHmac("sha256", ImageProxy.getHmacKey()).update(value).digest("hex");
  }

  private redactUrl(url: string): string {
    const urlObject = new URL(url);

    const redactedSearch = [...urlObject.searchParams.keys()].map((key) => `${key}=REDACTED`).join("&");

    return `${urlObject.origin}${urlObject.pathname}${redactedSearch ? `?${redactedSearch}` : ""}`;
  }

  private redactHeaders(headers: Record<string, string> | null): string | null {
    if (!headers) return null;

    return Object.keys(headers).join(", ");
  }
}
