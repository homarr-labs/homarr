import type { ThemePreset } from "../types";

export default {
  light: {
    body: "#f2f2f7",
    surface: "#ffffff",
    hover: "#e5e5eb",
    border: "#ccccd4",
    text: "#1c1c1e",
    dimmed: "#63636b",
    primary: "#0065d1",
    secondary: "#9654bd",
  },
  dark: {
    body: "#1c1c1e",
    surface: "#2c2c2e",
    hover: "#38383a",
    border: "#505054",
    text: "#f2f2f7",
    dimmed: "#aeaeb6",
    primary: "#64afff",
    secondary: "#d0a1ed",
  },
  theme: {
    fontFamily: "-apple-system, BlinkMacSystemFont, Inter, system-ui, sans-serif",
    headings: { fontFamily: "-apple-system, BlinkMacSystemFont, Inter, system-ui, sans-serif" },
    fontFamilyMonospace: "'SFMono-Regular', var(--font-geist-mono), ui-monospace, monospace",
    defaultRadius: "md",
    radius: { xs: "0.25rem", sm: "0.375rem", md: "0.625rem", lg: "0.875rem", xl: "1.125rem" },
    shadows: { sm: "0 2px 8px rgb(0 0 0 / 8%)", md: "0 8px 24px rgb(0 0 0 / 12%)" },
  },
} satisfies ThemePreset;
