import type { ThemePreset } from "../types";

// Adapted from the MantineHub example supplied with this feature.
export default {
  light: {
    body: "#ffffff",
    surface: "#ffffff",
    hover: "#f4f4f5",
    border: "#e4e4e7",
    text: "#09090b",
    dimmed: "#71717a",
    primary: "#18181b",
    secondary: "#52525b",
  },
  dark: {
    body: "#09090b",
    surface: "#18181b",
    hover: "#27272a",
    border: "#3f3f46",
    text: "#fafafa",
    dimmed: "#a1a1aa",
    primary: "#fafafa",
    secondary: "#a1a1aa",
  },
  theme: {
    fontFamily: "var(--font-geist), Inter, sans-serif",
    fontFamilyMonospace: "var(--font-geist-mono), monospace",
    headings: { fontFamily: "var(--font-geist), Inter, sans-serif", fontWeight: "600" },
    defaultRadius: "sm",
    radius: { xs: "0.375rem", sm: "0.5rem", md: "0.75rem", lg: "1rem", xl: "1.5rem" },
    shadows: {
      xs: "0 1px 2px rgb(0 0 0 / 5%)",
      sm: "0 1px 3px rgb(0 0 0 / 10%)",
      md: "0 4px 6px rgb(0 0 0 / 10%)",
      lg: "0 10px 15px rgb(0 0 0 / 10%)",
      xl: "0 20px 25px rgb(0 0 0 / 10%)",
    },
    components: {
      Button: { styles: { root: { fontWeight: 500 } } },
      Paper: { defaultProps: { withBorder: true } },
      Card: { defaultProps: { withBorder: true, shadow: "xs" } },
    },
  },
} satisfies ThemePreset;
