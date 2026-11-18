"use client";

import type { PropsWithChildren, ReactNode } from "react";
import { createContext, Suspense, use, useContext, useId } from "react";
import { Box } from "@mantine/core";
import { useResizeObserver } from "@mantine/hooks";

const TourTargetsEnabledContext = createContext(false);
let tourLibraryPromise: Promise<typeof import("@gfazioli/mantine-onboarding-tour")> | undefined;

const loadTourLibrary = () => {
  if (tourLibraryPromise) return tourLibraryPromise;

  const currentPromise = import("@gfazioli/mantine-onboarding-tour");
  tourLibraryPromise = currentPromise;
  void currentPromise.catch(() => {
    if (tourLibraryPromise === currentPromise) tourLibraryPromise = undefined;
  });
  return currentPromise;
};

export const TourTargetsProvider = ({ enabled = true, children }: PropsWithChildren<{ enabled?: boolean }>) => (
  <TourTargetsEnabledContext value={enabled}>{children}</TourTargetsEnabledContext>
);

const LoadedTourTarget = ({ id, children }: { id: string; children: ReactNode }) => {
  const { OnboardingTour } = use(loadTourLibrary());
  return <OnboardingTour.Target id={id}>{children}</OnboardingTour.Target>;
};

const VisibleTourTarget = ({ id, children }: { id: string; children: ReactNode }) => {
  const [ref, { width, height }] = useResizeObserver<HTMLDivElement>();
  const inactiveId = useId();
  let activeId = inactiveId;
  if (width > 0 && height > 0) activeId = id;
  const target = <Box>{children}</Box>;

  return (
    <Box ref={ref} data-tour-target={id} miw={0} maw="100%">
      <Suspense fallback={target}>
        <LoadedTourTarget id={activeId}>{target}</LoadedTourTarget>
      </Suspense>
    </Box>
  );
};

export const TourTarget = ({ id, children }: { id: string; children: ReactNode }) => {
  const isEnabled = useContext(TourTargetsEnabledContext);
  if (!isEnabled) return children;

  return <VisibleTourTarget id={id}>{children}</VisibleTourTarget>;
};
