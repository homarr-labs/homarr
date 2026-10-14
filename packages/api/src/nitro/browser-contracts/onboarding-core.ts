import type { RouterClient } from "@orpc/server";

import type { createOnboardingCoreProducer } from "../assembly/onboarding-core";

export { normalizeOnboardingStep, normalizeOnboardingPair } from "../routers/-settings-setup/steps";

export type OnboardingCoreClient = RouterClient<
  ReturnType<ReturnType<typeof createOnboardingCoreProducer>["createRequest"]>["contribution"]["router"]
>;
