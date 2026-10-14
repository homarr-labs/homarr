import { onboardingIntegrationDraftSchema } from "@homarr/validation/onboarding";

import { sourceProcedure } from "../procedure";
import { probeRuntimeCapabilities, runtimeCapabilitiesSchema } from "./-settings-setup/capabilities";
import type { RuntimeCapabilityResources } from "./-settings-setup/capabilities";
import { discoverDockerServices } from "./-settings-setup/discovery";
import type { SetupDiscoveryResources } from "./-settings-setup/discovery";
import { testSetupIntegration } from "./-settings-setup/integration-test";
import type { SetupIntegrationClientResources } from "./-settings-setup/integration-test";
import { createLegacyOnboardCurrentStepProcedure } from "./onboard-current-step";

export interface OnboardProcedureResources {
  readonly capabilities: RuntimeCapabilityResources;
  readonly discovery: SetupDiscoveryResources;
  readonly integrations: SetupIntegrationClientResources;
}

export const onboardImplementedPaths = [
  "onboard.currentStep",
  "onboard.testIntegration",
  "onboard.detectRuntimeCapabilities",
  "onboard.discoverDockerServices",
] as const;
export const onboardPendingPaths = [
  {
    path: "onboard.nextStep",
    reason:
      "Conditional current-step transition and claim-state lease adapter are not accepted; no unguarded start update is installed.",
  },
  {
    path: "onboard.completeSetup",
    reason:
      "Atomic SQLite/PostgreSQL plan application, claim removal, encrypted secret writes and conditional setup-to-finish adapter are not accepted.",
  },
] as const;

export function createOnboardProcedures(resources: OnboardProcedureResources) {
  const currentStep = createLegacyOnboardCurrentStepProcedure();
  const testIntegration = sourceProcedure({
    path: "onboard.testIntegration",
    kind: "mutation",
    access: { kind: "onboardingStep", step: "setup" },
    demo: "guarded",
  })
    .input(onboardingIntegrationDraftSchema)
    .handler(({ input }) => testSetupIntegration(resources.integrations, input));
  const detectRuntimeCapabilities = sourceProcedure({
    path: "onboard.detectRuntimeCapabilities",
    kind: "query",
    access: { kind: "onboardingStep", step: "setup" },
    demo: "guarded",
  })
    .output(runtimeCapabilitiesSchema)
    .handler(() => probeRuntimeCapabilities(resources.capabilities));
  const discoverDockerServicesProcedure = sourceProcedure({
    path: "onboard.discoverDockerServices",
    kind: "query",
    access: { kind: "onboardingStep", step: "setup" },
    demo: "guarded",
  }).handler(({ context }) => discoverDockerServices(context.db, resources.discovery));
  return {
    currentStep,
    testIntegration,
    detectRuntimeCapabilities,
    discoverDockerServices: discoverDockerServicesProcedure,
  };
}
