import { integrationKinds } from "@homarr/definitions";
import type { IntegrationKind } from "@homarr/definitions";

type Runnable = {
  status: "runnable";
  app: string;
  image: string;
  assertion: string;
};
type Unavailable = { status: "blocked" | "unsupported"; reason: string; evidence: string };
type Profile = Runnable | Unavailable;

const blocked = (reason: string, evidence = "packages/integrations/src/base/creator.ts"): Unavailable => ({
  status: "blocked",
  reason,
  evidence,
});
const stats = (provider: string) =>
  blocked(
    "SDK bootstrap and synthetic Stats dataset not implemented.",
    `packages/integrations/src/stats/providers/${provider}.ts`,
  );
const pending = (contract: string) => blocked(`SDK bootstrap and native ${contract} assertions not implemented.`);
const runnable = (app: string, assertion: string): Runnable => ({
  status: "runnable",
  app,
  image: `lscr.io/linuxserver/${app}:latest`,
  assertion,
});

export const profiles = {
  autobrr: stats("autobrr"),
  jellystat: stats("jellystat"),
  scrutiny: stats("scrutiny"),
  tubearchivist: stats("tubearchivist"),
  frigate: stats("frigate"),
  komga: stats("komga"),
  netalertx: stats("netalertx"),
  jackett: pending("indexer"),
  yourSpotify: blocked(
    "Spotify account and listening history are external prerequisites; no hermetic profile.",
    "packages/integrations/src/stats/providers/your-spotify.ts",
  ),
  romm: stats("romm"),
  homebox: stats("homebox"),
  mealie: stats("mealie"),
  xteve: stats("xteve"),
  unmanic: stats("unmanic"),
  syncthingRelay: stats("syncthing-relay"),
  stash: stats("stash"),
  prometheus: stats("prometheus"),
  plantit: stats("plantit"),
  netdata: stats("netdata"),
  fileflows: stats("fileflows"),
  trilium: stats("trilium"),
  tandoor: stats("tandoor"),
  spoolman: stats("spoolman"),
  miniflux: stats("miniflux"),
  maintainerr: stats("maintainerr"),
  linkwarden: stats("linkwarden"),
  karakeep: stats("karakeep"),
  healthchecks: stats("healthchecks"),
  gatus: stats("gatus"),
  changedetection: stats("changedetection"),
  caddy: stats("caddy"),
  sabNzbd: runnable("sabnzbd", "Authenticated empty queue/history, version identity, pause/resume, rejected key"),
  nzbGet: pending("download queue and authorization"),
  deluge: pending("download queue and authorization"),
  transmission: pending("download queue and authorization"),
  qBittorrent: runnable("qbittorrent", "Authenticated empty torrent queue, version identity, rejected password"),
  aria2: pending("RPC download queue"),
  slskd: pending("download queue and authorization"),
  sonarr: runnable("sonarr", "Authenticated version, empty library/calendar/missing/queue, rejected key"),
  sportarr: pending("sports calendar"),
  radarr: runnable("radarr", "Authenticated version, empty library/calendar/missing/queue, rejected key"),
  lidarr: pending("music calendar and version"),
  readarr: pending("book calendar and version"),
  bindery: pending("book library and version"),
  prowlarr: runnable("prowlarr", "Authenticated version, empty indexers and status, rejected key"),
  bazarr: runnable("bazarr", "Version-validated connection, empty subtitle badges, rejected key"),
  jellyfin: runnable(
    "jellyfin",
    "Admin identity, empty releases/playing sessions, rejected password and protected read",
  ),
  emby: pending("media releases and sessions"),
  plex: blocked(
    "Plex account claim/token is external; no account-free fixture profile.",
    "packages/integrations/src/plex/plex-integration.ts",
  ),
  jellyseerr: pending("media requests and authorization"),
  seerr: pending("media requests and authorization"),
  overseerr: pending("media requests and authorization"),
  piHole: pending("DNS statistics; v5 and v6 need separate pinned-major profiles"),
  adGuardHome: pending("DNS statistics and authorization"),
  technitiumDns: pending("DNS statistics; versioned factory needs separate compatibility profiles"),
  homeAssistant: pending("entity/calendar dataset and authorization"),
  openmediavault: blocked(
    "Host storage appliance RPC needs a dedicated machine fixture, not an ordinary peer container.",
    "packages/integrations/src/openmediavault/openmediavault-integration.ts",
  ),
  dashDot: pending("host health"),
  glances: pending("host health"),
  tdarr: pending("transcoding queue"),
  proxmox: blocked(
    "Requires a Proxmox node and realm/token; no virtualized host fixture.",
    "packages/integrations/src/proxmox/proxmox-integration.ts",
  ),
  nextcloud: pending("CalDAV calendar and notifications"),
  unifiController: blocked(
    "Network site/device dataset and controller bootstrap not implemented.",
    "packages/integrations/src/unifi-controller/unifi-controller-integration.ts",
  ),
  opnsense: blocked(
    "Requires a firewall appliance and configured API user; no VM fixture.",
    "packages/integrations/src/opnsense/opnsense-integration.ts",
  ),
  ntfy: pending("synthetic notification topic"),
  gotify: pending("synthetic notifications"),
  ical: {
    status: "unsupported",
    reason: "Feed URL contract, not a versioned peer image; outside this image lane.",
    evidence: "packages/definitions/src/integration.ts",
  },
  anchor: pending("notes dataset"),
  truenas: blocked(
    "Requires a TrueNAS appliance and WebSocket API; no storage appliance fixture.",
    "packages/integrations/src/truenas/truenas-integration.ts",
  ),
  synology: blocked(
    "Requires Synology DSM appliance APIs; no licensed appliance fixture.",
    "packages/integrations/src/synology/synology-integration.ts",
  ),
  unraid: blocked(
    "Requires an Unraid host/API; no licensed host fixture.",
    "packages/integrations/src/unraid/unraid-integration.ts",
  ),
  coolify: pending("deployment health"),
  immich: pending("photo dataset and authorization"),
  paperlessNgx: pending("document dataset and authorization"),
  thingport: pending("search dataset and authorization"),
  patchmon: pending("agent/patch dataset and authorization"),
  tracearr: pending("media monitoring dataset"),
  speedtestTracker: pending("synthetic speedtest result without public bandwidth tests"),
  uptimeKuma: pending("status page/monitor dataset"),
  audiobookshelf: pending("media library dataset"),
  navidrome: pending("music library dataset"),
  umami: pending("synthetic analytics dataset"),
  peaNut: blocked(
    "Requires a NUT UPS backend; no simulated UPS fixture implemented.",
    "packages/integrations/src/peanut/peanut-integration.ts",
  ),
  beszel: pending("agent metrics dataset"),
  gluetun: blocked(
    "VPN provider/tunnel configuration is external; no hermetic tunnel fixture.",
    "packages/integrations/src/gluetun/gluetun-integration.ts",
  ),
  traefik: pending("router/service dataset"),
  archiveTeamWarrior: blocked(
    "Real work contacts external archival infrastructure; no offline worker fixture.",
    "packages/integrations/src/archive-team-warrior/archive-team-warrior-integration.ts",
  ),
  wazuh: pending("security manager/indexer dataset within resource budget"),
  wud: pending("isolated image inventory without host Docker socket access"),
  llamacpp: blocked(
    "Requires a model/server metrics fixture within the one-GiB container cap; not implemented.",
    "packages/integrations/src/llama-cpp/llamacpp-integration.ts",
  ),
  mock: {
    status: "unsupported",
    reason: "Development mock has no real HTTP peer to verify.",
    evidence: "packages/definitions/src/integration.ts",
  },
} satisfies Record<IntegrationKind, Profile>;

assertCompleteRegistry();

export const runnableProfiles = integrationKinds.flatMap((kind) => {
  const profile: Profile = profiles[kind];
  if (profile.status !== "runnable") return [];
  return [{ id: kind, kind, ...profile }];
});

export const compatibilityProfiles = [
  {
    id: "qBittorrent-v4",
    kind: "qBittorrent" as const,
    status: "runnable" as const,
    app: "qbittorrent",
    image: "lscr.io/linuxserver/qbittorrent:4.6.7",
    assertion: "Explicit legacy v4 profile: authenticated empty queue, version identity, rejected password",
  },
];

export const executableProfiles = [...runnableProfiles, ...compatibilityProfiles];

export function selectedProfile() {
  const selected = executableProfiles.find((profile) => profile.id === process.env.LIVE_PROFILE);
  if (!selected) throw new Error("LIVE_PROFILE must name an executable weekly profile");
  return selected;
}

export function assertCompleteRegistry() {
  const mapped: Partial<Record<IntegrationKind, Profile>> = profiles;
  if (integrationKinds.some((kind) => !mapped[kind])) throw new Error("An integration kind has no weekly disposition");
}
