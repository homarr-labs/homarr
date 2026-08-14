"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Center, Loader, Paper } from "@mantine/core";
import { useHotkeys } from "@mantine/hooks";

import { hotkeys } from "@homarr/definitions";
import { hasPendingSpotlightOpen, openSpotlight, spotlightOpenEvent } from "@homarr/spotlight/open";

const loadSpotlight = () => import("@homarr/spotlight/component");
const SpotlightLoading = () => (
  <Center
    data-homarr-dev-benchmark-spotlight-feedback
    pos="fixed"
    inset={0}
    role="status"
    aria-label="Loading search"
    style={{ zIndex: 1000, background: "rgb(0 0 0 / 20%)", backdropFilter: "blur(2px)" }}
  >
    <Paper withBorder radius="md" p="xl" shadow="xl">
      <Loader />
    </Paper>
  </Center>
);
const Spotlight = dynamic(() => loadSpotlight().then(({ Spotlight: Component }) => Component), {
  ssr: false,
  loading: SpotlightLoading,
});

export const preloadSpotlight = () => void loadSpotlight().catch(() => undefined);

export const LazySpotlight = () => {
  const [isMounted, setIsMounted] = useState(false);
  const [isPreloaded, setIsPreloaded] = useState(false);

  useHotkeys(
    isMounted
      ? []
      : [
          [
            hotkeys.openSpotlight,
            () => {
              setIsMounted(true);
              openSpotlight();
            },
          ],
        ],
  );

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

  return isMounted || isPreloaded ? (
    <>
      {isPreloaded && <span hidden data-homarr-dev-benchmark-spotlight-preloaded />}
      {isMounted && (
        <>
          <span hidden data-homarr-dev-benchmark-spotlight-mounted />
          <Spotlight />
        </>
      )}
    </>
  ) : null;
};
