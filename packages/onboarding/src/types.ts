import type { ReactNode } from "react";

import type { OnboardingStep } from "@homarr/definitions";

export interface OnboardingEnvironment {
  version: string;
  currentStep: OnboardingStep;
  databaseDriver: "sqlite" | "mysql" | "postgresql";
  externalAuthEnabled: boolean;
  dockerConfigured: boolean;
  kubernetesConfigured: boolean;
  workshopApiUrl: string;
  workshopUrl: string;
  serverOrigin: string;
  mcpEndpoint: string;
  canConfigurePrivileged: boolean;
  hasUsers: boolean;
  initialBoard: { id: string; name: string; primaryColor: string; secondaryColor: string } | null;
  availableBoards: { id: string; name: string }[];
}

export interface OnboardingStudioProps {
  environment: OnboardingEnvironment;
  sqliteRestore?: ReactNode;
  assistantConfiguration?: ReactNode;
}
