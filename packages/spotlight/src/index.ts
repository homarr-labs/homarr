"use client";

import { spotlightActions } from "./spotlight-store";

export { NewSpotlight } from "./components/spotlight";
export { useRegisterSpotlightActions } from "./data-store";
export { openSpotlight };

const openSpotlight = spotlightActions.open;
