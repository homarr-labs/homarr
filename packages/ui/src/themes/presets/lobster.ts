import type { ThemePreset } from "../types";

export default {
  light: {
    body: "#fff5f0",
    surface: "#fffaf7",
    hover: "#fde6dc",
    border: "#e9c1b4",
    text: "#4a2b2c",
    dimmed: "#815b57",
    primary: "#b63d4a",
    secondary: "#217c78",
  },
  dark: {
    body: "#211518",
    surface: "#302024",
    hover: "#442a2e",
    border: "#664047",
    text: "#ffe7dd",
    dimmed: "#cba9a3",
    primary: "#ff9186",
    secondary: "#79d1c5",
  },
  theme: {
    defaultRadius: "lg",
    radius: { sm: "0.5rem", md: "0.75rem", lg: "1rem", xl: "1.5rem" },
    headings: { fontWeight: "700" },
    shadows: { sm: "0 2px 6px rgba(139, 51, 53, 0.08)", md: "0 6px 18px rgba(139, 51, 53, 0.12)" },
  },
} satisfies ThemePreset;
