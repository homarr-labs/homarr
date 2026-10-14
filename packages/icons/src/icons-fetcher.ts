import type { IconFetchResources, LocalIconResources } from "./resources";
import { GitHubIconRepository } from "./repositories/github.icon-repository";
import { JsdelivrIconRepository } from "./repositories/jsdelivr.icon-repository";
import { LocalIconRepository } from "./repositories/local.icon-repository";
import type { IconRepositoryMetadata } from "./repositories/icon-repository";
import type { RepositoryIconGroup } from "./types";

export const iconRepositorySources = [
  {
    kind: "github",
    name: "Dashboard Icons",
    slug: "homarr-labs/dashboard-icons",
    license: undefined,
    repositoryUrl: new URL("https://github.com/homarr-labs/dashboard-icons"),
    repositoryIndexingUrl: new URL(
      "https://api.github.com/repos/homarr-labs/dashboard-icons/git/trees/main?recursive=true",
    ),
    repositoryBlobUrlTemplate: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/{0}",
  },
  {
    kind: "github",
    name: "selfh.st",
    slug: "selfhst/icons",
    license: "CC0-1.0",
    repositoryUrl: new URL("https://github.com/selfhst/icons"),
    repositoryIndexingUrl: new URL("https://api.github.com/repos/selfhst/icons/git/trees/main?recursive=true"),
    repositoryBlobUrlTemplate: "https://cdn.jsdelivr.net/gh/selfhst/icons/{0}",
  },
  {
    kind: "github",
    name: "SimpleIcons",
    slug: "simple-icons/simple-icons",
    license: "CC0-1.0",
    repositoryUrl: new URL("https://github.com/simple-icons/simple-icons"),
    repositoryIndexingUrl: new URL(
      "https://api.github.com/repos/simple-icons/simple-icons/git/trees/master?recursive=true",
    ),
    repositoryBlobUrlTemplate: "https://cdn.simpleicons.org/{1}",
  },
  {
    kind: "jsdelivr",
    name: "Papirus",
    slug: "PapirusDevelopmentTeam/papirus-icon-theme",
    license: "GPL-3.0",
    repositoryUrl: new URL("https://github.com/PapirusDevelopmentTeam/papirus-icon-theme"),
    repositoryIndexingUrl: new URL(
      "https://data.jsdelivr.com/v1/packages/gh/PapirusDevelopmentTeam/papirus_icons@master?structure=flat",
    ),
    repositoryBlobUrlTemplate: "https://cdn.jsdelivr.net/gh/PapirusDevelopmentTeam/papirus_icons/{0}",
  },
  {
    kind: "jsdelivr",
    name: "Homelab SVG assets",
    slug: "loganmarchione/homelab-svg-assets",
    license: "MIT",
    repositoryUrl: new URL("https://github.com/loganmarchione/homelab-svg-assets"),
    repositoryIndexingUrl: new URL(
      "https://data.jsdelivr.com/v1/packages/gh/loganmarchione/homelab-svg-assets@main?structure=flat",
    ),
    repositoryBlobUrlTemplate: "https://cdn.jsdelivr.net/gh/loganmarchione/homelab-svg-assets/{0}",
  },
] as const satisfies readonly (IconRepositoryMetadata & { kind: "github" | "jsdelivr" })[];

export const createIconFetcher = (resources: IconFetchResources, local: LocalIconResources) => {
  if (Object.values(resources.limits).some((value) => !Number.isSafeInteger(value) || value <= 0)) {
    throw new Error("Positive finite icon source bounds are required");
  }
  const repositories = [
    ...iconRepositorySources.map((source) =>
      source.kind === "github"
        ? new GitHubIconRepository(source, resources)
        : new JsdelivrIconRepository(source, resources),
    ),
    new LocalIconRepository(local),
  ];
  return {
    async fetchIconsAsync(signal?: AbortSignal): Promise<RepositoryIconGroup[]> {
      const results = await Promise.allSettled(repositories.map((repository) => repository.getAllIconsAsync(signal)));
      signal?.throwIfAborted();
      const failure = results.find((result) => result.status === "rejected");
      if (failure?.status === "rejected") throw failure.reason;
      return results.flatMap((result) => (result.status === "fulfilled" ? [result.value] : []));
    },
  };
};

export const fetchIconsAsync = (resources: IconFetchResources, local: LocalIconResources, signal?: AbortSignal) =>
  createIconFetcher(resources, local).fetchIconsAsync(signal);
