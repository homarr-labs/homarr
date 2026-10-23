import { z } from "zod/v4";

import { isNotFoundError } from "./errors";
import type { ProviderRequestInit } from "./http";
import { fetchJsonAsync, fetchProviderAsync, providerUrl, tokenHeaders } from "./http";
import { floatingTagNames } from "./versions";

const manifestAccept = [
  "application/vnd.oci.image.index.v1+json",
  "application/vnd.docker.distribution.manifest.list.v2+json",
  "application/vnd.oci.image.manifest.v1+json",
  "application/vnd.docker.distribution.manifest.v2+json",
].join(", ");
const TAG_PAGE_SIZE = 1000;
const MAX_TAG_PAGES = 5;

const tokenSchema = z.object({ token: z.string() });
const tagsSchema = z.object({ tags: z.array(z.string()).nullish() });
const manifestSchema = z.object({
  config: z.object({ digest: z.string() }).optional(),
  manifests: z.array(z.object({ digest: z.string() })).optional(),
});
const configSchema = z.object({
  created: z
    .string()
    .transform((value) => new Date(value))
    .optional(),
  config: z.object({ Labels: z.record(z.string(), z.string()).nullish() }).optional(),
});

type OciManifest = z.infer<typeof manifestSchema>;

export interface OciImage {
  tag: string;
  digest?: string;
  createdAt?: Date;
  labels: Record<string, string>;
}

const basicCredentials = (token: string) => ({
  Authorization: `Basic ${Buffer.from(`homarr:${token}`).toString("base64")}`,
});

const getNextTagsPath = (linkHeader: string | null) => {
  const nextUrl = /<([^>]+)>;\s*rel="next"/.exec(linkHeader ?? "")?.[1];
  if (!nextUrl) return undefined;
  return nextUrl.slice(nextUrl.indexOf("tags/list"));
};

const ignoreNotFound = (error: unknown) => {
  if (isNotFoundError(error)) return undefined;
  throw error;
};

export class OciRegistry {
  private constructor(
    private readonly origin: string,
    private readonly repository: string,
    private readonly bearerToken: string,
  ) {}

  static async connectAsync(baseUrl: string, repository: string, token?: string) {
    const { origin, host } = new URL(baseUrl);
    const scope = encodeURIComponent(`repository:${repository}:pull`);
    const { token: bearerToken } = await fetchJsonAsync(
      providerUrl(origin, `/token?service=${host}&scope=${scope}`),
      tokenSchema,
      { headers: tokenHeaders(token, basicCredentials) },
    );
    return new OciRegistry(origin, repository, bearerToken);
  }

  async listTagsAsync() {
    const tags: string[] = [];
    let path: string | undefined = `tags/list?n=${TAG_PAGE_SIZE}`;
    for (let page = 0; path && page < MAX_TAG_PAGES; page++) {
      const response = await this.requestAsync(path);
      tags.push(...(tagsSchema.parse(await response.json()).tags ?? []));
      path = getNextTagsPath(response.headers.get("link"));
    }
    return tags;
  }

  async getImageAsync(tag: string): Promise<OciImage> {
    const response = await this.requestManifestAsync(tag);
    const manifest = await this.resolveImageManifestAsync(manifestSchema.parse(await response.json()));
    if (!manifest.config) throw new Error(`Image manifest of ${this.repository}:${tag} has no config`);

    const config = configSchema.parse(await (await this.requestAsync(`blobs/${manifest.config.digest}`)).json());
    return {
      tag,
      digest: response.headers.get("docker-content-digest") ?? undefined,
      createdAt: config.created,
      labels: config.config?.Labels ?? {},
    };
  }

  async findFloatingImageAsync() {
    for (const tag of floatingTagNames) {
      const image = await this.getImageAsync(tag).catch(ignoreNotFound);
      if (image) return image;
    }
    return undefined;
  }

  async findTagWithDigestAsync(candidates: string[], digest: string) {
    for (const candidate of candidates) {
      const response = await this.requestManifestAsync(candidate, "HEAD").catch(ignoreNotFound);
      if (response?.headers.get("docker-content-digest") === digest) return candidate;
    }
    return undefined;
  }

  private async resolveImageManifestAsync(manifest: OciManifest) {
    const platformDigest = manifest.manifests?.[0]?.digest;
    if (manifest.config || !platformDigest) return manifest;
    return manifestSchema.parse(await (await this.requestManifestAsync(platformDigest)).json());
  }

  private async requestManifestAsync(reference: string, method: ProviderRequestInit["method"] = "GET") {
    return await this.requestAsync(`manifests/${reference}`, { method, headers: { Accept: manifestAccept } });
  }

  private async requestAsync(path: string, init: ProviderRequestInit = {}) {
    return await fetchProviderAsync(providerUrl(this.origin, `/v2/${this.repository}/${path}`), {
      ...init,
      headers: { Authorization: `Bearer ${this.bearerToken}`, ...init.headers },
    });
  }
}
