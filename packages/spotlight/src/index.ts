"use client";

import { mediaRequestSearchEvent, spotlightActions } from "./spotlight-store";

export { Spotlight } from "./components/spotlight";
export { closeSpotlight, openSpotlight, openMediaRequestSearch };
export {
  SpotlightProvider,
  useRegisterSpotlightContextResults,
  useRegisterSpotlightContextActions,
} from "./modes/home/context";

const openSpotlight = spotlightActions.open;
const closeSpotlight = spotlightActions.close;

export interface OpenMediaRequestSearchOptions {
  integrationIds?: string[];
  query?: string;
}

const openMediaRequestSearch = (options: OpenMediaRequestSearchOptions = {}) => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent<OpenMediaRequestSearchOptions>(mediaRequestSearchEvent, { detail: options }));
  }

  spotlightActions.open();
};

export { mediaRequestSearchEvent };
