import { customThemeSchema } from "@homarr/validation/theme";

const accent = [
  "#f0f8f6",
  "#dcede9",
  "#bddbd4",
  "#94c1b7",
  "#6ba7a0",
  "#55968d",
  "#43877e",
  "#397a73",
  "#2f655f",
  "#244e49",
];

// A real, editable Homarr custom theme for the selected demo board.
export const demoTheme = customThemeSchema.parse({
  preset: "default",
  theme: {
    colors: { primaryColor: accent, secondaryColor: accent },
    primaryShade: { light: 7, dark: 4 },
    fontFamily: "var(--font-geist), system-ui, sans-serif",
    fontFamilyMonospace: "var(--font-geist-mono), ui-monospace, monospace",
    headings: { fontFamily: "var(--font-geist), system-ui, sans-serif", fontWeight: "600" },
    autoContrast: true,
    luminanceThreshold: 0.179,
    defaultRadius: "md",
    respectReducedMotion: true,
  },
  light: {
    body: "#f1f4f5",
    surface: "#ffffff",
    hover: "#e6ecee",
    border: "#ccd5da",
    text: "#18252d",
    dimmed: "#4a606e",
    primary: "#397a73",
    secondary: "#397a73",
  },
  dark: {
    body: "#14191f",
    surface: "#1d242b",
    hover: "#263038",
    border: "#36424b",
    text: "#e5ebef",
    dimmed: "#adb9c3",
    primary: "#6ba7a0",
    secondary: "#6ba7a0",
  },
});

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
} satisfies import("@homarr/validation/user").HeaderPreferences;

export const demoBoardPreferences = {
  pageTitle: "Homarr demo",
  itemRadius: "lg",
} satisfies import("./types").DemoBoardDefinition["board"];
