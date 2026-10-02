"use client";

export { openSpotlight, openMediaRequestSearch, mediaRequestSearchEvent } from "./open";
export {
  SpotlightProvider,
  useRegisterSpotlightContextResults,
  useRegisterSpotlightContextActions,
} from "./modes/home/context";
export type { ContextSpecificItem } from "./modes/home/context";
