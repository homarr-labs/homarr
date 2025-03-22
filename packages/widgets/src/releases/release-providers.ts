export class ReleaseProvider {
  name: string;
  iconUrl: string;

  constructor(name: string, iconUrl: string) {
    this.name = name;
    this.iconUrl = iconUrl;
  }
}

interface ProvidersProps {
  [key: string]: ReleaseProvider;
  Docker: ReleaseProvider;
  Github: ReleaseProvider;
  Gitlab: ReleaseProvider;
  Npm: ReleaseProvider;
  Codeberg: ReleaseProvider;
}

export const Providers: ProvidersProps = {
  Docker: new ReleaseProvider("Docker", "https://cdn.jsdelivr.net/gh/selfhst/icons/svg/docker.svg"),
  Github: new ReleaseProvider("Github", "https://cdn.jsdelivr.net/gh/selfhst/icons/svg/github-dark.svg"),
  Gitlab: new ReleaseProvider("Gitlab", "https://cdn.jsdelivr.net/gh/selfhst/icons/svg/gitlab.svg"),
  Npm: new ReleaseProvider("Npm", "https://cdn.jsdelivr.net/gh/loganmarchione/homelab-svg-assets//assets/npm.svg"),
  Codeberg: new ReleaseProvider("Codeberg", "https://cdn.jsdelivr.net/gh/selfhst/icons/svg/codeberg.svg"),
};
