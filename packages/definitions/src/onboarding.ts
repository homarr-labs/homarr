export const onboardingSteps = [
  "start",
  "import",
  "user",
  "group",
  "settings",
  "searchEngines",
  "board",
  "finish",
] as const;
export type OnboardingStep = (typeof onboardingSteps)[number];
