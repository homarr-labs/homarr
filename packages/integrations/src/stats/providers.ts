import { autobrrStatsProvider } from "./providers/autobrr";
import type { StatsProvider } from "./types";
import { caddyStatsProvider } from "./providers/caddy";
import { changedetectionStatsProvider } from "./providers/changedetection";
import { fileflowsStatsProvider } from "./providers/fileflows";
import { gatusStatsProvider } from "./providers/gatus";
import { healthchecksStatsProvider } from "./providers/healthchecks";
import { homeboxStatsProvider } from "./providers/homebox";
import { jellystatStatsProvider } from "./providers/jellystat";
import { karakeepStatsProvider } from "./providers/karakeep";
import { komgaStatsProvider } from "./providers/komga";
import { linkwardenStatsProvider } from "./providers/linkwarden";
import { maintainerrStatsProvider } from "./providers/maintainerr";
import { mealieStatsProvider } from "./providers/mealie";
import { minifluxStatsProvider } from "./providers/miniflux";
import { myspeedStatsProvider } from "./providers/myspeed";
import { netdataStatsProvider } from "./providers/netdata";
import { netalertxStatsProvider } from "./providers/netalertx";
import { frigateStatsProvider } from "./providers/frigate";
import { scrutinyStatsProvider } from "./providers/scrutiny";
import { plantitStatsProvider } from "./providers/plantit";
import { prometheusStatsProvider } from "./providers/prometheus";
import { rommStatsProvider } from "./providers/romm";
import { spoolmanStatsProvider } from "./providers/spoolman";
import { stashStatsProvider } from "./providers/stash";
import { syncthingRelayStatsProvider } from "./providers/syncthing-relay";
import { tandoorStatsProvider } from "./providers/tandoor";
import { triliumStatsProvider } from "./providers/trilium";
import { tubearchivistStatsProvider } from "./providers/tubearchivist";
import { unmanicStatsProvider } from "./providers/unmanic";
import { xteveStatsProvider } from "./providers/xteve";
import { yourSpotifyStatsProvider } from "./providers/your-spotify";

export const statsProviders = {
  autobrr: autobrrStatsProvider,
  caddy: caddyStatsProvider,
  changedetection: changedetectionStatsProvider,
  fileflows: fileflowsStatsProvider,
  gatus: gatusStatsProvider,
  healthchecks: healthchecksStatsProvider,
  homebox: homeboxStatsProvider,
  jellystat: jellystatStatsProvider,
  karakeep: karakeepStatsProvider,
  komga: komgaStatsProvider,
  linkwarden: linkwardenStatsProvider,
  maintainerr: maintainerrStatsProvider,
  mealie: mealieStatsProvider,
  miniflux: minifluxStatsProvider,
  myspeed: myspeedStatsProvider,
  netdata: netdataStatsProvider,
  netalertx: netalertxStatsProvider,
  frigate: frigateStatsProvider,
  scrutiny: scrutinyStatsProvider,
  plantit: plantitStatsProvider,
  prometheus: prometheusStatsProvider,
  romm: rommStatsProvider,
  spoolman: spoolmanStatsProvider,
  stash: stashStatsProvider,
  syncthingRelay: syncthingRelayStatsProvider,
  tandoor: tandoorStatsProvider,
  trilium: triliumStatsProvider,
  tubearchivist: tubearchivistStatsProvider,
  unmanic: unmanicStatsProvider,
  xteve: xteveStatsProvider,
  yourSpotify: yourSpotifyStatsProvider,
} satisfies Record<string, StatsProvider>;
