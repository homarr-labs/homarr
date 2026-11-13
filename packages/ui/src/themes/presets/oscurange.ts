import type { ThemePreset } from "../types";

export default {
  light: {
    body: "#faf7f2",
    surface: "#fffdf9",
    hover: "#f1e7da",
    border: "#d9c8b4",
    text: "#30251b",
    dimmed: "#77624d",
    primary: "#ad4b00",
    secondary: "#795529",
  },
  dark: {
    body: "#151311",
    surface: "#211c17",
    hover: "#32281f",
    border: "#51402f",
    text: "#f0e5d7",
    dimmed: "#bdab97",
    primary: "#ffa349",
    secondary: "#e0bc87",
  },
  theme: {
    defaultRadius: "sm",
    radius: { xs: "2px", sm: "4px", md: "6px", lg: "10px", xl: "14px" },
    headings: { fontFamily: "var(--font-geist), Inter, sans-serif", fontWeight: "700" },
  },
} satisfies ThemePreset;
