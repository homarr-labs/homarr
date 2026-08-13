import { isProviderEnabled } from "@homarr/auth/server";
import type { Database } from "@homarr/db";
import { onboarding } from "@homarr/db/schema";
import type { OnboardingStep } from "@homarr/definitions";

export const nextOnboardingStepAsync = async (db: Database) => {
  const { current } = await getOnboardingOrFallbackAsync(db);
  if (current !== "start") return;
  const nextStep = await getNextOnboardingStepAsync(db);
  if (!nextStep) return;

  await db.update(onboarding).set({ previousStep: current, step: nextStep });
};

export const getOnboardingOrFallbackAsync = async (db: Database) => {
  const value = await db.query.onboarding.findFirst();
  if (!value) return { current: "start" as const, previous: null };

  return {
    current: normalizeOnboardingStep(value.step),
    previous: value.previousStep ? normalizeOnboardingStep(value.previousStep) : null,
  };
};

const getNextOnboardingStepAsync = async (db: Database): Promise<OnboardingStep> => {
  const existingUser = await db.query.users.findFirst({ columns: { id: true } });
  if (isProviderEnabled("credentials") && !existingUser) return "user";
  if (isProviderEnabled("ldap") || isProviderEnabled("oidc")) return "group";
  return "setup";
};

export const normalizeOnboardingStep = (step: string | null | undefined): OnboardingStep => {
  if (step === "user" || step === "group" || step === "setup" || step === "finish") return step;
  if (step === "settings" || step === "integrations") return "setup";
  return "start";
};
