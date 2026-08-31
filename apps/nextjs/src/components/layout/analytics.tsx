"use client";

import { useEffect } from "react";

const POSTHOG_KEY = "phc_vYBmGWNbRshvfeC7EHfeSmUm2pD2Neg5nGqzJuGvS8Hs";
const POSTHOG_HOST = "https://hog.homarr.dev";

let postHogInitialization: Promise<void> | undefined;

const initializePostHog = () => {
  if (postHogInitialization) return;

  const initializationAttempt = import("posthog-js").then(({ default: posthog }) => {
    posthog.init(POSTHOG_KEY, {
      api_host: POSTHOG_HOST,
      capture_pageview: false,
      capture_pageleave: false,
      autocapture: false,
      persistence: "memory",
    });
  });

  postHogInitialization = initializationAttempt;
  void initializationAttempt.catch((error: unknown) => {
    if (postHogInitialization === initializationAttempt) {
      postHogInitialization = undefined;
    }

    console.error("PostHog initialization failed", error);
  });
};

export const Analytics = ({ enabled }: { enabled: boolean }) => {
  useEffect(() => {
    if (!enabled) return;

    initializePostHog();
  }, [enabled]);

  return null;
};
