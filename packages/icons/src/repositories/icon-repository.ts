import type { IconFetchResources } from "../resources";
import type { IconRepositoryLicense, RepositoryIconGroup } from "../types";

export interface IconRepositoryMetadata {
  name: string;
  slug: string;
  license: IconRepositoryLicense;
  repositoryUrl?: URL;
  repositoryIndexingUrl?: URL;
  repositoryBlobUrlTemplate?: string;
}

export class IconSourceHttpError extends Error {
  constructor(
    public readonly metadata: {
      status: number;
      rateLimitRemaining: string | null;
      rateLimitReset: string | null;
      retryAfter: string | null;
    },
  ) {
    super("Icon index request failed");
  }
}

export abstract class IconRepository {
  constructor(
    public readonly metadata: IconRepositoryMetadata,
    protected readonly resources: IconFetchResources,
  ) {}

  get name() {
    return this.metadata.name;
  }
  get slug() {
    return this.metadata.slug;
  }
  get license() {
    return this.metadata.license;
  }
  get repositoryUrl() {
    return this.metadata.repositoryUrl;
  }

  public async getAllIconsAsync(signal?: AbortSignal): Promise<RepositoryIconGroup> {
    signal?.throwIfAborted();
    if (this.resources.noExternalConnection())
      return { slug: this.slug, success: false, icons: [], failure: "external-disabled" };
    await this.resources.assertCurrentAuthorityAsync(signal);
    signal?.throwIfAborted();
    if (this.resources.noExternalConnection())
      return { slug: this.slug, success: false, icons: [], failure: "external-disabled" };
    let result: RepositoryIconGroup;
    try {
      result = await this.getAllIconsInternalAsync(signal);
    } catch (error) {
      signal?.throwIfAborted();
      this.resources.reportSourceError(error, {
        slug: this.slug,
        kind: error instanceof IconSourceHttpError ? "http" : "unavailable",
      });
      return { slug: this.slug, success: false, icons: [], failure: "source-unavailable" };
    }
    signal?.throwIfAborted();
    await this.resources.assertCurrentAuthorityAsync(signal);
    signal?.throwIfAborted();
    if (this.resources.noExternalConnection())
      return { slug: this.slug, success: false, icons: [], failure: "external-disabled" };
    return result;
  }

  protected abstract getAllIconsInternalAsync(signal?: AbortSignal): Promise<RepositoryIconGroup>;

  protected async readIndexAsync(signal?: AbortSignal): Promise<unknown> {
    const url = this.metadata.repositoryIndexingUrl;
    if (!url || !this.metadata.repositoryBlobUrlTemplate)
      throw new Error("Repository URLs are required for this repository");
    const deadline = this.resources.clock.createDeadline(10000, signal);
    let response: Response | undefined;
    let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
    let cancellation: Promise<void> | undefined;
    const cancelReaderAsync = () => (cancellation ??= Promise.resolve().then(() => reader?.cancel()));
    const onAbort = () => {
      void cancelReaderAsync().catch(() => undefined);
    };
    try {
      deadline.signal.throwIfAborted();
      response = await this.resources.fetchWithTrustedCertificatesAsync(url, { signal: deadline.signal });
      deadline.signal.throwIfAborted();
      if (!response.ok)
        throw new IconSourceHttpError({
          status: response.status,
          rateLimitRemaining: response.headers.get("x-ratelimit-remaining"),
          rateLimitReset: response.headers.get("x-ratelimit-reset"),
          retryAfter: response.headers.get("retry-after"),
        });
      const declared = response.headers.get("content-length");
      if (
        declared !== null &&
        (!/^\d+$/.test(declared) || Number(declared) > this.resources.limits.maximumIndexBytes)
      ) {
        throw new Error("Icon index response exceeds its bound");
      }
      if (!response.body) throw new Error("Icon index response has no body");
      reader = response.body.getReader();
      deadline.signal.addEventListener("abort", onAbort, { once: true });
      if (deadline.signal.aborted) onAbort();
      const parts: Uint8Array[] = [];
      let length = 0;
      for (;;) {
        deadline.signal.throwIfAborted();
        const result = await reader.read();
        deadline.signal.throwIfAborted();
        if (result.done) break;
        length += result.value.byteLength;
        if (length > this.resources.limits.maximumIndexBytes) throw new Error("Icon index response exceeds its bound");
        parts.push(result.value);
      }
      const bytes = new Uint8Array(length);
      let offset = 0;
      for (const part of parts) {
        bytes.set(part, offset);
        offset += part.byteLength;
      }
      return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)) as unknown;
    } finally {
      deadline.signal.removeEventListener("abort", onAbort);
      try {
        if (reader) {
          try {
            await cancelReaderAsync();
          } finally {
            reader.releaseLock();
          }
        } else await response?.body?.cancel();
      } finally {
        deadline.dispose();
      }
    }
  }
}

export const readIndexRecord = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid icon index record");
  return value as Record<string, unknown>;
};

export const readIndexString = (value: unknown, maximumLength: number): string => {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > maximumLength ||
    Array.from(value).some((character) => character.charCodeAt(0) < 32)
  ) {
    throw new Error("Invalid icon index string");
  }
  return value;
};

export const readIndexPath = (value: unknown, maximumLength: number): string => {
  const path = readIndexString(value, maximumLength);
  if (/[\\?#]/.test(path) || path.startsWith("//") || path.split("/").some((part) => part === "." || part === "..")) {
    throw new Error("Invalid icon index path");
  }
  return path;
};
