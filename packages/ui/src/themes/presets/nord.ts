import type { ThemePreset } from "../types";

export default {
  light: {
    body: "#eceff4",
    surface: "#f8fafc",
    hover: "#e5e9f0",
    border: "#c3ccd9",
    text: "#2e3440",
    dimmed: "#586579",
    primary: "#3b6f89",
    secondary: "#78618b",
  },
  dark: {
    body: "#2e3440",
    surface: "#3b4252",
    hover: "#434c5e",
    border: "#4c566a",
    text: "#eceff4",
    dimmed: "#b7c2d3",
    primary: "#88c0d0",
    secondary: "#c8a3c3",
  },
  theme: {
    defaultRadius: "sm",
    radius: { xs: "3px", sm: "5px", md: "8px", lg: "10px", xl: "14px" },
    shadows: {
      xs: "0 1px 2px rgb(46 52 64 / 6%)",
      sm: "0 2px 4px rgb(46 52 64 / 8%)",
      md: "0 4px 10px rgb(46 52 64 / 10%)",
      lg: "0 6px 18px rgb(46 52 64 / 12%)",
      xl: "0 10px 28px rgb(46 52 64 / 14%)",
    },
  },
} satisfies ThemePreset;
