"use client";

import type { ComponentType } from "react";
import dynamic from "next/dynamic";
import { Center, Loader as UiLoader } from "@mantine/core";

import type { WidgetKind } from "@homarr/definitions";

import type { WidgetComponentProps } from "./definition";
import { loadWidgetModule, widgetKinds } from "./manifest";

const createWidgetComponent = (kind: WidgetKind) =>
  dynamic<WidgetComponentProps<WidgetKind>>(
    async () => {
      const { componentLoader } = await loadWidgetModule(kind);
      return await componentLoader();
    },
    {
      loading: () => (
        <Center w="100%" h="100%">
          <UiLoader />
        </Center>
      ),
    },
  );

// Creating every dynamic wrapper at module scope lets Next register stable
// client boundaries and preload metadata. Widget implementation modules remain
// behind their manifest loaders.
const widgetComponents = Object.fromEntries(widgetKinds.map((kind) => [kind, createWidgetComponent(kind)])) as Record<
  WidgetKind,
  ComponentType<WidgetComponentProps<WidgetKind>>
>;

export const getWidgetComponent = <TKind extends WidgetKind>(kind: TKind) => {
  return widgetComponents[kind] as ComponentType<WidgetComponentProps<TKind>>;
};
