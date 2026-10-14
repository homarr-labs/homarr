import { onboardingCompleteSetupSchema } from "@homarr/validation/onboarding";

import { sourceProcedure } from "../procedure";

export type {
  OnboardTransitionPreparationResources,
  OnboardSourceTransactionResources,
} from "./-onboard-transitions/resources";
export {
  prepareOnboardNextStepSourceBody,
  prepareOnboardCompleteSetupSourceBody,
  writeOnboardNextStepSqliteSourceBody,
  writeOnboardNextStepPostgresqlSourceBody,
  writeOnboardCompleteSetupSqliteSourceBody,
  writeOnboardCompleteSetupPostgresqlSourceBody,
} from "./-onboard-transitions/helpers";

export const onboardTransitionsPreparedPaths = ["onboard.nextStep", "onboard.completeSetup"] as const;
export const onboardTransitionsImplementedPaths = [] as const;
export const onboardTransitionsPendingPaths = [
  {
    path: "onboard.nextStep",
    reason:
      "Source body and SQL preparation only: no concrete transaction-time admin-or-valid-claim/no-user/current-step predicate producer or conditional transition commit binding.",
  },
  {
    path: "onboard.completeSetup",
    reason:
      "Source preparation and paired SQL bodies only: no concrete current-authority/claim/no-user predicate producer paired with atomic setup-to-finish, plan writes and claim removal.",
  },
] as const;

export function createOnboardTransitionBuilders() {
  return {
    nextStep: sourceProcedure({
      path: "onboard.nextStep",
      kind: "mutation",
      access: { kind: "onboardingClaimed" },
      demo: "guarded",
    }),
    completeSetup: sourceProcedure({
      path: "onboard.completeSetup",
      kind: "mutation",
      access: { kind: "onboardingStep", step: "setup" },
      demo: "guarded",
    }).input(onboardingCompleteSetupSchema),
  };
}
