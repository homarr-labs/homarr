import { os } from "@orpc/server";
import { z } from "zod/v4";

import { onboardingSteps } from "@homarr/definitions";

import type { OnboardingCoreContext } from "../assembly/onboarding-core";
import { sourceProcedure, sourceProcedureMeta } from "../procedure";
import type { PublicQuerySourceDescriptor } from "../procedure";
import { getOnboardingOrFallback } from "./-settings-setup/steps";

export const onboardingCurrentStepDescriptor: PublicQuerySourceDescriptor = Object.freeze({
  path: "onboard.currentStep",
  kind: "query",
  access: Object.freeze({ kind: "public" }),
  demo: "guarded",
});

export function createLegacyOnboardCurrentStepProcedure() {
  return sourceProcedure(onboardingCurrentStepDescriptor).handler(({ context }) => getOnboardingOrFallback(context.db));
}

export const onboardingCoreInputSchema = z.undefined();
export const onboardingCoreOutputSchema = z.object({
  current: z.enum(onboardingSteps),
  previous: z.enum(onboardingSteps).nullable(),
});

export function createOnboardingCoreCurrentStepBuilder() {
  return os
    .$context<OnboardingCoreContext>()
    .meta(sourceProcedureMeta(onboardingCurrentStepDescriptor))
    .input(onboardingCoreInputSchema)
    .output(onboardingCoreOutputSchema);
}
