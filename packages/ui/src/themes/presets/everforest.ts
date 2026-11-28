import type { ThemePreset } from "../types";

export default {
  light: {
    body: "#fdf6e3",
    surface: "#f5efdb",
    hover: "#e6e2cc",
    border: "#c5c9ad",
    text: "#5c6a72",
    dimmed: "#606d63",
    primary: "#557433",
    secondary: "#966522",
  },
  dark: {
    body: "#2d353b",
    surface: "#343f44",
    hover: "#3d484d",
    border: "#56635a",
    text: "#d3c6aa",
    dimmed: "#b0b4a3",
    primary: "#a7c080",
    secondary: "#dbbc7f",
  },
  theme: {
    defaultRadius: "sm",
    shadows: { xs: "none", sm: "none", md: "0 4px 12px rgba(45, 53, 59, 0.10)" },
  },
} satisfies ThemePreset;
