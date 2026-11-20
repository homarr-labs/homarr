import type { ThemePreset } from "../types";

export default {
  light: {
    body: "#f7f7f8",
    surface: "#ffffff",
    hover: "#eeeeef",
    border: "#dcdcdf",
    text: "#202023",
    dimmed: "#696970",
    primary: "#cf2534",
    secondary: "#8051c4",
  },
  dark: {
    body: "#18181a",
    surface: "#222225",
    hover: "#2d2d32",
    border: "#3e3e44",
    text: "#f4f4f5",
    dimmed: "#a4a4ad",
    primary: "#ff6369",
    secondary: "#bca0f2",
  },
  theme: {
    defaultRadius: "sm",
    radius: { xs: "0.25rem", sm: "0.375rem", md: "0.5rem", lg: "0.75rem", xl: "1rem" },
    shadows: { sm: "0 2px 8px rgb(0 0 0 / 8%)", md: "0 8px 24px rgb(0 0 0 / 14%)" },
  },
} satisfies ThemePreset;
