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
import { createPresetTheme, createThemeColorScale, createThemeVariablesResolver } from "@homarr/ui/themes";
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

export const resolveActiveTheme = (branding: Branding, selection?: ThemeSelection) => {
  let lockedPrimaryColor: string | undefined;
  if (branding.lockPrimaryColor) lockedPrimaryColor = branding.primaryColor;
  return { ...resolveThemeSelection(branding, selection), lockedPrimaryColor };
};

const radiusDefaults = (radius: MantineRadius): MantineThemeOverride => ({
  defaultRadius: radius,
  components: {
    ActionIcon: { defaultProps: { radius } },
    Button: { defaultProps: { radius } },
    Card: { defaultProps: { radius } },
    Paper: { defaultProps: { radius } },
  },
});

export const createDefaultAccentColors = (
  branding: Pick<Branding, "primaryColor" | "secondaryColor" | "lockPrimaryColor">,
  customTheme?: CustomTheme | null,
) => {
  const colors: Record<string, MantineColorsTuple> = {};
  for (const key of ["primary", "secondary"] as const) {
    const name = `${key}Color` as const;
    const fallback = branding[name];
    const light = customTheme?.light?.[key];
    const dark = customTheme?.dark?.[key];
    const raw = customTheme?.theme.colors?.[name];
    if (key === "primary" && branding.lockPrimaryColor) {
      colors[name] = generateColorScale(fallback);
      continue;
    }
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
  const { preset, customTheme, lockedPrimaryColor } = resolveActiveTheme(branding, selection);
  const base = createTheme({
    colors: createDefaultAccentColors(branding, preset === "default" ? customTheme : null),
    primaryColor: "primaryColor",
  });

  let theme = mergeThemeOverrides(
    homarrTheme,
    base,
    createPresetTheme(preset, lockedPrimaryColor, customTheme),
    radiusDefaults(branding.defaultRadius),
  );

  if (customTheme) {
    const override = customTheme.theme;
    const inheritedPrimaryShade = theme.primaryShade ?? DEFAULT_THEME.primaryShade;
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
    if (lockedPrimaryColor) {
      const { primaryColor, presetPrimaryLight, presetPrimaryDark } =
        createPresetTheme(preset, lockedPrimaryColor).colors ?? {};
      theme = mergeThemeOverrides(theme, {
        primaryColor: "primaryColor",
        primaryShade: inheritedPrimaryShade,
        colors: {
          primaryColor: primaryColor ?? generateColorScale(lockedPrimaryColor),
          ...(presetPrimaryLight && { presetPrimaryLight }),
          ...(presetPrimaryDark && { presetPrimaryDark }),
        },
      });
    }
  }

  return { theme, cssVariablesResolver: createThemeVariablesResolver(preset, lockedPrimaryColor, customTheme) };
};
