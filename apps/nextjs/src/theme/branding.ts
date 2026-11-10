import type { MantineColorsTuple, MantineRadius, MantineThemeOverride } from "@mantine/core";
import {
  createTheme,
  darken,
  DEFAULT_THEME,
  getPrimaryShade,
  lighten,
  mergeThemeOverrides,
  virtualColor,
} from "@mantine/core";

import type { ServerSettings } from "@homarr/server-settings";
import { theme as homarrTheme } from "@homarr/ui";
import {
  createPresetTheme,
  createThemeColorScale,
  createThemeVariablesResolver,
  getThemePalette,
  getThemePreset,
} from "@homarr/ui/themes";
import type { CustomTheme, ThemeSelection } from "@homarr/validation/theme";
import { resolveThemeSelection } from "@homarr/validation/theme";

export type { ThemeSelection } from "@homarr/validation/theme";

export const generateColorScale = (hex: string) => {
  const lightnessSteps = [-0.25, -0.2, -0.15, -0.1, -0.05, 0, 0.05, 0.1, 0.15, 0.2] as const;
  const colors = lightnessSteps.map((lightness) => {
    if (lightness < 0) return lighten(hex, -lightness);
    return darken(hex, lightness);
  });

  return colors.map((color) => {
    const channels = color.split("(")[1]?.replaceAll(" ", "").replace(")", "").split(",");
    if (!channels) return hex;
    const value = channels
      .map((channel) => parseInt(channel, 10))
      .slice(0, 3)
      .map((channel) => channel.toString(16).padStart(2, "0"))
      .join("");
    return `#${value}`;
  }) as unknown as MantineColorsTuple;
};

type Branding = ServerSettings["branding"];

export const resolveActiveTheme = (branding: Branding, selection?: ThemeSelection) =>
  resolveThemeSelection(branding, selection);

const radiusDefaults = (radius: MantineRadius): MantineThemeOverride => ({
  defaultRadius: radius,
  components: {
    ActionIcon: { defaultProps: { radius } },
    Button: { defaultProps: { radius } },
    Card: { defaultProps: { radius } },
    Paper: { defaultProps: { radius } },
  },
});

export const createDefaultAccentColors = (customTheme?: CustomTheme | null) => {
  const colors: Record<string, MantineColorsTuple> = {};
  for (const key of ["primary", "secondary"] as const) {
    const name = `${key}Color` as const;
    let fallback = "#fa5252";
    if (key === "secondary") fallback = "#fd7e14";
    const light = customTheme?.light?.[key];
    const dark = customTheme?.dark?.[key];
    const raw = customTheme?.theme.colors?.[name];
    if (raw || (!light && !dark)) {
      colors[name] = raw ?? generateColorScale(fallback);
      continue;
    }
    const lightName = `custom-${key}-light`;
    const darkName = `custom-${key}-dark`;
    colors[lightName] = light
      ? createThemeColorScale(light, getPrimaryShade(DEFAULT_THEME, "light"))
      : generateColorScale(fallback);
    colors[darkName] = dark
      ? createThemeColorScale(dark, getPrimaryShade(DEFAULT_THEME, "dark"))
      : generateColorScale(fallback);
    colors[name] = virtualColor({ name, light: lightName, dark: darkName });
  }

  return colors;
};

export const createAppearanceTheme = (branding: Branding, selection?: ThemeSelection) => {
  const { preset, customTheme } = resolveActiveTheme(branding, selection);
  const base = createTheme({
    colors: createDefaultAccentColors(preset === "default" ? customTheme : null),
    primaryColor: "primaryColor",
  });

  let theme = mergeThemeOverrides(homarrTheme, base, createPresetTheme(preset, undefined, customTheme));

  if (customTheme) {
    const override = customTheme.theme;
    const components: NonNullable<MantineThemeOverride["components"]> = {};
    for (const [name, component] of Object.entries(override.components ?? {})) {
      const inheritedStyles = theme.components?.[name]?.styles;
      let styles = component.styles;
      const padding = styles?.root?.padding;
      if (
        (name === "Paper" || name === "Card") &&
        typeof padding === "string" &&
        ["xs", "sm", "md", "lg", "xl"].includes(padding)
      ) {
        styles = { ...styles, root: { ...styles?.root, padding: `var(--mantine-spacing-${padding})` } };
        components[name] = { styles };
      }
      if (typeof inheritedStyles === "function" && styles)
        components[name] = {
          styles: (...args: unknown[]) => {
            const inherited = inheritedStyles(...args) as Record<string, Record<string, unknown>>;
            return {
              ...inherited,
              ...Object.fromEntries(
                Object.entries(styles).map(([selector, values]) => [selector, { ...inherited?.[selector], ...values }]),
              ),
            };
          },
        };
      if (component.vars) {
        const inheritedVars = theme.components?.[name]?.vars;
        components[name] = {
          ...components[name],
          vars: (...args: unknown[]) => {
            let inherited: Record<string, Record<string, unknown>> = {};
            if (typeof inheritedVars === "function") inherited = inheritedVars(...args);
            return {
              ...inherited,
              ...Object.fromEntries(
                Object.entries(component.vars ?? {}).map(([selector, values]) => [
                  selector,
                  { ...inherited[selector], ...values },
                ]),
              ),
            };
          },
        };
      }
    }
    if (override.defaultRadius !== undefined)
      theme = mergeThemeOverrides(theme, radiusDefaults(override.defaultRadius));
    theme = mergeThemeOverrides(theme, override, { components });
  }

  return { theme, cssVariablesResolver: createThemeVariablesResolver(preset, undefined, customTheme) };
};

export const getBrandingAppearance = (branding: Branding) => {
  const active = resolveActiveTheme(branding);
  const palette = getThemePalette(active.preset, "light", active.customTheme);
  const override = active.customTheme?.theme;
  let primaryColor = palette.primary ?? "#fa5252";
  let secondaryColor = palette.secondary ?? "#fd7e14";
  const primary = override?.colors?.[override.primaryColor ?? "primaryColor"];
  const secondary = override?.colors?.secondaryColor;
  if (primary) primaryColor = primary[6];
  if (secondary) secondaryColor = secondary[6];
  const radius = override?.defaultRadius ?? getThemePreset(active.preset)?.theme?.defaultRadius ?? "md";
  return { primaryColor, secondaryColor, radius };
};

export const getThemeCustomCss = (branding: Branding) => resolveActiveTheme(branding).customTheme?.customCss ?? "";
