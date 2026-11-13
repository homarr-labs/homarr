import type { ThemePreset } from "../types";

export default {
  light: {
    body: "#f5f7fa",
    surface: "#ffffff",
    hover: "#e7edf5",
    border: "#ccd6e3",
    text: "#403f53",
    dimmed: "#62677c",
    primary: "#3c58b8",
    secondary: "#8840a9",
  },
  dark: {
    body: "#011627",
    surface: "#082235",
    hover: "#153448",
    border: "#2a4558",
    text: "#d6deeb",
    dimmed: "#8fa6bd",
    primary: "#82aaff",
    secondary: "#c792ea",
  },
  theme: {
    defaultRadius: "md",
    headings: { fontWeight: "600" },
    shadows: {
      xs: "0 1px 2px rgb(1 22 39 / 8%)",
      sm: "0 2px 5px rgb(1 22 39 / 10%)",
      md: "0 4px 12px rgb(1 22 39 / 14%)",
      lg: "0 8px 24px rgb(1 22 39 / 18%)",
      xl: "0 12px 32px rgb(1 22 39 / 22%)",
    },
  },
} satisfies ThemePreset;
