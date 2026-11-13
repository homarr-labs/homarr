import type { ThemePreset } from "../types";

export default {
  light: {
    body: "#edf7ee",
    surface: "#f8fcf8",
    hover: "#dceedd",
    border: "#a2c8a8",
    text: "#12351c",
    dimmed: "#486851",
    primary: "#006b31",
    secondary: "#226549",
  },
  dark: {
    body: "#030b05",
    surface: "#09180d",
    hover: "#102a17",
    border: "#245333",
    text: "#bbefc5",
    dimmed: "#81b68d",
    primary: "#42e86f",
    secondary: "#8bdca7",
  },
  theme: {
    fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
    headings: { fontFamily: "var(--font-geist-mono), ui-monospace, monospace", fontWeight: "600" },
    defaultRadius: "xs",
    radius: { xs: "2px", sm: "3px", md: "4px", lg: "6px", xl: "8px" },
    shadows: { xs: "none", sm: "none", md: "none", lg: "none", xl: "none" },
  },
} satisfies ThemePreset;
