import type { ThemePreset } from "../types";

export default {
  light: {
    body: "#f7f5ff",
    surface: "#ffffff",
    hover: "#eee9fb",
    border: "#d9d1ec",
    text: "#261d38",
    dimmed: "#70617e",
    primary: "#7052c4",
    secondary: "#a53776",
  },
  dark: {
    body: "#15121e",
    surface: "#211b2e",
    hover: "#302740",
    border: "#473b59",
    text: "#f0eafa",
    dimmed: "#b1a2c4",
    primary: "#bca0ff",
    secondary: "#f49ac2",
  },
  theme: {
    defaultRadius: "lg",
    headings: { fontWeight: "700" },
    shadows: {
      sm: "0 2px 8px rgba(80, 45, 130, 0.10)",
      md: "0 6px 20px rgba(80, 45, 130, 0.14)",
    },
  },
} satisfies ThemePreset;
