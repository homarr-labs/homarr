import type { OnboardingEnvironment } from "./types";

export type OnboardingClaimState = "checking" | "ready" | "locked" | "signIn" | "error";

export const getOnboardingAccessState = (
  environment: Pick<
    OnboardingEnvironment,
    "currentStep" | "canConfigurePrivileged" | "hasUsers" | "externalAuthEnabled"
  >,
): "ready" | "signIn" | "claim" => {
  if (environment.currentStep === "finish" || environment.canConfigurePrivileged) return "ready";
  if (environment.hasUsers || (environment.externalAuthEnabled && environment.currentStep === "setup")) return "signIn";
  return environment.currentStep === "start" ? "ready" : "claim";
};
