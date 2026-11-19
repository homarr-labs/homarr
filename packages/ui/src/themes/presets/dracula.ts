import type { ThemePreset } from "../types";

export default {
  light: {
    body: "#f8f7fb",
    surface: "#ffffff",
    hover: "#eeeaf6",
    border: "#d6cfe4",
    text: "#282a36",
    dimmed: "#676078",
    primary: "#7440a8",
    secondary: "#b52a75",
  },
  dark: {
    body: "#282a36",
    surface: "#21222c",
    hover: "#343746",
    border: "#44475a",
    text: "#f8f8f2",
    dimmed: "#b4b9d1",
    primary: "#bd93f9",
    secondary: "#ff79c6",
  },
  theme: {
    defaultRadius: "md",
    headings: { fontWeight: "700" },
    shadows: { sm: "0 2px 6px rgba(40, 42, 54, 0.16)", md: "0 6px 18px rgba(40, 42, 54, 0.20)" },
  },
} satisfies ThemePreset;
