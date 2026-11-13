import type { ThemePreset } from "../types";

export default {
  light: {
    body: "#f3f3f3",
    surface: "#ffffff",
    hover: "#e8e8e8",
    border: "#cecece",
    text: "#333333",
    dimmed: "#616161",
    primary: "#0068a9",
    secondary: "#8c3a83",
  },
  dark: {
    body: "#1e1e1e",
    surface: "#252526",
    hover: "#2d2d30",
    border: "#454545",
    text: "#d4d4d4",
    dimmed: "#a1a1a1",
    primary: "#4daafc",
    secondary: "#c586c0",
  },
  theme: {
    fontFamily: "'Segoe UI', Inter, system-ui, sans-serif",
    headings: { fontFamily: "'Segoe UI', Inter, system-ui, sans-serif" },
    fontFamilyMonospace: "var(--font-geist-mono), Consolas, ui-monospace, monospace",
    defaultRadius: "xs",
    radius: { xs: "0.125rem", sm: "0.1875rem", md: "0.25rem", lg: "0.375rem", xl: "0.5rem" },
  },
} satisfies ThemePreset;
