import type { StatsProvider } from "./types";
import { caddyStatsProvider } from "./providers/caddy";
import { changedetectionStatsProvider } from "./providers/changedetection";
import { fileflowsStatsProvider } from "./providers/fileflows";
import { gatusStatsProvider } from "./providers/gatus";
import { healthchecksStatsProvider } from "./providers/healthchecks";
import { homeboxStatsProvider } from "./providers/homebox";
import { karakeepStatsProvider } from "./providers/karakeep";
import { linkwardenStatsProvider } from "./providers/linkwarden";
import { maintainerrStatsProvider } from "./providers/maintainerr";
import { mealieStatsProvider } from "./providers/mealie";
import { minifluxStatsProvider } from "./providers/miniflux";
import { myspeedStatsProvider } from "./providers/myspeed";
import { netdataStatsProvider } from "./providers/netdata";
import { plantitStatsProvider } from "./providers/plantit";
import { prometheusStatsProvider } from "./providers/prometheus";
import { rommStatsProvider } from "./providers/romm";
import { spoolmanStatsProvider } from "./providers/spoolman";
import { stashStatsProvider } from "./providers/stash";
import { syncthingRelayStatsProvider } from "./providers/syncthing-relay";
import { tandoorStatsProvider } from "./providers/tandoor";
import { triliumStatsProvider } from "./providers/trilium";
import { unmanicStatsProvider } from "./providers/unmanic";
import { xteveStatsProvider } from "./providers/xteve";
import { yourSpotifyStatsProvider } from "./providers/your-spotify";

export const statsProviders = {
  caddy: caddyStatsProvider,
  changedetection: changedetectionStatsProvider,
  fileflows: fileflowsStatsProvider,
  gatus: gatusStatsProvider,
  healthchecks: healthchecksStatsProvider,
  homebox: homeboxStatsProvider,
  karakeep: karakeepStatsProvider,
  linkwarden: linkwardenStatsProvider,
  maintainerr: maintainerrStatsProvider,
  mealie: mealieStatsProvider,
  miniflux: minifluxStatsProvider,
  myspeed: myspeedStatsProvider,
  netdata: netdataStatsProvider,
  plantit: plantitStatsProvider,
  prometheus: prometheusStatsProvider,
  romm: rommStatsProvider,
  spoolman: spoolmanStatsProvider,
  stash: stashStatsProvider,
  syncthingRelay: syncthingRelayStatsProvider,
  tandoor: tandoorStatsProvider,
  trilium: triliumStatsProvider,
  unmanic: unmanicStatsProvider,
  xteve: xteveStatsProvider,
  yourSpotify: yourSpotifyStatsProvider,
} satisfies Record<string, StatsProvider>;
