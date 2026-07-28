"use client";

import type { PropsWithChildren } from "react";
import { createContext, useContext, useEffect, useState } from "react";
import { Box, Group, Skeleton, Stack } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";

import { useSettings } from "@homarr/settings";

export const mobileBoardMediaQuery = "(max-width: 48em)";

export type MobileBoardDeviceClass = "phone" | "tablet" | "desktop";

interface MobileBoardViewport {
  deviceClass: MobileBoardDeviceClass;
  isMobile: boolean;
  isResolved: boolean;
}

const MobileBoardViewportContext = createContext<MobileBoardViewport>({
  deviceClass: "desktop",
  isMobile: false,
  isResolved: true,
});

export const resolveMobileBoardViewport = ({
  deviceClass,
  matchesMobileWidth,
  hasResolvedClientWidth,
}: {
  deviceClass: MobileBoardDeviceClass;
  matchesMobileWidth: boolean;
  hasResolvedClientWidth: boolean;
}): MobileBoardViewport => ({
  deviceClass,
  isMobile: deviceClass === "phone" || matchesMobileWidth,
  isResolved: deviceClass !== "tablet" || hasResolvedClientWidth,
});

const MobileBoardViewportSkeleton = () => (
  <Box
    aria-busy
    mih="100dvh"
    p="md"
    pt="calc(var(--mantine-spacing-md) + env(safe-area-inset-top))"
    pr="calc(var(--mantine-spacing-md) + env(safe-area-inset-right))"
    pb="calc(var(--mantine-spacing-md) + env(safe-area-inset-bottom))"
    pl="calc(var(--mantine-spacing-md) + env(safe-area-inset-left))"
  >
    <Group h={44} justify="space-between" wrap="nowrap">
      <Skeleton h={32} w="min(45vw, 12rem)" />
      <Group gap="sm" wrap="nowrap">
        <Skeleton circle h={44} />
        <Skeleton circle h={44} />
      </Group>
    </Group>
    <Stack gap="md" mt="md">
      <Group align="stretch" grow wrap="nowrap">
        <Skeleton h={150} />
        <Skeleton h={150} />
      </Group>
      <Skeleton h={220} />
      <Group align="stretch" grow wrap="nowrap">
        <Skeleton h={150} />
        <Skeleton h={150} />
      </Group>
    </Stack>
  </Box>
);

export const MobileBoardViewportProvider = ({
  initialDeviceClass,
  children,
}: PropsWithChildren<{ initialDeviceClass: MobileBoardDeviceClass }>) => {
  const { enableAutomaticMobileLayout } = useSettings();
  const [hasResolvedClientWidth, setHasResolvedClientWidth] = useState(false);
  const matchesMobileWidth = useMediaQuery(mobileBoardMediaQuery, initialDeviceClass === "phone", {
    getInitialValueInEffect: true,
  });

  useEffect(() => {
    setHasResolvedClientWidth(true);
  }, []);

  const viewport = resolveMobileBoardViewport({
    deviceClass: initialDeviceClass,
    matchesMobileWidth,
    hasResolvedClientWidth,
  });

  return (
    <MobileBoardViewportContext.Provider value={viewport}>
      {shouldShowMobileBoardViewportSkeleton({
        enableAutomaticMobileLayout,
        isResolved: viewport.isResolved,
      }) ? (
        <MobileBoardViewportSkeleton />
      ) : (
        children
      )}
    </MobileBoardViewportContext.Provider>
  );
};

export const useMobileBoardViewport = () => useContext(MobileBoardViewportContext);

export const resolveIsAutomaticMobileBoard = ({
  isMobileViewport,
  enableAutomaticMobileLayout,
}: {
  isMobileViewport: boolean;
  enableAutomaticMobileLayout: boolean;
}) => isMobileViewport && enableAutomaticMobileLayout;

export const shouldShowMobileBoardViewportSkeleton = ({
  enableAutomaticMobileLayout,
  isResolved,
}: {
  enableAutomaticMobileLayout: boolean;
  isResolved: boolean;
}) => enableAutomaticMobileLayout && !isResolved;

export const useIsMobileBoard = () => {
  const viewport = useMobileBoardViewport();
  const { enableAutomaticMobileLayout } = useSettings();

  return resolveIsAutomaticMobileBoard({
    isMobileViewport: viewport.isMobile,
    enableAutomaticMobileLayout,
  });
};
