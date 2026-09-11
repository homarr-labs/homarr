"use client";

import posthog from "posthog-js";
import { useEffect } from "react";

export function Analytics() {
  useEffect(() => {
    posthog.init("phc_pWxeD1hbl4ip02JYReX1Crjkt5DhB3dduigirHMCtFE", {
      api_host: "https://hog.homarr.dev",
      ui_host: "https://eu.posthog.com",
      defaults: "2026-01-30",
      autocapture: true,
      disable_session_recording: true,
      advanced_disable_feature_flags: true,
    });
  }, []);

  return null;
}
