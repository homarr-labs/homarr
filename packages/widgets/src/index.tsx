import type { ComponentType } from "react";
import type { Loader } from "next/dynamic";
import dynamic from "next/dynamic";
import { Center, Loader as UiLoader } from "@mantine/core";

import type { WidgetKind } from "@homarr/definitions";

import * as app from "./app";
import * as bookmarks from "./bookmarks";
import * as calendar from "./calendar";
import * as clock from "./clock";
import type { WidgetComponentProps } from "./definition";
import * as dnsHoleControls from "./dns-hole/controls";
import * as dnsHoleSummary from "./dns-hole/summary";
import * as downloads from "./downloads";
import * as iframe from "./iframe";
import type { WidgetImportRecord } from "./import";
import * as indexerManager from "./indexer-manager";
import * as mediaRequestsList from "./media-requests/list";
import * as mediaRequestsStats from "./media-requests/stats";
import * as mediaServer from "./media-server";
import * as notebook from "./notebook";
import * as rssFeed from "./rssFeed";
import * as smartHomeEntityState from "./smart-home/entity-state";
import * as smartHomeExecuteAutomation from "./smart-home/execute-automation";
import * as video from "./video";
import * as weather from "./weather";

export { reduceWidgetOptionsWithDefaultValues } from "./options";

export type { WidgetDefinition } from "./definition";
export { WidgetEditModal } from "./modals/widget-edit-modal";
export { useServerDataFor } from "./server/provider";
export { GlobalItemServerDataRunner } from "./server/runner";
export type { WidgetComponentProps };

export const widgetImports = {
  clock,
  weather,
  app,
  notebook,
  iframe,
  video,
  dnsHoleSummary,
  dnsHoleControls,
  "smartHome-entityState": smartHomeEntityState,
  "smartHome-executeAutomation": smartHomeExecuteAutomation,
  mediaServer,
  calendar,
  downloads,
  "mediaRequests-requestList": mediaRequestsList,
  "mediaRequests-requestStats": mediaRequestsStats,
  rssFeed,
  bookmarks,
  indexerManager,
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
