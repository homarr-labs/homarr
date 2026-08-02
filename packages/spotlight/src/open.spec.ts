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

    openSpotlight();

    expect(listener).toHaveBeenCalledOnce();
    expect(consumePendingSpotlightOpen()).toBe(true);
    expect(consumePendingSpotlightOpen()).toBe(false);
    window.removeEventListener(spotlightOpenEvent, listener);
  });

  it("lets a listener installed after the request discover the pending open", () => {
    openSpotlight();

    expect(hasPendingSpotlightOpen()).toBe(true);
    expect(consumePendingSpotlightOpen()).toBe(true);
    expect(hasPendingSpotlightOpen()).toBe(false);
  });

  it("retains media options while dispatching both mount and media events", () => {
    const openListener = vi.fn();
    const mediaListener = vi.fn();
    window.addEventListener(spotlightOpenEvent, openListener);
    window.addEventListener(mediaRequestSearchEvent, mediaListener);

    openMediaRequestSearch({ integrationIds: ["integration-a"], query: "movie" });

    expect(openListener).toHaveBeenCalledOnce();
    expect(mediaListener).toHaveBeenCalledOnce();
    expect(consumePendingSpotlightOpen()).toBe(true);
    expect(consumePendingMediaRequestSearch()).toEqual({ integrationIds: ["integration-a"], query: "movie" });
    window.removeEventListener(spotlightOpenEvent, openListener);
    window.removeEventListener(mediaRequestSearchEvent, mediaListener);
  });
});
