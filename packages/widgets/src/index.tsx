import type { ComponentType } from "react";
import dynamic from "next/dynamic";
import type { Loader } from "next/dynamic";

import { Loader as UiLoader } from "@homarr/ui";

import * as clock from "./clock";
import type { WidgetComponentProps } from "./definition";
import type { WidgetImportRecord } from "./import";
import * as weather from "./weather";

export { WidgetEditModal } from "./WidgetEditModal";

export const widgetSorts = ["clock", "weather"] as const;

export const widgetImports = {
  clock,
  weather,
} satisfies WidgetImportRecord;

export type WidgetSort = (typeof widgetSorts)[number];
export type WidgetImports = typeof widgetImports;
export type WidgetImportKey = keyof WidgetImports;

const loadedComponents = new Map<
  WidgetSort,
  ComponentType<WidgetComponentProps<WidgetSort>>
>();

export const loadWidgetDynamic = <TSort extends WidgetSort>(sort: TSort) => {
  const existingComponent = loadedComponents.get(sort);
  if (existingComponent) return existingComponent;

  const newlyLoadedComponent = dynamic<WidgetComponentProps<TSort>>(
    widgetImports[sort].componentLoader as Loader<WidgetComponentProps<TSort>>,
    {
      loading: () => <UiLoader />,
    },
  );

  loadedComponents.set(sort, newlyLoadedComponent);
  return newlyLoadedComponent;
};
