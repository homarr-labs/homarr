import type { ThemePreset } from "../types";

export default {
  light: {
    body: "#fafaf6",
    surface: "#ffffff",
    hover: "#f0eee4",
    border: "#dcdfd9",
    text: "#575f66",
    dimmed: "#626a73",
    primary: "#9a5d00",
    secondary: "#257d9a",
  },
  dark: {
    body: "#0b0e14",
    surface: "#11151c",
    hover: "#1b2432",
    border: "#303d4e",
    text: "#bfbdb6",
    dimmed: "#939ca9",
    primary: "#ffb454",
    secondary: "#59c2ff",
  },
  theme: {
    defaultRadius: "sm",
    headings: { fontWeight: "600" },
    shadows: { sm: "none", md: "0 3px 12px rgba(11, 14, 20, 0.12)" },
  },
} satisfies ThemePreset;
