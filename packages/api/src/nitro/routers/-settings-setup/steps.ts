import type { Database } from "@homarr/db";
import type { OnboardingStep } from "@homarr/definitions";

export function normalizeOnboardingStep(step: string | null | undefined): OnboardingStep {
  if (step === "user" || step === "group" || step === "setup" || step === "finish") return step;
  if (step === "settings" || step === "integrations") return "setup";
  return "start";
}

export function normalizeOnboardingPair(
  value:
    | { readonly step: string | null | undefined; readonly previousStep: string | null | undefined }
    | null
    | undefined,
): { current: OnboardingStep; previous: OnboardingStep | null } {
  if (!value) return { current: "start", previous: null };
  return {
    current: normalizeOnboardingStep(value.step),
    previous: value.previousStep ? normalizeOnboardingStep(value.previousStep) : null,
  };
}

export async function getOnboardingOrFallback(db: Database) {
  return normalizeOnboardingPair(await db.query.onboarding.findFirst());
}
