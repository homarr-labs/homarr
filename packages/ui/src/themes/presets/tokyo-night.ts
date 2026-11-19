import type { ThemePreset } from "../types";

export default {
  light: {
    body: "#e6e7ed",
    surface: "#f0f1f6",
    hover: "#d9dce9",
    border: "#b8c0d7",
    text: "#343b58",
    dimmed: "#596381",
    primary: "#34548a",
    secondary: "#78459d",
  },
  dark: {
    body: "#1a1b26",
    surface: "#24283b",
    hover: "#2f354d",
    border: "#414868",
    text: "#c0caf5",
    dimmed: "#9aa5ce",
    primary: "#7aa2f7",
    secondary: "#bb9af7",
  },
  theme: {
    defaultRadius: "md",
    radius: { xs: "0.25rem", sm: "0.375rem", md: "0.625rem", lg: "0.875rem", xl: "1.125rem" },
    fontFamilyMonospace: "var(--font-geist-mono), ui-monospace, monospace",
  },
} satisfies ThemePreset;
