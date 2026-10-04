"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import type { HotkeyItem } from "@mantine/hooks";
import { useHotkeys } from "@mantine/hooks";

import { hotkeys } from "@homarr/definitions";
import { hasPendingSpotlightOpen, openSpotlight, spotlightOpenEvent } from "@homarr/spotlight/open";

const loadSpotlight = () => import("@homarr/spotlight/component");
const Spotlight = dynamic(() => loadSpotlight().then(({ Spotlight: Component }) => Component), {
  ssr: false,
  loading: () => null,
});

const spotlightHotkeys: HotkeyItem[] = [
  [hotkeys.openSpotlight, () => openSpotlight(), { preventDefault: true }],
  [hotkeys.openSpotlightApps, () => openSpotlight({ mode: "apps" }), { preventDefault: true }],
  [hotkeys.openSpotlightAssistant, () => openSpotlight({ mode: "assistant" }), { preventDefault: true }],
  [hotkeys.openSpotlightPreferences, () => openSpotlight({ mode: "preferences" }), { preventDefault: true }],
];

export const LazySpotlight = () => {
  const [isMounted, setIsMounted] = useState(false);
  const [isPreloaded, setIsPreloaded] = useState(false);

  useHotkeys(spotlightHotkeys, [], true);

  useEffect(() => {
    let isActive = true;
    const mount = () => setIsMounted(true);
    window.addEventListener(spotlightOpenEvent, mount);
    if (hasPendingSpotlightOpen()) mount();

    const preload = () => {
      void loadSpotlight().then(
        () => {
          if (isActive) setIsPreloaded(true);
        },
        () => undefined,
      );
    };
    let idleId: number | undefined;
    const delayId = window.setTimeout(() => {
      idleId = window.requestIdleCallback?.(preload, { timeout: 1_000 });
      if (idleId === undefined) preload();
    }, 1_000);
    return () => {
      isActive = false;
      window.removeEventListener(spotlightOpenEvent, mount);
      window.clearTimeout(delayId);
      if (idleId !== undefined) window.cancelIdleCallback?.(idleId);
    };
  }, []);

  if (!isMounted && !isPreloaded) return null;

  return (
    <>
      {isPreloaded && <span hidden data-homarr-dev-benchmark-spotlight-preloaded />}
      {isMounted && <span hidden data-homarr-dev-benchmark-spotlight-mounted />}
      {isMounted && <Spotlight />}
    </>
  );
};
