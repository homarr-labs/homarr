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
import type { CustomTheme } from "@homarr/validation/theme";

import { getThemePreset } from "./registry";
import type { ThemePalette } from "./types";

export { getThemePreset } from "./registry";
export type { ThemePalette, ThemePreset } from "./types";

export const getThemePalette = (
  id: ThemeId,
  scheme: "light" | "dark",
  customTheme?: CustomTheme | null,
): Partial<ThemePalette> => {
  const palette: Partial<ThemePalette> = { ...getThemePreset(id)?.[scheme] };
  const override = customTheme?.theme;
  if (scheme === "light") {
    if (override?.white) {
      delete palette.body;
      delete palette.surface;
    }
    if (override?.black) delete palette.text;
    if (override?.colors?.gray) {
      delete palette.hover;
      delete palette.border;
      delete palette.dimmed;
    }
  } else if (override?.colors?.dark) {
    for (const key of ["body", "surface", "hover", "border", "text", "dimmed"] as const) delete palette[key];
  }
  return { ...palette, ...customTheme?.[scheme] };
};

export const createThemeColorScale = (color: string, shade = 6): MantineColorsTuple => {
  const scale: MantineColorsTuple = [
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
  if (shade === 6) return scale;
  return scale.map((_, index) => scale[Math.max(0, Math.min(9, index - shade + 6))]) as unknown as MantineColorsTuple;
};

export const createPresetTheme = (
  id: ThemeId,
  lockedPrimaryColor?: string,
  customTheme?: CustomTheme | null,
): MantineThemeOverride => {
  const preset = getThemePreset(id);
  if (!preset) return {};
  const radius = preset.theme?.defaultRadius ?? "md";
  const light = { ...preset.light, ...customTheme?.light };
  const dark = { ...preset.dark, ...customTheme?.dark };

  return mergeThemeOverrides(
    {
      colors: {
        gray: [
          light.body,
          light.hover,
          light.border,
          light.border,
          light.dimmed,
          light.dimmed,
          light.dimmed,
          light.text,
          light.text,
          light.text,
        ],
        presetPrimaryLight: createThemeColorScale(lockedPrimaryColor ?? light.primary),
        presetPrimaryDark: createThemeColorScale(lockedPrimaryColor ?? dark.primary),
        presetSecondaryLight: createThemeColorScale(light.secondary),
        presetSecondaryDark: createThemeColorScale(dark.secondary),
        primaryColor: virtualColor({ name: "primaryColor", light: "presetPrimaryLight", dark: "presetPrimaryDark" }),
        secondaryColor: virtualColor({
          name: "secondaryColor",
          light: "presetSecondaryLight",
          dark: "presetSecondaryDark",
        }),
        dark: [
          dark.text,
          dark.dimmed,
          dark.dimmed,
          dark.border,
          dark.hover,
          dark.hover,
          dark.surface,
          dark.body,
          darken(dark.body, 0.15),
          darken(dark.body, 0.3),
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
  (id: ThemeId, lockedPrimaryColor?: string, customTheme?: CustomTheme | null): CSSVariablesResolver =>
  (theme) => {
    const base = v8CssVariablesResolver(theme);
    const preset = getThemePreset(id);
    if (!preset && !customTheme) return base;

    const variables = (palette: Partial<ThemePalette>): Record<string, string> => {
      const result: Record<string, string> = {};
      if (palette.body) result["--mantine-color-body"] = palette.body;
      if (palette.text) {
        result["--mantine-color-text"] = palette.text;
        result["--mantine-color-bright"] = palette.text;
        result["--mantine-color-default-color"] = palette.text;
      }
      if (palette.dimmed) {
        result["--mantine-color-dimmed"] = palette.dimmed;
        result["--mantine-color-disabled-color"] = palette.dimmed;
        result["--mantine-color-placeholder"] = palette.dimmed;
      }
      if (palette.surface) result["--mantine-color-default"] = palette.surface;
      if (palette.hover) {
        result["--mantine-color-default-hover"] = palette.hover;
        result["--mantine-color-disabled"] = palette.hover;
      }
      if (palette.border) {
        result["--mantine-color-default-border"] = palette.border;
        result["--mantine-color-disabled-border"] = palette.border;
      }
      if (!palette.primary || !palette.secondary) return result;
      const override = customTheme?.theme;
      const usePresetPrimary =
        lockedPrimaryColor ||
        (override?.primaryShade === undefined &&
          !override?.colors?.primaryColor &&
          !override?.colors?.presetPrimaryLight &&
          !override?.colors?.presetPrimaryDark);
      if (usePresetPrimary && theme.primaryColor === "primaryColor") {
        result["--mantine-color-anchor"] = lockedPrimaryColor ?? palette.primary;
        result["--mantine-primary-color-contrast"] = "var(--mantine-color-primaryColor-contrast)";
      }

      for (const [name, color] of [
        ["primaryColor", lockedPrimaryColor ?? palette.primary],
        ["secondaryColor", palette.secondary],
      ] as const) {
        if (name === "primaryColor" && !usePresetPrimary) continue;
        if (
          name === "secondaryColor" &&
          (override?.primaryShade !== undefined ||
            override?.colors?.secondaryColor ||
            override?.colors?.presetSecondaryLight ||
            override?.colors?.presetSecondaryDark)
        )
          continue;
        const scale = createThemeColorScale(color);
        scale.forEach((shade, index) => {
          result[`--mantine-color-${name}-${index}`] = shade;
        });
        Object.assign(result, {
          [`--mantine-color-${name}-filled`]: color,
          [`--mantine-color-${name}-filled-hover`]: darken(color, 0.1),
          [`--mantine-color-${name}-contrast`]: getContrastColor({ color, theme, autoContrast: theme.autoContrast }),
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
      light: { ...base.light, ...variables(getThemePalette(id, "light", customTheme)) },
      dark: { ...base.dark, ...variables(getThemePalette(id, "dark", customTheme)) },
    };
  };
