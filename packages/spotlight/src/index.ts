"use client";

import { mediaRequestSearchEvent, openWebUiChatEvent, spotlightActions } from "./spotlight-store";

export { Spotlight } from "./components/spotlight";
export { openSpotlight, openMediaRequestSearch, openOpenWebUiChat };
export {
  SpotlightProvider,
  useRegisterSpotlightContextResults,
  useRegisterSpotlightContextActions,
} from "./modes/home/context";

const openSpotlight = spotlightActions.open;

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

export { mediaRequestSearchEvent, openWebUiChatEvent };

// Opens the Open WebUI chat side panel, optionally seeding it with a query to
// start a conversation from. Closes the spotlight so the panel takes over.
const openOpenWebUiChat = (query?: string) => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent<{ query?: string }>(openWebUiChatEvent, { detail: { query } }));
  }

  spotlightActions.close();
};
