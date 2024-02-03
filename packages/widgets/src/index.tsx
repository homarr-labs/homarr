import type { ComponentType } from "react";
import dynamic from "next/dynamic";
import type { Loader } from "next/dynamic";

import type { WidgetKind } from "@homarr/definitions";
import { Loader as UiLoader } from "@homarr/ui";

import * as app from "./app";
import * as clock from "./clock";
import type { WidgetComponentProps } from "./definition";
import type { WidgetImportRecord } from "./import";
import * as weather from "./weather";

export { WidgetEditModal } from "./WidgetEditModal";

export const widgetImports = {
  clock,
  weather,
  app,
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

  loadedComponents.set(kind, newlyLoadedComponent);
  return newlyLoadedComponent;
};
