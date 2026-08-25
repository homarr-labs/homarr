"use client";

export const spotlightOpenEvent = "homarr:spotlight:open";
export const mediaRequestSearchEvent = "homarr:spotlight:media-request-search";

export type SpotlightMode =
  | "search"
  | "apps"
  | "command"
  | "preferences"
  | "assistant"
  | "external"
  | "media"
  | "userGroup";

export interface OpenSpotlightOptions {
  mode?: SpotlightMode;
  query?: string;
}

export interface SpotlightOpenIntent {
  mode: SpotlightMode;
  query?: string;
}

export interface OpenMediaRequestSearchOptions {
  integrationIds?: string[];
  query?: string;
}

let pendingMediaRequestSearch: OpenMediaRequestSearchOptions | null = null;
let pendingSpotlightOpen: SpotlightOpenIntent | null = null;

const requestSpotlightMount = (intent: SpotlightOpenIntent) => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent<SpotlightOpenIntent>(spotlightOpenEvent, { detail: intent }));
  }
};

export const openSpotlight = (options: OpenSpotlightOptions = {}) => {
  const intent: SpotlightOpenIntent = {
    mode: options.mode ?? "search",
  };
  if (options.query !== undefined) intent.query = options.query;

  if (intent.mode !== "media") pendingMediaRequestSearch = null;
  pendingSpotlightOpen = intent;
  requestSpotlightMount(intent);
};

export const consumePendingSpotlightOpen = () => {
  const pending = pendingSpotlightOpen;
  pendingSpotlightOpen = null;
  return pending;
};

export const hasPendingSpotlightOpen = () => pendingSpotlightOpen !== null;

export const consumePendingMediaRequestSearch = () => {
  const pending = pendingMediaRequestSearch;
  pendingMediaRequestSearch = null;
  return pending;
};

export const openMediaRequestSearch = (options: OpenMediaRequestSearchOptions = {}) => {
  pendingMediaRequestSearch = options;
  openSpotlight({ mode: "media", query: options.query });

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent<OpenMediaRequestSearchOptions>(mediaRequestSearchEvent, { detail: options }));
  }
};
