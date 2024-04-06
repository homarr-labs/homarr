"use client";

import { spotlightActions } from "./spotlight-store";

export { Spotlight } from "./component";
export { useRegisterSpotlightActions } from "./data-store";
export { openSpotlight };

const openSpotlight = spotlightActions.open;
