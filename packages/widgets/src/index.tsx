import type { ComponentType } from "react";
import type { Loader } from "next/dynamic";
import dynamic from "next/dynamic";
import { Center, Loader as UiLoader } from "@mantine/core";

import { objectEntries } from "@homarr/common";
import type { IntegrationKind, WidgetKind } from "@homarr/definitions";
import type { SettingsContextProps } from "@homarr/settings/creator";

import * as anchorNote from "./anchor-note";
import * as audioStats from "./audio-stats";
import * as app from "./app";
import * as archiveTeamWarrior from "./archive-team-warrior";
import * as bookmarks from "./bookmarks";
import * as bazarr from "./bazarr";
import * as calendar from "./calendar";
import * as clock from "./clock";
import * as coolify from "./coolify";
import type { WidgetComponentProps } from "./definition";
import * as dnsHoleControls from "./dns-hole/controls";
import * as dnsHoleSummary from "./dns-hole/summary";
import * as dockerContainers from "./docker";
import * as downloads from "./downloads";
import * as firewall from "./firewall";
import * as healthMonitoring from "./health-monitoring";
import * as iframe from "./iframe";
import * as immichAlbumCarousel from "./immich/album-carousel";
import * as immichServerStats from "./immich/server-stats";
import type { WidgetImportRecord } from "./import";
import * as indexerManager from "./indexer-manager";
import * as mediaReleases from "./media-releases";
import * as mediaRequestsList from "./media-requests/list";
import * as mediaRequestsStats from "./media-requests/stats";
import * as mediaServer from "./media-server";
import * as mediaTranscoding from "./media-transcoding";
import * as mediaMissing from "./media-missing";
import * as minecraftServerStatus from "./minecraft/server-status";
import * as networkControllerStatus from "./network-controller/network-status";
import * as networkControllerSummary from "./network-controller/summary";
import * as notebook from "./notebook";
import * as paperlessNgx from "./paperless-ngx";
import * as patchmon from "./patchmon";
import * as notifications from "./notifications";
import type { WidgetOptionDefinition } from "./options";
import * as releases from "./releases";
import * as rssFeed from "./rssFeed";
import * as smartHomeEntityState from "./smart-home/entity-state";
import * as smartHomeExecuteAutomation from "./smart-home/execute-automation";
import * as speedtestTracker from "./speedtest-tracker";
import * as uptimeKuma from "./uptime-kuma";
import * as stockPrice from "./stocks";
import * as systemDisks from "./system-disks";
import * as systemResources from "./system-resources";
import * as timetable from "./timetable";
import * as traefik from "./traefik";
import * as tracearr from "./tracearr";
import * as umami from "./umami";
import * as ups from "./ups";
import * as vpn from "./vpn";
import * as beszelSystemTable from "./beszel-system-table";
import * as beszelSystemGrid from "./beszel-system-grid";
import * as beszelAlerts from "./beszel-alerts";
import * as beszelSystemStats from "./beszel-system-stats";
import * as video from "./video";
import * as weather from "./weather";
import * as customApi from "./custom-api";

export type {
  WidgetDefinition,
  WidgetContextMenuAction,
  WidgetContextActionProps,
  WidgetOptionsSettings,
} from "./definition";
export type { WidgetComponentProps };
export type { WidgetOptionDefinition, WidgetOptionType } from "./options";

export const widgetImports = {
  clock,
  weather,
  app,
  archiveTeamWarrior,
  anchorNote,
  notebook,
  iframe,
  video,
  dnsHoleSummary,
  dnsHoleControls,
  "smartHome-entityState": smartHomeEntityState,
  "smartHome-executeAutomation": smartHomeExecuteAutomation,
  stockPrice,
  mediaServer,
  calendar,
  downloads,
  "mediaRequests-requestList": mediaRequestsList,
  "mediaRequests-requestStats": mediaRequestsStats,
  mediaMissing,
  networkControllerSummary,
  networkControllerStatus,
  rssFeed,
  bookmarks,
  bazarr,
  indexerManager,
  healthMonitoring,
  mediaTranscoding,
  minecraftServerStatus,
  dockerContainers,
  releases,
  firewall,
  notifications,
  mediaReleases,
  systemResources,
  coolify,
  systemDisks,
  timetable,
  "immich-serverStats": immichServerStats,
  "immich-albumCarousel": immichAlbumCarousel,
  paperlessNgx,
  patchmon,
  tracearr,
  speedtestTracker,
  uptimeKuma,
  audioStats,
  umami,
  vpn,
  ups,
  beszelSystemTable,
  beszelSystemGrid,
  beszelAlerts,
  beszelSystemStats,
  traefik,
  customApi,
} satisfies WidgetImportRecord;

export type WidgetImports = typeof widgetImports;
export type WidgetImportKey = keyof WidgetImports;

const loadedComponents = new Map<WidgetKind, ComponentType<WidgetComponentProps<WidgetKind>>>();

export const loadWidgetDynamic = <TKind extends WidgetKind>(kind: TKind) => {
  const existingComponent = loadedComponents.get(kind);
  if (existingComponent) return existingComponent;

  const newlyLoadedComponent = dynamic<WidgetComponentProps<TKind>>(
    widgetImports[kind].componentLoader as Loader<WidgetComponentProps<TKind>>,
    {
      loading: () => (
        <Center w="100%" h="100%">
          <UiLoader />
        </Center>
      ),
    },
  );

  loadedComponents.set(kind, newlyLoadedComponent as never);
  return newlyLoadedComponent;
};

export type inferSupportedIntegrations<TKind extends WidgetKind> = (WidgetImports[TKind]["definition"] extends {
  supportedIntegrations: string[];
}
  ? WidgetImports[TKind]["definition"]["supportedIntegrations"]
  : string[])[number];

export type inferSupportedIntegrationsStrict<TKind extends WidgetKind> = (WidgetImports[TKind]["definition"] extends {
  supportedIntegrations: IntegrationKind[];
}
  ? WidgetImports[TKind]["definition"]["supportedIntegrations"]
  : never[])[number];

export const reduceWidgetOptionsWithDefaultValues = (
  kind: WidgetKind,
  settings: Pick<SettingsContextProps, "enableStatusByDefault" | "forceDisableStatus">,
  currentValue: Record<string, unknown> = {},
) => {
  const definition = widgetImports[kind].definition;
  const options = definition.createOptions(settings) as Record<string, WidgetOptionDefinition>;
  return objectEntries(options).reduce(
    (prev, [key, value]) => ({
      ...prev,
      [key]: currentValue[key] ?? value.defaultValue,
    }),
    {} as Record<string, unknown>,
  );
};
