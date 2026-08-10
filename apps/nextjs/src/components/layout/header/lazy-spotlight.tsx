"use client";

import { useEffect, useState } from "react";
import { useHotkeys } from "@mantine/hooks";

import { hotkeys } from "@homarr/definitions";
import { Spotlight } from "@homarr/spotlight/component";
import { hasPendingSpotlightOpen, openSpotlight, spotlightOpenEvent } from "@homarr/spotlight/open";

export const LazySpotlight = () => {
  const [isMounted, setIsMounted] = useState(false);

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
    const mount = () => setIsMounted(true);
    window.addEventListener(spotlightOpenEvent, mount);
    if (hasPendingSpotlightOpen()) mount();

    let idleId: number | undefined;
    const delayId = window.setTimeout(() => {
      idleId = window.requestIdleCallback?.(mount, { timeout: 1_000 });
      if (idleId === undefined) mount();
    }, 1_000);
    return () => {
      window.removeEventListener(spotlightOpenEvent, mount);
      window.clearTimeout(delayId);
      if (idleId !== undefined) window.cancelIdleCallback?.(idleId);
    };
  }, []);

  return isMounted ? (
    <>
      <span hidden data-homarr-dev-benchmark-spotlight-preloaded />
      <span hidden data-homarr-dev-benchmark-spotlight-mounted />
      <Spotlight />
    </>
  ) : null;
};
