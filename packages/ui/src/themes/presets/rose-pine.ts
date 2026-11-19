import type { ThemePreset } from "../types";

export default {
  light: {
    body: "#faf4ed",
    surface: "#fffaf3",
    hover: "#f2e9e1",
    border: "#d9cfc5",
    text: "#575279",
    dimmed: "#797593",
    primary: "#76578f",
    secondary: "#a44265",
  },
  dark: {
    body: "#191724",
    surface: "#1f1d2e",
    hover: "#26233a",
    border: "#403d52",
    text: "#e0def4",
    dimmed: "#a09bb8",
    primary: "#c4a7e7",
    secondary: "#ebbcba",
  },
  theme: {
    defaultRadius: "lg",
    radius: { xs: "0.25rem", sm: "0.5rem", md: "0.75rem", lg: "1rem", xl: "1.5rem" },
  },
} satisfies ThemePreset;
