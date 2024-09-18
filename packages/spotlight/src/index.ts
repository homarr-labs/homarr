"use client";

import { spotlightActions } from "./spotlight-store";

export { Spotlight } from "./components/spotlight";
export { useRegisterSpotlightActions } from "./data-store";
export { openSpotlight };

const openSpotlight = spotlightActions.open;
