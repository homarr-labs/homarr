"use client";

import { spotlightActions } from "./spotlight-store";

export { Spotlight } from "./components/spotlight";
export { openSpotlight };

const openSpotlight = spotlightActions.open;
