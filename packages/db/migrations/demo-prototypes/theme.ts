import { customThemeSchema } from "@homarr/validation/theme";

// A real, editable Homarr custom theme for the opt-in scratch comparison.
export const demoPrototypeTheme = customThemeSchema.parse({
  preset: "default",
  theme: {
    fontFamily: "var(--font-geist), system-ui, sans-serif",
    fontFamilyMonospace: "var(--font-geist-mono), ui-monospace, monospace",
    headings: { fontFamily: "var(--font-geist), system-ui, sans-serif", fontWeight: "600" },
    autoContrast: true,
    luminanceThreshold: 0.179,
    defaultRadius: "md",
    respectReducedMotion: true,
  },
  light: {
    body: "#f1f4f5",
    surface: "#ffffff",
    hover: "#e6ecee",
    border: "#ccd5da",
    text: "#18252d",
    dimmed: "#4a606e",
    primary: "#397a73",
    secondary: "#397a73",
  },
  dark: {
    body: "#14191f",
    surface: "#1d242b",
    hover: "#263038",
    border: "#36424b",
    text: "#e5ebef",
    dimmed: "#adb9c3",
    primary: "#6ba7a0",
    secondary: "#6ba7a0",
  },
});
