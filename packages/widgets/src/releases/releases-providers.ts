 /**
 * @deprecated Use the new integration system instead.
 */
export interface ReleasesProvider {
  name: string;
  iconUrl: string;
}
 /**
 * @deprecated Use the new integration system instead.
 */
export const Providers = {
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
} as const satisfies Record<string, ReleasesProvider>;
 /**
 * @deprecated Use the new integration system instead.
 */
export type ProviderKey = keyof typeof Providers;
 /**
 * @deprecated Use the new integration system instead.
 */
export const isProviderKey = (key: string): key is ProviderKey => {
  return key in Providers;
};
