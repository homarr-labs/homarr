"use client";

import type { ReactNode } from "react";
import { OnboardingTour } from "@gfazioli/mantine-onboarding-tour";
import { Box } from "@mantine/core";

export const TourTarget = ({ id, children }: { id: string; children: ReactNode }) => (
  <OnboardingTour.Target id={id}>
    <Box data-tour-target={id}>{children}</Box>
  </OnboardingTour.Target>
);
