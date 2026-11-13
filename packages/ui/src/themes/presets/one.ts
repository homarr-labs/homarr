import type { ThemePreset } from "../types";

export default {
  light: {
    body: "#fafafa",
    surface: "#ffffff",
    hover: "#ebeef2",
    border: "#d4d8df",
    text: "#383a42",
    dimmed: "#696c77",
    primary: "#3165d4",
    secondary: "#a23eb9",
  },
  dark: {
    body: "#282c34",
    surface: "#303640",
    hover: "#3b424e",
    border: "#4b5362",
    text: "#d5dae3",
    dimmed: "#a0a9b9",
    primary: "#61afef",
    secondary: "#cf8ce2",
  },
  theme: {
    defaultRadius: "sm",
    radius: { xs: "3px", sm: "5px", md: "8px", lg: "12px", xl: "16px" },
    headings: { fontFamily: "var(--font-geist-mono), ui-monospace, monospace", fontWeight: "600" },
  },
} satisfies ThemePreset;
