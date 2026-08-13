import type { ReactNode } from "react";

import type { OnboardingStep } from "@homarr/definitions";

export interface OnboardingEnvironment {
  currentStep: OnboardingStep;
  databaseDriver: "sqlite" | "mysql" | "postgresql";
  externalAuthEnabled: boolean;
  dockerConfigured: boolean;
  kubernetesConfigured: boolean;
  workshopApiUrl: string;
  workshopUrl: string;
  mcpEndpoint: string;
  canConfigurePrivileged: boolean;
  hasUsers: boolean;
  initialBoard: { id: string; name: string } | null;
  availableBoards: { id: string; name: string }[];
}

export interface OnboardingStudioProps {
  environment: OnboardingEnvironment;
  sqliteRestore?: ReactNode;
  assistantConfiguration?: ReactNode;
}
