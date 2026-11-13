import type { ThemePreset } from "../types";

export default {
  light: {
    body: "#faf9f2",
    surface: "#fffef8",
    hover: "#eeecdf",
    border: "#d1cebb",
    text: "#38382e",
    dimmed: "#6b6854",
    primary: "#617b13",
    secondary: "#b81252",
  },
  dark: {
    body: "#272822",
    surface: "#303129",
    hover: "#3e3d32",
    border: "#57584b",
    text: "#f8f8f2",
    dimmed: "#b9b9a4",
    primary: "#a6e22e",
    secondary: "#ff6b9d",
  },
  theme: {
    defaultRadius: "sm",
    headings: { fontFamily: "var(--font-geist-mono), ui-monospace, monospace" },
    radius: { xs: "3px", sm: "5px", md: "8px", lg: "10px", xl: "14px" },
  },
} satisfies ThemePreset;
