import type { ProviderReply, ProviderRequest } from "./provider-server";
import { serveProvider } from "./provider-server";

export interface FakeImage {
  digest: string;
  created?: string;
  labels?: Record<string, string>;
  singlePlatform?: boolean;
}

export interface FakeOciRegistry {
  origin?: string;
  repository: string;
  tags: Record<string, FakeImage>;
  tagPageSize?: number;
  tokenReply?: ProviderReply;
}

export const registryToken = "registry-token";

export const image = (digest: string, details: Omit<FakeImage, "digest"> = {}): FakeImage => ({ digest, ...details });

const platformDigest = (digest: string) => `${digest}-amd64`;

const listTags = (registry: FakeOciRegistry, request: ProviderRequest): ProviderReply => {
  const names = Object.keys(registry.tags);
  const pageSize = registry.tagPageSize ?? names.length;
  const start = names.indexOf(request.url.searchParams.get("last") ?? "") + 1;
  const page = names.slice(start, start + pageSize);
  const lastOnPage = page.at(-1);
  if (start + pageSize >= names.length || !lastOnPage) return { body: { name: registry.repository, tags: page } };
  return {
    body: { name: registry.repository, tags: page },
    headers: { link: `</v2/${registry.repository}/tags/list?last=${lastOnPage}&n=${pageSize}>; rel="next"` },
  };
};

const findImageByDigest = (registry: FakeOciRegistry, digest: string) =>
  Object.values(registry.tags).find((candidate) => candidate.digest === digest);

const serveManifest = (registry: FakeOciRegistry, reference: string): ProviderReply | undefined => {
  const tagged = registry.tags[reference];
  if (tagged?.singlePlatform) {
    return {
      body: { config: { digest: `config-${tagged.digest}` } },
      headers: { "docker-content-digest": tagged.digest },
    };
  }
  if (tagged) {
    return {
      body: { manifests: [{ digest: platformDigest(tagged.digest) }] },
      headers: { "docker-content-digest": tagged.digest },
    };
  }

  const platformImage = Object.values(registry.tags).find(
    (candidate) => platformDigest(candidate.digest) === reference,
  );
  if (platformImage) return { body: { config: { digest: `config-${platformImage.digest}` } } };
  return undefined;
};

const serveBlob = (registry: FakeOciRegistry, blob: string): ProviderReply | undefined => {
  const blobImage = findImageByDigest(registry, blob.replace(/^config-/, ""));
  if (!blobImage) return undefined;
  return { body: { created: blobImage.created, config: { Labels: blobImage.labels ?? null } } };
};

const routeRegistry = (registry: FakeOciRegistry, request: ProviderRequest): ProviderReply | undefined => {
  const origin = registry.origin ?? "https://ghcr.io";
  if (request.url.origin !== origin) return undefined;
  if (request.url.pathname === "/token") return registry.tokenReply ?? { body: { token: registryToken } };
  if (request.headers.authorization !== `Bearer ${registryToken}`) return { status: 401, body: {} };

  const prefix = `/v2/${registry.repository}/`;
  if (!request.url.pathname.startsWith(prefix)) return undefined;
  const path = request.url.pathname.slice(prefix.length);

  if (path === "tags/list") return listTags(registry, request);
  if (path.startsWith("manifests/"))
    return serveManifest(registry, decodeURIComponent(path.slice("manifests/".length)));
  if (path.startsWith("blobs/")) return serveBlob(registry, decodeURIComponent(path.slice("blobs/".length)));
  return undefined;
};

export const serveOciRegistry = (registry: FakeOciRegistry) =>
  serveProvider((request) => routeRegistry(registry, request));
