import dynamic from "next/dynamic";
import type { Loader } from "next/dynamic";

import * as clock from "./clock";
import type { WidgetComponentProps } from "./definition";
import type { WidgetImportRecord } from "./import";
import * as weather from "./weather";

export const widgetSorts = ["clock", "weather"] as const;

export const widgetImports = {
  clock,
  weather,
} satisfies WidgetImportRecord;

export type WidgetSort = (typeof widgetSorts)[number];
export type WidgetImports = typeof widgetImports;

export const loadWidgetDynamic = <TSort extends WidgetSort>(sort: TSort) =>
  dynamic<WidgetComponentProps<TSort>>(
    widgetImports[sort].componentLoader as Loader<WidgetComponentProps<TSort>>,
  );
