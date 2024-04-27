import type { ComponentType } from "react";
import type { Loader } from "next/dynamic";
import dynamic from "next/dynamic";
import { Loader as UiLoader } from "@mantine/core";

import type { WidgetKind } from "@homarr/definitions";

import * as app from "./app";
import * as clock from "./clock";
import type { WidgetComponentProps } from "./definition";
import * as iframe from "./iframe";
import type { WidgetImportRecord } from "./import";
import * as notebook from "./notebook";
import * as video from "./video";
import * as weather from "./weather";

export { reduceWidgetOptionsWithDefaultValues } from "./options";

export { WidgetEditModal } from "./modals/widget-edit-modal";
export { useServerDataFor } from "./server/provider";
export { GlobalItemServerDataRunner } from "./server/runner";

export const widgetImports = {
  clock,
  weather,
  app,
  notebook,
  iframe,
  video,
} satisfies WidgetImportRecord;

export type WidgetImports = typeof widgetImports;
export type WidgetImportKey = keyof WidgetImports;

const loadedComponents = new Map<
  WidgetKind,
  ComponentType<WidgetComponentProps<WidgetKind>>
>();

export const loadWidgetDynamic = <TKind extends WidgetKind>(kind: TKind) => {
  const existingComponent = loadedComponents.get(kind);
  if (existingComponent) return existingComponent;

  const newlyLoadedComponent = dynamic<WidgetComponentProps<TKind>>(
    widgetImports[kind].componentLoader as Loader<WidgetComponentProps<TKind>>,
    {
      loading: () => <UiLoader />,
    },
  );

  loadedComponents.set(kind, newlyLoadedComponent as never);
  return newlyLoadedComponent;
};
