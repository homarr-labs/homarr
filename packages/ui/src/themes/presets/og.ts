import type { ThemePreset } from "../types";

export default {
  light: {
    body: "#f8f9fa",
    surface: "#ffffff",
    hover: "#f1f3f5",
    border: "#dee2e6",
    text: "#212529",
    dimmed: "#687078",
    primary: "#c92a2a",
    secondary: "#b84e00",
  },
  dark: {
    body: "#242424",
    surface: "#2e2e2e",
    hover: "#3b3b3b",
    border: "#4a4a4a",
    text: "#f1f3f5",
    dimmed: "#adb5bd",
    primary: "#ff6b6b",
    secondary: "#fd7e14",
  },
  theme: {
    fontFamily: "var(--font-sans, Inter), system-ui, -apple-system, sans-serif",
    headings: { fontFamily: "var(--font-sans, Inter), system-ui, -apple-system, sans-serif" },
    defaultRadius: "sm",
    radius: { xs: "2px", sm: "4px", md: "8px", lg: "16px", xl: "32px" },
  },
} satisfies ThemePreset;
