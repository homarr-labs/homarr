import type { ThemePreset } from "../types";

export default {
  light: {
    body: "#fbf1c7",
    surface: "#f2e5bc",
    hover: "#ebdbb2",
    border: "#bdae93",
    text: "#3c3836",
    dimmed: "#665c54",
    primary: "#af3a03",
    secondary: "#427b58",
  },
  dark: {
    body: "#282828",
    surface: "#32302f",
    hover: "#3c3836",
    border: "#665c54",
    text: "#ebdbb2",
    dimmed: "#bdae93",
    primary: "#fe8019",
    secondary: "#b8bb26",
  },
  theme: {
    defaultRadius: "xs",
    radius: { xs: "0.125rem", sm: "0.25rem", md: "0.375rem", lg: "0.5rem" },
    shadows: { xs: "none", sm: "none", md: "none" },
  },
} satisfies ThemePreset;
