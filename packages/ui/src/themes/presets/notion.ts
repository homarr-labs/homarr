import type { ThemePreset } from "../types";

export default {
  light: {
    body: "#ffffff",
    surface: "#f7f7f5",
    hover: "#eeeeec",
    border: "#dededb",
    text: "#37352f",
    dimmed: "#74716b",
    primary: "#37352f",
    secondary: "#276b9b",
  },
  dark: {
    body: "#191919",
    surface: "#202020",
    hover: "#2c2c2c",
    border: "#3d3d3b",
    text: "#e6e5e2",
    dimmed: "#a7a6a2",
    primary: "#e6e5e2",
    secondary: "#80b6d9",
  },
  theme: {
    fontFamily: "var(--font-sans, Inter), system-ui, -apple-system, sans-serif",
    headings: { fontFamily: "var(--font-sans, Inter), system-ui, -apple-system, sans-serif", fontWeight: "600" },
    defaultRadius: "sm",
    radius: { xs: "3px", sm: "4px", md: "6px", lg: "8px", xl: "12px" },
    shadows: { xs: "none", sm: "none", md: "none", lg: "none", xl: "none" },
  },
} satisfies ThemePreset;
