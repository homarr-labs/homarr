import type { MantineThemeOverride } from "@mantine/core";

export interface ThemePalette {
  body: string;
  surface: string;
  hover: string;
  border: string;
  text: string;
  dimmed: string;
  primary: string;
  secondary: string;
}

export interface ThemePreset {
  light: ThemePalette;
  dark: ThemePalette;
  /** Mantine tokens and component defaults, merged with Homarr's base theme. */
  theme?: MantineThemeOverride;
}
