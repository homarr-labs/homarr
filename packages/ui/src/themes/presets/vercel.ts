import type { ThemePreset } from "../types";

export default {
  light: {
    body: "#fafafa",
    surface: "#ffffff",
    hover: "#f2f2f2",
    border: "#e0e0e0",
    text: "#171717",
    dimmed: "#666666",
    primary: "#171717",
    secondary: "#0068d6",
  },
  dark: {
    body: "#000000",
    surface: "#0a0a0a",
    hover: "#1a1a1a",
    border: "#333333",
    text: "#ededed",
    dimmed: "#a1a1a1",
    primary: "#ededed",
    secondary: "#52a8ff",
  },
  theme: {
    fontFamily: "var(--font-geist), Inter, system-ui, sans-serif",
    fontFamilyMonospace: "var(--font-geist-mono), ui-monospace, monospace",
    headings: { fontFamily: "var(--font-geist), Inter, system-ui, sans-serif", fontWeight: "600" },
    defaultRadius: "sm",
    radius: { xs: "0.125rem", sm: "0.375rem", md: "0.375rem", lg: "0.5rem", xl: "0.75rem" },
    shadows: {
      xs: "none",
      sm: "none",
      md: "0 4px 12px rgb(0 0 0 / 8%)",
      lg: "0 8px 24px rgb(0 0 0 / 12%)",
      xl: "0 16px 48px rgb(0 0 0 / 16%)",
    },
  },
} satisfies ThemePreset;
