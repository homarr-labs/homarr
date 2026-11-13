import type { ThemePreset } from "../types";

export default {
  light: {
    body: "#ffffff",
    surface: "#f6f8fa",
    hover: "#eaeef2",
    border: "#d0d7de",
    text: "#1f2328",
    dimmed: "#59636e",
    primary: "#0969da",
    secondary: "#1a7f37",
  },
  dark: {
    body: "#0d1117",
    surface: "#161b22",
    hover: "#21262d",
    border: "#30363d",
    text: "#e6edf3",
    dimmed: "#919ba6",
    primary: "#58a6ff",
    secondary: "#3fb950",
  },
  theme: {
    defaultRadius: "sm",
    radius: { sm: "0.375rem", md: "0.375rem", lg: "0.5rem" },
    shadows: { sm: "0 1px 0 rgba(31, 35, 40, 0.04)", md: "0 3px 6px rgba(31, 35, 40, 0.10)" },
  },
} satisfies ThemePreset;
