export const onboardingSteps = ["start", "import", "user", "group", "settings", "integrations", "finish"] as const;
export type OnboardingStep = (typeof onboardingSteps)[number];
