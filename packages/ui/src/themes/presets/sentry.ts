import type { ThemePreset } from "../types";

export default {
  light: {
    body: "#f6f4fa",
    surface: "#ffffff",
    hover: "#eeebf5",
    border: "#d5cde4",
    text: "#362d59",
    dimmed: "#716783",
    primary: "#6c5fc7",
    secondary: "#b54f7b",
  },
  dark: {
    body: "#181225",
    surface: "#21182f",
    hover: "#2d223e",
    border: "#443353",
    text: "#eee8f6",
    dimmed: "#b7a7c7",
    primary: "#bda4ff",
    secondary: "#f2a0bd",
  },
  theme: {
    defaultRadius: "sm",
    radius: { xs: "0.125rem", sm: "0.25rem", md: "0.375rem", lg: "0.5rem", xl: "0.75rem" },
    shadows: { sm: "0 2px 5px rgb(54 45 89 / 10%)", md: "0 6px 20px rgb(54 45 89 / 14%)" },
  },
} satisfies ThemePreset;
