export interface ReleasesProvider {
  name: string;
  iconUrl: string;
}

interface ProvidersProps {
  [key: string]: ReleasesProvider;
  DockerHub: ReleasesProvider;
  Github: ReleasesProvider;
  Gitlab: ReleasesProvider;
  Npm: ReleasesProvider;
  Codeberg: ReleasesProvider;
}

export const Providers: ProvidersProps = {
  DockerHub: {
    name: "Docker Hub",
    iconUrl: "https://cdn.jsdelivr.net/gh/selfhst/icons/svg/docker.svg",
  },
  Github: {
    name: "Github",
    iconUrl: "https://cdn.jsdelivr.net/gh/selfhst/icons/svg/github-dark.svg",
  },
  Gitlab: {
    name: "Gitlab",
    iconUrl: "https://cdn.jsdelivr.net/gh/selfhst/icons/svg/gitlab.svg",
  },
  Npm: {
    name: "Npm",
    iconUrl: "https://cdn.jsdelivr.net/gh/loganmarchione/homelab-svg-assets//assets/npm.svg",
  },
  Codeberg: {
    name: "Codeberg",
    iconUrl: "https://cdn.jsdelivr.net/gh/selfhst/icons/svg/codeberg.svg",
  },
};
