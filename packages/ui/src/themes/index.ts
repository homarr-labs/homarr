import type { CSSVariablesResolver, MantineColorsTuple, MantineThemeOverride } from "@mantine/core";
import {
  darken,
  getContrastColor,
  lighten,
  mergeThemeOverrides,
  v8CssVariablesResolver,
  virtualColor,
} from "@mantine/core";

import type { ThemeId } from "@homarr/definitions";

import { getThemePreset } from "./registry";
import type { ThemePalette } from "./types";

export { getThemePreset } from "./registry";
export type { ThemePalette, ThemePreset } from "./types";

export const createThemeColorScale = (color: string): MantineColorsTuple => [
  lighten(color, 0.94),
  lighten(color, 0.85),
  lighten(color, 0.7),
  lighten(color, 0.5),
  lighten(color, 0.3),
  lighten(color, 0.12),
  color,
  darken(color, 0.15),
  darken(color, 0.3),
  darken(color, 0.45),
];

export const createPresetTheme = (id: ThemeId, lockedPrimaryColor?: string): MantineThemeOverride => {
  const preset = getThemePreset(id);
  if (!preset) return {};
  const radius = preset.theme?.defaultRadius ?? "md";

  return mergeThemeOverrides(
    {
      colors: {
        gray: [
          preset.light.body,
          preset.light.hover,
          preset.light.border,
          preset.light.border,
          preset.light.dimmed,
          preset.light.dimmed,
          preset.light.dimmed,
          preset.light.text,
          preset.light.text,
          preset.light.text,
        ],
        presetPrimaryLight: createThemeColorScale(lockedPrimaryColor ?? preset.light.primary),
        presetPrimaryDark: createThemeColorScale(lockedPrimaryColor ?? preset.dark.primary),
        presetSecondaryLight: createThemeColorScale(preset.light.secondary),
        presetSecondaryDark: createThemeColorScale(preset.dark.secondary),
        primaryColor: virtualColor({ name: "primaryColor", light: "presetPrimaryLight", dark: "presetPrimaryDark" }),
        secondaryColor: virtualColor({
          name: "secondaryColor",
          light: "presetSecondaryLight",
          dark: "presetSecondaryDark",
        }),
        dark: [
          preset.dark.text,
          preset.dark.dimmed,
          preset.dark.dimmed,
          preset.dark.border,
          preset.dark.hover,
          preset.dark.hover,
          preset.dark.surface,
          preset.dark.body,
          darken(preset.dark.body, 0.15),
          darken(preset.dark.body, 0.3),
        ],
      },
      primaryColor: "primaryColor",
      primaryShade: { light: 6, dark: 6 },
      components: {
        Paper: { defaultProps: { radius }, styles: { root: { backgroundColor: "var(--mantine-color-default)" } } },
        Card: { defaultProps: { radius }, styles: { root: { backgroundColor: "var(--mantine-color-default)" } } },
        Button: { defaultProps: { radius } },
        ActionIcon: { defaultProps: { radius } },
      },
    },
    preset.theme ?? {},
  );
};

/** Keep v8 light variants while adding the preset's semantic and scheme-specific tokens. */
export const createThemeVariablesResolver =
  (id: ThemeId, lockedPrimaryColor?: string): CSSVariablesResolver =>
  (theme) => {
    const base = v8CssVariablesResolver(theme);
    const preset = getThemePreset(id);
    if (!preset) return base;

    const variables = (palette: ThemePalette): Record<string, string> => {
      const result: Record<string, string> = {
        "--mantine-color-body": palette.body,
        "--mantine-color-text": palette.text,
        "--mantine-color-bright": palette.text,
        "--mantine-color-dimmed": palette.dimmed,
        "--mantine-color-default": palette.surface,
        "--mantine-color-default-color": palette.text,
        "--mantine-color-default-hover": palette.hover,
        "--mantine-color-default-border": palette.border,
        "--mantine-color-disabled": palette.hover,
        "--mantine-color-disabled-color": palette.dimmed,
        "--mantine-color-disabled-border": palette.border,
        "--mantine-color-placeholder": palette.dimmed,
        "--mantine-color-anchor": palette.primary,
        "--mantine-primary-color-contrast": "var(--mantine-color-primaryColor-contrast)",
      };

      for (const [name, color] of [
        ["primaryColor", lockedPrimaryColor ?? palette.primary],
        ["secondaryColor", palette.secondary],
      ] as const) {
        const scale = createThemeColorScale(color);
        scale.forEach((shade, index) => {
          result[`--mantine-color-${name}-${index}`] = shade;
        });
        Object.assign(result, {
          [`--mantine-color-${name}-filled`]: color,
          [`--mantine-color-${name}-filled-hover`]: darken(color, 0.1),
          [`--mantine-color-${name}-contrast`]: getContrastColor({ color, theme, autoContrast: true }),
          [`--mantine-color-${name}-light`]: `color-mix(in srgb, ${color} 12%, transparent)`,
          [`--mantine-color-${name}-light-hover`]: `color-mix(in srgb, ${color} 18%, transparent)`,
          [`--mantine-color-${name}-light-color`]: color,
          [`--mantine-color-${name}-text`]: color,
          [`--mantine-color-${name}-outline`]: color,
          [`--mantine-color-${name}-outline-hover`]: `color-mix(in srgb, ${color} 10%, transparent)`,
        });
      }
      return result;
    };

    return {
      variables: base.variables,
      light: { ...base.light, ...variables(preset.light) },
      dark: { ...base.dark, ...variables(preset.dark) },
    };
  };
