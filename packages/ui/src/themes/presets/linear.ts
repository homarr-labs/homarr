import type { ThemePreset } from "../types";

export default {
  light: {
    body: "#f9f9fb",
    surface: "#ffffff",
    hover: "#eeeef3",
    border: "#dedee7",
    text: "#22232a",
    dimmed: "#646575",
    primary: "#5e5ad2",
    secondary: "#8c46b9",
  },
  dark: {
    body: "#101014",
    surface: "#19191f",
    hover: "#25252e",
    border: "#353541",
    text: "#eeeff4",
    dimmed: "#a0a0b1",
    primary: "#a19aff",
    secondary: "#c69aef",
  },
  theme: {
    fontFamily: "var(--font-geist), Inter, sans-serif",
    headings: { fontFamily: "var(--font-geist), Inter, sans-serif", fontWeight: "600" },
    defaultRadius: "sm",
    radius: { sm: "0.375rem", md: "0.5rem", lg: "0.625rem" },
    shadows: { sm: "0 1px 3px rgba(16, 16, 20, 0.08)", md: "0 4px 14px rgba(16, 16, 20, 0.12)" },
  },
} satisfies ThemePreset;
