import type { ThemePreset } from "../types";

export default {
  light: {
    body: "#fffbfe",
    surface: "#f3edf7",
    hover: "#eaddff",
    border: "#cac4d0",
    text: "#1c1b1f",
    dimmed: "#625b71",
    primary: "#6750a4",
    secondary: "#625b71",
  },
  dark: {
    body: "#141218",
    surface: "#211f26",
    hover: "#36343b",
    border: "#49454f",
    text: "#e6e0e9",
    dimmed: "#cac4d0",
    primary: "#d0bcff",
    secondary: "#ccc2dc",
  },
  theme: {
    defaultRadius: "lg",
    radius: { xs: "4px", sm: "8px", md: "12px", lg: "16px", xl: "28px" },
    shadows: {
      xs: "0 1px 2px rgb(28 27 31 / 12%)",
      sm: "0 1px 3px rgb(28 27 31 / 12%), 0 1px 2px rgb(28 27 31 / 8%)",
      md: "0 2px 6px rgb(28 27 31 / 14%)",
      lg: "0 4px 12px rgb(28 27 31 / 16%)",
      xl: "0 6px 18px rgb(28 27 31 / 18%)",
    },
  },
} satisfies ThemePreset;
