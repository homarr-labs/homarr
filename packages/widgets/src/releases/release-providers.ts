export interface ReleaseProvider {
  name: string;
  iconUrl: string;
}

interface ProvidersProps {
  [key: string]: ReleaseProvider;
  DockerHub: ReleaseProvider;
  Github: ReleaseProvider;
  Gitlab: ReleaseProvider;
  Npm: ReleaseProvider;
  Codeberg: ReleaseProvider;
}

export const Providers: ProvidersProps = {
  DockerHub: { name: "Docker Hub", iconUrl: "https://cdn.jsdelivr.net/gh/selfhst/icons/svg/docker.svg" },
  Github: { name: "Github", iconUrl: "https://cdn.jsdelivr.net/gh/selfhst/icons/svg/github-dark.svg" },
  Gitlab: { name: "Gitlab", iconUrl: "https://cdn.jsdelivr.net/gh/selfhst/icons/svg/gitlab.svg" },
  Npm: { name: "Npm", iconUrl: "https://cdn.jsdelivr.net/gh/loganmarchione/homelab-svg-assets//assets/npm.svg" },
  Codeberg: { name: "Codeberg", iconUrl: "https://cdn.jsdelivr.net/gh/selfhst/icons/svg/codeberg.svg" },
};
