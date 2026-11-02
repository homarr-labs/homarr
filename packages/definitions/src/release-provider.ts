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

export const splitReleaseProviderReference = (provider: ReleaseProviderKind, identifier: string) => {
  const trimmedIdentifier = identifier.trim();
  const registryPrefix = releaseProviderRegistryPrefixes[provider];
  const withoutRegistry =
    registryPrefix && trimmedIdentifier.startsWith(registryPrefix)
      ? trimmedIdentifier.slice(registryPrefix.length)
      : trimmedIdentifier;

  // Git releases are not container references; a colon there is part of the repository name.
  if (!registryPrefix) return { identifier: withoutRegistry, tag: undefined };

  const digestIndex = withoutRegistry.indexOf("@");
  const withoutDigest = digestIndex === -1 ? withoutRegistry : withoutRegistry.slice(0, digestIndex);
  const name = withoutDigest.slice(0, withoutDigest.lastIndexOf("/") + 1);
  const tagIndex = withoutDigest.indexOf(":", name.length);
  if (tagIndex === -1) return { identifier: withoutDigest, tag: undefined };

  const tag = withoutDigest.slice(tagIndex + 1).trim();
  return { identifier: withoutDigest.slice(0, tagIndex), tag: tag || undefined };
};

export const normalizeReleaseProviderIdentifier = (provider: ReleaseProviderKind, identifier: string) =>
  splitReleaseProviderReference(provider, identifier).identifier;

/** Keeps a non-numeric image tag, such as nightly or master, on the repository identifier. */
export const releaseIdentifierForImageTag = (identifier: string, version: string | undefined) => {
  if (!version || version === "latest" || /\d/.test(version)) return identifier;
  return `${identifier}:${version}`;
};

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
  return { provider, identifier: normalizeReleaseProviderIdentifier(provider, identifier), version };
};
