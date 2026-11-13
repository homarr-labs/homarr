import type { ThemePreset } from "../types";

export default {
  light: {
    body: "#fdf6e3",
    surface: "#fffaf0",
    hover: "#eee8d5",
    border: "#d3cbb7",
    text: "#586e75",
    dimmed: "#657b83",
    primary: "#006e95",
    secondary: "#996800",
  },
  dark: {
    body: "#002b36",
    surface: "#073642",
    hover: "#104451",
    border: "#365963",
    text: "#c2d2d2",
    dimmed: "#93a1a1",
    primary: "#43b4ab",
    secondary: "#e1b64b",
  },
  theme: {
    defaultRadius: "xs",
    radius: { xs: "0.125rem", sm: "0.1875rem", md: "0.25rem", lg: "0.375rem", xl: "0.5rem" },
    fontFamilyMonospace: "var(--font-geist-mono), ui-monospace, monospace",
  },
} satisfies ThemePreset;
