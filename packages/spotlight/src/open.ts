"use client";

export const spotlightOpenEvent = "homarr:spotlight:open";
export const mediaRequestSearchEvent = "homarr:spotlight:media-request-search";

export interface OpenMediaRequestSearchOptions {
  integrationIds?: string[];
  query?: string;
}

let pendingMediaRequestSearch: OpenMediaRequestSearchOptions | null = null;
let pendingSpotlightOpen = false;

const requestSpotlightMount = () => {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(spotlightOpenEvent));
};

export const openSpotlight = () => {
  pendingSpotlightOpen = true;
  requestSpotlightMount();
};

export const consumePendingSpotlightOpen = () => {
  const pending = pendingSpotlightOpen;
  pendingSpotlightOpen = false;
  return pending;
};

export const hasPendingSpotlightOpen = () => pendingSpotlightOpen;

export const consumePendingMediaRequestSearch = () => {
  const pending = pendingMediaRequestSearch;
  pendingMediaRequestSearch = null;
  return pending;
};

export const openMediaRequestSearch = (options: OpenMediaRequestSearchOptions = {}) => {
  pendingMediaRequestSearch = options;
  openSpotlight();

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent<OpenMediaRequestSearchOptions>(mediaRequestSearchEvent, { detail: options }));
  }
};
