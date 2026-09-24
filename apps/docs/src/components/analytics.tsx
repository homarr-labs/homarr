"use client";

import posthog from "posthog-js";
import { useEffect } from "react";

let initialized = false;

export function Analytics() {
  useEffect(() => {
    if (!initialized) {
      posthog.init("phc_pWxeD1hbl4ip02JYReX1Crjkt5DhB3dduigirHMCtFE", {
        api_host: "https://hog.homarr.dev",
        ui_host: "https://eu.posthog.com",
        defaults: "2026-01-30",
        capture_pageview: "history_change",
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
          event.properties.verification =
            window.location.hostname === "localhost" ||
            window.location.hostname === "127.0.0.1" ||
            new URLSearchParams(window.location.search).has("analytics_test");
          // PostHog also sends person properties at the top level of $set events.
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
      initialized = true;
    }

    function onClick(event: MouseEvent) {
      if (event.button !== 0 && event.button !== 1) return;
      if (!(event.target instanceof Element)) return;
      const link = event.target.closest<HTMLAnchorElement>("a[href]");
      if (!link || link.closest(".homarr-carbon")) return;
      const url = new URL(link.href, window.location.origin);
      if (url.protocol !== "http:" && url.protocol !== "https:") return;
      if (url.pathname === window.location.pathname && url.origin === window.location.origin && url.hash) return;

      let name = "link_clicked";
      if (url.hostname === "demo.homarr.dev") name = "demo_opened";
      else if (link.dataset.attr === "Install button") name = "installation_opened";

      posthog.capture(name, {
        destination: `${url.origin}${url.pathname}`,
        external: url.origin !== window.location.origin,
        source_path: window.location.pathname,
        label: link.dataset.attr,
      });
    }

    document.addEventListener("click", onClick);
    document.addEventListener("auxclick", onClick);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("auxclick", onClick);
    };
  }, []);

  return null;
}
