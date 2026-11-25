import { objectKeys } from "@homarr/common";

export const releaseProviderDefs = {
  github: {
    name: "Github",
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/github.svg",
    defaultUrl: "https://api.github.com",
  },
  dockerHub: {
    name: "Docker Hub",
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/docker.svg",
    defaultUrl: "https://hub.docker.com",
  },
  gitlab: {
    name: "Gitlab",
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/gitlab.svg",
    defaultUrl: "https://gitlab.com",
  },
  npm: {
    name: "NPM",
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/npm.svg",
    defaultUrl: "https://registry.npmjs.org",
  },
  codeberg: {
    name: "Codeberg",
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/codeberg.svg",
    defaultUrl: "https://codeberg.org",
  },
  linuxServerIO: {
    name: "LinuxServer.io",
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/linuxserver-io.svg",
    defaultUrl: "https://api.linuxserver.io",
  },
  gitHubContainerRegistry: {
    name: "GitHub Container Registry",
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/github.svg",
    defaultUrl: "https://ghcr.io",
  },
  quay: {
    name: "Quay",
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/png/quay.png",
    defaultUrl: "https://quay.io",
  },
} as const;

export const releaseProviderKinds = objectKeys(releaseProviderDefs);
export type ReleaseProviderKind = keyof typeof releaseProviderDefs;

export const getReleaseProviderName = (provider: ReleaseProviderKind) => releaseProviderDefs[provider].name;
export const getReleaseProviderIconUrl = (provider: ReleaseProviderKind) => releaseProviderDefs[provider].iconUrl;
export const getReleaseProviderDefaultUrl = (provider: ReleaseProviderKind) => releaseProviderDefs[provider].defaultUrl;

const releaseProviderRegistryPrefixes: Partial<Record<ReleaseProviderKind, string>> = {
  dockerHub: "docker.io/",
  gitHubContainerRegistry: "ghcr.io/",
  linuxServerIO: "lscr.io/",
  quay: "quay.io/",
};

export const supportsReleaseProviderTracks = (provider: ReleaseProviderKind) =>
  provider === "dockerHub" || provider === "gitHubContainerRegistry" || provider === "quay";

export const isVersionLikeTag = (tag: string) => /^v?\d{1,4}$/.test(tag) || /\d\.\d/.test(tag);

export const splitReleaseProviderReference = (provider: ReleaseProviderKind, identifier: string) => {
  const trimmedIdentifier = identifier.trim();
  const registryPrefix = releaseProviderRegistryPrefixes[provider];
  const withoutRegistry =
    registryPrefix && trimmedIdentifier.startsWith(registryPrefix)
      ? trimmedIdentifier.slice(registryPrefix.length)
      : trimmedIdentifier;

  if (!registryPrefix) return { identifier: withoutRegistry, tag: undefined };
  const withoutDigest = withoutRegistry.split("@")[0] ?? withoutRegistry;
  const tagIndex = withoutDigest.indexOf(":", withoutDigest.lastIndexOf("/") + 1);
  if (tagIndex === -1) return { identifier: withoutDigest, tag: undefined };
  return { identifier: withoutDigest.slice(0, tagIndex), tag: withoutDigest.slice(tagIndex + 1) || undefined };
};

export const normalizeReleaseProviderIdentifier = (provider: ReleaseProviderKind, identifier: string) =>
  splitReleaseProviderReference(provider, identifier).identifier;

const containerImageToProviderKind: Record<string, ReleaseProviderKind> = {
  "ghcr.io": "gitHubContainerRegistry",
  "docker.io": "dockerHub",
  "lscr.io": "linuxServerIO",
  "quay.io": "quay",
};

export const getReleaseSourceFromDockerImage = (image: string) => {
  const digestIndex = image.indexOf("@");
  let withoutDigest = image;
  if (digestIndex !== -1) withoutDigest = image.slice(0, digestIndex);

  const tagIndex = withoutDigest.indexOf(":", withoutDigest.lastIndexOf("/") + 1);
  let reference = withoutDigest;
  let version: string | undefined;
  if (tagIndex !== -1) {
    reference = withoutDigest.slice(0, tagIndex);
    version = withoutDigest.slice(tagIndex + 1);
  }

  const [maybeSource, maybeIdentifier] = reference.split(/\/(.*)/);
  const hasSource = maybeSource && maybeSource in containerImageToProviderKind;
  const source = hasSource ? maybeSource : "docker.io";
  let identifier = reference;
  if (hasSource && maybeIdentifier) identifier = maybeIdentifier;

  if (!identifier) return undefined;

  const provider = containerImageToProviderKind[source] ?? "dockerHub";
  if (provider === "linuxServerIO" && version && version !== "latest" && !isVersionLikeTag(version)) return undefined;
  identifier = normalizeReleaseProviderIdentifier(provider, identifier);
  if (supportsReleaseProviderTracks(provider) && version && version !== "latest" && !isVersionLikeTag(version)) {
    identifier = `${identifier}:${version}`;
  }
  return { provider, identifier, version };
};
