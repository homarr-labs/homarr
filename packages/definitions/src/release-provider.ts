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

const removeContainerImageVersion = (identifier: string) => {
  const digestIndex = identifier.indexOf("@");
  const withoutDigest = digestIndex === -1 ? identifier : identifier.slice(0, digestIndex);
  const tagIndex = withoutDigest.indexOf(":", withoutDigest.lastIndexOf("/") + 1);

  return tagIndex === -1 ? withoutDigest : withoutDigest.slice(0, tagIndex);
};

export const normalizeReleaseProviderIdentifier = (provider: ReleaseProviderKind, identifier: string) => {
  const trimmedIdentifier = identifier.trim();
  const registryPrefix = releaseProviderRegistryPrefixes[provider];
  const withoutRegistry =
    registryPrefix && trimmedIdentifier.startsWith(registryPrefix)
      ? trimmedIdentifier.slice(registryPrefix.length)
      : trimmedIdentifier;

  // ponytail: only strip container image versions/digests for providers that use them
  return registryPrefix ? removeContainerImageVersion(withoutRegistry) : withoutRegistry;
};
