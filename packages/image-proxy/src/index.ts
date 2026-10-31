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
import {
  cancelBodyAsync,
  fetchGuardedAsync,
  isLiteralNonPublicAddress,
  isNonPublicHttpTargetAsync,
} from "@homarr/core/infrastructure/http";
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
  | { redirectUrl: string }
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
    options?: { persistent?: boolean; allowPrivateNetwork?: boolean },
  ): Promise<string> {
    if (options?.persistent) {
      if (headers) throw new Error("Persistent image URLs cannot contain integration headers");
      // App icons are saved in the database, unlike periodically refreshed integration
      // images. A signed, encrypted source survives Redis expiry and server restarts.
      // allowPrivateNetwork is signed into the id so a caller cannot flip it later.
      const encryptedUrl = encryptSecret(url);
      const allowPrivateNetwork = options.allowPrivateNetwork === true;
      const signature = createKeyedFingerprint(
        allowPrivateNetwork ? `image-proxy:persistent:local:${encryptedUrl}` : `image-proxy:persistent:${encryptedUrl}`,
      );
      const id = allowPrivateNetwork
        ? `persistent.local.${signature}.${encryptedUrl}`
        : `persistent.${signature}.${encryptedUrl}`;
      return this.createImageUrl(id);
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
    let urlAndHeaders: {
      url: string;
      headers: Record<string, string> | null;
      trustedOrigin: string | undefined;
    } | null;
    let blockPrivateNetworks: boolean | "off-origin" | undefined;

    if (id.startsWith("persistent.")) {
      const persistent = this.parsePersistentImage(id);
      if (!persistent) return { error: "not-found" };
      // Legacy ids, and icons that are not on the host the user added, never fetch a
      // private or metadata address. The browser can still request the source itself.
      if (!persistent.allowPrivateNetwork && isLiteralNonPublicAddress(new URL(persistent.url).hostname)) {
        return { redirectUrl: persistent.url };
      }
      urlAndHeaders = { url: persistent.url, headers: null, trustedOrigin: undefined };
      blockPrivateNetworks = persistent.allowPrivateNetwork ? "off-origin" : true;
    } else {
      urlAndHeaders = await this.getImageUrlAndHeadersAsync(id);
      blockPrivateNetworks = undefined;
    }
    if (!urlAndHeaders) {
      return { error: "not-found" };
    }
    const imageTarget = urlAndHeaders;

    const proxyUrl = this.createImageUrl(id);
    const controller = new AbortController();
    const signal = requestSignal ? AbortSignal.any([controller.signal, requestSignal]) : controller.signal;
    const deadline = setTimeout(
      () => controller.abort(new DOMException("Image forwarding deadline exceeded", "TimeoutError")),
      IMAGE_PROXY_TIMEOUT_MS,
    );
    try {
      signal.throwIfAborted();
      if (blockPrivateNetworks === true && (await isNonPublicHttpTargetAsync(new URL(imageTarget.url), signal))) {
        return { redirectUrl: imageTarget.url };
      }
      // Page-declared icons are untrusted on every fetch, including redirects and DNS
      // changes. Existing integration images retain loopback and HTTP proxy support
      // only on their registered origin; redirects elsewhere lose credentials and trust.
      return await fetchGuardedAsync(
        new URL(imageTarget.url),
        {
          headers: imageTarget.headers ?? undefined,
          trustedOrigin: imageTarget.trustedOrigin,
          blockPrivateNetworks,
          timeout: IMAGE_PROXY_TIMEOUT_MS,
          signal,
        },
        async (response) => {
          if (!response.ok) {
            await cancelBodyAsync(response);
            logger.error(
              new ErrorWithMetadata("Failed to fetch image", {
                id,
                url: this.redactUrl(imageTarget.url),
                headers: this.redactHeaders(imageTarget.headers),
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
            url: this.redactUrl(imageTarget.url),
            headers: this.redactHeaders(imageTarget.headers),
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
            url: this.redactUrl(imageTarget.url),
            headers: this.redactHeaders(imageTarget.headers),
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

  private parsePersistentImage(id: string): { url: string; allowPrivateNetwork: boolean } | null {
    const localParts = /^persistent\.local\.([a-f0-9]{64})\.([a-f0-9]+)\.([a-f0-9]{32})$/.exec(id);
    const legacyParts = localParts ? null : /^persistent\.([a-f0-9]{64})\.([a-f0-9]+)\.([a-f0-9]{32})$/.exec(id);
    const parts = localParts ?? legacyParts;
    if (!parts) return null;
    const allowPrivateNetwork = localParts !== null;
    const [, signature = "", ciphertext = "", initializationVector = ""] = parts;
    const encryptedUrl = `${ciphertext}.${initializationVector}` as const;
    const fingerprint = allowPrivateNetwork
      ? `image-proxy:persistent:local:${encryptedUrl}`
      : `image-proxy:persistent:${encryptedUrl}`;
    if (!verifyKeyedFingerprint(fingerprint, signature)) return null;
    try {
      const url = URL.parse(decryptSecret(encryptedUrl));
      if (!url || (url.protocol !== "http:" && url.protocol !== "https:")) return null;
      return { url: url.href, allowPrivateNetwork };
    } catch {
      return null;
    }
  }

  private async getImageUrlAndHeadersAsync(id: string) {
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
