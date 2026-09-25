import { PostHog } from "posthog-node";

export const POSTHOG_API_KEY = "phc_vYBmGWNbRshvfeC7EHfeSmUm2pD2Neg5nGqzJuGvS8Hs";
export const POSTHOG_HOST = "https://hog.homarr.dev";

export const createPostHogClient = (): PostHog =>
  new PostHog(POSTHOG_API_KEY, {
    host: POSTHOG_HOST,
    flushAt: 10,
    flushInterval: 0,
    preloadFeatureFlags: false,
    disableSurveys: true,
  });
