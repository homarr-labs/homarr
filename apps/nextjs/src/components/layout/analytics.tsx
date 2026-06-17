"use client";

import { useEffect } from "react";

const POSTHOG_KEY = "phc_vYBmGWNbRshvfeC7EHfeSmUm2pD2Neg5nGqzJuGvS8Hs";
const POSTHOG_HOST = "https://hog.homarr.dev";

export const Analytics = ({ enabled }: { enabled: boolean }) => {
  useEffect(() => {
    if (!enabled) return;

    void import("posthog-js").then(({ default: posthog }) => {
      posthog.init(POSTHOG_KEY, {
        api_host: POSTHOG_HOST,
        capture_pageview: false,
        capture_pageleave: false,
        autocapture: false,
        persistence: "memory",
      });
    });
  }, [enabled]);

  return null;
};
