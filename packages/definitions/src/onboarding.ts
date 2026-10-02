export const onboardingSteps = ["start", "user", "group", "setup", "finish"] as const;
export type OnboardingStep = (typeof onboardingSteps)[number];

export const onboardingLayoutPresets = ["balanced", "wide", "focused"] as const;
export type OnboardingLayoutPreset = (typeof onboardingLayoutPresets)[number];
