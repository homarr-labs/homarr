"use client";

import type { PropsWithChildren } from "react";

import { AdaptiveContainerPrototypeProvider } from "./adaptive-container-context";
import { NativePrototypeControls } from "./prototype-controls";
import { prototypeFixtureIds } from "./prototype-fixtures";
import { PrototypeWidgetProvider } from "./prototype-widget-provider";

// Three alternatives on Homarr's existing board route, shareable with ?variant=A|B|C.
export function AdaptiveContainerPrototypeHost({ children }: PropsWithChildren) {
  return (
    <AdaptiveContainerPrototypeProvider
      sectionId={prototypeFixtureIds.container}
      mediaItemId={prototypeFixtureIds.media}
      statsItemId={prototypeFixtureIds.stats}
      mediaSavedRows={3}
      savedContainerRows={6}
    >
      <PrototypeWidgetProvider>
        {children}
        <NativePrototypeControls />
      </PrototypeWidgetProvider>
    </AdaptiveContainerPrototypeProvider>
  );
}
