import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  consumePendingMediaRequestSearch,
  consumePendingSpotlightOpen,
  hasPendingSpotlightOpen,
  mediaRequestSearchEvent,
  openMediaRequestSearch,
  openSpotlight,
  spotlightOpenEvent,
} from "./open";

describe("lazy Spotlight open bridge", () => {
  beforeEach(() => {
    consumePendingSpotlightOpen();
    consumePendingMediaRequestSearch();
  });

  it("keeps a pre-mount open request until the lazy component consumes it", () => {
    const listener = vi.fn();
    window.addEventListener(spotlightOpenEvent, listener);

    openSpotlight({ mode: "apps", query: "rada" });

    expect(listener).toHaveBeenCalledOnce();
    expect(listener.mock.calls[0]?.[0]).toMatchObject({
      detail: { mode: "apps", query: "rada" },
    });
    expect(consumePendingSpotlightOpen()).toEqual({ mode: "apps", query: "rada" });
    expect(consumePendingSpotlightOpen()).toBeNull();
    window.removeEventListener(spotlightOpenEvent, listener);
  });

  it("defaults to search and lets a listener installed after the request discover the pending intent", () => {
    openSpotlight();

    expect(hasPendingSpotlightOpen()).toBe(true);
    expect(consumePendingSpotlightOpen()).toEqual({ mode: "search" });
    expect(hasPendingSpotlightOpen()).toBe(false);
  });

  it("retains media options while dispatching both mount and media events", () => {
    const openListener = vi.fn();
    const mediaListener = vi.fn();
    window.addEventListener(spotlightOpenEvent, openListener);
    window.addEventListener(mediaRequestSearchEvent, mediaListener);

    openMediaRequestSearch({ integrationIds: ["integration-a"], query: "movie" });

    expect(openListener).toHaveBeenCalledOnce();
    expect(openListener.mock.calls[0]?.[0]).toMatchObject({
      detail: { mode: "media", query: "movie" },
    });
    expect(mediaListener).toHaveBeenCalledOnce();
    expect(consumePendingSpotlightOpen()).toEqual({ mode: "media", query: "movie" });
    expect(consumePendingMediaRequestSearch()).toEqual({ integrationIds: ["integration-a"], query: "movie" });
    window.removeEventListener(spotlightOpenEvent, openListener);
    window.removeEventListener(mediaRequestSearchEvent, mediaListener);
  });
});
