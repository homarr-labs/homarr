"use client";

import { spotlightActions } from "./spotlight-store";

export { Spotlight } from "./component";
export { NewSpotlight } from "./new-search/component";
export { useRegisterSpotlightActions } from "./data-store";
export { openSpotlight };

const openSpotlight = spotlightActions.open;
