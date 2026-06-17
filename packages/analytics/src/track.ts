import { getPostHogClient } from "./client";

export const trackEvent = (instanceId: string, event: string, properties?: Record<string, unknown>) => {
  getPostHogClient().capture({
    distinctId: instanceId,
    event,
    properties,
  });
};
