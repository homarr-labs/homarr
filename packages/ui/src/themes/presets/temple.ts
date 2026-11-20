import type { ThemePreset } from "../types";

export default {
  light: {
    body: "#f5f1e8",
    surface: "#fffcf5",
    hover: "#e9e2d5",
    border: "#d1c6b2",
    text: "#39382e",
    dimmed: "#746e5c",
    primary: "#5d7040",
    secondary: "#a15038",
  },
  dark: {
    body: "#1b1d19",
    surface: "#252820",
    hover: "#32372a",
    border: "#49513d",
    text: "#e4e3cf",
    dimmed: "#aaa991",
    primary: "#b9cc8a",
    secondary: "#e1a181",
  },
  theme: {
    defaultRadius: "sm",
    radius: { xs: "0.125rem", sm: "0.25rem", md: "0.375rem", lg: "0.5rem", xl: "0.75rem" },
    shadows: { xs: "none", sm: "0 2px 4px rgb(57 56 46 / 6%)", md: "0 6px 16px rgb(57 56 46 / 10%)" },
  },
} satisfies ThemePreset;
