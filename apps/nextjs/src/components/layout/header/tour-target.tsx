"use client";

import type { PropsWithChildren, ReactNode } from "react";
import { createContext, Suspense, use, useContext } from "react";
import { Box } from "@mantine/core";

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

export const TourTarget = ({ id, children }: { id: string; children: ReactNode }) => {
  const isEnabled = useContext(TourTargetsEnabledContext);
  if (!isEnabled) return children;

  const target = <Box data-tour-target={id}>{children}</Box>;

  return (
    <Suspense fallback={target}>
      <LoadedTourTarget id={id}>{target}</LoadedTourTarget>
    </Suspense>
  );
};
