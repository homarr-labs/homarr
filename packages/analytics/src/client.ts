import { PostHog } from "posthog-node";

export const POSTHOG_API_KEY = "phc_vYBmGWNbRshvfeC7EHfeSmUm2pD2Neg5nGqzJuGvS8Hs";
export const POSTHOG_HOST = "https://hog.homarr.dev";

let instance: PostHog | undefined;

export const getPostHogClient = (): PostHog => {
  instance ??= new PostHog(POSTHOG_API_KEY, {
    host: POSTHOG_HOST,
    flushAt: 10,
    flushInterval: 30_000,
  });
  return instance;
};

export const trackEvent = (instanceId: string, event: string, properties?: Record<string, unknown>) => {
  getPostHogClient().capture({
    distinctId: instanceId,
    event,
    properties,
  });
};
