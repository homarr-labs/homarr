"use client";

import type { PropsWithChildren } from "react";

import { AdaptiveContainerPrototypeProvider } from "./adaptive-container-context";
import { NativePrototypeControls } from "./prototype-controls";
import { prototypeFixtureIds } from "./prototype-fixtures";
import { PrototypeWidgetProvider } from "./prototype-widget-provider";

// One smart container: relevance chooses a page; its children compete for a shared row budget.
export function AdaptiveContainerPrototypeHost({ children }: PropsWithChildren) {
  return (
    <AdaptiveContainerPrototypeProvider
      sectionId={prototypeFixtureIds.container}
      mediaItemId={prototypeFixtureIds.media}
      downloadsItemId={prototypeFixtureIds.downloads}
      requestsItemId={prototypeFixtureIds.requests}
      savedContainerRows={6}
    >
      <PrototypeWidgetProvider>
        {children}
        <NativePrototypeControls />
      </PrototypeWidgetProvider>
    </AdaptiveContainerPrototypeProvider>
  );
}
