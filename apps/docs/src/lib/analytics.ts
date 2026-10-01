"use client";

import posthog from "posthog-js";

type AnalyticsEvent =
  | "Installation Opened"
  | "Search No Results"
  | "Workshop Item Downloaded"
  | "Workshop Submit Started"
  | "Workshop Submit Completed";

let initialized = false;

export function initAnalytics() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;

  posthog.init("phc_pWxeD1hbl4ip02JYReX1Crjkt5DhB3dduigirHMCtFE", {
    api_host: "https://hog.homarr.dev",
    ui_host: "https://eu.posthog.com",
    defaults: "2026-01-30",
    capture_pageview: "history_change",
    capture_pageleave: false,
    // Keep Workshop forms and API-key inputs out of analytics.
    autocapture: false,
    capture_dead_clicks: false,
    capture_heatmaps: false,
    capture_exceptions: false,
    disable_surveys: true,
    disable_session_recording: true,
    advanced_disable_feature_flags: true,
    person_profiles: "identified_only",
    before_send(event) {
      if (!event) return event;
      event.properties.site = "homarr-docs";
      event.properties.source_path ??= window.location.pathname;
      event.properties.verification =
        window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1" ||
        new URLSearchParams(window.location.search).has("analytics_test");
      for (const properties of [
        event.properties,
        event.properties.$set,
        event.properties.$set_once,
        "$set" in event && event.$set,
        "$set_once" in event && event.$set_once,
      ]) {
        if (!properties || typeof properties !== "object") continue;
        for (const key of [
          "$current_url",
          "$referrer",
          "$initial_current_url",
          "$initial_referrer",
          "$session_entry_url",
          "$session_entry_referrer",
        ]) {
          const value = properties[key];
          if (typeof value !== "string" || !value) continue;
          try {
            const url = new URL(value);
            properties[key] = `${url.origin}${url.pathname}`;
          } catch {
            delete properties[key];
          }
        }
      }
      return event;
    },
  });
}

export function track(event: AnalyticsEvent, properties: Record<string, unknown> = {}) {
  if (typeof window === "undefined" || !initialized) return;
  posthog.capture(event, { ...properties, source_path: window.location.pathname });
}
