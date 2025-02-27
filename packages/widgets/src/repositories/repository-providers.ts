export class RepositoryProvider {
  name: string;
  url: string;
  iconUrl: string;

  constructor(name: string, url: string, iconUrl: string) {
    this.name = name;
    this.url = url;
    this.iconUrl = iconUrl;
  }
}

interface ProvidersProps {
  [key: string]: RepositoryProvider;
  Docker: RepositoryProvider;
  Github: RepositoryProvider;
  Gitlab: RepositoryProvider;
  Npm: RepositoryProvider;
  Nuget: RepositoryProvider;
}

export const Providers: ProvidersProps = {
  Docker: new RepositoryProvider(
    "Docker",
    "https://hub.docker.com/v2/namespaces/{owner}/repositories/{name}/tags",
    "https://cdn.jsdelivr.net/gh/selfhst/icons/svg/docker.svg",
  ),
  Github: new RepositoryProvider(
    "Github",
    "https://hub.docker.com/v2/namespaces/{owner}/repositories/{name}/tags",
    "https://cdn.jsdelivr.net/gh/selfhst/icons/svg/github-dark.svg",
  ),
  Gitlab: new RepositoryProvider(
    "Gitlab",
    "https://hub.docker.com/v2/namespaces/{owner}/repositories/{name}/tags",
    "https://cdn.jsdelivr.net/gh/selfhst/icons/svg/gitlab.svg",
  ),
  Npm: new RepositoryProvider(
    "Npm",
    "https://hub.docker.com/v2/namespaces/{owner}/repositories/{name}/tags",
    "https://cdn.jsdelivr.net/gh/loganmarchione/homelab-svg-assets//assets/npm.svg",
  ),
  Nuget: new RepositoryProvider(
    "Nuget",
    "https://hub.docker.com/v2/namespaces/{owner}/repositories/{name}/tags",
    "https://cdn.simpleicons.org/nuget",
  ),
};
