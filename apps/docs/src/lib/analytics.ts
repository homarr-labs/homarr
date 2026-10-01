"use client";

import posthog from "posthog-js";

export type LinkKind = "nav" | "sidebar" | "toc" | "footer" | "content" | "cta";

export type CodeKind = "docs_code" | "markdown" | "docker_snippet" | "custom_widget";

export type SearchTrigger = "keyboard" | "click";

export type SearchResultKind = "page" | "heading" | "text";

export type WorkshopItemType = "customWidget" | "customCss";

type Surface = "home" | "docs" | "api_reference" | "blog" | "workshop" | "about";

export interface AnalyticsEvents {
  "Link Clicked": {
    destination: string;
    external: boolean;
    link_kind: LinkKind;
    link_text?: string;
    label?: string;
  };
  "Demo Opened": {
    destination: string;
    link_text?: string;
    label?: string;
  };
  "Installation Opened": {
    destination: string;
    link_text?: string;
    label?: string;
  };
  "Launch Menu Opened": Record<never, never>;
  "Sidebar Toggled": {
    folder: string;
    expanded: boolean;
  };
  "Search Opened": {
    trigger: SearchTrigger;
  };
  "Search Performed": {
    query: string;
    result_count: number;
  };
  "Search No Results": {
    query: string;
  };
  "Search Result Clicked": {
    query: string;
    result_index: number;
    result_type: SearchResultKind;
    destination: string;
  };
  "Tab Switched": {
    tab: string;
  };
  "Directory Filtered": {
    label: string;
    query: string;
    result_count: number;
  };
  "Code Copied": {
    code_kind: CodeKind;
    code_language?: string;
  };
  "Docker Key Refreshed": Record<never, never>;
  "Ask AI Opened": {
    trigger: "mascot";
  };
  "Workshop Item Opened": {
    item_id: string;
    item_type: WorkshopItemType;
  };
  "Workshop Vote Cast": {
    item_id: string;
    direction: "upvote" | "downvote" | "removed";
  };
  "Workshop Comment Posted": {
    item_id: string;
  };
  "Workshop Submit Started": Record<never, never>;
  "Workshop Submit Completed": {
    item_type: WorkshopItemType;
  };
  "Workshop Sign In Clicked": Record<never, never>;
  "Workshop Item Downloaded": {
    item_id: string;
    item_type: WorkshopItemType;
    method: "file" | "clipboard";
  };
}

type EventProperties<Name extends keyof AnalyticsEvents> = Omit<AnalyticsEvents[Name], "source_path">;

function surfaceFor(pathname: string): Surface {
  if (pathname.startsWith("/docs")) return "docs";
  if (pathname.startsWith("/api-reference")) return "api_reference";
  if (pathname.startsWith("/blog")) return "blog";
  if (pathname.startsWith("/workshop")) return "workshop";
  if (pathname.startsWith("/about-us")) return "about";
  return "home";
}

let initialized = false;
let searchHotkeyAt = 0;

export function searchTrigger(): SearchTrigger {
  return Date.now() - searchHotkeyAt < 1000 ? "keyboard" : "click";
}

export function initAnalytics() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;

  window.addEventListener(
    "keydown",
    (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") searchHotkeyAt = Date.now();
    },
    true,
  );

  posthog.init("phc_pWxeD1hbl4ip02JYReX1Crjkt5DhB3dduigirHMCtFE", {
    api_host: "https://hog.homarr.dev",
    ui_host: "https://eu.posthog.com",
    defaults: "2026-01-30",
    capture_pageview: "history_change",
    capture_pageleave: false,
    // Capture deliberate link events, not Workshop forms or API-key inputs.
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
      event.properties.surface = surfaceFor(window.location.pathname);
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

export function track<Name extends keyof AnalyticsEvents>(
  event: Name,
  ...args: keyof EventProperties<Name> extends never ? [] : [properties: EventProperties<Name>]
) {
  if (typeof window === "undefined" || !initialized) return;
  const properties = (args[0] ?? {}) as EventProperties<Name>;
  posthog.capture(event, { ...properties, source_path: window.location.pathname });
}

export function normalizeDestination(value: string | URL): string {
  const url = typeof value === "string" ? new URL(value, window.location.origin) : value;
  return `${url.origin}${url.pathname}`;
}
