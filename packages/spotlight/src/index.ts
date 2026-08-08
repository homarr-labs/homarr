"use client";

import { spotlightActions } from "./spotlight-store";

export { Spotlight } from "./components/spotlight";
export { openSpotlight, openMediaRequestSearch, mediaRequestSearchEvent } from "./open";
export {
  SpotlightProvider,
  useRegisterSpotlightContextResults,
  useRegisterSpotlightContextActions,
} from "./modes/home/context";

export const closeSpotlight = spotlightActions.close;
