import type { HeaderPreferences } from "@homarr/validation/user";

import type { DemoBoardDefinition } from "./types";

export const demoHeaderPreferences = {
  version: 4,
  visible: true,
  searchDisplay: "icon",
  logoDisplay: "logoAndText",
  tabsDisplay: "wide",
  zones: {
    left: [{ type: "builtin", id: "logo" }],
    center: [{ type: "builtin", id: "boardTabs" }],
    right: [
      { type: "builtin", id: "search" },
      { type: "builtin", id: "boardEdit" },
      { type: "builtin", id: "boardSettings" },
      { type: "builtin", id: "themeToggle" },
      { type: "builtin", id: "user" },
    ],
  },
} satisfies HeaderPreferences;

export const demoBoardPreferences = {
  pageTitle: "Homarr demo",
} satisfies DemoBoardDefinition["board"];
