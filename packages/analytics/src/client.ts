import { PostHog } from "posthog-node";

import { POSTHOG_API_KEY, POSTHOG_HOST } from "./constants";

let instance: PostHog | undefined;

export const getPostHogClient = (): PostHog => {
  instance ??= new PostHog(POSTHOG_API_KEY, {
    host: POSTHOG_HOST,
    flushAt: 10,
    flushInterval: 30_000,
  });
  return instance;
};

export const shutdownPostHogAsync = async () => {
  if (!instance) return;
  await instance.shutdown();
  instance = undefined;
};
