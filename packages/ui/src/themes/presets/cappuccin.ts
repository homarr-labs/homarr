import type { ThemePreset } from "../types";

export default {
  light: {
    body: "#eff1f5",
    surface: "#e6e9ef",
    hover: "#dce0e8",
    border: "#bcc0cc",
    text: "#4c4f69",
    dimmed: "#62667e",
    primary: "#8839ef",
    secondary: "#b62e6c",
  },
  dark: {
    body: "#1e1e2e",
    surface: "#181825",
    hover: "#313244",
    border: "#45475a",
    text: "#cdd6f4",
    dimmed: "#a6adc8",
    primary: "#cba6f7",
    secondary: "#f5c2e7",
  },
  theme: {
    defaultRadius: "lg",
    radius: { sm: "0.5rem", md: "0.75rem", lg: "1rem" },
    shadows: { sm: "none", md: "0 4px 16px rgba(17, 17, 27, 0.15)" },
  },
} satisfies ThemePreset;
